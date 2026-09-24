import { readFile } from 'node:fs/promises';
import { fromRow, publicConfigValid } from '../src/core.js';
import { ORIGIN, parseRoute, pagePath, catalogPath, productPath, metadata, headMarkup, sitemap, escapeHtml as E, imageUrl } from '../src/seo-core.js';
const templatePromise=readFile(new URL('../index.html',import.meta.url),'utf8');
const configPromise=readFile(new URL('../public-config.json',import.meta.url),'utf8').then(JSON.parse);
async function publicProducts(config) {
  if(!publicConfigValid(config)) throw Error('Public configuration unavailable');
  const products=[];
  for(let offset=0;;offset+=500) {
    const response=await fetch(`${config.supabaseUrl}/rest/v1/hmg_catalog_products?select=*&status=in.(0,1,2)&order=id.desc&limit=500&offset=${offset}`,{headers:{apikey:config.supabaseKey},signal:AbortSignal.timeout(6000)});
    if(!response.ok) throw Error('Catalog unavailable');
    const rows=await response.json();
    products.push(...rows.map(fromRow));
    if(rows.length<500) return products;
  }
}
function serverContent(route,products,base) {
  const {lang,view,cat,product}=route,pl=lang==='pl';
  const meta=metadata({...route,base});
  const nav=`<nav class="hp-toprow" aria-label="${pl?'Nawigacja':'Навігація'}"><a href="/${lang}/">Hugo Media</a><a href="${catalogPath(lang)}">${pl?'Katalog':'Каталог'}</a><a href="${pagePath({...route,lang:lang==='uk'?'pl':'uk'})}">${pl?'Українська':'Polski'}</a></nav>`;
  if(product) return nav+`<article class="hp-detail"><h1>${E(product.name)}</h1>${meta.image?`<div class="hp-photo"><img src="${E(meta.image)}" alt="${E(product.name)}" fetchpriority="high"></div>`:''}<p>${E(meta.schema['@graph'][2].offers.price)} zł · ${E((pl?['Dostępny','Zarezerwowany','Sprzedany']:['У наявності','Заброньовано','Продано'])[product.status])}</p><p>${E(pl?product.descPl:product.descUk).replace(/\n/g,'<br>')}</p><dl>${['cpu','ram','ssd','gpu','screen','battery','condition','warranty'].filter(k=>product[k]).map(k=>`<dt>${E(k)}</dt><dd>${E(product[k])}</dd>`).join('')}</dl><a href="https://t.me/HUGO_Media">${pl?'Zapytaj w Telegramie':'Запитати в Telegram'}</a></article>`;
  if(view==='start') return nav+`<section class="hm-start"><h1>Hugo Media</h1><p>${E(meta.description)}</p><a class="hp-button" href="${catalogPath(lang)}">${pl?'Otwórz katalog':'Відкрити каталог'}</a><a class="hp-button" href="https://t.me/h_m_g_pl">Telegram</a></section>`;
  const list=cat>=0?products.filter(p=>Number(p.cat)===cat):products;
  return nav+`<h1>${E(meta.title.replace(' — Hugo Media',''))}</h1><p>${E(meta.description)}</p><div class="hp-grid">${list.map(p=>`<article class="hp-product"><a class="hp-product-open" href="${E(productPath(p,lang))}">${p.images?.length?`<div class="hp-photo"><img src="${E(imageUrl(p.images[0],base))}" alt="${E(p.name)}" loading="lazy" decoding="async"></div>`:''}<div class="hp-product-body"><h2>${E(p.name)}</h2><p>${E(metadata({lang,view:'detail',product:p}).schema['@graph'][2].offers.price)} zł</p></div></a></article>`).join('')}</div>`;
}
export async function servePage(url,{template,config,loadProducts=publicProducts}={}) {
  template ??= await templatePromise;
  config ??= {...await configPromise};
  config.supabaseUrl=process.env.SUPABASE_URL||config.supabaseUrl;
  config.supabaseKey=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||config.supabaseKey;
  const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store'};
  const send=(status,body,extra={})=>({status,body,headers:{...headers,...extra}});
  const redirect=path=>send(308,'',{'Location':path});
  if(url.hostname==='hugo-media-catalog.vercel.app') return redirect(ORIGIN+url.pathname+url.search);
  if(url.pathname==='/robots.txt') return send(200,`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${ORIGIN}/sitemap.xml\n`,{'Content-Type':'text/plain; charset=utf-8'});
  const route=parseRoute(url.pathname);route.lang ||= 'uk';
  const privatePage=['admin','finder','selection','code','error','type'].some(k=>url.searchParams.has(k));
  const preview=!['www.hugomedia.pl','hugomedia.pl'].includes(url.hostname);
  let products=[],status=200,body='';
  try {
    if(!privatePage && (url.pathname==='/sitemap.xml'||['home','catalog','detail'].includes(route.view)||url.searchParams.has('product'))) products=await loadProducts(config);
    if(url.pathname==='/sitemap.xml') return send(200,sitemap(products),{'Content-Type':'application/xml; charset=utf-8'});
    if(privatePage) route.view='admin';
    else {
      if(url.searchParams.has('product')) {route.view='detail';route.id=Number(url.searchParams.get('product'));}
      else if(url.searchParams.has('catalog')) route.view='catalog';
      if(route.view==='detail') {
        route.product=products.find(p=>p.id===route.id && [0,1,2].includes(Number(p.status)));
        if(!route.product) route.view='notFound';
      }
      if(route.view==='notFound') {
        status=404;body=`<h1>${route.lang==='pl'?'Nie znaleziono strony':'Сторінку не знайдено'}</h1><a href="/${route.lang}/">Hugo Media</a>`;
      } else {
        const canonical=pagePath(route),params=new URLSearchParams(url.search);
        params.delete('product');params.delete('catalog');
        if(url.pathname!==canonical || url.searchParams.has('product')||url.searchParams.has('catalog')) return redirect(canonical+(params.size?'?'+params:''));
        body=serverContent(route,products,config.supabaseUrl);
      }
    }
  } catch {
    status=503;headers['Retry-After']='60';
    body='<h1>Hugo Media</h1><p>Каталог тимчасово недоступний. Спробуйте оновити сторінку. / Katalog chwilowo niedostępny. Odśwież stronę.</p>';
  }
  const meta=metadata({...route,base:config.supabaseUrl,noindex:privatePage||preview||status!==200});
  if(meta.noindex) headers['X-Robots-Tag']='noindex, follow';
  let html=template.replace(/<title>[\s\S]*?<\/title>/,'').replace(/<meta name="description"[^>]*>/,'').replace('<html lang="uk">',`<html lang="${route.lang}">`).replace('</head>',headMarkup(meta)+'</head>');
  html=html.replace('<main class="hp-main" id="hp-content"></main>',`<main class="hp-main" id="hp-content"${body?' data-ssr="true"':''}>${body}</main>`);
  // A real 404 remains a 404; do not turn it into the home page in client routing.
  if(status===404) html=html.replace('<script type="module" src="/src/app.js"></script>','');
  return send(status,html);
}
export default async function handler(req,res) {
  const url=new URL(req.url,`https://${req.headers.host||'www.hugomedia.pl'}`);
  // The rewrite supplies the public route; the browser's query is preserved.
  if(url.searchParams.has('__path')) {url.pathname='/'+url.searchParams.get('__path');url.searchParams.delete('__path');}
  if(url.pathname==='/api/seo') url.pathname='/';
  const result=await servePage(url);
  res.statusCode=result.status;
  for(const [key,value] of Object.entries(result.headers)) res.setHeader(key,value);
  res.end(req.method==='HEAD'?'':result.body);
}
