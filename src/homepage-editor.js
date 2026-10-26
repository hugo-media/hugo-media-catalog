import {availableProduct} from './enhancement-core.js';
import {effectivePrice} from './core.js';

export function renderHomepageEditor(products,homepage,{lang='uk',esc,photoUrl}){
 const L=(uk,pl)=>lang==='pl'?pl:uk;
 const ids=Array.isArray(homepage?.carouselProductIds)?homepage.carouselProductIds:[homepage?.featuredProductId,null,null];
 const eligible=products.filter(p=>availableProduct(p)&&p.images?.length).sort((a,b)=>a.name.localeCompare(b.name));
 const options=selected=>'<option value="">'+L('Автоматичний вибір','Wybór automatyczny')+'</option>'
  +(selected&&!eligible.some(p=>p.id===Number(selected))?'<option value="'+Number(selected)+'" selected>'+L('Товар недоступний','Produkt niedostępny')+' · HMG-'+Number(selected)+'</option>':'')
  +eligible.map(p=>'<option value="'+p.id+'" '+(p.id===Number(selected)?'selected':'')+'>'+esc(p.name)+' · '+effectivePrice(p)+' zł · HMG-'+p.id+'</option>').join('');
 return '<section class="hp-form-section hm-home-editor" data-home-editor><h2>'+L('Карусель — «Знайомся ближче»','Karuzela — „Poznaj bliżej”')+'</h2><p>'+L('Обери до трьох товарів і зміни порядок стрілками. Порожнє місце заповнюється автоматично.','Wybierz do trzech produktów i zmień kolejność strzałkami. Puste miejsce jest uzupełniane automatycznie.')+'</p>'
  +'<div class="hm-carousel-editor-slots">'+[0,1,2].map(index=>'<div class="hm-carousel-editor-slot" data-home-slot="'+index+'"><div class="hm-carousel-slot-heading"><strong>'+L('Слайд','Slajd')+' '+(index+1)+'</strong><div><button type="button" data-home-move="-1" aria-label="'+L('Слайд','Slajd')+' '+(index+1)+L(': перемістити вище',': przesuń wyżej')+'" '+(!index?'disabled':'')+'>↑</button><button type="button" data-home-move="1" aria-label="'+L('Слайд','Slajd')+' '+(index+1)+L(': перемістити нижче',': przesuń niżej')+'" '+(index===2?'disabled':'')+'>↓</button></div></div><div class="hm-carousel-preview" data-home-preview></div><label class="hp-field">'+L('Товар','Produkt')+' '+(index+1)+'<select name="home_carousel_'+index+'" data-home-product>'+options(ids[index])+'</select></label><button type="button" class="hm-carousel-auto" data-home-clear>'+L('Обирати автоматично','Wybieraj automatycznie')+'</button></div>').join('')+'</div>'
  +'<p class="hp-muted">'+L('На сайті показуються товари в наявності з фото. Якщо вибраний товар недоступний, тимчасово показується інший. Після повернення в наявність твій вибір відновиться.','Strona pokazuje dostępne produkty ze zdjęciem. Niedostępny produkt jest tymczasowo zastępowany innym. Gdy wróci do sprzedaży, Twój wybór zostanie przywrócony.')+'</p><p data-home-editor-status role="status"></p>'
  +'<div class="hp-form-grid">'+['uk','pl'].map(l=>'<label class="hp-field">'+(l==='uk'?'Підпис українською':'Podpis po polsku')+'<input name="home_label_'+l+'" maxlength="80" value="'+esc(homepage?.featuredLabel?.[l]||'')+'" placeholder="'+(l==='uk'?'Знайомся ближче':'Poznaj bliżej')+'"></label>').join('')+'</div><button type="submit" class="hp-button hp-primary">'+L('Зберегти налаштування','Zapisz ustawienia')+'</button><p id="hp-home-settings-message" role="status"></p></section>';
}
export function mountHomepageEditor(root,products,{lang='uk',esc,photoUrl}){
 if(!root)return;
 const L=(uk,pl)=>lang==='pl'?pl:uk;
 const inputs=[...root.querySelectorAll('[data-home-product]')];
 const status=root.querySelector('[data-home-editor-status]');
 function update(changed=false){
  const ids=inputs.map(input=>Number(input.value)||null);
  inputs.forEach((input,index)=>{
   const p=products.find(p=>p.id===ids[index]),duplicate=!!ids[index]&&ids.indexOf(ids[index])!==index;
   input.setCustomValidity(duplicate?L('Обери різні товари для слайдів.','Wybierz różne produkty dla slajdów.'):'');
   const preview=input.closest('[data-home-slot]').querySelector('[data-home-preview]');
   preview.innerHTML=p
    ? (p.images?.length?'<img src="'+esc(photoUrl(p.images[0]))+'" alt="" loading="lazy" decoding="async">':'')+'<strong>'+esc(p.name)+'</strong><span>'+effectivePrice(p)+' zł · HMG-'+p.id+'</span>'+(!availableProduct(p)||!p.images?.length?'<small>'+L('Тимчасово буде автоматична заміна','Tymczasowo zostanie zastąpiony')+'</small>':'')
    : '<span class="hm-carousel-auto-symbol" aria-hidden="true">↻</span><strong>'+L('Автоматичний вибір','Wybór automatyczny')+'</strong><span>'+L('Доступний товар із фото','Dostępny produkt ze zdjęciem')+'</span>';
   for(const option of input.options)option.disabled=!!option.value&&inputs.some(other=>other!==input&&other.value===option.value);
  });
  if(changed)status.textContent=L('Є зміни. Натисни «Зберегти налаштування», щоб оновити сайт.','Są zmiany. Kliknij „Zapisz ustawienia”, aby zaktualizować stronę.');
 }
 root.addEventListener('change',event=>{if(event.target.matches('[data-home-product]'))update(true);});
 root.addEventListener('click',event=>{
  const button=event.target.closest('[data-home-move],[data-home-clear]');if(!button||!root.contains(button))return;
  const index=Number(button.closest('[data-home-slot]').dataset.homeSlot);
  if(button.hasAttribute('data-home-clear')){inputs[index].value='';update(true);inputs[index].focus();return;}
  const target=index+Number(button.dataset.homeMove);if(!inputs[target])return;
  const values=inputs.map(input=>input.value);
  // Every select includes the same options, including unavailable saved IDs.
  [values[index],values[target]]=[values[target],values[index]];
  values.forEach((value,i)=>{if(value&&![...inputs[i].options].some(option=>option.value===value)){const option=root.ownerDocument.createElement('option');option.value=value;option.textContent=L('Товар недоступний','Produkt niedostępny')+' · HMG-'+value;inputs[i].append(option);}inputs[i].value=value;});
  update(true);inputs[target].focus();
 });
 update();
}
