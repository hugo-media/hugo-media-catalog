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
