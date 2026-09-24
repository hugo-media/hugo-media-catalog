import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {servePage} from '../api/seo.js';
import {productPath,parseRoute,metadata,sitemap,safeJson} from '../src/seo-core.js';
const p={id:7,name:'HP EliteBook 850 G8',cat:0,status:0,price:1990,discount:'10',quantity:'1',brand:'HP',descUk:'Ноутбук HP для роботи',descPl:'Laptop HP do pracy',images:['7/photo.jpg'],updated_at:'2026-09-24T00:00:00Z'};
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
test('missing products are genuine 404s and DB failures are retryable 503s',async()=>{
 const r=await page('/uk/product/99-missing');assert.equal(r.status,404);assert.match(r.headers['X-Robots-Tag'],/noindex/);assert.doesNotMatch(r.body,/src="\/src\/app.js"/);
 const failure=await servePage(new URL('https://www.hugomedia.pl/uk/'),{...options,loadProducts:async()=>{throw Error('offline');}});
 assert.equal(failure.status,503);assert.equal(failure.headers['Retry-After'],'60');
});
test('admin and auth callback stay accessible, uncached and unindexable without public DB dependency',async()=>{
 for(const path of ['/?admin','/?admin=stats','/?code=auth-code']) {
  const r=await servePage(new URL('https://www.hugomedia.pl'+path),{...options,loadProducts:async()=>{throw Error('must not fetch');}});
  assert.equal(r.status,200);assert.equal(r.headers.Location,undefined);assert.match(r.headers['X-Robots-Tag'],/noindex/);assert.match(r.headers['Cache-Control'],/no-store/);assert.match(r.body,/src="\/src\/app.js"/);
 }
});
test('sitemap is current, excludes drafts and includes both languages; no invented stock',()=>{
 const xml=sitemap([p,{...p,id:8,status:3}]);assert.match(xml,/\/uk\/product\/7-/);assert.match(xml,/\/pl\/product\/7-/);assert.doesNotMatch(xml,/product\/8-/);assert.doesNotMatch(xml,/admin/);
 assert.equal(metadata({product:{...p,quantity:'0'}}).schema['@graph'][2].offers.availability,'https://schema.org/OutOfStock');
 assert.equal(metadata({product:{...p,status:1}}).schema['@graph'][2].offers.availability,'https://schema.org/OutOfStock');
});
test('untrusted product text cannot break out of HTML or JSON-LD',async()=>{
 const bad={...p,name:'</script><script>alert(1)</script>',descUk:'<img onerror=alert(1)>'};
 const r=await servePage(new URL('https://www.hugomedia.pl'+productPath(bad)),{...options,loadProducts:async()=>[bad]});
 assert.equal(r.status,200);assert.doesNotMatch(r.body,/<script>alert\(1\)<\/script>/);assert.match(r.body,/&lt;img onerror/);assert.doesNotMatch(safeJson(bad),/</);
});
