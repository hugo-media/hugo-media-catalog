import test from 'node:test';
import assert from 'node:assert/strict';
import {filterAdminProducts,normalizeQuickFields,planQuickChanges,quickValue} from '../src/admin-catalog-core.js';
import {createAdminCatalog} from '../src/admin-catalog.js';
const stamp='2026-10-10T12:00:00Z';
const p={id:43,name:'MacBook Air Rose Gold',brand:'Apple',cat:0,status:0,price:1299,discount:'10',quantity:'1',updated_at:stamp,images:[],ram:'8',ssd:'128'};
test('admin search finds model, brand and padded HMG ID and combines filters',()=>{
 const rows=[p,{...p,id:44,name:'HP EliteBook',brand:'HP',status:5,newArrival:'true'},{...p,id:45,name:'Dell',brand:'Dell',bestseller:'true',quantity:'0'}];
 assert.deepEqual(filterAdminProducts(rows,{search:'HMG-043'}).map(p=>p.id),[43]);
 assert.deepEqual(filterAdminProducts(rows,{search:'apple rose'}).map(p=>p.id),[43]);
 assert.deepEqual(filterAdminProducts(rows,{status:'5',mark:'new'}).map(p=>p.id),[44]);
 assert.deepEqual(filterAdminProducts(rows,{mark:'best'}).map(p=>p.id),[45]);
 assert.deepEqual(filterAdminProducts(rows,{mark:'empty'}).map(p=>p.id),[45]);
 assert.equal(filterAdminProducts(rows,{category:'1'}).length,0);
});
test('price sorting and quick preview use discounted prices; empty quantity means one',()=>{
 const rows=[p,{...p,id:44,price:1300,discount:'50'}];
 assert.deepEqual(filterAdminProducts(rows,{sort:'priceAsc'}).map(p=>p.id),[44,43]);
 assert.equal(quickValue({...p,quantity:''},'quantity'),1);
 assert.equal(quickValue({...p,bestseller:true},'bestseller'),'');
});
test('quick edits validate ranges, cents and an explicit field whitelist',()=>{
 assert.deepEqual(normalizeQuickFields({price:'1234,567',discount:'9',quantity:'0',status:'5',bestseller:'true'}),{price:1234.57,discount:9,quantity:0,status:5,bestseller:'true'});
 for(const fields of [{price:''},{price:null},{price:true},{price:-1},{price:10000001},{discount:100},{discount:1.5},{quantity:100},{quantity:-1},{status:6},{newArrival:'false'},{name:'cannot edit here'},{specs:{}},{}])assert.throws(()=>normalizeQuickFields(fields),/validation/);
});
test('bulk plans contain only requested changes and immutable version expectations',()=>{
 const second={...p,id:44,discount:'20',quantity:'2'};
 const before=JSON.stringify([p,second]);
 assert.deepEqual(planQuickChanges([p,second],[43,44],{discount:20}),[{id:43,expected_updated_at:stamp,fields:{discount:20}}]);
 assert.deepEqual(planQuickChanges([p],[43],{price:1299,discount:10,quantity:1,status:0}),[]);
 assert.equal(JSON.stringify([p,second]),before);
 for(const ids of [[],[43,43],[999],Array.from({length:101},(_,i)=>i+1)])assert.throws(()=>planQuickChanges([p],ids,{discount:20}));
 assert.throws(()=>planQuickChanges([{...p,updated_at:''}],[43],{discount:20}),/editConflict/);
});
test('admin rows escape product content and render labeled quick controls in UA and PL',()=>{
 const dictionary={manage:'Товари',newProduct:'Додати товар',category:'Категорія',status:'Статус',categories:['Ноутбуки','Телефони'],statuses:['В наявності','Резерв','Розпродано','Чернетка','Немає','Очікується'],newArrival:'Новинка',bestseller:'Бестселер',edit:'Редагувати',duplicate:'Дублювати',delete:'Видалити',name:'Назва'};
 const context={root:{querySelector:()=>null},admin:true,view:'admin',lang:'uk',products:[{...p,name:'MacBook <script>alert(1)</script>'}],t:key=>dictionary[key]||key,esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money:n=>String(n),icon:()=>'',photoUrl:()=>'',refreshIcons:()=>{}};
 const ui=createAdminCatalog(context);
 const uk=ui.render();
 assert.match(uk,/MacBook &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
 assert.doesNotMatch(uk,/<script>/);
 for(const field of ['price','discount','quantity','status'])assert.ok(uk.includes('name="'+field+'"'));
 assert.match(uk,/Після знижки/);assert.match(uk,/Зберегти рядок/);
 assert.match(uk,/id="hm-admin-search"/);assert.match(uk,/id="hm-admin-bulk-form"/);
 context.lang='pl';assert.match(ui.render(),/Zapisz wiersz/);assert.match(ui.render(),/Zmiana zbiorcza/);
});
