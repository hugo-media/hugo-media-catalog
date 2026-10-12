import test from 'node:test';
import assert from 'node:assert/strict';
import {transition,openManagedProduct,productSearchResult,MENU} from '../supabase/functions/hmg-telegram-admin/bot-core.mjs';
import {createBotHandler} from '../supabase/functions/hmg-telegram-admin/handler.mjs';
import {toRow} from '../src/core.js';
const uuid='12345678-1234-4234-8234-123456789012';
const row={id:51,name:'JBL Quantum Stream',brand:'JBL',cat:3,status:0,price:200,condition:'Вживаний',warranty:'12 місяців',desc_uk:'Справний',desc_pl:'Sprawny',images:['old/site-photo.jpg'],specs:{deviceType:'microphone',quantity:'1',discount:'0',newArrival:'true',bestseller:'',connection:'USB-C',sampleRate:'48 kHz',seoTitleUk:'Мікрофон JBL',futureField:'preserve'}};
const opened=()=>openManagedProduct({product:structuredClone(row),fingerprint:'a'.repeat(32)},uuid).state;
const run=(s,text,more={})=>transition(s,{text,...more},uuid);
test('management search uses names, exact product buttons and pagination',()=>{
 assert.ok(MENU.keyboard.flat().includes('🔎 Керувати товарами'));
 let state=run({},'/products').state;assert.equal(state.step,'manageSearch');
 assert.deepEqual(run(state,'JBL').lookup,{query:'JBL',offset:0});
 const result=productSearchResult({items:[row],hasMore:true},'JBL',0);
 assert.equal(run(result.state,result.state.results[0].label).openProduct,51);
 assert.deepEqual(run(result.state,'Далі ➡️').lookup,{query:'JBL',offset:6});
 assert.equal(run(result.state,'🔎 Інший пошук').state.step,'manageSearch');
 assert.match(productSearchResult({items:[]},'nothing').reply.text,/Нічого не знайдено/);
 assert.match(run({step:'price',values:{}},'/products').reply.text,/незавершені/);
});
test('editing price, discount, flags and status requires explicit save and preserves other fields',()=>{
 let s=opened();
 s=run(s,'Ціна').state;s=run(s,'250').state;
 assert.equal(s.step,'preview');assert.equal(s.values.price,250);
 assert.equal(s.values.sampleRate,'48 kHz');assert.equal(s.values.seoTitleUk,'Мікрофон JBL');
 s.values.salePrice='190';
 s=run(run(s,'Знижка').state,'20').state;
 assert.equal(s.values.salePrice,'');assert.equal(s.values.discount,'20');
 assert.equal(toRow({...s.values,images:row.images}).specs.discount,'20');
 s=run(run(s,'Бестселер').state,'Так').state;assert.equal(s.values.bestseller,'true');
 s=run(run(s,'Нове надходження').state,'Ні').state;assert.equal(s.values.newArrival,'');
 s=run(run(s,'Наявність').state,'Очікується').state;assert.equal(s.values.status,5);
 const saved=run(s,'💾 Зберегти зміни');assert.equal(saved.saveExisting,true);assert.equal(saved.publish,undefined);
 assert.equal(run(s,'✅ Опублікувати').publish,undefined);
 assert.match(run(s,'❌ Скасувати').reply.text,/без змін/);
});
test('photos retain site paths and accept replacement without re-uploading originals',()=>{
 let s=opened();assert.equal(s.photos[0].path,'old/site-photo.jpg');
 s=run(s,'Фото').state;
 s=run(s,'',{photo:{fileId:'new-id',uniqueId:'new',size:4}}).state;
 assert.equal(s.photos.length,2);
 s=run(s,'➖ Прибрати останнє фото').state;assert.equal(s.photos.length,1);
 s=run(s,'🗑 Очистити фото').state;s=run(s,'✅ Фото додано').state;
 assert.equal(run(s,'💾 Зберегти зміни').saveExisting,undefined);
 s=run(run(s,'Наявність').state,'Чернетка').state;assert.equal(run(s,'💾 Зберегти зміни').saveExisting,true);
});
test('delete requires a separate confirmation containing exact product code',()=>{
 const s=opened();
 assert.equal(run(s,'ВИДАЛИТИ HMG-051').remove,undefined);
 const confirm=run(s,'🗑 Видалити товар').state;
 assert.equal(confirm.step,'confirmDelete');
 assert.equal(run(confirm,'Так').remove,undefined);assert.equal(run(confirm,'ВИДАЛИТИ HMG-052').remove,undefined);
 assert.equal(run(confirm,'ВИДАЛИТИ HMG-051').remove,true);
 assert.equal(run(confirm,'⬅️ Назад').state.step,'preview');
 assert.equal(run(confirm,'❌ Скасувати').remove,undefined);
});
test('category changes request the subtype and remove invalid computer upgrades',()=>{
 let s=opened();s.values.cat=0;s.values.deviceType='laptop';s.values.ram16Enabled='true';s.values.ram16Price='100';s.values.ram='8 GB';s.values.ssd='256 GB';s.values.extraStorageType='HDD';s.values.extraStorageCapacity='1';s.values.extraStorageUnit='TB';
 s=run(run(s,'✏️ Виправити').state,'Категорія').state;
 s=run(s,'Смартдевайси').state;assert.equal(s.step,'deviceType');
 s=run(s,'Розумні окуляри').state;
 assert.equal(s.step,'preview');assert.equal(s.values.deviceType,'glasses');assert.equal(s.values.ram16Enabled,undefined);assert.equal(s.values.extraStorageType,undefined);
});
test('invalid input preserves editor and reports keep pending changes',()=>{
 const s=run(opened(),'Ціна').state;
 assert.deepEqual(run(s,'oops').state,s);
 assert.deepEqual(run(s,'/report').state,s);
 assert.match(run(s,'/resume').reply.text,/базову ціну/);
});
function mock(state={},conflict=false){
 const calls=[],writes=[],sent=[];
 const json=x=>new Response(JSON.stringify(x));
 const fetch=async(url,opt={})=>{
  const method=url.split('/').at(-1),body=typeof opt.body==='string'?JSON.parse(opt.body):opt.body;
  calls.push(method);
  if(method==='hmg_catalog_bot_authorize')return json({token:'test-token'});
  if(method==='hmg_catalog_bot_context')return json({version:2,state});
  if(method==='hmg_catalog_bot_products')return json({items:[row],hasMore:false});
  if(method==='hmg_catalog_bot_product')return json({product:row,fingerprint:'a'.repeat(32)});
  if(method==='hmg_catalog_bot_manage_commit'){writes.push(body);return json({reply:conflict?{text:'Товар змінили в адмінці',reply_markup:MENU}:body.p_reply});}
  if(method==='hmg_catalog_bot_commit')return json({reply:body.p_reply});
  if(method==='hmg_catalog_bot_delivered')return new Response(null,{status:204});
  if(method==='sendMessage'){sent.push(body);return json({ok:true,result:{message_id:2}});}
  throw Error('Unexpected '+method);
 };
 const handler=createBotHandler({env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test'},fetch,uuid:()=>uuid});
 const request=text=>new Request('https://example.supabase.co/functions/v1/hmg-telegram-admin',{method:'POST',headers:{'x-telegram-bot-api-secret-token':'test-secret-'.repeat(4)},body:JSON.stringify({update_id:444,message:{chat:{type:'private',id:123},from:{id:123},text}})});
 return {handler,request,calls,writes,sent};
}
test('handler loads current product through authenticated RPC',async()=>{
 const results=productSearchResult({items:[row]},'',0);
 const m=mock(results.state);
 assert.equal((await m.handler(m.request(results.state.results[0].label))).status,200);
 assert.ok(m.calls.includes('hmg_catalog_bot_product'));
 assert.match(m.sent[0].text,/HMG-051/);
});
test('handler updates same product atomically and preserves existing images and unknown specs',async()=>{
 const m=mock(opened());assert.equal((await m.handler(m.request('💾 Зберегти зміни'))).status,200);
 assert.equal(m.writes.length,1);assert.equal(m.writes[0].p_action,'update');
 assert.equal(m.writes[0].p_product.specs.futureField,'preserve');
 assert.deepEqual(m.writes[0].p_product.images,row.images);assert.ok(!m.calls.includes('getFile'));
});
test('handler returns conflict instead of a false success message',async()=>{
 const m=mock(opened(),true);await m.handler(m.request('💾 Зберегти зміни'));
 assert.match(m.sent[0].text,/Товар змінили/);assert.doesNotMatch(m.sent[0].text,/✅/);
});
test('handler deletion uses the confirmed session and never removes image files',async()=>{
 const m=mock(run(opened(),'🗑 Видалити товар').state);
 assert.equal((await m.handler(m.request('ВИДАЛИТИ HMG-051'))).status,200);
 assert.equal(m.writes[0].p_action,'delete');assert.equal(m.writes[0].p_product,null);
 assert.ok(!m.calls.some(x=>x.includes('storage')));
});
