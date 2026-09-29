// Searches are analytics, never customer contact details.
export function safeSearch(value) {
 const text=String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
 if(text.length<2 || text.length>80 || /@|https?:|www\.|\d[\d\s()+-]{7,}\d/.test(text)) return '';
 return text;
}
export function journey(events, product='') {
 const sessions=new Map();
 for(const e of events){if(!e.session_id)continue;const a=sessions.get(e.session_id)||[];a.push(e);sessions.set(e.session_id,a);}
 const result={visits:0,views:0,cart:0,orders:0,direct:0,channel:0};
 for(const rows of sessions.values()){
  rows.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const relevant=e=>!product||String(e.product_id)===String(product);
  if(product&&!rows.some(e=>relevant(e)&&e.event_type==='product_view'))continue;
  if(rows.some(e=>e.event_type==='page_view'))result.visits++;
  let viewed=false,added=false,ordered=false,direct=false;
  for(const e of rows){if(!relevant(e))continue;
   if(e.event_type==='product_view')viewed=true;
   if(viewed&&e.event_type==='cart_add')added=true;
   if(viewed&&e.event_type==='telegram_click'&&e.destination==='telegram_order'){direct=true;if(added)ordered=true;}
  }
  result.views+=+viewed;result.cart+=+added;result.orders+=+ordered;result.direct+=+direct;
  if(rows.some(e=>e.event_type==='telegram_click'&&e.destination==='telegram_channel'))result.channel++;
 }
 return result;
}
export function missedSearches(events){
 const groups=new Map();for(const e of events){if(e.event_type!=='search_no_results')continue;const term=safeSearch(e.destination);if(!term)continue;const key=term+'|'+e.placement;const row=groups.get(key)||{term,filtered:e.placement==='filtered',count:0,visitors:new Set()};row.count++;if(e.visitor_id)row.visitors.add(e.visitor_id);groups.set(key,row);}
 return [...groups.values()].sort((a,b)=>b.count-a.count).slice(0,30);
}
export function consistencyIssues(p){
 const issues=[];if(!Number.isFinite(Number(p.price))||Number(p.price)<=0)issues.push('price');
 if(p.status===0&&p.quantity!==''&&p.quantity!=null&&Number(p.quantity)<=0)issues.push('stock');
 for(const [field,re] of [['ram',/(\d+)\s*(?:gb\s*ram|гб\s*(?:ram|озп)|ram)/i],['ssd',/(\d+)\s*(?:gb\s*ssd|гб\s*ssd|ssd)/i],['screen',/(\d+(?:[.,]\d+)?)\s*["″”]/]]){
 const match=String(p.name||'').match(re);const n=parseFloat(String(p[field]||'').replace(',','.'));if(match&&Number.isFinite(n)&&Math.abs(Number(match[1].replace(',','.'))-n)>.01)issues.push('mismatch');
 }return [...new Set(issues)];
}

export function reportMetrics(events) {
 const rows=Array.isArray(events)?events:[],
  pageViews=rows.filter(e=>e.event_type==='page_view'),
  productViews=rows.filter(e=>e.event_type==='product_view'),
  contacts=rows.filter(e=>e.event_type==='telegram_click'&&['telegram_order','telegram_cart_order','telegram_contact'].includes(e.destination)),
  carts=rows.filter(e=>e.event_type==='cart_add'),
  viewed=new Set(productViews.map(e=>e.session_id).filter(Boolean)),
  contacted=new Set(contacts.map(e=>e.session_id).filter(Boolean)),
  sources=new Map(),products=new Map(),productFunnel=new Map();
 for(const e of pageViews){const k=e.traffic_source||'direct';sources.set(k,(sources.get(k)||0)+1);}
 for(const e of productViews){
  const id=Number(e.product_id);if(!Number.isFinite(id)||id<=0)continue;
  products.set(id,(products.get(id)||0)+1);
  const row=productFunnel.get(id)||{sessions:new Set(),contacts:new Set(),views:0};
  row.views++;if(e.session_id)row.sessions.add(e.session_id);productFunnel.set(id,row);
 }
 for(const e of contacts){
  const id=Number(e.product_id),row=productFunnel.get(id);
  if(row&&e.session_id)row.contacts.add(e.session_id);
 }
 const topSource=[...sources].sort((a,b)=>b[1]-a[1])[0]||null,
  topProduct=[...products].sort((a,b)=>b[1]-a[1])[0]||null,
  weakProduct=[...productFunnel].map(([id,row])=>{
   const sessions=row.sessions.size, contactSessions=[...row.sessions].filter(s=>row.contacts.has(s)).length;
   return {id,views:row.views,sessions,contactSessions,rate:sessions?Math.round(contactSessions/sessions*100):0};
  }).filter(p=>p.sessions>=5&&p.rate<5).sort((a,b)=>a.rate-b.rate||b.sessions-a.sessions)[0]||null,
  misses=rows.filter(e=>e.event_type==='search_no_results');
 return {
  pageViews:pageViews.length,visitors:new Set(pageViews.map(e=>e.visitor_id).filter(Boolean)).size,
  productViews:productViews.length,cartAdds:carts.length,contactClicks:contacts.length,
  productSessions:viewed.size,contactSessions:[...viewed].filter(id=>contacted.has(id)).length,
  noResultSearches:misses.length,topSource,topProduct,weakProduct,topSearch:missedSearches(misses)[0]?.term||''
 };
}
export function compareReportMetrics(currentEvents, previousEvents) {
 const current=reportMetrics(currentEvents),previous=reportMetrics(previousEvents),keys=['visitors','pageViews','productViews','contactClicks','cartAdds'];
 const changes=Object.fromEntries(keys.map(key=>[key,previous[key]===0?(current[key]===0?0:null):Math.round((current[key]-previous[key])/previous[key]*100)]));
 return {current,previous,changes};
}
