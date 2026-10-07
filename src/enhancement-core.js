import { consistencyIssues } from './insights-core.js';
import { csv, effectivePrice } from './core.js';
export const LINK_SLOTS = ['start','catalog','product','footer','floating'];
export const TRUST_SECTIONS = ['warranty','payment','delivery','inspection','returns'];
export function normalizeInvite(value = '') {
 const raw = String(value).trim(); if (!raw) return '';
 try { const u = new URL(raw); if (u.protocol !== 'https:' || u.hostname !== 't.me' || u.username || u.password || u.search || u.hash) return null;
 if (!/^\/(?:\+[A-Za-z0-9_-]{8,}|joinchat\/[A-Za-z0-9_-]{8,}|h_m_g_pl)\/?$/.test(u.pathname)) return null;
 return u.href.replace(/\/$/,''); } catch { return null; }
}
export function validateSettings(value) {
 const links = {}, trust = {};
 for (const key of LINK_SLOTS) { const v = normalizeInvite(value.links?.[key]); if (v === null) throw Error('invalidInvite'); links[key] = v; }
 for (const key of TRUST_SECTIONS) { trust[key] = {}; for (const lang of ['uk','pl']) { const v = String(value.trust?.[key]?.[lang] || '').trim(); if(v.length > 2000) throw Error('validation'); trust[key][lang] = v; } }
 const rawId=value.homepage?.featuredProductId;
 const featuredProductId=rawId==null||rawId===''?null:Number(rawId);
 if(featuredProductId!==null&&(!Number.isSafeInteger(featuredProductId)||featuredProductId<=0||!/^\d+$/.test(String(rawId))))throw Error('validation');
 const featuredLabel={};for(const lang of ['uk','pl']){const label=String(value.homepage?.featuredLabel?.[lang]||'').trim();if(label.length>80)throw Error('validation');featuredLabel[lang]=label;}
 return { links, trust, homepage:{featuredProductId,featuredLabel} };
}
export function publicProduct(p) { return [0,1,2].includes(p.status); }
export function availableProduct(p) { return p.status === 0 && (p.quantity === '' || p.quantity == null || Number(p.quantity) > 0); }
export function selectionIds(value) {
 if (typeof value !== 'string' || value.length > 320) return [];
 return [...new Set(value.split(',').filter(v=>/^[1-9]\d{0,14}$/.test(v)).map(Number).filter(Number.isSafeInteger))].slice(0,20);
}
export function shareSelection(ids, origin) {
 const url = new URL('/', origin); url.searchParams.set('selection', selectionIds(ids.join(',')).join(',')); return url.href;
}
export function rankLaptops(products, { budget, purpose, size }) {
 const ceiling = Number(budget); if (!Number.isFinite(ceiling) || ceiling <= 0) return [];
 return products.filter(p => p.cat === 0 && availableProduct(p) && effectivePrice(p) <= ceiling).map(p => {
  const diagonal = parseFloat(String(p.screen || '').replace(',','.'));
  const sizeMatch = size === 'any' || (Number.isFinite(diagonal) && (size === 'compact' ? diagonal <= 14 : diagonal > 14));
  const ram = parseFloat(p.ram), storage = parseFloat(p.ssd);
  const tagged = csv(p.purposes).includes(purpose);
  const basicFit = ['study','office'].includes(purpose) && ram >= 8 && storage >= 128;
  return { product:p, eligible:sizeMatch && (tagged || basicFit), reasons:[tagged ? 'purpose' : 'basic', 'budget', ...(Number.isFinite(diagonal) ? ['screen'] : []), ...(ram ? ['ram'] : [])], score:(tagged ? 10:0) + Math.min(ram||0,32)/8 + Math.min(storage||0,1024)/512 };
 }).filter(x=>x.eligible).sort((a,b)=>b.score-a.score || effectivePrice(a.product)-effectivePrice(b.product)).slice(0,3);
}
export function laptopHighlights(results, { purpose='', size='any' }={}) {
 const items=Array.isArray(results)?results.filter(item=>item?.product):[];
 if(!items.length)return [];
 if(items.length===1)return [{...items[0],highlights:['match']}];
 const labels=new Map();
 const add=(item,key)=>{
  if(!item?.product)return;
  const current=labels.get(item.product.id)||[];
  if(current.length<2&&!current.includes(key))labels.set(item.product.id,[...current,key]);
 };
 add(items[0],'match');
 const compact=size==='compact'||purpose==='travel';
 const byPrice=[...items].sort((a,b)=>effectivePrice(a.product)-effectivePrice(b.product))[0];
 if(compact){
  const smallest=[...items].filter(item=>Number.isFinite(parseFloat(String(item.product.screen||'').replace(',','.'))))
   .sort((a,b)=>parseFloat(String(a.product.screen).replace(',','.'))-parseFloat(String(b.product.screen).replace(',','.')))[0];
  add(smallest,'compact');
 }
 add(byPrice,'price');
 const byRamValue=[...items].sort((a,b)=>{
  const priceA=effectivePrice(a.product),priceB=effectivePrice(b.product);
  const ramA=parseFloat(a.product.ram)||0,ramB=parseFloat(b.product.ram)||0;
  return (priceB>0?ramB/priceB:-1)-(priceA>0?ramA/priceA:-1);
 })[0];
 add(byRamValue,'ramValue');
 return items.map(item=>({...item,highlights:[...(labels.get(item.product.id)||[])]}));
}

export function productIssues(p, now=Date.now()) {
 const issues=consistencyIssues(p);
 if (!p.images?.length) issues.push('photos');
 if (!/^https:\/\/t\.me\/h_m_g_pl\/\d+$/.test(p.telegramPost||'')) issues.push('post');
 if (!p.warranty) issues.push('warranty');
 if (!p.condition) issues.push('condition');
 if ([0,1,2,4].includes(p.cat) && !p.charger) issues.push('charger');
 if (!String(p.descUk||'').trim()) issues.push('uk');
 if (!String(p.descPl||'').trim()) issues.push('pl');
 if (!p.photoKind) issues.push('photoKind');
 if (p.status === 0 && now - new Date(p.updated_at).getTime() > 30*86400000) issues.push('stale');
 return issues;
}
export function draftValues(formData) {
 const values=Object.fromEntries(formData);
 delete values.password;
 for(const key of ['purposes','benefits','bundles']) values[key]=formData.getAll(key).join(',');
 return values;
}
