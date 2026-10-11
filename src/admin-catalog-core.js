import {MAX_DISCOUNT_PERCENT,discountPercent,effectivePrice} from './core.js';

export function normalizeQuickFields(fields) {
 const fail=field=>{const e=Error('validation');e.field=field;throw e;};
 if(!fields||typeof fields!=='object'||Array.isArray(fields)||!Object.keys(fields).length)fail('fields');
 const out={};
 for(const [key,value] of Object.entries(fields)){
  if(['price','discount','quantity','status'].includes(key)){
   if(value===null||typeof value==='boolean'||!String(value).trim())fail(key);
   const n=Number(String(value).trim().replace(',','.'));
   if(!Number.isFinite(n)||n<0)fail(key);
   if(key==='price'){if(n>10000000)fail(key);out.price=Math.round(n*100)/100;}
   else {const max=key==='discount'?MAX_DISCOUNT_PERCENT:key==='quantity'?99:5;if(!Number.isInteger(n)||n>max)fail(key);out[key]=n;}
  }else if(['newArrival','bestseller'].includes(key)){
   if(!['','true'].includes(value))fail(key);out[key]=value;
  }else fail(key);
 }
 return out;
}

export function quickValue(product,key) {
 if(key==='quantity')return product.quantity===''||product.quantity==null?1:Number(product.quantity);
 if(key==='discount')return discountPercent(product);
 if(key==='newArrival'||key==='bestseller')return product[key]==='true'?'true':'';
 return Number(product[key]);
}

export function quickPricePreview(product,fields) {
 const normalized=normalizeQuickFields(fields);
 const changesPrice=['price','discount'].some(key=>Object.hasOwn(normalized,key)&&normalized[key]!==quickValue(product,key));
 return {...product,...normalized,...(changesPrice?{salePrice:''}:{})};
}

export function planQuickChanges(products,ids,fields) {
 const normalized=normalizeQuickFields(fields);
 if(!Array.isArray(ids)||!ids.length||ids.length>100||new Set(ids).size!==ids.length||ids.some(id=>!Number.isSafeInteger(id)||id<1))throw Error('validation');
 const byId=new Map(products.map(p=>[p.id,p]));
 return ids.flatMap(id=>{
  const p=byId.get(id);if(!p||!p.updated_at||!Number.isFinite(Date.parse(p.updated_at)))throw Error('editConflict');
  const changes=Object.fromEntries(Object.entries(normalized).filter(([key,value])=>quickValue(p,key)!==value));
  return Object.keys(changes).length?[{id,expected_updated_at:p.updated_at,fields:changes}]:[];
 });
}

export function filterAdminProducts(products,filters={}) {
 const normalized=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('uk').trim();
 const terms=normalized(filters.search).split(/\s+/).filter(Boolean);
 const rows=products.filter(p=>{
  if(filters.category!==''&&filters.category!=null&&Number(p.cat)!==Number(filters.category))return false;
  if(filters.status!==''&&filters.status!=null&&Number(p.status)!==Number(filters.status))return false;
  if(filters.mark==='new'&&p.newArrival!=='true')return false;
  if(filters.mark==='best'&&p.bestseller!=='true')return false;
  if(filters.mark==='discount'&&!discountPercent(p))return false;
  if(filters.mark==='empty'&&quickValue(p,'quantity')>0)return false;
  const haystack=normalized([p.name,p.brand,String(p.id),'HMG-'+String(p.id).padStart(3,'0')].join(' '));
  return terms.every(term=>haystack.includes(term));
 });
 return rows.sort((a,b)=>{
  if(filters.sort==='priceAsc')return effectivePrice(a)-effectivePrice(b)||b.id-a.id;
  if(filters.sort==='priceDesc')return effectivePrice(b)-effectivePrice(a)||b.id-a.id;
  if(filters.sort==='name')return String(a.name).localeCompare(String(b.name),'uk')||b.id-a.id;
  return (Date.parse(b.updated_at)||0)-(Date.parse(a.updated_at)||0)||b.id-a.id;
 });
}
