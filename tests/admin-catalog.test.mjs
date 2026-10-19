import test from 'node:test';
import assert from 'node:assert/strict';
import {filterAdminProducts,normalizeQuickFields,planQuickChanges,quickValue,planMarkToggle,adminGroupCounts} from '../src/admin-catalog-core.js';
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


test('group tabs combine search and category filters and count overlapping memberships independently',()=>{
 const products=[{...p,newArrival:'true',bestseller:'true'},{...p,id:44,name:'HP',brand:'HP',newArrival:'true'},{...p,id:45,cat:1,bestseller:'true'}];
 assert.deepEqual(adminGroupCounts(products),{all:3,new:2,best:2});
 assert.deepEqual(adminGroupCounts(products,{category:'0',group:'best'}),{all:2,new:2,best:1});
 assert.deepEqual(filterAdminProducts(products,{group:'best',category:'0'}).map(p=>p.id),[43]);
 assert.deepEqual(filterAdminProducts(products,{group:'new',search:'apple'}).map(p=>p.id),[43]);
 assert.deepEqual(adminGroupCounts(products,{search:'missing'}),{all:0,new:0,best:0});
});
test('mark toggles change one allowed field and retain version expectations, prices and the other group',()=>{
 const product={...p,newArrival:'true',bestseller:'',salePrice:'1111'};
 assert.deepEqual(planMarkToggle(product,'bestseller'),[{id:p.id,expected_updated_at:stamp,fields:{bestseller:'true'}}]);
 assert.deepEqual(planMarkToggle(product,'newArrival'),[{id:p.id,expected_updated_at:stamp,fields:{newArrival:''}}]);
 assert.equal(product.salePrice,'1111');assert.equal(product.newArrival,'true');
 for(const field of ['price','status','salePrice','specs','__proto__'])assert.throws(()=>planMarkToggle(product,field),/validation/);
});

function markHarness(update){
 const dictionary={manage:'Товари',newProduct:'Додати товар',category:'Категорія',status:'Статус',categories:['Ноутбуки','Телефони'],statuses:['В наявності','Резерв','Розпродано','Чернетка','Немає','Очікується'],newArrival:'Новинка',bestseller:'Бестселер',edit:'Редагувати',duplicate:'Дублювати',delete:'Видалити',name:'Назва'};
 const writes=[],notices=[];
 let renderCount=0,refreshCount=0;
 const c={root:{querySelector:()=>null},admin:true,view:'admin',lang:'uk',products:[{...p,newArrival:'true',bestseller:''}],
 t:key=>dictionary[key]||key,esc:value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),money:String,icon:()=>'',photoUrl:()=>'',refreshIcons:()=>{},
 render:()=>{renderCount++;},notify:value=>notices.push(value),refresh:async()=>{refreshCount++;},
 applyProducts:rows=>{c.products=c.products.map(p=>rows.find(row=>row.id===p.id)||p);},
 db:{quickUpdateProducts:async changes=>{writes.push(changes);return update?update(changes,c):changes.map(change=>({...c.products.find(p=>p.id===change.id),...change.fields,updated_at:'2026-10-19T06:50:00Z'}));}}};
 const ui=createAdminCatalog(c);
 const button=(field='bestseller',id=43)=>({dataset:{adminMark:field,adminProduct:String(id)},closest:()=>({}),hasAttribute:key=>key==='data-admin-mark'});
 const group=key=>({dataset:{adminGroup:key},closest:()=>({}),hasAttribute:attr=>attr==='data-admin-group'});
 return {c,ui,writes,notices,button,group,get renderCount(){return renderCount;},get refreshCount(){return refreshCount;}};
}
test('one click confirms a saved group flag without opening or redrawing the catalog',async()=>{
 const h=markHarness();await h.ui.handleClick(h.button());
 assert.equal(h.writes.length,1);assert.equal(h.c.products[0].bestseller,'true');assert.equal(h.c.products[0].newArrival,'true');
 assert.equal(h.c.products[0].price,p.price);assert.equal(h.renderCount,0);
 assert.match(h.ui.render(),/data-admin-mark="bestseller" data-admin-product="43" aria-pressed="true"/);
 assert.match(h.ui.render(),/Збережено/);
 await h.ui.handleClick(h.button());assert.equal(h.c.products[0].bestseller,'');
});
test('pending clicks do not pretend to save or issue a duplicate write',async()=>{
 let release;
 const h=markHarness((changes,c)=>new Promise(resolve=>{release=()=>resolve([{...c.products[0],bestseller:'true',updated_at:'2026-10-19T06:50:00Z'}]);}));
 const pending=h.ui.handleClick(h.button());
 assert.equal(h.writes.length,1);assert.equal(h.c.products[0].bestseller,'');
 assert.match(h.ui.render(),/Зберігаю позначку…/);
 await h.ui.handleClick(h.button());assert.equal(h.writes.length,1);
 release();await pending;assert.equal(h.c.products[0].bestseller,'true');
});
test('failed, conflicting or unconfirmed saves retain the old flag and show a retryable message',async()=>{
 for(const mode of ['offline','editConflict','unconfirmed']){
  const h=markHarness((changes,c)=>{if(mode==='unconfirmed')return [{...c.products[0]}];throw Error(mode);});
  await h.ui.handleClick(h.button());
  assert.equal(h.c.products[0].bestseller,'');assert.equal(h.refreshCount,1);assert.equal(h.renderCount,0);
  assert.match(h.ui.render(),/hm-admin-mark-feedback is-error/);
  assert.match(h.ui.render(),/aria-pressed="false"/);
 }
});
test('unprivileged, non-admin-view and invalid mark clicks cannot issue writes',async()=>{
 const h=markHarness();
 h.c.admin=false;await h.ui.handleClick(h.button());assert.equal(h.writes.length,0);
 h.c.admin=true;h.c.view='catalog';await h.ui.handleClick(h.button());assert.equal(h.writes.length,0);
 h.c.view='admin';await h.ui.handleClick(h.button('price'));assert.equal(h.writes.length,0);
});
test('removing a flag while viewing its group removes the row and updates the group counter',async()=>{
 const h=markHarness();await h.ui.handleClick(h.group('new'));
 assert.match(h.ui.render(),/data-admin-row="43"/);
 await h.ui.handleClick(h.button('newArrival'));
 const html=h.ui.render();assert.doesNotMatch(html,/data-admin-row="43"/);
 assert.match(html,/data-admin-group="new" aria-pressed="true"[^>]*><span>Нові надходження<\/span><b>0<\/b>/);
});
test('saving a mark preserves an unsaved price draft and rebases it onto the returned version',async()=>{
 const h=markHarness();
 const form={dataset:{adminQuickForm:'43'},querySelector:()=>({disabled:false,innerHTML:''}),closest:()=>({classList:{toggle:()=>{}}})};
 h.ui.handleInput({hasAttribute:key=>key==='data-admin-quick-input',closest:()=>form,name:'price',value:'1500'});
 await h.ui.handleClick(h.button());
 const html=h.ui.render();assert.match(html,/name="price"[^>]*value="1500"/);
 assert.doesNotMatch(html,/Товар змінився в іншому місці/);
 await h.ui.handleSubmit({matches:()=>true,hasAttribute:key=>key==='data-admin-quick-form',dataset:{adminQuickForm:'43'}});
 assert.equal(h.writes[1][0].expected_updated_at,'2026-10-19T06:50:00Z');
 assert.deepEqual(h.writes[1][0].fields,{price:1500});
});

