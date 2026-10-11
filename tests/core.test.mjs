import {test} from 'node:test';
import assert from 'node:assert/strict';
import {orderText,availabilityRequestText,telegramLink,telegramPostUrl,normalizeTelegramPost,reconcileCart,toRow,fromRow,publicConfigValid,effectivePrice,extraStorageLabel,TELEGRAM_CHANNEL,csv,warsawDate,validateDailyPicks,promotionState,activeHomePromotion,configuredDiscountPercent,discountPercent,configuration,warsawDateTimeToUtc,utcToWarsawDateTime} from '../src/core.js';
const p={id:1,name:'Dell & Lenovo? #1',brand:'Dell',cat:0,status:0,price:10.15,images:[],ram:'16',descUk:'Опис',descPl:'Opis'};
test('Telegram draft preserves Unicode and special characters and uses fixed recipient',()=>{const text=orderText([p,{...p,id:2,price:20.2}],'uk','https://shop.example');const url=new URL(telegramLink(text));assert.equal(url.hostname,'t.me');assert.equal(url.pathname,'/HGM_Manager');assert.equal(url.searchParams.get('text'),text);assert.match(text,/30.35 zł/);assert.match(text,/\?product=2/);});
test('availability request drafts a bilingual direct Telegram message with product identity and link',()=>{
 const text=availabilityRequestText({...p,id:46},'uk','https://shop.example/?product=46');
 assert.match(text,/Повідомте, будь ласка, коли цей товар з’явиться в наявності/);
 assert.match(text,/HMG-046/);
 assert.match(text,/https:\/\/shop\.example\/\?product=46/);
 const url=new URL(telegramLink(text));
 assert.equal(url.pathname,'/HGM_Manager');
 assert.equal(url.searchParams.get('text'),text);
 const polish=availabilityRequestText({...p,id:46},'pl','https://shop.example/pl/produkt/46');
 assert.match(polish,/gdy ten produkt będzie dostępny/);
 assert.match(polish,/Dell & Lenovo\? #1/);
});
test('cart removes unavailable, missing and duplicate products',()=>{assert.deepEqual(reconcileCart([1,1,2,3,4],[p,{...p,id:2,status:1},{...p,id:3,status:2}]),[1]);});
test('cart removes products with zero stock',()=>{assert.deepEqual(reconcileCart([1,2],[{...p,quantity:'0'},{...p,id:2,quantity:'1'}]),[2]);});
test('database mapping roundtrips bilingual text, promotion and Telegram fields without granting injected fields',()=>{const row=toRow({...p,newArrival:'true',bestseller:'true',discount:'15',telegramPost:'https://t.me/h_m_g_pl/123',role:'admin',created_at:'fake'});assert.equal(row.role,undefined);assert.equal(row.created_at,undefined);assert.equal(fromRow(row).descUk,'Опис');assert.equal(fromRow(row).ram,'16');assert.equal(fromRow(row).newArrival,'true');assert.equal(fromRow(row).bestseller,'true');assert.equal(fromRow(row).discount,'15');assert.equal(fromRow(row).telegramPost,'https://t.me/h_m_g_pl/123');});
test('additional laptop drive type, capacity, and unit round-trip through product specs',()=>{
 const laptop={...p,extraStorageType:'HDD',extraStorageCapacity:'700',extraStorageUnit:'GB'};
 const stored=toRow(laptop);
 assert.equal(stored.specs.extraStorageType,'HDD');
 assert.equal(stored.specs.extraStorageCapacity,'700');
 assert.equal(stored.specs.extraStorageUnit,'GB');
 const loaded=fromRow({id:1,...stored});
 assert.equal(extraStorageLabel(loaded),'700 GB HDD');
 assert.equal(extraStorageLabel({...loaded,cat:1}),'');
 assert.equal(extraStorageLabel(p),'');
 assert.throws(()=>toRow({...p,extraStorageType:'SSD'}),e=>e.field==='extraStorageCapacity');
 assert.throws(()=>toRow({...p,extraStorageType:'SSD',extraStorageCapacity:'700',extraStorageUnit:''}),e=>e.field==='extraStorageUnit');
 assert.throws(()=>toRow({...p,extraStorageType:'M2',extraStorageCapacity:'700',extraStorageUnit:'GB'}),e=>e.field==='extraStorageType');
 assert.throws(()=>toRow({...p,cat:1,extraStorageType:'SSD',extraStorageCapacity:'700',extraStorageUnit:'GB'}),e=>e.field==='extraStorageType');
});
test('discounted price is rounded to whole PLN and used in Telegram order',()=>{const sale={...p,price:100,discount:'15'};assert.equal(effectivePrice(sale),85);assert.match(orderText([sale],'uk'),/85.00 zł \(-15%\)/);});
test('custom discount percentages round-trip, calculate, and stay in range',()=>{const sale={...p,price:1299,discount:'17'};assert.equal(fromRow(toRow(sale)).discount,'17');assert.equal(effectivePrice(sale),1078);assert.equal(effectivePrice({...sale,discount:'99'}),13);assert.throws(()=>toRow({...sale,discount:'100'}),error=>error.field==='discount');});
test('bundle choices are deduplicated and included in order total',()=>{assert.deepEqual(csv('mouse,office,mouse'),['mouse','office']);const text=orderText([{...p,price:100,bundles:'mouse,office,photoshop,software'}],'uk','',{1:'mouse,office,photoshop,software'});assert.match(text,/Мишка — 45 zł/);assert.match(text,/Microsoft Office — 200 zł/);assert.match(text,/Adobe Photoshop — 200 zł/);assert.match(text,/Інші програми — за запитом/);assert.match(text,/Разом: 545.00 zł/);});
test('existing JSON formatted product purposes are readable',()=>{assert.deepEqual(csv('["study", "office", "study"]'),['study','office']);});
test('charger contents roundtrip through product specs without inventing a value for old products',()=>{for(const charger of ['adapter','cable','none'])assert.equal(fromRow(toRow({...p,charger})).charger,charger);assert.equal(fromRow(toRow(p)).charger,'');});
test('SEO fields persist in product specs and enforce safe limits',()=>{const mapped=toRow({...p,seoTitleUk:'Ноутбук для роботи',seoDescriptionPl:'Laptop do pracy i nauki'});assert.equal(fromRow(mapped).seoTitleUk,'Ноутбук для роботи');assert.equal(fromRow(mapped).seoDescriptionPl,'Laptop do pracy i nauki');assert.throws(()=>toRow({...p,seoTitleUk:'x'.repeat(81)}),e=>e.field==='seoTitleUk');assert.throws(()=>toRow({...p,seoDescriptionPl:'x'.repeat(301)}),e=>e.field==='seoDescriptionPl');});
test('invalid product cannot reach data API mapping',()=>{for(const patch of [{price:-1},{price:NaN},{cat:7},{status:6},{discount:100},{newArrival:'yes'},{bestseller:'yes'},{charger:'unknown'},{telegramPost:'https://evil.test/post'},{name:' '},{brand:''},{images:Array(9).fill('x')}])assert.throws(()=>toRow({...p,...patch}));});
test('invalid product names the field that blocks saving',()=>{
 for(const [field,patch] of [['price',{price:-1}],['telegramPost',{telegramPost:'https://t.me/another_channel/123'}],['ram16Enabled',{ram16Enabled:'true',ram:'16',ram16Price:'399'}]]){
  assert.throws(()=>toRow({...p,...patch}),error=>error.message==='validation'&&error.field===field);
 }
});
test('Telegram media link normalizes copied post formats and falls back safely',()=>{assert.equal(telegramPostUrl(''),TELEGRAM_CHANNEL);assert.equal(telegramPostUrl('https://evil.test/post'),TELEGRAM_CHANNEL);assert.equal(normalizeTelegramPost('t.me/h_m_g_pl/123'),'https://t.me/h_m_g_pl/123');assert.equal(normalizeTelegramPost('https://www.t.me/s/h_m_g_pl/123?single'),'https://t.me/h_m_g_pl/123');assert.equal(normalizeTelegramPost('https://telegram.me/h_m_g_pl/123'),'https://t.me/h_m_g_pl/123');});
test('public config refuses service-role and secret keys and invalid origins',()=>{const jwt=role=>'x.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.x';const url='https://example.supabase.co';assert.equal(publicConfigValid({supabaseUrl:url,supabaseKey:jwt('service_role')}),false);assert.equal(publicConfigValid({supabaseUrl:url,supabaseKey:'sb_secret_secret'}),false);assert.equal(publicConfigValid({supabaseUrl:url,supabaseKey:jwt('anon')}),true);assert.equal(publicConfigValid({supabaseUrl:'https://example.supabase.co.attacker.test',supabaseKey:jwt('anon')}),false);});
test('daily picks follow Warsaw calendar day and never exceed two distinct IDs',()=>{assert.equal(warsawDate(new Date('2026-09-22T22:30:00Z')),'2026-09-23');assert.equal(warsawDate(new Date('2026-12-31T23:30:00Z')),'2027-01-01');assert.deepEqual(validateDailyPicks([5,1]),[5,1]);assert.deepEqual(validateDailyPicks([]),[]);for(const ids of [[1,2,3],[1,1],[0],[-1],[1.5],['1'],null])assert.throws(()=>validateDailyPicks(ids));});


test('out-of-stock products validate and round-trip through database rows',()=>{
 const row=toRow({...p,status:4,quantity:'0'});
 assert.equal(row.status,4);
 assert.equal(fromRow({id:2,...row}).status,4);
 assert.equal(fromRow({id:2,...row}).quantity,'0');
});


test('expected products validate and round-trip through database rows',()=>{
 const row=toRow({...p,status:5});
 assert.equal(row.status,5);
 assert.equal(fromRow({id:3,...row}).status,5);
});

const scheduled={...p,price:1299,discount:'17',promoStartAt:'2026-10-11T10:00:00.000Z',promoEndAt:'2026-10-11T11:00:00.000Z',promoHome:'true'};
test('scheduled promotions use one absolute shared deadline without changing legacy discounts',()=>{
 const start=Date.parse(scheduled.promoStartAt),end=Date.parse(scheduled.promoEndAt);
 for(const cat of [0,1,2,3,4,5,6]){
  const product={...scheduled,cat};
  assert.equal(promotionState(product,start-1).status,'upcoming');
  assert.equal(effectivePrice(product,start-1),1299);
  assert.equal(discountPercent(product,start-1),0);
  assert.equal(effectivePrice(product,start),1078);
  assert.equal(effectivePrice(product,end-1),1078);
  assert.equal(promotionState(product,end).status,'expired');
  assert.equal(effectivePrice(product,end),1299);
  assert.equal(discountPercent(product,end),0);
  assert.equal(configuredDiscountPercent(product),17);
 }
 assert.equal(effectivePrice({...scheduled,promoStartAt:'',promoEndAt:''},end),1078);
 assert.equal(effectivePrice({...scheduled,salePrice:'999.95'},start),999.95);
 assert.equal(effectivePrice({...scheduled,salePrice:'999.95'},end),1299);
});
test('invalid or partial schedules fail closed and cannot be saved as real promotions',()=>{
 const now=Date.parse(scheduled.promoStartAt);
 for(const fields of [{promoEndAt:''},{promoStartAt:'2026-10-11T12:00:00.000Z'},{promoEndAt:'2026-02-30T11:00:00.000Z'},{promoStartAt:'2026-10-11T12:00'}]){
  const product={...scheduled,...fields};
  assert.equal(promotionState(product,now).status,'invalid');
  assert.equal(effectivePrice(product,now),1299);
  assert.throws(()=>toRow(product));
 }
 assert.throws(()=>toRow({...p,promoHome:'true'}),e=>e.field==='promoEndAt');
 assert.throws(()=>toRow({...scheduled,discount:'0'}),e=>e.field==='discount');
});
test('scheduled promotion specs preserve their configured prices and titles during database round trip',()=>{
 for(const salePrice of ['', '999.95']){
  const product={...scheduled,salePrice,promoTitleUk:'Акція на ноутбук',promoTitlePl:'Promocja laptopa'};
  const loaded=fromRow({id:1,...toRow(product)});
  assert.equal(loaded.promoStartAt,scheduled.promoStartAt);
  assert.equal(loaded.promoEndAt,scheduled.promoEndAt);
  assert.equal(loaded.promoHome,'true');
  assert.equal(loaded.promoTitleUk,product.promoTitleUk);
  assert.equal(loaded.salePrice,salePrice);
  assert.equal(Number(loaded.discount),configuredDiscountPercent(product));
 }
});
test('home selects one available real scheduled promotion and hides it on expiry or no stock',()=>{
 const now=Date.parse(scheduled.promoStartAt);
 const later={...scheduled,id:2,promoEndAt:'2026-10-11T12:00:00.000Z'};
 assert.equal(activeHomePromotion([later,scheduled],now).id,1);
 assert.equal(activeHomePromotion([{...scheduled,status:2},later],now).id,2);
 for(const patch of [{status:2},{quantity:'0'},{promoHome:''},{discount:'0'},{promoStartAt:''}]){
  assert.equal(activeHomePromotion([{...scheduled,...patch}],now),null);
 }
 assert.equal(activeHomePromotion([scheduled],Date.parse(scheduled.promoEndAt)),null);
 assert.equal(activeHomePromotion([{...scheduled,promoStartAt:'',promoEndAt:''}],now),null);
});
test('Warsaw datetime inputs serialize exact UTC instants including seasonal offsets and reject DST ambiguity',()=>{
 assert.equal(warsawDateTimeToUtc('2026-07-01T12:30'),'2026-07-01T10:30:00.000Z');
 assert.equal(warsawDateTimeToUtc('2026-12-01T12:30'),'2026-12-01T11:30:00.000Z');
 assert.equal(utcToWarsawDateTime('2026-07-01T10:30:00.000Z'),'2026-07-01T12:30');
 for(const local of ['2026-03-29T02:30','2026-10-25T02:30','2026-02-30T12:00','2026-07-01','invalid'])assert.equal(warsawDateTimeToUtc(local),null);
});
test('scheduled expiry produces matching configuration and Telegram totals while extras keep full price',()=>{
 const product={...scheduled,bundles:'mouse,office'};
 for(const [now,base,total] of [[Date.parse(scheduled.promoEndAt)-1,1078,1323],[Date.parse(scheduled.promoEndAt),1299,1544]]){
  assert.equal(configuration(product,'mouse,office',{},'uk',now).total,total);
  const draft=orderText([product],'uk','',{1:'mouse,office'},{},now);
  assert.ok(draft.includes(base.toFixed(2)+' zł'));
  assert.ok(draft.includes('Разом: '+total.toFixed(2)+' zł'));
  assert.match(draft,/Мишка — 45 zł/);
  assert.match(draft,/Microsoft Office — 200 zł/);
 }
});
