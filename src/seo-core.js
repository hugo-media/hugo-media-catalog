import { effectivePrice, BUCKET } from './core.js';
export const ORIGIN = 'https://www.hugomedia.pl';
export const categories = ['laptops','phones','tablets','headphones','smartwatches','monitors'];
export const labels = {
  uk: ['Ноутбуки','Телефони','Планшети','Навушники','Смартгодинники','Монітори'],
  pl: ['Laptopy','Telefony','Tablety','Słuchawki','Smartwatche','Monitory'],
};
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeJson = value => JSON.stringify(value).replace(/</g,'\\u003c');
export const slug = name => String(name || 'product').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'') || 'product';
export const productPath = (p, lang='uk') => `/${lang}/product/${p.id}-${slug(p.name)}`;
export const catalogPath = (lang='uk',cat=-1) => `/${lang}/catalog${categories[cat] ? '/'+categories[cat] : ''}`;
export function parseRoute(pathname) {
  const parts=pathname.split('/').filter(Boolean);
  const lang=['uk','pl'].includes(parts[0]) ? parts.shift() : null;
  if (!lang) return {lang:null,view:pathname==='/'?'home':pathname==='/start'?'start':'notFound',cat:-1};
  if (!parts.length) return {lang,view:'home',cat:-1};
  if (parts.length===1 && parts[0]==='start') return {lang,view:'start',cat:-1};
  if (parts[0]==='catalog' && parts.length<=2 && (!parts[1]||categories.includes(parts[1]))) return {lang,view:'catalog',cat:parts[1]?categories.indexOf(parts[1]):-1};
  const match=parts.length===2 && parts[0]==='product' && /^([1-9]\d*)(?:-[a-z0-9-]+)?$/.exec(parts[1]);
  if(match && Number.isSafeInteger(Number(match[1]))) return {lang,view:'detail',id:Number(match[1]),cat:-1};
  return {lang,view:'notFound',cat:-1};
}
export function pagePath({lang='uk',view,cat=-1,product}) {
  if(view==='detail' && product) return productPath(product,lang);
  if(view==='catalog') return catalogPath(lang,cat);
  if(view==='start') return `/${lang}/start`;
  return `/${lang}/`;
}
export function imageUrl(path,base) {
  if(!path || !base) return '';
  if(/^https:\/\//.test(path)) return path;
  return `${base}/storage/v1/object/public/${BUCKET}/${String(path).split('/').map(encodeURIComponent).join('/')}`;
}
export function metadata({lang='uk',view='home',cat=-1,product,base='',noindex=false}) {
  const pl=lang==='pl',path=pagePath({lang,view,cat,product});
  const description=product ? String((pl?product.descPl:product.descUk)||product.name).replace(/\s+/g,' ').trim().slice(0,170)
    : view==='start' ? (pl?'Hugo Media: katalog elektroniki, kanał Telegram i kontakt.':'Hugo Media: каталог техніки, Telegram-канал і зв’язок із нами.')
    : `${cat>=0?labels[lang][cat]+'. ':''}${pl?'Elektronika w Polsce. Porównaj laptopy, telefony i inne urządzenia. Aktualne ceny w złotych, parametry i kontakt przez Telegram.':'Техніка в Польщі. Порівнюй ноутбуки, телефони та інші пристрої. Актуальні ціни у злотих, характеристики й консультація в Telegram.'}`;
  const title=product ? `${product.name} — Hugo Media` : `${cat>=0?labels[lang][cat]:pl?'Katalog elektroniki w Polsce':'Каталог техніки в Польщі'} — Hugo Media`;
  const url=ORIGIN+path,image=product?.images?.length?imageUrl(product.images[0],base):'';
  const graph=[{'@type':'Organization','@id':ORIGIN+'/#organization',name:'Hugo Media',url:ORIGIN,sameAs:['https://t.me/h_m_g_pl']},
    {'@type':'WebSite','@id':ORIGIN+'/#website',url:ORIGIN,name:'Hugo Media',inLanguage:['uk','pl'],publisher:{'@id':ORIGIN+'/#organization'}}];
  if(product) {
    const qty=product.quantity===''||product.quantity==null?1:Number(product.quantity);
    const item={'@type':'Product','@id':url+'#product',name:product.name,description,url,sku:`HMG-${String(product.id).padStart(3,'0')}`,
      ...(product.brand?{brand:{'@type':'Brand',name:product.brand}}:{}),
      ...(image?{image:product.images.map(p=>imageUrl(p,base))}:{}),
      offers:{'@type':'Offer',url,priceCurrency:'PLN',price:effectivePrice(product).toFixed(2),availability:'https://schema.org/'+(Number(product.status)===0&&qty>0?'InStock':'OutOfStock'),seller:{'@id':ORIGIN+'/#organization'}}};
    graph.push(item,{'@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:pl?'Katalog':'Каталог',item:ORIGIN+catalogPath(lang)},
      {'@type':'ListItem',position:2,name:labels[lang][product.cat],item:ORIGIN+catalogPath(lang,product.cat)},
      {'@type':'ListItem',position:3,name:product.name,item:url}]});
  }
  return {lang,title,description,url,image,noindex:noindex||!['home','catalog','detail','start'].includes(view),
    alternates:['uk','pl'].map(l=>({lang:l,url:ORIGIN+pagePath({lang:l,view,cat,product})})),
    schema:{'@context':'https://schema.org','@graph':graph}};
}
export function headMarkup(meta) {
  const E=escapeHtml;
  return `<title>${E(meta.title)}</title><meta name="description" content="${E(meta.description)}"><meta name="robots" content="${meta.noindex?'noindex,follow':'index,follow,max-image-preview:large'}"><link rel="canonical" href="${E(meta.url)}">`+
    meta.alternates.map(a=>`<link rel="alternate" hreflang="${a.lang}" href="${E(a.url)}">`).join('')+
    `<link rel="alternate" hreflang="x-default" href="${E(meta.alternates[0].url)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Hugo Media"><meta property="og:title" content="${E(meta.title)}"><meta property="og:description" content="${E(meta.description)}"><meta property="og:url" content="${E(meta.url)}"><meta property="og:locale" content="${meta.lang==='pl'?'pl_PL':'uk_UA'}"><meta name="twitter:card" content="${meta.image?'summary_large_image':'summary'}">${meta.image?`<meta property="og:image" content="${E(meta.image)}"><meta property="og:image:alt" content="${E(meta.title)}">`:''}<script id="hmg-schema" type="application/ld+json">${safeJson(meta.schema)}</script>`;
}
export function sitemap(products) {
  const paths=[];
  for(const lang of ['uk','pl']) {
    paths.push({path:`/${lang}/`},{path:`/${lang}/start`},{path:catalogPath(lang)});
    for(let cat=0;cat<categories.length;cat++) if(products.some(p=>Number(p.cat)===cat)) paths.push({path:catalogPath(lang,cat)});
    for(const p of products) if([0,1,2].includes(Number(p.status))) paths.push({path:productPath(p,lang),date:p.updated_at});
  }
  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(({path,date})=>`<url><loc>${escapeHtml(ORIGIN+path)}</loc>${date&&!Number.isNaN(Date.parse(date))?`<lastmod>${new Date(date).toISOString()}</lastmod>`:''}</url>`).join('')+'</urlset>';
}
