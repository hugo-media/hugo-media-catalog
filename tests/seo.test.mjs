import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {servePage} from '../api/seo.js';
import {productPath,parseRoute,metadata,sitemap,safeJson,visibleSeoContent} from '../src/seo-core.js';
const p={id:7,name:'HP EliteBook 850 G8',cat:0,status:0,price:1990,discount:'10',quantity:'1',condition:'Ідеальний / Idealny',brand:'HP',descUk:'Ноутбук HP для роботи',descPl:'Laptop HP do pracy',images:['7/photo.jpg'],updated_at:'2026-09-24T00:00:00Z'};
const template=await readFile(new URL('../index.html',import.meta.url),'utf8');
const config={supabaseUrl:'https://example.supabase.co',supabaseKey:'sb_publishable_example'};
const options={template,config,loadProducts:async()=>[p]};
const page=path=>servePage(new URL('https://www.hugomedia.pl'+path),options);
test('localized product URLs resolve and old links permanently redirect without dropping campaign',async()=>{
 assert.deepEqual(parseRoute(productPath(p,'pl')),{lang:'pl',view:'detail',id:7,cat:-1});
 const r=await page('/?product=7&utm_source=tiktok');assert.equal(r.status,308);assert.equal(r.headers.Location,productPath(p)+'?utm_source=tiktok');
 const renamed=await page('/uk/product/7-old-name');assert.equal(renamed.headers.Location,productPath(p));
});
test('product response contains visible description, current discounted offer and reciprocal languages before JavaScript',async()=>{
 const r=await page(productPath(p,'pl'));assert.equal(r.status,200);
 assert.match(r.body,/<html lang="pl">/);assert.match(r.body,/<h1>HP EliteBook 850 G8<\/h1>/);assert.match(r.body,/Laptop HP do pracy/);
 assert.match(r.body,/"price":"1791.00"/);assert.match(r.body,/"priceCurrency":"PLN"/);
 assert.match(r.body,/hreflang="uk"/);assert.match(r.body,/hreflang="pl"/);assert.match(r.body,/rel="canonical"/);
});
test('Product offer schema mirrors the database price, currency, condition, and availability',()=>{
 const productSchema=product=>metadata({lang:'uk',view:'detail',product}).schema['@graph'].find(item=>item['@type']==='Product');
 const offer=product=>productSchema(product).offers;
 assert.equal(offer(p).price,'1791.00');
 assert.equal(offer(p).priceCurrency,'PLN');
 assert.equal(offer(p).availability,'https://schema.org/InStock');
 assert.equal(offer(p).itemCondition,'https://schema.org/UsedCondition');
 assert.equal(offer({...p,condition:'Новий / Nowy'}).itemCondition,'https://schema.org/NewCondition');
 assert.equal(offer({...p,condition:'Refurbished'}).itemCondition,'https://schema.org/RefurbishedCondition');
 assert.equal(offer({...p,status:5}).availability,'https://schema.org/OutOfStock');
 assert.equal(offer({...p,quantity:'0'}).availability,'https://schema.org/OutOfStock');
});
test('expected products render as server-side OutOfStock product pages',async()=>{
 const expected={...p,id:12,status:5};
 const r=await servePage(new URL('https://www.hugomedia.pl'+productPath(expected)),{...options,loadProducts:async()=>[expected]});
 assert.equal(r.status,200);
 assert.match(r.body,/Очікується/);
 assert.match(r.body,/"availability":"https:\/\/schema.org\/OutOfStock"/);
});
test('missing products are genuine 404s and DB failures are retryable 503s',async()=>{
 const r=await page('/uk/product/99-missing');assert.equal(r.status,404);assert.match(r.headers['X-Robots-Tag'],/noindex/);assert.doesNotMatch(r.body,/src="\/src\/app.js"/);
 const failure=await servePage(new URL('https://www.hugomedia.pl/uk'),{...options,loadProducts:async()=>{throw Error('offline');}});
 assert.equal(failure.status,503);assert.equal(failure.headers['Retry-After'],'60');
});
test('admin and auth callback stay accessible, uncached and unindexable without public DB dependency',async()=>{
 for(const path of ['/?admin','/?admin=stats','/?code=auth-code']) {
  const r=await servePage(new URL('https://www.hugomedia.pl'+path),{...options,loadProducts:async()=>{throw Error('must not fetch');}});
  assert.equal(r.status,200);assert.equal(r.headers.Location,undefined);assert.match(r.headers['X-Robots-Tag'],/noindex/);assert.match(r.headers['Cache-Control'],/no-store/);assert.match(r.body,/src="\/src\/app.js"/);
 }
});
test('sitemap is current, excludes drafts and includes both languages; no invented stock',()=>{
 const xml=sitemap([p,{...p,id:8,status:3},{...p,id:9,status:5}]);assert.match(xml,/\/uk\/product\/7-/);assert.match(xml,/\/pl\/product\/7-/);assert.doesNotMatch(xml,/product\/8-/);assert.doesNotMatch(xml,/admin/);assert.ok(xml.includes('/product/9-'));
 assert.equal(metadata({product:{...p,quantity:'0'}}).schema['@graph'][2].offers.availability,'https://schema.org/OutOfStock');
 assert.doesNotMatch(xml,/\/start/);assert.match(xml,/xmlns:xhtml/);assert.match(xml,/hreflang="uk"/);assert.match(xml,/hreflang="pl"/);
 assert.equal(metadata({product:{...p,status:1}}).schema['@graph'][2].offers.availability,'https://schema.org/OutOfStock');
 assert.equal(metadata({product:{...p,status:5}}).schema['@graph'][2].offers.availability,'https://schema.org/OutOfStock');
});
test('untrusted product text cannot break out of HTML or JSON-LD',async()=>{
 const bad={...p,name:'</script><script>alert(1)</script>',descUk:'<img onerror=alert(1)>'};
 const r=await servePage(new URL('https://www.hugomedia.pl'+productPath(bad)),{...options,loadProducts:async()=>[bad]});
 assert.equal(r.status,200);assert.doesNotMatch(r.body,/<script>alert\(1\)<\/script>/);assert.match(r.body,/&lt;img onerror/);assert.doesNotMatch(safeJson(bad),/</);
});

