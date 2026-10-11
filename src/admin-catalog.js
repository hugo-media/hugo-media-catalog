import {discountPercent,effectivePrice} from './core.js';
import {filterAdminProducts,normalizeQuickFields,planQuickChanges,quickValue,quickPricePreview} from './admin-catalog-core.js';

export function createAdminCatalog(c) {
 const E=c.esc,L=(u,p)=>c.lang==='pl'?p:u;
 const q=selector=>c.root.querySelector(selector);
 const filters={search:'',category:'',status:'',mark:'',sort:'updated'};
 const selected=new Set(),drafts=new Map();
 let bulkField='discount',bulkValue='0',preview=null,busy=false,message='',error=false;
 const option=(value,label,current)=>`<option value="${E(value)}" ${String(value)===String(current)?'selected':''}>${E(label)}</option>`;
 const labels=()=>({price:L('Ціна, zł','Cena, zł'),discount:L('Знижка, %','Rabat, %'),quantity:L('Кількість','Ilość'),status:c.t('status'),newArrival:L('Нові надходження','Nowości'),bestseller:L('Бестселери','Bestsellery')});
 const rows=()=>filterAdminProducts(c.products,filters);
 function cleanSelection(){const ids=new Set(c.products.map(p=>p.id));for(const id of selected)if(!ids.has(id))selected.delete(id);}
 function rawFields(p){return {price:String(p.price),discount:String(discountPercent(p)),quantity:String(quickValue(p,'quantity')),status:String(p.status)};}
 function dirty(id){const d=drafts.get(id);if(!d)return false;try{return planQuickChanges([d.base],[id],d.fields).length>0;}catch{return true;}}
 function productRow(p){
  const d=drafts.get(p.id),fields=d?.fields||rawFields(p),changed=dirty(p.id),stale=d&&d.base.updated_at!==p.updated_at;
  let final=effectivePrice(p);try{const parsed=normalizeQuickFields(fields);final=effectivePrice(quickPricePreview(p,parsed));}catch{final=null;}
  const title=E(p.name),id=`HMG-${String(p.id).padStart(3,'0')}`,disabled=busy?'disabled':'';
  return `<article class="hm-admin-product ${changed?'is-dirty':''}" data-admin-row="${p.id}">
   <div class="hm-admin-product-head"><label class="hm-admin-checkbox"><input type="checkbox" data-admin-select="${p.id}" aria-label="${E(L('Обрати','Wybierz'))} ${title}" ${selected.has(p.id)?'checked':''} ${disabled}></label>${p.images?.[0]?`<img class="hm-admin-thumb" src="${E(c.photoUrl(p.images[0]))}" alt="" loading="lazy">`:''}<div><h3>${title}</h3><p>${id} · ${E(c.t('categories')[p.cat])} · ${E(p.brand)}</p><div class="hm-admin-badges">${p.newArrival==='true'?`<span>${E(c.t('newArrival'))}</span>`:''}${p.bestseller==='true'?`<span>${E(c.t('bestseller'))}</span>`:''}</div></div></div>
   <form data-admin-quick-form="${p.id}" class="hm-admin-quick-form"><fieldset ${disabled}><legend class="hm-admin-sr">${E(L('Швидке редагування','Szybka edycja'))} ${title}</legend><div class="hm-admin-fields">${['price','discount','quantity'].map(key=>`<label class="hp-field"><span>${E(labels()[key])}</span><input data-admin-quick-input name="${key}" type="number" inputmode="${key==='price'?'decimal':'numeric'}" min="0" max="${key==='price'?10000000:99}" step="${key==='price'?'0.01':'1'}" required value="${E(fields[key])}"></label>`).join('')}<label class="hp-field"><span>${E(c.t('status'))}</span><select data-admin-quick-input name="status">${c.t('statuses').map((s,i)=>option(i,s,fields.status)).join('')}</select></label></div><div class="hm-admin-row-bottom"><span data-admin-final>${E(L('Після знижки','Po rabacie'))}: <strong>${final===null?'—':E(c.money(final))+' zł'}</strong></span><div><button type="button" class="hp-button" data-admin-reset="${p.id}" ${(!changed&&!stale)||busy?'disabled':''}>${E(stale?L('Взяти актуальні дані','Pobierz aktualne dane'):L('Скасувати','Anuluj'))}</button><button type="submit" class="hp-button hp-primary" data-admin-save-button ${!changed||busy||stale?'disabled':''}>${c.icon('check')}${E(L('Зберегти рядок','Zapisz wiersz'))}</button></div></div>${stale?`<p class="hm-admin-warning">${E(L('Товар змінився в іншому місці. Візьми актуальні дані перед новим редагуванням.','Produkt został zmieniony w innym miejscu. Pobierz aktualne dane przed ponowną edycją.'))}</p>`:''}</fieldset></form>
   <div class="hp-admin-actions hm-admin-full-actions"><button type="button" data-edit="${p.id}" aria-label="${E(c.t('edit'))}: ${title}" ${disabled}>${c.icon('pencil')}</button><button type="button" data-duplicate="${p.id}" aria-label="${E(c.t('duplicate'))}: ${title}" ${disabled}>${c.icon('copy')}</button><button type="button" data-delete="${p.id}" aria-label="${E(c.t('delete'))}: ${title}" ${disabled}>${c.icon('trash-2')}</button></div>
  </article>`;
 }
 function valueControl(){
  if(bulkField==='discount')return `<input id="hm-admin-bulk-value" type="number" inputmode="numeric" min="0" max="99" step="1" required value="${E(bulkValue)}">`;
  if(bulkField==='status')return `<select id="hm-admin-bulk-value">${c.t('statuses').map((s,i)=>option(i,s,bulkValue)).join('')}</select>`;
  return `<select id="hm-admin-bulk-value">${option('true',L('Так','Tak'),bulkValue)}${option('',L('Ні','Nie'),bulkValue)}</select>`;
 }
 function formatValue(p,field,value){
  if(field==='discount')return `${value}% · ${c.money(effectivePrice(quickPricePreview(p,{discount:value})))} zł`;
  if(field==='status')return c.t('statuses')[Number(value)];
  return value==='true'?L('Так','Tak'):L('Ні','Nie');
 }
 function previewMarkup(){
  if(!preview)return '';
  return `<section class="hm-admin-review" aria-labelledby="hm-admin-review-title"><h3 id="hm-admin-review-title">${E(L('Перевір масові зміни','Sprawdź zmiany zbiorcze'))}</h3><p>${E(L('Будуть змінені тільки ці товари.','Zmienią się tylko te produkty.'))} ${preview.changes.length} ${E(L('із вибраних','z wybranych'))} ${selected.size}.</p><div class="hp-table-scroll"><table><thead><tr><th>${E(c.t('name'))}</th><th>${E(L('Було','Przed'))}</th><th>${E(L('Буде','Po'))}</th></tr></thead><tbody>${preview.changes.map(change=>{const p=preview.products.find(p=>p.id===change.id);return `<tr><th>${E(p.name)}<small>HMG-${String(p.id).padStart(3,'0')}</small></th><td>${E(formatValue(p,preview.field,quickValue(p,preview.field)))}</td><td>${E(formatValue(p,preview.field,preview.fields[preview.field]))}</td></tr>`;}).join('')}</tbody></table></div><div class="hm-admin-review-actions"><button type="button" class="hp-button" data-admin-cancel-preview ${busy?'disabled':''}>${E(L('Скасувати','Anuluj'))}</button><button type="button" class="hp-button hp-primary" data-admin-apply ${busy?'disabled':''}>${E(L('Зберегти зміни для','Zapisz zmiany dla'))} ${preview.changes.length} ${E(L('товарів','produktów'))}</button></div></section>`;
 }
 function render(){
  cleanSelection();const visible=rows();
  return `<section class="hm-admin-catalog" data-admin-catalog aria-busy="${busy}"><div class="hp-intro"><div><h1>${E(c.t('manage'))}</h1><p class="hp-muted">${E(L('Ціну, знижку, кількість і статус можна змінити прямо тут.','Cenę, rabat, ilość i status możesz zmienić tutaj.'))}</p></div><button type="button" class="hp-button hp-primary" id="hp-new" ${busy?'disabled':''}>${c.icon('plus')}${E(c.t('newProduct'))}</button></div>
  <div class="hm-admin-filters"><label class="hp-field hm-admin-search"><span>${E(L('Пошук товарів','Szukaj produktów'))}</span><input id="hm-admin-search" type="search" value="${E(filters.search)}" placeholder="${E(L('Назва, бренд або HMG-номер','Nazwa, marka lub numer HMG'))}"></label><label class="hp-field"><span>${E(c.t('category'))}</span><select data-admin-filter="category">${option('',L('Усі категорії','Wszystkie kategorie'),filters.category)}${c.t('categories').map((x,i)=>option(i,x,filters.category)).join('')}</select></label><label class="hp-field"><span>${E(c.t('status'))}</span><select data-admin-filter="status">${option('',L('Усі статуси','Wszystkie statusy'),filters.status)}${c.t('statuses').map((x,i)=>option(i,x,filters.status)).join('')}</select></label><label class="hp-field"><span>${E(L('Позначки','Oznaczenia'))}</span><select data-admin-filter="mark">${[['',L('Усі товари','Wszystkie produkty')],['new',c.t('newArrival')],['best',c.t('bestseller')],['discount',L('Зі знижкою','Z rabatem')],['empty',L('Кількість — 0','Ilość — 0')]].map(([v,l])=>option(v,l,filters.mark)).join('')}</select></label><label class="hp-field"><span>${E(L('Сортування','Sortowanie'))}</span><select data-admin-filter="sort">${[['updated',L('Нещодавно змінені','Ostatnio zmienione')],['name',L('За назвою','Nazwa')],['priceAsc',L('Від дешевих','Od najtańszych')],['priceDesc',L('Від дорогих','Od najdroższych')]].map(([v,l])=>option(v,l,filters.sort)).join('')}</select></label><button type="button" class="hp-button" data-admin-clear-filters>${E(L('Скинути фільтри','Wyczyść filtry'))}</button></div>
  <div class="hm-admin-summary"><span id="hm-admin-result-count">${visible.length} / ${c.products.length} ${E(L('товарів','produktów'))}</span><span id="hm-admin-draft-count"></span></div><form id="hm-admin-bulk-form" class="hm-admin-bulk"><label class="hm-admin-select-all"><input id="hm-admin-select-all" type="checkbox" ${busy?'disabled':''}>${E(L('Обрати показані','Wybierz widoczne'))}</label><strong id="hm-admin-selected-count">${E(L('Обрано','Wybrano'))}: ${selected.size}</strong><label class="hp-field"><span>${E(L('Масова дія','Zmiana zbiorcza'))}</span><select id="hm-admin-bulk-field" ${busy?'disabled':''}>${['discount','newArrival','bestseller','status'].map(key=>option(key,labels()[key],bulkField)).join('')}</select></label><label class="hp-field"><span>${E(L('Нове значення','Nowa wartość'))}</span><span id="hm-admin-bulk-control">${valueControl()}</span></label><button type="submit" class="hp-button" id="hm-admin-review-button" ${!selected.size||busy?'disabled':''}>${E(L('Переглянути зміни','Sprawdź zmiany'))}</button><button type="button" class="hp-button" data-admin-clear-selection ${!selected.size||busy?'disabled':''}>${E(L('Зняти вибір','Odznacz'))}</button><small>${E(L('До 100 товарів за одну операцію. При зміні пошуку або фільтрів вибір скидається.','Do 100 produktów w jednej operacji. Zmiana wyszukiwania lub filtrów usuwa zaznaczenie.'))}</small></form>
  <div id="hm-admin-message" role="${error?'alert':'status'}" class="hm-admin-message ${error?'is-error':''}" ${message?'':'hidden'}>${E(message)}</div><div id="hm-admin-bulk-preview">${previewMarkup()}</div><div id="hm-admin-results" class="hp-admin-list">${visible.map(productRow).join('')||`<div class="hp-empty">${E(L('Нічого не знайдено. Зміни пошук або скинь фільтри.','Brak wyników. Zmień wyszukiwanie lub usuń filtry.'))}</div>`}</div><div class="hm-admin-selection-bar" id="hm-admin-selection-bar" ${selected.size?'':'hidden'}><strong id="hm-admin-mobile-count">${E(L('Обрано','Wybrano'))}: ${selected.size}</strong><button type="button" class="hp-button hp-primary" data-admin-goto-bulk>${E(L('Масова зміна','Zmiana zbiorcza'))}</button></div></section>`;
 }
 function sync(){
  if(busy)q('[data-admin-catalog]')?.querySelectorAll('input,select,button').forEach(el=>el.disabled=true);
  const list=rows(),checkbox=q('#hm-admin-select-all');if(checkbox){checkbox.checked=list.length>0&&list.every(p=>selected.has(p.id));checkbox.indeterminate=list.some(p=>selected.has(p.id))&&!checkbox.checked;}
  const bar=q('#hm-admin-selection-bar');if(bar)bar.hidden=!selected.size;const mobile=q('#hm-admin-mobile-count');if(mobile)mobile.textContent=L('Обрано','Wybrano')+': '+selected.size;q('[data-admin-catalog]')?.classList.toggle('has-selection',selected.size>0);
  const count=q('#hm-admin-selected-count');if(count)count.textContent=L('Обрано','Wybrano')+': '+selected.size;
  const dirtyCount=[...drafts.keys()].filter(dirty).length,draftCount=q('#hm-admin-draft-count');if(draftCount)draftCount.textContent=dirtyCount?L('Незбережених рядків','Niezapisane wiersze')+': '+dirtyCount:'';
  const review=q('#hm-admin-review-button');if(review)review.disabled=!selected.size||busy;
  const clear=q('[data-admin-clear-selection]');if(clear)clear.disabled=!selected.size||busy;
  const notice=q('#hm-admin-message');if(notice){notice.textContent=message;notice.hidden=!message;notice.setAttribute('role',error?'alert':'status');notice.classList.toggle('is-error',error);}
  const previewEl=q('#hm-admin-bulk-preview');if(previewEl)previewEl.innerHTML=previewMarkup();
 }
 function renderResults(){
  cleanSelection();const list=rows(),results=q('#hm-admin-results');if(results)results.innerHTML=list.map(productRow).join('')||`<div class="hp-empty">${E(L('Нічого не знайдено. Зміни пошук або скинь фільтри.','Brak wyników. Zmień wyszukiwanie lub usuń filtry.'))}</div>`;
  const count=q('#hm-admin-result-count');if(count)count.textContent=`${list.length} / ${c.products.length} `+L('товарів','produktów');
  sync();c.refreshIcons();
 }
 function handleInput(el){
  if(!c.admin||c.view!=='admin'||busy)return false;
  if(el.id==='hm-admin-search'){filters.search=el.value;selected.clear();preview=null;message='';renderResults();return true;}
  if(el.id==='hm-admin-bulk-value'){bulkValue=el.value;preview=null;sync();return true;}
  if(el.hasAttribute('data-admin-quick-input')){
   const form=el.closest('[data-admin-quick-form]'),id=Number(form?.dataset.adminQuickForm),p=c.products.find(p=>p.id===id);if(!p)return true;
   const d=drafts.get(id)||{base:{...p},fields:rawFields(p)};d.fields[el.name]=el.value;drafts.set(id,d);preview=null;
   const changed=dirty(id),stale=d.base.updated_at!==p.updated_at;if(!changed&&!stale)drafts.delete(id);form.closest('[data-admin-row]').classList.toggle('is-dirty',changed);
   form.querySelector('[data-admin-save-button]').disabled=!changed||stale;form.querySelector('[data-admin-reset]').disabled=!changed&&!stale;
   let final=null;try{final=effectivePrice(quickPricePreview(p,d.fields));}catch{}
   form.querySelector('[data-admin-final]').innerHTML=`${E(L('Після знижки','Po rabacie'))}: <strong>${final===null?'—':E(c.money(final))+' zł'}</strong>`;
   sync();return true;
  }
  return false;
 }
 function handleChange(el){
  if(!c.admin||c.view!=='admin'||busy)return false;
  if(el.dataset.adminFilter){filters[el.dataset.adminFilter]=el.value;selected.clear();preview=null;message='';renderResults();return true;}
  if(el.dataset.adminSelect){const id=Number(el.dataset.adminSelect);if(el.checked&&selected.size>=100){el.checked=false;message=L('Можна обрати до 100 товарів.','Możesz wybrać do 100 produktów.');error=true;}else{el.checked?selected.add(id):selected.delete(id);message='';}preview=null;sync();return true;}
  if(el.id==='hm-admin-select-all'){selected.clear();if(el.checked)rows().slice(0,100).forEach(p=>selected.add(p.id));preview=null;renderResults();return true;}
  if(el.id==='hm-admin-bulk-field'){bulkField=el.value;bulkValue=bulkField==='discount'||bulkField==='status'?'0':'true';preview=null;q('#hm-admin-bulk-control').innerHTML=valueControl();sync();return true;}
  return handleInput(el);
 }
 async function persist(changes){
  if(busy||!c.admin)return;
  if(!changes.length){message=L('Значення вже такі — змін немає.','Wartości są już takie — brak zmian.');error=false;sync();return;}
  busy=true;error=false;message=L('Зберігаю зміни…','Zapisuję zmiany…');c.render();
  try{
   const saved=await c.db.quickUpdateProducts(changes);c.applyProducts(saved);
   for(const change of changes)drafts.delete(change.id);
   selected.clear();preview=null;message=L('Збережено товарів','Zapisano produktów')+': '+saved.length+'.';c.notify(message);
  }catch(e){
   error=true;message=/editConflict/.test(e.message||'')?L('Товар змінився в іншому місці. Масові зміни не застосовані. Перевір актуальні дані та повтори вибір.','Produkt zmienił się w innym miejscu. Zmiany zbiorcze nie zostały zapisane. Sprawdź aktualne dane i wybierz ponownie.'):/notAdmin|permission/i.test(e.message||'')?L('Увійди в адмінку повторно.','Zaloguj się ponownie.'):L('Не вдалося підтвердити збереження. Перевір з’єднання й актуальні значення перед повторною спробою.','Nie udało się potwierdzić zapisu. Sprawdź połączenie i aktualne wartości przed kolejną próbą.');
   preview=null;selected.clear();try{await c.refresh();}catch{}
  }finally{busy=false;c.render();sync();}
 }
 async function handleSubmit(form){
  if(!form.matches('[data-admin-quick-form],#hm-admin-bulk-form'))return false;
  if(!c.admin||c.view!=='admin'||busy)return true;
  try{
   if(form.hasAttribute('data-admin-quick-form')){
    const id=Number(form.dataset.adminQuickForm),d=drafts.get(id);if(d)await persist(planQuickChanges([d.base],[id],d.fields));
   }else{
    if([...selected].some(dirty)){message=L('Спочатку збережи або скасуй незбережені рядки вибраних товарів.','Najpierw zapisz lub anuluj niezapisane wiersze wybranych produktów.');error=true;sync();return true;}
    const fields=normalizeQuickFields({[bulkField]:bulkValue}),changes=planQuickChanges(c.products,[...selected],fields);
    preview=changes.length?{changes,field:bulkField,fields,products:c.products.filter(p=>selected.has(p.id)).map(p=>({...p}))}:null;
    message=changes.length?'':L('Обрані товари вже мають ці значення.','Wybrane produkty mają już te wartości.');error=false;sync();q('#hm-admin-review-title')?.scrollIntoView({block:'nearest',behavior:'smooth'});
   }
  }catch(e){message=L('Перевір введені значення та обери товари.','Sprawdź wartości i wybierz produkty.');error=true;sync();}
  return true;
 }
 async function handleClick(b){
  if(!b.closest('[data-admin-catalog]'))return false;
  if(!c.admin||busy)return true;
  if(b.hasAttribute('data-admin-goto-bulk')){q('#hm-admin-bulk-form')?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return true;}
  if(b.hasAttribute('data-admin-reset')){drafts.delete(Number(b.dataset.adminReset));renderResults();return true;}
  if(b.hasAttribute('data-admin-clear-filters')){Object.assign(filters,{search:'',category:'',status:'',mark:'',sort:'updated'});selected.clear();preview=null;message='';c.render();sync();return true;}
  if(b.hasAttribute('data-admin-clear-selection')){selected.clear();preview=null;renderResults();return true;}
  if(b.hasAttribute('data-admin-cancel-preview')){preview=null;sync();return true;}
  if(b.hasAttribute('data-admin-apply')){if(preview)await persist(preview.changes);return true;}
  return false;
 }
 return {render,handleInput,handleChange,handleClick,handleSubmit,afterRender:sync};
}