test('changing the catalog view during a pending save restores the new view to an enabled state',async()=>{
 let release;
 const h=markHarness((changes,c)=>new Promise(resolve=>{release=()=>resolve([{...c.products[0],bestseller:'true',updated_at:'2026-10-19T06:50:00Z'}]);}));
 const block=()=>({querySelectorAll:()=>[],setAttribute:()=>{},classList:{toggle:()=>{}}});
 let current=block();h.c.root.querySelector=selector=>selector==='[data-admin-catalog]'?current:null;
 const pending=h.ui.handleClick(h.button());
 current=block();h.c.lang='pl';release();await pending;
 assert.equal(h.c.products[0].bestseller,'true');assert.equal(h.renderCount,0);
 assert.match(h.ui.render(),/aria-busy="false"/);
});

test('independent product mark saves proceed together while duplicate clicks on one row are ignored',async()=>{
 const release=new Map(),h=markHarness((changes,c)=>new Promise(resolve=>release.set(changes[0].id,()=>resolve([{...c.products.find(p=>p.id===changes[0].id),...changes[0].fields,updated_at:'2026-10-19T07:00:00Z'}]))));
 h.c.products.push({...h.c.products[0],id:44,name:'Dell'});
 const first=h.ui.handleClick(h.button('bestseller',43));
 const second=h.ui.handleClick(h.button('newArrival',44));
 await h.ui.handleClick(h.button('newArrival',43));
 assert.equal(h.writes.length,2);
 release.get(43)();await first;release.get(44)();await second;
 assert.equal(h.c.products[0].bestseller,'true');assert.equal(h.c.products[1].newArrival,'');
 assert.equal(h.renderCount,0);
});
test('active marks explain removal explicitly and invalid version errors are visible',async()=>{
 const h=markHarness();h.c.products[0].bestseller='true';
 assert.match(h.ui.render(),/aria-label="Прибрати: Бестселер/);
 h.c.products[0].updated_at='';
 await h.ui.handleClick(h.button());
 assert.equal(h.writes.length,0);
 assert.match(h.ui.render(),/Не вдалося підготувати зміну/);
});
