
import test from 'node:test';
import {toRow,fromRow} from '../src/core.js';
import assert from 'node:assert/strict';
import {transition,parseNumber,parseSpecs,formatOnDemandReport,CATEGORIES,STATUSES,MENU} from '../supabase/functions/hmg-telegram-admin/bot-core.mjs';
import {createBotHandler,incomingMessage,imageType} from '../supabase/functions/hmg-telegram-admin/handler.mjs';

const id='12345678-1234-4234-8234-123456789012';
const photo={fileId:'photo-id',uniqueId:'photo-unique',size:100};
const run=(state,text,extra={})=>transition(state,{text,...extra},id);
function completed(){
 let state=run({},'/add').state;
 for(const text of [CATEGORIES[0],'Dell Latitude 5420','Dell','1299','10','Вживаний — добрий','12 місяців',STATUSES[0],'1','Так','CPU: Intel Core i5\nRAM: 16 GB\nSSD: 512 GB\nДодатковий диск: HDD 1 TB','Справний, є подряпини.','Пропустити','Блок і кабель','https://t.me/h_m_g_pl/12','Фото цього товару'])state=run(state,text).state;
 assert.equal(state.step,'photos');
 state=run(state,'',{photo}).state;
 state=run(state,'✅ Фото додано').state;
 return state;
}
test('complete product journey preserves real fields, discount and photos until explicit publish',()=>{
 const state=completed();
 assert.equal(state.step,'preview');assert.equal(state.values.price,1299);assert.equal(state.values.extraStorageType,'HDD');
 assert.equal(state.values.telegramPost,'https://t.me/h_m_g_pl/12');assert.equal(state.photos.length,1);
 assert.match(run(state,'anything').reply.text,/1.?169 zł/);
 const result=run(state,'✅ Опублікувати');assert.equal(result.publish,true);assert.equal(result.draft,false);
});
test('reports preserve an unfinished product and are independent of daily delivery',()=>{
 const state=completed(),result=run(state,'📊 Звіт зараз');
 assert.equal(result.report,'today');assert.deepEqual(result.state,state);
 assert.equal(run(state,'📈 Звіт за 7 днів').report,'7');
 assert.equal(run(state,'/yesterday').report,'yesterday');
});
test('validation, optional fields, editing, cancel and resume prevent accidental data loss',()=>{
 let state=completed(),bad=run({...state,step:'price'},'abc');assert.equal(bad.state.step,'price');
 assert.throws(()=>parseNumber('-1'));assert.throws(()=>parseNumber('20.5',{integer:true}));
 assert.equal(parseNumber('1 299,50'),1299.5);
 assert.throws(()=>parseSpecs('Додатковий диск: HDD 1 TB',1));
 const editing=run(run(state,'✏️ Виправити').state,'Ціна').state;
 const changed=run(editing,'1500');assert.equal(changed.state.step,'preview');assert.equal(changed.state.values.price,1500);
 assert.equal(run(state,'/add').state.draftId,id);
 assert.equal(run(state,'/resume').state.step,'preview');
 assert.deepEqual(run(state,'/cancel').state,{});
});
test('albums deduplicate photos and cap at 8; photo-less items can only save as draft',()=>{
 let state={...completed(),step:'photos',photos:[]};
 for(let i=0;i<10;i++)state=run(state,'',{photo:{...photo,uniqueId:'u'+i}}).state;
 assert.equal(state.photos.length,8);
 assert.equal(run(state,'',{photo:{...photo,uniqueId:'u0'}}).state.photos.length,8);
 state={...state,step:'preview',photos:[]};
 assert.equal(run(state,'✅ Опублікувати').publish,undefined);
 assert.equal(run(state,'💾 Зберегти чернетку').draft,true);
});
test('all seven categories work and non-computer categories skip charger',()=>{
 for(const cat of CATEGORIES){
  let state=run(run({},'/add').state,cat).state;assert.equal(state.values.cat,CATEGORIES.indexOf(cat));
 }
 let state={...completed(),step:'descPl',values:{...completed().values,cat:6}};
 assert.equal(run(state,'Пропустити').state.step,'telegramPost');
});
test('today report labels partial period and contact clicks honestly',()=>{
 const report=formatOnDemandReport({fromDate:'2026-10-12',toDate:'2026-10-12',partial:true,generatedAt:'14:00',current:{visitors:3,contactClicks:1},changes:{visitors:50}});
 assert.match(report,/Сьогодні станом на 14:00/);assert.match(report,/проти вчора до цієї ж години/);
 assert.match(report,/Кліки не підтверджують покупки/);assert.doesNotMatch(report,/undefined|NaN/);
});
test('only private human messages are accepted; bytes determine photo type',()=>{
 const update={update_id:10,message:{chat:{id:123,type:'private'},from:{id:123},text:'/report'}};
 assert.equal(incomingMessage(update).chatId,'123');
 assert.equal(incomingMessage({...update,message:{...update.message,chat:{id:123,type:'group'}}}),null);
 assert.equal(incomingMessage({...update,message:{...update.message,from:{id:999}}}),null);
 assert.equal(imageType(new Uint8Array([255,216,255])).mime,'image/jpeg');
 assert.throws(()=>imageType(new TextEncoder().encode('<svg>')));
});
function mock({state={},denied=false,duplicate=false,photoFailure=false,pending=false}={}){
 const calls=[],products=[],sent=[];
 const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
 const fetch=async(url,options={})=>{
  const body=typeof options.body==='string'?JSON.parse(options.body):options.body;
  const method=url.split('/').at(-1);calls.push(method);
  if(method==='hmg_catalog_bot_authorize')return json(denied?null:{token:'private-test-token',chatId:'123'});
  if(method==='hmg_catalog_bot_context')return json(duplicate?{duplicate:true,delivered:!pending,result:{reply:{text:'Saved reply',reply_markup:MENU},productId:77}}:{version:1,state});
  if(method==='hmg_catalog_bot_report')return json({fromDate:'2026-10-12',toDate:'2026-10-12',partial:true,current:{visitors:5}});
  if(method==='getFile'){
   if(photoFailure)return new Response(JSON.stringify({ok:false}),{status:400});
   return json({ok:true,result:{file_path:'photos/file.jpg',file_size:3}});
  }
  if(url.includes('/file/bot'))return new Response(new Uint8Array([255,216,255]),{headers:{'content-type':'image/jpeg'}});
  if(url.includes('/storage/v1/object/'))return json({Key:'stored'});
  if(method==='hmg_catalog_bot_commit'){if(body.p_product)products.push(body.p_product);return json({reply:body.p_reply,...(body.p_product?{productId:77,draft:body.p_product.status===3}:{})});}
  if(method==='sendMessage'){sent.push(body);return json({ok:true,result:{message_id:4}});}
  if(method==='hmg_catalog_bot_delivered')return new Response(null,{status:204});
  throw Error('Unexpected request: '+method);
 };
 const handler=createBotHandler({env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service-test'},fetch,uuid:()=>id});
 const request=(text='/report',header='test-secret-'.repeat(4))=>new Request('https://example.supabase.co/functions/v1/hmg-telegram-admin',{method:'POST',headers:header?{'X-Telegram-Bot-Api-Secret-Token':header}:{},body:JSON.stringify({update_id:123,message:{chat:{id:123,type:'private'},from:{id:123},text}})});
 return {handler,request,calls,products,sent};
}
test('webhook rejects missing authentication before touching DB and ignores other owners',async()=>{
 let m=mock();assert.equal((await m.handler(m.request('/report',''))).status,401);assert.equal(m.calls.length,0);
 m=mock({denied:true});assert.equal((await m.handler(m.request())).status,200);assert.equal(m.sent.length,0);
 assert.deepEqual(m.calls,['hmg_catalog_bot_authorize']);
});
test('button creates a fresh report, not a daily delivery claim',async()=>{
 const m=mock();assert.equal((await m.handler(m.request())).status,200);
 assert.equal(m.sent.length,1);assert.match(m.sent[0].text,/Відвідувачі: 5/);
 assert.ok(!m.calls.some(c=>/claim_daily|finish_daily/.test(c)));
});
test('publication transfers photo, inserts once and returns public URL',async()=>{
 const m=mock({state:completed()});assert.equal((await m.handler(m.request('✅ Опублікувати'))).status,200);
 assert.equal(m.products.length,1);assert.match(m.products[0].images[0],/^telegram\/[a-f0-9-]+\/0.jpg$/);
 assert.equal(m.products[0].specs.ram,'16 GB');assert.equal(m.products[0].specs.newArrival,'true');assert.match(m.sent[0].text,/\?product=77/);
 assert.ok(!JSON.stringify(m.products).includes('private-test-token'));
});
test('duplicate updates never insert or upload again; pending replies can recover',async()=>{
 for(const pending of [false,true]){
  const m=mock({duplicate:true,pending});assert.equal((await m.handler(m.request('✅ Опублікувати'))).status,200);
  assert.equal(m.products.length,0);assert.ok(!m.calls.includes('getFile'));assert.equal(m.sent.length,pending?1:0);
 }
});
test('failed photo upload leaves product unpublished and offers retry',async()=>{
 const m=mock({state:completed(),photoFailure:true});
 assert.equal((await m.handler(m.request('✅ Опублікувати'))).status,200);assert.equal(m.products.length,0);
 assert.match(m.sent[0].text,/Не вдалося завантажити/);
});

test('new-arrival choice round-trips through the shared catalog field and can be cleared independently',()=>{
 const draft=completed();
 assert.equal(draft.values.newArrival,'true');
 assert.match(run(draft,'anything').reply.text,/Нове надходження: Так/);
 const marked=toRow({...draft.values,images:[]});
 assert.equal(fromRow(marked).newArrival,'true');
 let edited=run(run(draft,'✏️ Виправити').state,'Нове надходження').state;
 assert.equal(edited.step,'newArrival');
 assert.deepEqual(run(edited,'maybe').state,edited);
 const cleared=run(edited,'Ні').state;
 assert.equal(cleared.step,'preview');
 assert.equal(cleared.values.newArrival,'');
 assert.equal(cleared.values.status,draft.values.status);
 assert.equal(cleared.values.discount,draft.values.discount);
 assert.equal(fromRow(toRow({...cleared.values,images:[]})).newArrival,'');
 assert.match(run(cleared,'anything').reply.text,/Нове надходження: Ні/);
 const legacy={...draft,values:{...draft.values}};
 delete legacy.values.newArrival;
 assert.match(run(legacy,'/resume').reply.text,/Нове надходження: Ні/);
 assert.equal(run(legacy,'✅ Опублікувати').publish,true);
});
test('admin shortcut keeps unfinished product and opens the independent site editor',()=>{
 const draft=completed();
 for(const action of ['⚙️ Адмінка сайту','/admin']){
  const result=run(draft,action);
  assert.deepEqual(result.state,draft);
  assert.equal(result.reply.reply_markup.inline_keyboard[0][0].url,'https://www.hugomedia.pl/?admin');
 }
 assert.ok(MENU.keyboard.flat().includes('⚙️ Адмінка сайту'));
 const resumed=run(draft,'/resume');
 assert.equal(resumed.state.step,'preview');
});
