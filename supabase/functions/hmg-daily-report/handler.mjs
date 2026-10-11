// Server-only daily reporting. No credentials or Telegram payloads are logged.
export function formatDailyReport(report){
 const s=report.current||{},changes=report.changes||{},clean=value=>String(value||'').replace(/\s+/g,' ').trim().slice(0,100);
 const change=(key)=>Number.isFinite(changes[key])?` (${changes[key]>0?'+':''}${changes[key]}% до попереднього дня)`:'';
 const date=String(report.reportDate||'').split('-').reverse().join('.');
 const findings=[];
 if(s.topProduct&&report.productNames?.top)findings.push(`✅ Найбільше дивились: ${clean(report.productNames.top)}.`);
 if(s.weakProduct&&report.productNames?.weak)findings.push(`⚠️ ${clean(report.productNames.weak)}: ${s.weakProduct.sessions} сесій перегляду, ${s.weakProduct.contactSessions} кліків звернення. Перевір ціну, фото та умови.`);
 if(s.noResultSearches)findings.push(`🔎 ${s.noResultSearches} пошуків без результату. Перевір назви, категорії й наявність.`);
 if(findings.length<3&&s.productSessions>=10){
  const rate=Math.round((s.contactSessions||0)/s.productSessions*100);
  findings.push(`${rate>=5?'✅':'⚠️'} Після перегляду товару звернення натиснули у ${rate}% сесій. ${rate<5?'Перевір помітність кнопки Telegram і доставку.':'Це кліки, а не підтверджені покупки.'}`);
 }
 if(!findings.length)findings.push(s.pageViews?'📌 Даних замало для висновків. Стеж за зверненнями після наступних публікацій.':'📌 За вчора немає зафіксованих відвідувань зі згодою на аналітику.');
 if(findings.length<3&&Number.isFinite(changes.pageViews)&&changes.pageViews<0)findings.push(`⚠️ Переглядів менше на ${Math.abs(changes.pageViews)}%. Перевір останні публікації та посилання.`);
 return [`HUGO MEDIA · звіт за ${date}`,`Завершений день · Europe/Warsaw`,'',
  `👤 Відвідувачі*: ${s.visitors||0}${change('visitors')}`,
  `📊 Перегляди сайту: ${s.pageViews||0}${change('pageViews')}`,
  `🛍 Перегляди товарів: ${s.productViews||0}${change('productViews')}`,
  `📩 Кліки звернення: ${s.contactClicks||0}${change('contactClicks')}`,
  `🛒 Додали у вибір: ${s.cartAdds||0}${change('cartAdds')}`,'',
  ...findings.slice(0,3),'','* Зафіксовані браузери після згоди на аналітику. Кліки не підтверджують покупку.',
  'Адмінка: https://www.hugomedia.pl/?admin'].join('\n');
}

export function deliveryOutcome(response,data){
 if(response?.ok&&data?.ok===true&&Number.isSafeInteger(data?.result?.message_id))
  return {status:'sent',messageId:data.result.message_id};
 if(data?.ok===false&&Number.isInteger(data?.error_code)){
  const code=data.error_code;
  if(code===429||code>=500)return {status:'retry',error:'telegram_'+code,retryAfter:Math.max(60,Math.min(Number(data.parameters?.retry_after)||900,86400))};
  return {status:'failed',error:'telegram_'+code};
 }
 return {status:'uncertain',error:'delivery_unknown'};
}

