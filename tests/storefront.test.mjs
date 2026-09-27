import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizedSpec,specLabel,filterValues,homeSelection,createStorefront} from '../src/storefront.js';
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

test('homepage keeps the localized admin SEO heading and intro visible after hydration',()=>{
 const app=createStorefront({lang:'pl',esc:escapeHtml,t:value=>value,icon:()=>'',stockQty:()=>1,reviewsBlock:()=>'',compare:[]});
 const html=app.home([],[],'new',{title:'Używane laptopy w Polsce | Hugo Media',intro:'Porównaj <modele> i ceny.\n\nSprawdź dostępność.'});
 assert.match(html,/<h1>Używane laptopy w Polsce<\/h1>/);
 assert.match(html,/<section class="hm-seo-copy"><p>Porównaj &lt;modele&gt; i ceny\.<\/p><p>Sprawdź dostępność\.<\/p><\/section>/);
});
