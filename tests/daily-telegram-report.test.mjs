import test from 'node:test';
import assert from 'node:assert/strict';
import {createReportHandler,formatDailyReport,deliveryOutcome} from '../supabase/functions/hmg-daily-report/handler.mjs';
const env={SUPABASE_URL:'https://lukxdctqcaprfwfisblw.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-service',SUPABASE_ANON_KEY:'test-anon'};
const report={reportDate:'2026-10-10',current:{visitors:10,pageViews:20,productViews:12,contactClicks:2,cartAdds:1,productSessions:10,contactSessions:2,topProduct:[49,6]},previous:{},changes:{visitors:25,pageViews:-10},productNames:{top:'PRIME V1'}};
const credentials={configured:true,enabled:true,token:'123:test-only',chatId:'12345',updatedAt:'2026-10-11T08:00:00Z'};
const ok=value=>new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});
function harness({owner=true,configured=true,claim={reportDate:'2026-10-10',leaseId:'00000000-0000-4000-a000-000000000001'},send='ok',privateChat=true,verified=true,dbSave=true}={}){
 const calls=[];const finished=[];
 const fetch=async(url,options={})=>{
  calls.push({url,body:options.body?JSON.parse(options.body):null});
  if(url.endsWith('/auth/v1/user'))return ok({id:'owner-test-id'});
  const name=url.split('/').pop();
  if(name==='hmg_catalog_is_owner')return ok(owner);
  if(name==='hmg_catalog_report_credentials')return ok({...credentials,configured});
  if(name==='getMe')return ok({ok:true,result:{username:'hmg_test_bot'}});
  if(name==='getChat')return ok({ok:true,result:{type:privateChat?'private':'group',id:12345}});
  if(name==='hmg_catalog_report_recipient_verified')return ok(verified);
  if(name==='hmg_catalog_claim_daily_report')return ok(claim);
  if(name==='hmg_catalog_daily_report')return ok(report);
  if(name==='hmg_catalog_finish_daily_report'){
   const value=JSON.parse(options.body);finished.push(value);
   return ok(value.p_status==='sent'?dbSave:true);
  }
  if(name==='sendMessage'){
   if(send==='network')throw Error('https://api.telegram.org/bot123:test-only/sendMessage');
   if(send==='429')return new Response(JSON.stringify({ok:false,error_code:429,parameters:{retry_after:120}}),{status:429});
   if(send==='403')return new Response(JSON.stringify({ok:false,error_code:403,description:'private secret must not leak'}),{status:403});
   return ok({ok:true,result:{message_id:44}});
  }
  throw Error('Unexpected test request '+name);
 };
 return {handler:createReportHandler({env,fetch}),calls,finished};
}
const scheduled=()=>new Request('https://functions.test/hmg-daily-report',{method:'POST',headers:{'Content-Type':'application/json','X-HMG-Cron-Secret':'test-cron'},body:JSON.stringify({action:'scheduled'})});
const manual=action=>new Request('https://functions.test/hmg-daily-report',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test-owner'},body:JSON.stringify({action})});
test('unauthenticated invocation cannot reach database or Telegram',async()=>{
 const h=harness();const r=await h.handler(new Request('https://functions.test',{method:'POST',body:'{"action":"scheduled"}'}));
 assert.equal(r.status,401);assert.equal(h.calls.length,0);
});
test('non-owner cannot test or send private daily reports',async()=>{
 const h=harness({owner:false});const r=await h.handler(manual('send'));
 assert.equal(r.status,403);assert.equal(h.calls.some(x=>/telegram.org/.test(x.url)),false);
});
test('unconfigured daily job neither claims nor sends',async()=>{
 const h=harness({configured:false});const r=await h.handler(scheduled());
 assert.equal((await r.json()).status,'not_configured');assert.equal(h.calls.length,1);
});
test('test verifies a private recipient and previews without sendMessage or claim',async()=>{
 const h=harness();const r=await h.handler(manual('test'));const data=await r.json();
 assert.equal(data.status,'verified');assert.match(data.preview,/10\.10\.2026/);
 assert.equal(h.calls.some(x=>x.url.endsWith('/sendMessage')),false);
 assert.equal(h.calls.some(x=>x.url.endsWith('/hmg_catalog_claim_daily_report')),false);
 assert.equal(JSON.stringify(data).includes(credentials.token),false);
 assert.equal(JSON.stringify(data).includes(credentials.chatId),false);
});
test('already delivered day is skipped before Telegram calls',async()=>{
 const h=harness({claim:null});const r=await h.handler(scheduled());
 assert.equal((await r.json()).status,'already_processed');
 assert.equal(h.calls.some(x=>/telegram.org/.test(x.url)),false);
});
test('private group targets fail during preparation, before sending',async()=>{
 const h=harness({privateChat:false});const r=await h.handler(scheduled());
 assert.equal(r.status,409);assert.equal(h.finished.at(-1).p_status,'failed');
 assert.equal(h.calls.some(x=>x.url.endsWith('/sendMessage')),false);
});
test('successful delivery records message id after marking sending',async()=>{
 const h=harness();const r=await h.handler(scheduled());assert.equal(r.status,200);
 assert.deepEqual(h.finished.map(x=>x.p_status),['sending','sent']);
 assert.equal(h.finished.at(-1).p_message_id,44);
 const sent=h.calls.find(x=>x.url.endsWith('/sendMessage'));
 assert.equal(sent.body.chat_id,credentials.chatId);assert.match(sent.body.text,/Кліки звернення: 2/);
});
test('ambiguous network failure is uncertain and never retried inline',async()=>{
 const h=harness({send:'network'});const r=await h.handler(scheduled());const body=await r.text();
 assert.equal(r.status,502);assert.equal(h.finished.at(-1).p_status,'uncertain');
 assert.equal(h.calls.filter(x=>x.url.endsWith('/sendMessage')).length,1);
 assert.equal(body.includes('test-only'),false);assert.equal(body.includes('telegram.org'),false);
});
test('explicit rate limiting records a durable safe retry delay',async()=>{
 const h=harness({send:'429'});const r=await h.handler(scheduled());
 assert.equal(r.status,503);assert.equal(h.finished.at(-1).p_status,'retry');
 assert.equal(h.finished.at(-1).p_retry_after,120);
});
test('explicit permission denial is a permanent failure with sanitized error',async()=>{
 const h=harness({send:'403'});const r=await h.handler(scheduled());const data=await r.json();
 assert.equal(data.error,'telegram_403');assert.equal(h.finished.at(-1).p_status,'failed');
 assert.equal(JSON.stringify(data).includes('secret'),false);
});
test('unconfirmed persistence after accepted Telegram message is never called successful',async()=>{
 const h=harness({dbSave:false});const r=await h.handler(scheduled());const data=await r.json();
 assert.equal(data.status,'uncertain');assert.equal(data.error,'delivery_log_unconfirmed');
 assert.equal(h.calls.filter(x=>x.url.endsWith('/sendMessage')).length,1);
});
test('report is compact, compares completed days and does not expose raw search text',()=>{
 const text=formatDailyReport({...report,current:{...report.current,topSearch:'private-person@example.com',noResultSearches:2}});
 assert.match(text,/Завершений день/);assert.match(text,/\+25%/);
 assert.match(text,/Кліки не підтверджують покупку/);
 assert.equal(text.includes('private-person'),false);assert.ok(text.length<4096);
});
test('malformed success without message id stays uncertain',()=>{
 assert.deepEqual(deliveryOutcome({ok:true},{ok:true,result:{}}),{status:'uncertain',error:'delivery_unknown'});
});
