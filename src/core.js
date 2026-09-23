export const TABLE = 'hmg_catalog_products';
export const BUCKET = 'hmg-catalog-photos';
export const MAX_IMAGES = 8;
export const SPEC_KEYS = ['cpu','generation','ram','ssd','gpu','screen','battery','os','type','resolution','hz','sim','gps','lte','compatibility','noise','newArrival','bestseller','discount','telegramPost','quantity','purposes','benefits','bundles'];
export const DISCOUNTS = [0,5,10,15,20,25,30];
export const TELEGRAM_CHANNEL = 'https://t.me/h_m_g_pl';
export const PURPOSES = ['study','office','programming','editing','gaming','travel'];
export const BENEFITS = ['tested','metal','battery','keyboard','touch','light','gradeA'];
export const BUNDLES = {mouse:45,office:200,photoshop:200,software:0,setup:50,upgrade:0};
export function csv(value=''){return [...new Set(String(value||'').split(',').map(v=>v.trim()).filter(Boolean))];}
export function discountPercent(p){const value=Number(p?.discount||0);return DISCOUNTS.includes(value)?value:0;}
export function effectivePrice(p){return Math.round(Number(p.price)*(100-discountPercent(p)))/100;}
export function normalizeTelegramPost(value=''){
 const raw=String(value||'').trim();if(!raw)return '';
 try{const url=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);const host=url.hostname.toLowerCase().replace(/^www\./,'');let path=url.pathname.replace(/^\/s\//,'/').replace(/\/+$/,'');if(!['t.me','telegram.me'].includes(host)||!/^\/h_m_g_pl(?:\/\d+)?$/.test(path)||url.username||url.password)return null;return `https://t.me${path}`;}catch{return null;}
}
export function validTelegramPost(value=''){return normalizeTelegramPost(value)!==null;}
export function telegramPostUrl(value=''){return normalizeTelegramPost(value)||TELEGRAM_CHANNEL;}
export function validateProduct(p){
 if(!String(p.name||'').trim()||!String(p.brand||'').trim())throw Error('validation');
 if(String(p.name).length>180||String(p.brand).length>80)throw Error('validation');
 if(!Number.isFinite(Number(p.price))||Number(p.price)<0||Number(p.price)>10000000)throw Error('validation');
 if(!Number.isInteger(Number(p.cat))||Number(p.cat)<0||Number(p.cat)>5)throw Error('validation');
 if(!Number.isInteger(Number(p.status))||Number(p.status)<0||Number(p.status)>3)throw Error('validation');
 if(!DISCOUNTS.includes(Number(p.discount||0)))throw Error('validation');
 if(!['','true'].includes(String(p.newArrival||'')))throw Error('validation');
 if(!['','true'].includes(String(p.bestseller||'')))throw Error('validation');
 if(!validTelegramPost(p.telegramPost))throw Error('validation');
 const quantity=p.quantity===''||p.quantity==null?1:Number(p.quantity);if(!Number.isInteger(quantity)||quantity<0||quantity>99)throw Error('validation');
 if(csv(p.purposes).some(v=>!PURPOSES.includes(v))||csv(p.benefits).some(v=>!BENEFITS.includes(v))||csv(p.bundles).some(v=>!(v in BUNDLES)))throw Error('validation');
 if((p.images||[]).length>MAX_IMAGES)throw Error('validation');
 for(const k of ['descUk','descPl'])if(String(p[k]||'').length>10000)throw Error('validation');
}
export function toRow(p){validateProduct(p);return {name:p.name.trim(),brand:p.brand.trim(),cat:Number(p.cat),status:Number(p.status),price:Math.round(Number(p.price)*100)/100,condition:String(p.condition||''),warranty:String(p.warranty||''),desc_uk:String(p.descUk||''),desc_pl:String(p.descPl||''),images:p.images||[],specs:Object.fromEntries(SPEC_KEYS.map(k=>[k,k==='telegramPost'?normalizeTelegramPost(p[k]):String(p[k]||'').trim()]))};}
export function fromRow(r){return {...r,...r.specs,price:Number(r.price),descUk:r.desc_uk||'',descPl:r.desc_pl||'',images:Array.isArray(r.images)?r.images:[]};}
export function reconcileCart(ids,products){return [...new Set(ids)].filter(id=>products.some(p=>p.id===id&&p.status===0&&(p.quantity===''||p.quantity==null||Number(p.quantity)>0)));}
export function orderText(items,lang='uk',origin='',bundleSelections={}){
 const lines=[lang==='pl'?'Dzień dobry! Interesują mnie te produkty:':'Вітаю! Цікавлять ці товари:'];
 for(const p of items){lines.push(`• ${p.name} / HMG-${String(p.id).padStart(3,'0')} — ${effectivePrice(p).toFixed(2)} zł${discountPercent(p)?` (-${discountPercent(p)}%)`:''}`);const extras=csv(bundleSelections[p.id]).filter(k=>k in BUNDLES);for(const key of extras)lines.push(`  + ${bundleLabel(key,lang)}${BUNDLES[key]?` — ${BUNDLES[key]} zł`:''}`);if(origin)lines.push(`${origin}/?product=${p.id}`);}
 const total=Math.round(items.reduce((s,p)=>s+Math.round(effectivePrice(p)*100)+csv(bundleSelections[p.id]).reduce((x,k)=>x+(BUNDLES[k]||0)*100,0),0));
 lines.push(`${lang==='pl'?'Razem':'Разом'}: ${(total/100).toFixed(2)} zł`);
 lines.push(lang==='pl'?'Proszę o potwierdzenie dostępności.':'Прошу підтвердити наявність.');return lines.join('\n');
}
export function bundleLabel(key,lang='uk'){const labels={uk:{mouse:'Мишка',office:'Встановлення Microsoft Office',photoshop:'Встановлення Adobe Photoshop',software:'Інші програми — за запитом',setup:'Налаштування Windows',upgrade:'Апгрейд RAM/SSD — узгодити'},pl:{mouse:'Mysz',office:'Instalacja Microsoft Office',photoshop:'Instalacja Adobe Photoshop',software:'Inne programy — na zapytanie',setup:'Konfiguracja Windows',upgrade:'Rozbudowa RAM/SSD — do ustalenia'}};return labels[lang]?.[key]||key;}
export function telegramLink(text){return `https://t.me/HUGO_Media?text=${encodeURIComponent(text)}`;}
export function publicConfigValid(c){
 try { const url=new URL(c.supabaseUrl);if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.pathname!=='/'||url.search||url.hash||url.username||url.password)return false;
 const key=c.supabaseKey||'';if(key.startsWith('sb_publishable_'))return key.length>25;
 const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return payload.role==='anon';
 }catch{return false;}
}