test('home canonical does not redirect back to a trailing slash',async()=>{
 const root=await page('/');assert.equal(root.headers.Location,'/uk');
 const home=await page('/uk');assert.equal(home.status,200);assert.equal(home.headers.Location,undefined);
 assert.match(home.body,/href="https:\/\/www.hugomedia.pl\/uk"/);
});


test('admin SEO metadata is used in server rendered HTML for pages and products',async()=>{
 const seo={pages:{home:{uk:{title:'Ноутбуки та техніка у Польщі | Hugo Media',description:'Підбери ноутбук і техніку у Польщі: актуальні ціни, характеристики, фото товарів і консультація українською в Telegram.'}},'category:laptops':{pl:{title:'Laptopy poleasingowe w Polsce | Hugo Media',description:'Sprawdź dostępne laptopy poleasingowe w Polsce. Porównaj ceny, parametry i stan urządzeń, a przed zakupem zapytaj o szczegóły.'}}}};
 const opts={...options,loadSeo:async()=>seo};
 const home=await servePage(new URL('https://www.hugomedia.pl/uk'),opts);
 assert.match(home.body,/<title>Ноутбуки та техніка у Польщі \| Hugo Media<\/title>/);
 const category=await servePage(new URL('https://www.hugomedia.pl/pl/catalog/laptops'),opts);
 assert.match(category.body,/<title>Laptopy poleasingowe w Polsce \| Hugo Media<\/title>/);
 const seoProduct={...p,seoTitlePl:'Laptop HP EliteBook do pracy | Hugo Media',seoDescriptionPl:'Sprawdź laptop HP EliteBook do pracy. Zobacz aktualną cenę, stan, parametry i zdjęcia urządzenia. Zapytaj o dostępność przed zakupem.'};
 const product=await servePage(new URL('https://www.hugomedia.pl'+productPath(seoProduct,'pl')),{...opts,loadProducts:async()=>[seoProduct]});
 assert.match(product.body,/<title>Laptop HP EliteBook do pracy \| Hugo Media<\/title>/);
});

test('empty categories and the start page stay out of the index; useful localized copy is server rendered',async()=>{
 const seo={pages:{'category:laptops':{pl:{
  title:'Używane laptopy biznesowe w Polsce | Hugo Media',
  description:'Używane laptopy biznesowe HP, Dell i Lenovo w Polsce. Porównaj ceny, parametry, zdjęcia, stan oraz warunki gwarancji przed zakupem.',
  focus:'używane laptopy biznesowe',
  intro:'Przeglądaj używane laptopy biznesowe w Polsce. Każda karta pokazuje konkretny model, jego konfigurację, cenę i zdjęcia. Stan urządzenia oraz warunki gwarancji opisujemy przy danej ofercie. Przed zakupem potwierdź dostępność przez Telegram.'
 }}}};
 const category=await servePage(new URL('https://www.hugomedia.pl/pl/catalog/laptops'),{...options,loadSeo:async()=>seo});
 assert.equal(category.status,200);assert.match(category.body,/Przeglądaj używane laptopy biznesowe w Polsce/);
 assert.match(category.body,/href="\/pl\/catalog\/phones"/);
 assert.match(category.body,/name="robots" content="index,follow/);
 assert.match(category.headers['Cache-Control'],/s-maxage=30/);
 const empty=await page('/pl/catalog/tablets');
 assert.match(empty.body,/name="robots" content="noindex,follow"/);
 assert.match(empty.headers['X-Robots-Tag'],/noindex/);
 const start=await page('/pl/start');
 assert.match(start.body,/name="robots" content="noindex,follow"/);
 assert.match(start.headers['X-Robots-Tag'],/noindex/);
});

test('admin SEO copy can safely supply a visible heading and readable paragraphs after hydration',()=>{
 const copy=visibleSeoContent({title:'Używane laptopy biznesowe w Polsce | Hugo Media',intro:'Porównaj <modele> i ceny.\n\nSprawdź dostępność.'});
 assert.equal(copy.title,'Używane laptopy biznesowe w Polsce');
 assert.equal(copy.intro,'<p>Porównaj &lt;modele&gt; i ceny.</p><p>Sprawdź dostępność.</p>');
});
