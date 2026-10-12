
import {transition,formatOnDemandReport,MENU} from './bot-core.mjs';
import {toRow,BUCKET} from '../../../src/core.js';

export function incomingMessage(update){
 const message=update?.message;
 if(!Number.isSafeInteger(update?.update_id)||update.update_id<0||!message||message.chat?.type!=='private'||
  !Number.isSafeInteger(message.from?.id)||!Number.isSafeInteger(message.chat?.id)||message.from.is_bot||
  message.from.id!==message.chat.id)return null;
 const photo=message.photo?.at(-1),doc=message.document;
 let image=null;
 if(photo)image={fileId:photo.file_id,uniqueId:photo.file_unique_id,size:photo.file_size||0};
 else if(doc&&['image/jpeg','image/png','image/webp'].includes(doc.mime_type))image={fileId:doc.file_id,uniqueId:doc.file_unique_id,size:doc.file_size||0};
 if(image&&(typeof image.fileId!=='string'||typeof image.uniqueId!=='string'||image.fileId.length>1000||image.size<0))image=null;
 return {updateId:update.update_id,chatId:String(message.chat.id),userId:String(message.from.id),
  text:message.text||message.caption||'',photo:image};
}
export function imageType(bytes){
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {mime:'image/jpeg',extension:'jpg'};
 if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)return {mime:'image/png',extension:'png'};
 if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return {mime:'image/webp',extension:'webp'};
 throw Error('unsupported_image');
}
async function boundedBytes(response){
 const limit=10*1024*1024;
 if(!response.ok||Number(response.headers.get('content-length'))>limit||!response.body)throw Error('photo_download');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('photo_size');chunks.push(value);}
 }finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(size);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return bytes;
}
export function createBotHandler({env={},fetch:fetcher=globalThis.fetch,uuid=()=>crypto.randomUUID()}={}){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),service=env.SUPABASE_SERVICE_ROLE_KEY;
 return async request=>{
  const respond=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  if(request.method!=='POST')return respond(405,{ok:false});
  const secret=request.headers.get('x-telegram-bot-api-secret-token');
  if(!secret||!/^[A-Za-z0-9_-]{32,256}$/.test(secret))return respond(401,{ok:false});
  if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(base)||!service)return respond(503,{ok:false});
  if(Number(request.headers.get('content-length'))>65536)return respond(413,{ok:false});
  let update;
  try{const raw=await request.text();if(raw.length>65536)return respond(413,{ok:false});update=JSON.parse(raw);}
  catch{return respond(400,{ok:false});}
  const input=incomingMessage(update);
  if(!input)return respond(200,{ok:true,ignored:true});
  async function rpc(name,args){
   const r=await fetcher(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
   const raw=await r.text(),data=raw?JSON.parse(raw):null;
   if(!r.ok)throw Object.assign(Error('database_request_failed'),{code:data?.code});
   return data;
  }
  let credentials;
  try{credentials=await rpc('hmg_catalog_bot_authorize',{p_secret:secret,p_chat_id:input.chatId,p_user_id:input.userId});}
  catch(e){return respond(e.code==='42501'?401:503,{ok:false});}
  if(!credentials?.token)return respond(200,{ok:true,ignored:true});
  async function telegram(method,body){
   const r=await fetcher('https://api.telegram.org/bot'+credentials.token+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
   const data=await r.json();
   if(!r.ok||data?.ok!==true)throw Error('telegram_request_failed');
   return data.result;
  }
  async function uploadPhoto(photo,draftId,index){
   const file=await telegram('getFile',{file_id:photo.fileId});
   if(!file?.file_path||!/^[-A-Za-z0-9_./]+$/.test(file.file_path)||file.file_path.includes('..')||file.file_size>10*1024*1024)throw Error('photo_file');
   const response=await fetcher('https://api.telegram.org/file/bot'+credentials.token+'/'+file.file_path,{redirect:'error',signal:AbortSignal.timeout(15000)});
   const bytes=await boundedBytes(response),type=imageType(bytes),path='telegram/'+draftId+'/'+index+'.'+type.extension;
   const uploaded=await fetcher(base+'/storage/v1/object/'+BUCKET+'/'+path,{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':type.mime,'x-upsert':'true','Cache-Control':'3600'},body:bytes,signal:AbortSignal.timeout(15000)});
   if(!uploaded.ok)throw Error('photo_upload');
   return path;
  }
  async function deliver(result){
   const outgoing={...result.reply};
   if(result.productId){
    outgoing.text+='\n\nHMG-'+String(result.productId).padStart(3,'0');
    if(!result.draft)outgoing.text+='\nhttps://www.hugomedia.pl/?product='+result.productId;
    outgoing.text+='\nАдмінка: https://www.hugomedia.pl/?admin';
   }
   await telegram('sendMessage',{chat_id:input.chatId,...outgoing,link_preview_options:{is_disabled:true}});
   await rpc('hmg_catalog_bot_delivered',{p_chat_id:input.chatId,p_update_id:input.updateId});
  }
  try{
   const context=await rpc('hmg_catalog_bot_context',{p_chat_id:input.chatId,p_update_id:input.updateId});
   if(context.duplicate){if(!context.delivered)await deliver(context.result);return respond(200,{ok:true,duplicate:true});}
   const next=transition(context.state,input,uuid());
   if(next.report){
    const report=await rpc('hmg_catalog_bot_report',{p_period:next.report});
    next.reply={text:formatOnDemandReport(report),reply_markup:MENU};
   }
   let product=null;
   if(next.publish){
    try{
     const paths=[];
     // Upload in bounded pairs to keep albums fast and memory bounded.
     for(let i=0;i<next.state.photos.length;i+=2){
      paths.push(...await Promise.all(next.state.photos.slice(i,i+2).map((p,j)=>uploadPhoto(p,next.state.draftId,i+j))));
     }
     product=toRow({...next.state.values,status:next.draft?3:next.state.values.status,images:paths});
     next.state={};
    }catch{
     next.reply={text:'Не вдалося завантажити фото або перевірити товар. Дані збережені. Натисни «✅ Опублікувати» ще раз або виправ фото.',reply_markup:{keyboard:[['✅ Опублікувати'],['💾 Зберегти чернетку','✏️ Виправити'],['❌ Скасувати']],resize_keyboard:true}};
     product=null;
    }
   }
   const result=await rpc('hmg_catalog_bot_commit',{p_chat_id:input.chatId,p_update_id:input.updateId,p_version:context.version,p_state:next.state,p_reply:next.reply,p_product:product});
   await deliver(result);
   return respond(200,{ok:true});
  }catch{return respond(503,{ok:false,retry:true});}
 };
}