export function createReportHandler({env={},fetch:fetcher=globalThis.fetch}={}){
 const corsOrigin='https://www.hugomedia.pl';
 return async request=>{
  const origin=request.headers.get('origin');
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
   'Access-Control-Allow-Origin':origin==='https://hugomedia.pl'?origin:corsOrigin,
   'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
   'Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
  const respond=(status,value)=>new Response(JSON.stringify(value),{status,headers});
  if(request.method==='OPTIONS')return respond(200,{ok:true});
  if(request.method!=='POST')return respond(405,{ok:false,error:'method_not_allowed'});
  if(origin&&origin!==corsOrigin&&origin!=='https://hugomedia.pl')return respond(403,{ok:false,error:'origin_not_allowed'});
  const url=String(env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=env.SUPABASE_SERVICE_ROLE_KEY,anon=env.SUPABASE_ANON_KEY;
  if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)||!key||!anon)return respond(503,{ok:false,error:'server_configuration_missing'});
  async function rpc(name,args={},token=key){
   let response,data;
   try{
    response=await fetcher(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:token===key?key:anon,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(10000)});
    data=await response.json();
   }catch{throw Object.assign(new Error('database_unavailable'),{code:'database_unavailable'});}
   if(!response.ok)throw Object.assign(new Error('database_unavailable'),{code:data?.code==='42501'?'not_authorized':'database_unavailable'});
   return data;
  }
  let body;
  try{body=await request.json();}catch{return respond(400,{ok:false,error:'invalid_request'});}
  const action=body?.action||'scheduled';
  if(!['scheduled','test','send'].includes(action))return respond(400,{ok:false,error:'invalid_action'});
  let ownerId=null,cronSecret=null;
  try{
   if(action==='scheduled'){
    cronSecret=request.headers.get('x-hmg-cron-secret');
    if(!cronSecret)return respond(401,{ok:false,error:'not_authorized'});
   }else{
    const bearer=request.headers.get('authorization')||'';
    if(!/^Bearer [^\s]+$/.test(bearer))return respond(401,{ok:false,error:'not_authorized'});
    const token=bearer.slice(7);
    let userResponse,user;
    try{userResponse=await fetcher(url+'/auth/v1/user',{headers:{apikey:anon,Authorization:bearer},signal:AbortSignal.timeout(10000)});user=await userResponse.json();}
    catch{return respond(503,{ok:false,error:'authentication_unavailable'});}
    if(!userResponse.ok||!user?.id)return respond(401,{ok:false,error:'not_authorized'});
    if(await rpc('hmg_catalog_is_owner',{},token)!==true)return respond(403,{ok:false,error:'owner_required'});
    ownerId=user.id;
   }
   const credentials=await rpc('hmg_catalog_report_credentials',{p_cron_secret:cronSecret,p_owner_id:ownerId});
   if(!credentials?.configured)return respond(action==='scheduled'?200:409,{ok:action==='scheduled',status:'not_configured',error:action==='scheduled'?undefined:'bot_and_chat_required'});
   if(action!=='test'&&!credentials.enabled)return respond(200,{ok:true,status:'disabled'});
   const claim=action==='test'?null:await rpc('hmg_catalog_claim_daily_report',{});
   if(action!=='test'&&!claim)return respond(200,{ok:true,status:'already_processed'});
   const finish=(status,error=null,messageId=null,retryAfter=900)=>rpc('hmg_catalog_finish_daily_report',{
    p_report_date:claim.reportDate,p_lease_id:claim.leaseId,p_status:status,p_error:error,
    p_message_id:messageId,p_retry_after:retryAfter,p_config_updated_at:credentials.updatedAt});
   async function telegram(method,values){
    try{
     const response=await fetcher('https://api.telegram.org/bot'+credentials.token+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values),signal:AbortSignal.timeout(12000)});
     let data;try{data=await response.json();}catch{data=null;}
     return {response,data};
    }catch{return {response:null,data:null};}
   }
   const [bot,chat]=await Promise.all([telegram('getMe',{}),telegram('getChat',{chat_id:credentials.chatId})]);
   if(!bot.response?.ok||bot.data?.ok!==true||!chat.response?.ok||chat.data?.ok!==true){
    if(claim){
     const code=bot.data?.ok===false?bot.data.error_code:chat.data?.ok===false?chat.data.error_code:null;
     const retry=code==null||code===429||code>=500;
     await finish(retry?'retry':'failed','telegram_verification_failed').catch(()=>{});
    }
    return respond(502,{ok:false,error:'telegram_verification_failed'});
   }
   if(chat.data.result?.type!=='private'||String(chat.data.result?.id)!==String(credentials.chatId)){
    if(claim)await finish('failed','private_chat_required').catch(()=>{});
    return respond(409,{ok:false,error:'private_chat_required'});
   }
   const verified=await rpc('hmg_catalog_report_recipient_verified',{p_config_updated_at:credentials.updatedAt,p_bot_username:bot.data.result?.username||null});
   if(!verified)return respond(409,{ok:false,error:'settings_changed'});
   if(action==='test'){
    const report=await rpc('hmg_catalog_daily_report',{});
    return respond(200,{ok:true,status:'verified',botUsername:bot.data.result?.username||null,preview:formatDailyReport(report)});
   }

   let report;
   try{report=await rpc('hmg_catalog_daily_report',{p_report_date:claim.reportDate});}
   catch{
    await finish('retry','metrics_unavailable').catch(()=>{});
    return respond(503,{ok:false,status:'retry',error:'metrics_unavailable'});
   }
   if(!await finish('sending'))return respond(409,{ok:false,error:'claim_or_settings_changed'});
   const result=await telegram('sendMessage',{chat_id:credentials.chatId,text:formatDailyReport(report),link_preview_options:{is_disabled:true}});
   const outcome=deliveryOutcome(result.response,result.data);
   let recorded=false;
   try{recorded=await finish(outcome.status,outcome.error||null,outcome.messageId||null,outcome.retryAfter||900);}
   catch{}
   if(!recorded)return respond(503,{ok:false,status:'uncertain',error:'delivery_log_unconfirmed'});
   return respond(outcome.status==='sent'?200:outcome.status==='retry'?503:502,{
    ok:outcome.status==='sent',status:outcome.status,reportDate:claim.reportDate,
    error:outcome.error});
  }catch(error){
   const code=error?.code==='not_authorized'?'not_authorized':'database_unavailable';
   return respond(code==='not_authorized'?403:503,{ok:false,error:code});
  }
 };
}
