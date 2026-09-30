import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizedSpec,specLabel,filterValues,homeSelection,homeCollections,createStorefront} from '../src/storefront.js';
import {escapeHtml} from '../src/seo-core.js';
test('mixed existing screen and capacity formats produce usable sorted filters',()=>{
 assert.deepEqual(filterValues([{ram:'16'},{ram:'8 GB'},{ram:'32'},{ram:'8'}],'ram'),['8','16','32']);
 assert.equal(normalizedSpec('screen','15,6″ Full HD'),'15.6');
 assert.equal(normalizedSpec('screen','15.6'),'15.6');
 assert.equal(specLabel('screen','15.6'),'15.6″');
 assert.equal(normalizedSpec('ssd','1 TB'),'1024');
 assert.equal(specLabel('ram','16 GB'),'16 GB');
});
test('home collections exclude unavailable and daily picks while preserving source data',()=>{
 const products=[{id:1,status:0,quantity:'1',price:1000,bestseller:'true',discount:'10'}, {id:2,status:0,quantity:'1',price:1000,newArrival:'true'}, {id:3,status:0,quantity:'0',price:1000}, {id:4,status:1,quantity:'1',price:1000}, {id:5,status:0,quantity:'1',price:1000}];
 assert.deepEqual(homeSelection(products,[products[0]],'new').map(x=>x.id),[2]);
 assert.deepEqual(homeSelection(products,[products[0]],'best'),[]);
 assert.equal(products[0].id,1);
});

test('homepage respects chosen product and falls back when hidden, sold, empty or without photos',async()=>{
 const {featuredProduct}=await import('../src/storefront.js');
 const p={id:1,cat:0,status:0,quantity:'1',images:['a.webp'],bestseller:'true'};
 const chosen={...p,id:2,bestseller:''};
 assert.equal(featuredProduct([p,chosen],[],2).id,2);
 for(const change of [{status:2},{status:3},{quantity:'0'},{images:[]}])assert.equal(featuredProduct([p,{...chosen,...change}],[],2).id,1);
 assert.equal(featuredProduct([p,chosen],[],999).id,1);
 assert.equal(featuredProduct([],[],2),undefined);
});

test('homepage renders new arrivals and bestsellers together',()=>{
 const featured={id:1,cat:0,status:0,quantity:'1',price:1000,name:'Featured laptop',images:['featured.webp']};
 const fresh={id:2,cat:0,status:0,quantity:'1',price:1200,name:'Fresh laptop',newArrival:'true'};
 const popular={id:3,cat:0,status:0,quantity:'1',price:1400,name:'Popular laptop',bestseller:'true'};
 const c={lang:'uk',esc:escapeHtml,t:key=>({bestChoice:'Бестселери',bestChoiceSub:'Популярні моделі',newArrivalsSub:'Свіжі моделі',bestseller:'Бестселер',newArrival:'Нове'})[key]||key,icon:()=>'',stockQty:()=>1,reviewsBlock:()=>'',compare:[],homepage:{featuredProductId:1},photo:()=>'<div class="hp-photo"></div>',productTitle:p=>p.name,priceBlock:()=>'',localizedValue:value=>value,money:value=>String(value)};
 const html=createStorefront(c).home([featured,fresh,popular],[]);
 assert.match(html,/<h3 id="hm-new-arrivals-title">Нові надходження<\/h3>/);
 assert.match(html,/<h3 id="hm-bestsellers-title">Бестселери<\/h3>/);
 assert.match(html,/Fresh laptop/);
 assert.match(html,/Popular laptop/);
 assert.doesNotMatch(html,/hm-tabs|data-home-tab/);
 const collections=homeCollections([featured,fresh,popular],[],featured);
 assert.deepEqual(collections.newArrivals.map(p=>p.id),[2]);
 assert.deepEqual(collections.bestsellers.map(p=>p.id),[3]);
});

test('homepage shows three new arrivals and six bestsellers',()=>{
 const featured={id:1,status:0,quantity:'1'};
 const fresh=Array.from({length:5},(_,i)=>({id:i+2,status:0,quantity:'1',newArrival:'true'}));
 const popular=Array.from({length:8},(_,i)=>({id:i+10,status:0,quantity:'1',bestseller:'true'}));
 const collections=homeCollections([featured,...fresh,...popular],[],featured);
 assert.equal(collections.newArrivals.length,3);
 assert.equal(collections.bestsellers.length,6);
 assert.equal(new Set([...collections.newArrivals,...collections.bestsellers].map(p=>p.id)).size,9);
});

test('homepage keeps the localized admin SEO heading and intro visible after hydration',()=>{
 const app=createStorefront({lang:'pl',esc:escapeHtml,t:value=>value,icon:()=>'',stockQty:()=>1,reviewsBlock:()=>'',compare:[]});
 const html=app.home([],[],{title:'Używane laptopy w Polsce | Hugo Media',intro:'Porównaj <modele> i ceny.\n\nSprawdź dostępność.'});
 assert.match(html,/<h1>Używane laptopy w Polsce<\/h1>/);
 assert.match(html,/<section class="hm-seo-copy"><p>Porównaj &lt;modele&gt; i ceny\.<\/p><p>Sprawdź dostępność\.<\/p><\/section>/);
});


test('out-of-stock catalog cards show status and disable ordering',()=>{
 const view=createStorefront({
  lang:'uk',
  esc:value=>escapeHtml(String(value??'')),
  t:key=>({outOfStock:'Немає в наявності',cardDetails:'Детальніше',compare:'Порівняти'}[key]||key),
  icon:()=>'<svg></svg>',
  photo:()=>'<div class="hp-photo"></div>',
  productTitle:p=>p.name,
  localizedValue:value=>value,
  priceBlock:()=>'<div class="hp-money">100 zł</div>',
  stockQty:p=>Number(p.quantity||1),
  compare:[],
 });
 const html=view.card({id:44,name:'Dell Latitude',brand:'Dell',cat:0,status:4,quantity:'1',price:100});
 assert.match(html,/hp-badge-out/);
 assert.match(html,/Немає в наявності/);
 assert.match(html,/<button[^>]*hp-card-order[^>]*disabled/);
});


test('sold products display the sold-out label and cannot be ordered',()=>{
 const view=createStorefront({
  lang:'uk',
  esc:value=>escapeHtml(String(value??'')),
  t:key=>key==='statuses'?['У наявності','Заброньовано','Розпродано','Чернетка','Немає в наявності']:{outOfStock:'Немає в наявності',cardDetails:'Детальніше',compare:'Порівняти'}[key]||key,
  icon:()=>'<svg></svg>',
  photo:()=>'<div class="hp-photo"></div>',
  productTitle:p=>p.name,
  localizedValue:value=>value,
  priceBlock:()=>'<div class="hp-money">100 zł</div>',
  stockQty:p=>Number(p.quantity||1),
  compare:[],
 });
 const html=view.card({id:45,name:'Dell Latitude',brand:'Dell',cat:0,status:2,quantity:'0',price:100});
 assert.match(html,/hp-badge-out/);
 assert.match(html,/Розпродано/);
 assert.match(html,/<button[^>]*hp-card-order[^>]*disabled/);
});
