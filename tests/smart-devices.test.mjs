import test from 'node:test';
import assert from 'node:assert/strict';
import {effectivePrice,fixedSalePrice,discountPercent,discountBadge,toRow,fromRow,orderText,configuration} from '../src/core.js';
import {quickPricePreview,planQuickChanges} from '../src/admin-catalog-core.js';
import {categories,catalogPath,parseRoute,metadata,sitemap,escapeHtml} from '../src/seo-core.js';
import {createStorefront} from '../src/storefront.js';
const product={id:45,name:'PRIME V2',brand:'PRIME',cat:4,status:0,price:350,salePrice:'250',discount:'29',quantity:'1',updated_at:'2026-10-11T10:00:00Z',condition:'Уточнюється / Do ustalenia',images:[]};

test('exact promotional prices agree in persistence, configuration and Telegram drafts',()=>{
 for(const [base,sale,percent] of [[350,250,29],[399,299,25],[65,50,23],[250,200,20]]) {
  const p={...product,price:base,salePrice:String(sale),discount:'0'};
  const saved=fromRow(toRow(p));
  assert.equal(effectivePrice(saved),sale);
  assert.equal(Number(saved.discount),percent);
  assert.equal(configuration(saved).total,sale);
  assert.ok(orderText([saved],'uk').includes(sale.toFixed(2)+' zł'));
 }
 assert.equal(discountBadge(product),'≈ -29%');
 assert.equal(discountBadge({...product,price:250,salePrice:'200'}),'-20%');
 assert.equal(effectivePrice({...product,salePrice:'',discount:'29'}),249);
});

test('invalid fixed prices are rejected before persistence and category 6 round-trips',()=>{
 for(const value of ['350','351','0','-1','NaN','249.999','1e2','1']) {
  assert.equal(fixedSalePrice({...product,salePrice:value}),null);
  assert.throws(()=>toRow({...product,salePrice:value}),e=>e.field==='salePrice');
 }
 const device=fromRow(toRow({...product,cat:6,bluetooth:'5.2',weight:'48 g',dimensions:'31.2 × 8.5 mm'}));
 assert.equal(device.cat,6);assert.equal(device.bluetooth,'5.2');assert.equal(device.weight,'48 g');
 assert.throws(()=>toRow({...product,cat:7}),e=>e.field==='cat');
});

test('stock and unchanged price edits preserve a fixed price; real price/discount edits use percentages',()=>{
 const before=structuredClone(product);
 assert.equal(effectivePrice(quickPricePreview(product,{quantity:2,status:1})),250);
 assert.equal(effectivePrice(quickPricePreview(product,{price:350,discount:29})),250);
 assert.equal(effectivePrice(quickPricePreview(product,{discount:20})),280);
 assert.equal(effectivePrice(quickPricePreview(product,{price:400})),284);
 assert.equal(quickPricePreview(product,{discount:20}).salePrice,'');
 assert.deepEqual(product,before);
 assert.deepEqual(planQuickChanges([product],[45],{discount:29}),[]);
 assert.deepEqual(planQuickChanges([product],[45],{discount:20})[0].fields,{discount:20});
});

test('Smart Devices has localized routes, sitemap entries and correct product offers',()=>{
 assert.equal(categories[6],'smart-devices');
 assert.equal(catalogPath('uk',6),'/uk/catalog/smart-devices');
 assert.deepEqual(parseRoute('/pl/catalog/smart-devices'),{lang:'pl',view:'catalog',cat:6});
 const p={...product,cat:6,brand:'Не вказано / Nie podano'};
 const graph=metadata({lang:'uk',view:'detail',product:p}).schema['@graph'];
 const item=graph.find(x=>x['@type']==='Product');
 assert.equal(item.offers.price,'250.00');
 assert.equal(item.offers.priceCurrency,'PLN');
 assert.equal(item.offers.availability,'https://schema.org/InStock');
 assert.equal(item.offers.itemCondition,undefined);assert.equal(item.brand,undefined);
 assert.match(JSON.stringify(graph),/Смартдевайси/);
 assert.match(sitemap([p]),/\/uk\/catalog\/smart-devices/);
 assert.match(sitemap([p]),/\/pl\/catalog\/smart-devices/);
});

test('watch and device cards summarize useful specifications and label rounded discounts',()=>{
 const ui=createStorefront({lang:'uk',esc:escapeHtml,t:k=>k,icon:()=>'',photo:()=>'',productTitle:p=>p.name,localizedValue:v=>v,priceBlock:()=>'',stockQty:()=>1,compare:[]});
 const watch=ui.card({...product,screen:'1.57',compatibility:'Android + iPhone',battery:'3–6 днів'});
 assert.match(watch,/1.57″/);assert.match(watch,/Android \+ iPhone/);assert.match(watch,/≈ −29%/);
 const device=ui.card({...product,cat:6,type:'Розумні окуляри',compatibility:'Android + iPhone',bluetooth:'5.2'});
 assert.match(device,/Bluetooth 5.2/);assert.match(device,/Розумні окуляри/);
});
