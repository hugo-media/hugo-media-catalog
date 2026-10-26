import test from 'node:test';
import assert from 'node:assert/strict';
import {spotlightProducts,normalizedSpec,specLabel,filterValues,homeSelection,homeCollections,createStorefront,displayBrand,availabilityRank,matchesAvailability,catalogSort,comparisonSelection,comparisonRows,productMediaUrl} from '../src/storefront.js';
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

test('homepage uses a localized campaign heading while keeping the admin SEO intro',()=>{
 const app=createStorefront({lang:'pl',esc:escapeHtml,t:value=>value,icon:()=>'',stockQty:()=>1,reviewsBlock:()=>'',compare:[]});
 const html=app.home([],[],{title:'Używane laptopy w Polsce | Hugo Media',intro:'Porównaj <modele> i ceny.\n\nSprawdź dostępność.'});
 assert.match(html,/<h1><span>Sięgaj<\/span> <span class="hm-hero-accent">po więcej\.<\/span><\/h1>/);
 assert.doesNotMatch(html,/<h1>Używane laptopy/);
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


test('expected products show a ready Telegram availability request instead of an order button',()=>{
 const view=createStorefront({
  lang:'uk',
  esc:value=>escapeHtml(String(value??'')),
  t:key=>key==='statuses'?['У наявності','Заброньовано','Розпродано','Чернетка','Немає в наявності','Очікується']:{outOfStock:'Немає в наявності',cardDetails:'Детальніше',compare:'Порівняти'}[key]||key,
  icon:()=>'<svg></svg>',
  photo:()=>'<div class="hp-photo"></div>',
  productTitle:p=>p.name,
  localizedValue:value=>value,
  priceBlock:()=>'<div class="hp-money">100 zł</div>',
  stockQty:p=>Number(p.quantity||1),
  compare:[],
  origin:'https://www.hugomedia.pl',
 });
 const html=view.card({id:46,name:'Dell Latitude',brand:'Dell',cat:0,status:5,quantity:'0',price:100});
 assert.match(html,/hp-badge-out/);
 assert.match(html,/Очікується/);
 assert.match(html,/Повідомити про наявність/);
 assert.match(html,/data-track-target="telegram_stock_request"/);
 assert.doesNotMatch(html,/<button[^>]*hp-card-order[^>]*disabled/);
 const href=html.match(/<a[^>]*hp-card-order[^>]*href="([^"]+)"/)?.[1];
 assert.ok(href);
 const link=new URL(href.replaceAll('&amp;','&'));
 assert.equal(link.hostname,'t.me');
 assert.equal(link.pathname,'/HGM_Manager');
 assert.match(link.searchParams.get('text'),/HMG-046/);
 assert.match(link.searchParams.get('text'),/https:\/\/www\.hugomedia\.pl/);
});

test('availability prioritizes orderable stock and places sold products last for every sort',()=>{
 const records=[
  {id:1,status:2,quantity:'0',price:1},
  {id:2,status:4,quantity:'0',price:2},
  {id:3,status:5,quantity:'0',price:3},
  {id:4,status:1,quantity:'1',price:4},
  {id:5,status:0,quantity:'0',price:5},
  {id:6,status:0,quantity:'1',price:100},
  {id:7,status:0,quantity:'',price:50},
  {id:8,status:3,quantity:'1',price:1},
 ];
 assert.deepEqual(records.map(availabilityRank),[4,3,2,1,3,0,0,5]);
 assert.deepEqual(records.filter(p=>matchesAvailability(p,'in-stock')).map(p=>p.id),[6,7]);
 assert.deepEqual(records.filter(p=>matchesAvailability(p,'out-of-stock')).map(p=>p.id),[2,5]);
 assert.deepEqual(records.filter(p=>matchesAvailability(p,'reserved')).map(p=>p.id),[4]);
 assert.equal(records.filter(p=>matchesAvailability(p)).length,7);
 assert.deepEqual([...records].filter(p=>matchesAvailability(p)).sort((a,b)=>catalogSort(a,b,'cheap')).map(p=>p.id),[7,6,4,3,2,5,1]);
 assert.deepEqual([...records].filter(p=>matchesAvailability(p)).sort((a,b)=>catalogSort(a,b,'expensive')).map(p=>p.id),[6,7,4,3,5,2,1]);
 assert.equal(records[0].id,1);
});

test('cards disable reserved and zero-stock orders while keeping contextual badges and useful text',()=>{
 const c={lang:'uk',esc:value=>escapeHtml(String(value??'')),t:key=>key==='statuses'?['У наявності','Заброньовано','Розпродано','Чернетка','Немає в наявності','Очікується']:{outOfStock:'Немає в наявності',bestseller:'Бестселер',newArrival:'Нове'}[key]||key,icon:()=>'',photo:()=>'<div class="hp-photo"></div>',productTitle:p=>p.name,localizedValue:value=>value,priceBlock:()=>'',stockQty:p=>p.quantity===''||p.quantity==null?1:Number(p.quantity),compare:[]};
 const view=createStorefront(c);
 for(const p of [{id:60,status:1,quantity:'1'},{id:61,status:0,quantity:'0'}]){
  const html=view.card({...p,name:'Test product',brand:'Не вказано / Nie podano',cat:6,type:'Розумні окуляри',compatibility:'Bluetooth',bluetooth:'5.2',newArrival:'true',bestseller:'true',price:200},{compact:true,collection:'best'});
  assert.match(html,/<button[^>]*hp-card-order[^>]*disabled/);
  assert.match(html,/hp-badge-best/);
  assert.doesNotMatch(html,/hp-badge-new|Не вказано|Nie podano|Bluetooth · Bluetooth/);
  assert.equal((html.match(/Bluetooth 5.2/g)||[]).length,1);
 }
 assert.equal(displayBrand('Nie podano'),'');
 assert.equal(displayBrand('Dell'),'Dell');
 assert.equal(displayBrand('Hewlett-Packard'),'Hewlett-Packard');
});

test('comparison keeps one category and normalizes capacities before selecting differences',()=>{
 const products=[{id:1,cat:0,status:0,price:1000,ram:'8 GB',ssd:'1 TB'},{id:2,cat:1,status:0,price:500,ram:'8'},{id:3,cat:0,status:0,price:1200,ram:'8',ssd:'1024'},{id:4,cat:0,status:3,price:1000}];
 const selected=comparisonSelection(products,[1,2,3,4,99]);
 assert.deepEqual(selected.map(p=>p.id),[1,3]);
 const definitions=[['price','Price'],['ram','RAM'],['ssd','SSD'],['gpu','GPU']];
 assert.deepEqual(comparisonRows(selected,definitions,false).map(row=>row[0]),['price','ram','ssd']);
 assert.deepEqual(comparisonRows(selected,definitions,true).map(row=>row[0]),['price']);
 assert.deepEqual(comparisonRows([{...selected[0],price:1200},selected[1]],definitions,true),[]);
});

test('home does not repeat its chosen hero in the daily recommendation cards',()=>{
 const p={id:1,cat:0,status:0,quantity:'1',price:1000,name:'Hero laptop',images:['hero.webp']};
 const c={lang:'uk',esc:escapeHtml,t:key=>key,icon:()=>'',stockQty:()=>1,reviewsBlock:()=>'',compare:[],homepage:{featuredProductId:1},photo:()=>'<div class="hp-photo"></div>',productTitle:p=>p.name,priceBlock:()=>'',localizedValue:value=>value,money:String};
 const html=createStorefront(c).home([p],[p]);
 assert.match(html,/hm-hero-product/);
 assert.doesNotMatch(html,/hm-daily/);
});

test('product media requires a real post path rather than a channel-only URL',()=>{
 for(const value of ['', 'https://t.me/h_m_g_pl', 'https://t.me/h_m_g_pl/', 'https://t.me/other_channel/123', 'not a link'])assert.equal(productMediaUrl(value),null);
 assert.equal(productMediaUrl('https://t.me/h_m_g_pl/123'),'https://t.me/h_m_g_pl/123');
 assert.equal(productMediaUrl('https://telegram.me/s/h_m_g_pl/123?single'),'https://t.me/h_m_g_pl/123');
 assert.equal(productMediaUrl(' https://t.me/h_m_g_pl/123?single '),'https://t.me/h_m_g_pl/123');
});


test('spotlight preserves the chosen first item and skips unavailable, duplicate, photo-less and daily-pick items',()=>{
 const base={cat:0,status:0,quantity:'1',price:1000,name:'Laptop',images:['photo.webp']};
 const items=[{...base,id:1},{...base,id:2,bestseller:'true'},{...base,id:3,newArrival:'true'},
  {...base,id:4,bestseller:'true',status:2},{...base,id:5,newArrival:'true',quantity:'0'},
  {...base,id:6,newArrival:'true',images:[]},{...base,id:7,bestseller:'true'}];
 assert.deepEqual(spotlightProducts(items,[items[6]],1).map(p=>p.id),[1,2,3]);
 assert.equal(spotlightProducts(items,[],3)[0].id,3);
 assert.equal(spotlightProducts([{...base,id:1,status:2}],[],1).length,0);
 assert.equal(spotlightProducts([items[0]],[],1).length,1);
});

test('spotlight uses localized native controls and one usable product link before enhancement',()=>{
 const base={cat:0,status:0,quantity:'1',price:1000,images:['photo.webp']};
 const products=[{...base,id:1,name:'Chosen <laptop>'},{...base,id:2,name:'Bestseller',bestseller:'true'}];
 const c={lang:'pl',esc:escapeHtml,t:key=>key,icon:()=>'',stockQty:()=>1,reviewsBlock:()=>'',compare:[],homepage:{featuredProductId:1,featuredLabel:{pl:'Wybrany model'}},photo:(p,o)=>'<div class="hp-photo" data-priority="'+o?.priority+'"></div>',productTitle:p=>p.name,priceBlock:()=>'',localizedValue:value=>value,money:String};
 const html=createStorefront(c).home(products,[]);
 assert.match(html,/Poznaj bliżej/);
 assert.match(html,/Wybrany model/);
 assert.match(html,/Następny produkt/);
 assert.match(html,/data-spotlight-toggle hidden/);
 assert.match(html,/aria-hidden="true" inert/);
 assert.match(html,/Chosen &lt;laptop&gt;/);
 assert.equal((html.match(/data-priority="true"/g)||[]).length,1);
 assert.equal((html.match(/data-spotlight-slide/g)||[]).length,2);
 const single=createStorefront(c).home([products[0]],[]);
 assert.doesNotMatch(single,/data-spotlight-toggle|data-spotlight-controls/);
});

test('manual carousel order reserves later choices, replaces missing slots and never repeats products',()=>{
 const base={cat:0,status:0,quantity:'1',price:1000,images:['photo.webp']};
 const rows=[{...base,id:1},{...base,id:2,bestseller:'true'},{...base,id:3,newArrival:'true'},{...base,id:4},{...base,id:5,status:2}];
 const ids=slots=>spotlightProducts(rows,[],1,slots).map(p=>p.id);
 assert.deepEqual(ids([3,1,2]),[3,1,2]);
 assert.deepEqual(ids([null,2,3]),[1,2,3]);
 assert.deepEqual(ids([5,1,2]),[3,1,2]);
 assert.equal(new Set(ids([1,1,2])).size,3);
 assert.deepEqual(spotlightProducts(rows,[rows[1]],1,[3,2,1]).map(p=>p.id),[3,2,1]);
 const unavailable=rows.map(p=>({...p,status:2}));
 assert.deepEqual(spotlightProducts(unavailable,[],1,[1,2,3]),[]);
 assert.deepEqual(spotlightProducts([rows[0]],[],1,[3,null,1]).map(p=>p.id),[1]);
});
