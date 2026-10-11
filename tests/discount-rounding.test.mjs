import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {effectivePrice,configuration,orderText,toRow,fromRow} from '../src/core.js';
import {quickPricePreview} from '../src/admin-catalog-core.js';
import {createAdminCatalog} from '../src/admin-catalog.js';
import {metadata,productPath,escapeHtml} from '../src/seo-core.js';
import {servePage} from '../api/seo.js';

const p={id:8,name:'Dell Latitude 7400',brand:'Dell',cat:0,status:0,price:1250,discount:'5',quantity:'1',ram:'8',ssd:'256',images:[],updated_at:'2026-10-11T10:00:00Z',descUk:'Ноутбук Dell',descPl:'Laptop Dell'};

test('percentage promotions round up and down to whole PLN for every category',()=>{
 for(const [price,discount,expected] of [[1250,5,1188],[1299,17,1078],[350,29,249],[399,25,299],[65,23,50]]) {
  for(let cat=0;cat<=6;cat++)assert.equal(effectivePrice(fromRow(toRow({...p,cat,price,discount:String(discount)}))),expected);
 }
 assert.equal(effectivePrice({...p,price:10.15,discount:'0'}),10.15);
 assert.equal(effectivePrice({...p,price:350,discount:'29',salePrice:'250'}),250);
});

test('rounded product price agrees with configuration, addons and Telegram totals',()=>{
 const sale={...p,bundles:'mouse',ram16Enabled:'true',ram16Price:'99'};
 assert.equal(configuration(sale,'mouse',{ram:'ram16'}).total,1332);
 const text=orderText([sale],'uk','',{8:'mouse'},{8:{ram:'ram16'}});
 assert.match(text,/1188.00 zł/);assert.match(text,/Разом: 1332.00 zł/);
 assert.equal(effectivePrice(quickPricePreview(p,{discount:17})),1038);
});

test('quick-edit rows preview the same rounded selling price',()=>{
 const dict={categories:['Ноутбуки'],statuses:['У наявності','Резерв','Розпродано','Чернетка','Немає','Очікується']};
 const ui=createAdminCatalog({root:{querySelector:()=>null},admin:true,view:'admin',lang:'uk',products:[p],t:k=>dict[k]||k,esc:escapeHtml,money:n=>String(n),icon:()=>'',photoUrl:()=>'',refreshIcons:()=>{}});
 const html=ui.render();
 assert.match(html,/data-admin-final[^>]*>[^<]*<strong>1188 zł<\/strong>/);
 assert.doesNotMatch(html,/1187.5/);
});

test('Google offers and server-rendered product pages use the rounded price',async()=>{
 const item=metadata({lang:'uk',view:'detail',product:p}).schema['@graph'].find(x=>x['@type']==='Product');
 assert.equal(item.offers.price,'1188.00');
 const template=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const r=await servePage(new URL('https://www.hugomedia.pl'+productPath(p,'uk')),{template,config:{supabaseUrl:'https://example.supabase.co',supabaseKey:'sb_publishable_example'},loadProducts:async()=>[p]});
 assert.equal(r.status,200);assert.match(r.body,/"price":"1188.00"/);assert.match(r.body,/1188.00 zł/);assert.doesNotMatch(r.body,/1187.50/);
});
