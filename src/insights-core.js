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
 }
 for(const description of [p.descUk,p.descPl]){
  for(const [field,re] of [['ram',/(?:Оперативна пам[’'ʼ]?ять|ОЗП|Pamięć RAM|RAM)\s*:\s*(\d+)\s*(?:ГБ|GB)/i],['ssd',/(?:Накопичувач|Dysk|Pamięć wbudowana)\s*:\s*(?:SSD\s*)?(\d+)\s*(?:ГБ|GB)/i],['screen',/(?:Екран|Дисплей|Ekran|Wyświetlacz)\s*:\s*(\d+(?:[.,]\d+)?)\s*[\"″”]/i]]){
   const match=String(description||'').match(re),value=parseFloat(String(p[field]||'').replace(',','.'));
   if(match&&Number.isFinite(value)&&Math.abs(Number(match[1].replace(',','.'))-value)>.01)issues.push('mismatch');
  }
 }
 return [...new Set(issues)];
}


export function isStartPath(path) { return /^\/(?:(?:uk|pl)\/)?start\/?$/.test(String(path||'').split(/[?#]/)[0]); }

export function startFunnel(events) {
 const firstStart=new Map();
 for(const e of events){const time=Date.parse(e.created_at);if(e.event_type!=='page_view'||!e.session_id||!isStartPath(e.path)||!Number.isFinite(time))continue;firstStart.set(e.session_id,Math.min(firstStart.get(e.session_id)??Infinity,time));}
 const converted=new Set();
 for(const e of events){const start=firstStart.get(e.session_id),time=Date.parse(e.created_at);if(start!==undefined&&e.event_type==='telegram_click'&&e.destination==='telegram_channel'&&Number.isFinite(time)&&time>=start)converted.add(e.session_id);}
 return {starts:firstStart.size,converted:converted.size,rate:firstStart.size?Math.round(converted.size/firstStart.size*100):0};
}
