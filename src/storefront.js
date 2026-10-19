import {deviceProfile,deviceTypeLabel} from './device-fields.js';
import { productPath, pagePath, visibleSeoContent } from './seo-core.js';
import { effectivePrice, discountPercent, discountBadge, csv, telegramLink, availabilityRequestText, normalizeTelegramPost } from './core.js';

// The visible brand campaign is independent of the search-result title.
export function homeCampaign(lang='uk') {
  return lang==='pl'
    ? {lead:'Sięgaj',accent:'po więcej.',description:'Laptopy, smartfony i urządzenia. Twój poziom w rozsądnej cenie.'}
    : {lead:'Вмикай',accent:'більше.',description:'Ноутбуки, смартфони та девайси. Твій рівень за розумною ціною.'};
}

// Normalize display/filter values without rewriting the source specifications.
export function normalizedSpec(key, value) {
  const text = String(value ?? '').trim();
  if(key==='cpu'){const family=text.match(/\b(?:Intel\s+)?(?:Core\s+)?(i[3579])\b/i);if(family)return 'Intel Core '+family[1].toLowerCase();}
  if (['ram', 'ssd'].includes(key)) {
    const match = text.replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(GB|ГБ|TB|ТБ)?(?:\s+SSD)?$/i);
    if (match) return String(Number(match[1]) * (/^(TB|ТБ)$/i.test(match[2] || '') ? 1024 : 1));
  }
  if (key === 'screen') {
    const match = text.replace(',', '.').match(/^(\d+(?:\.\d+)?)(?:\s*["″”]|\s|$)/);
    if (match) return String(Number(match[1]));
  }
  return text;
}
export function specLabel(key, value) {
  if(key==='cpu')return String(value??'').trim();
  const normalized = normalizedSpec(key, value);
  return normalized && ['ram', 'ssd'].includes(key) && /^\d+(\.\d+)?$/.test(normalized)
    ? `${normalized} GB`
    : key === 'screen' && /^\d+(\.\d+)?$/.test(normalized) ? `${normalized}″` : normalized;
}
export function filterValues(items, key) {
  return [...new Set(items.map(p => normalizedSpec(key, p[key])).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}
export function homeSelection(products, picks, tab, limit=4) {
  const excluded = new Set(picks.map(p => p.id));
  const available = products.filter(p => p.status === 0 && (p.quantity === '' || p.quantity == null || Number(p.quantity) > 0) && !excluded.has(p.id));
  return available.filter(p => tab === 'sale' ? discountPercent(p) > 0 : tab === 'best' ? p.bestseller === 'true' : p.newArrival === 'true')
    .sort((a,b) => tab === 'sale' ? discountPercent(b)-discountPercent(a) || b.id-a.id : tab === 'new' ? Number(b.newArrival==='true')-Number(a.newArrival==='true') || b.id-a.id : b.id-a.id).slice(0,limit);
}
export function homeCollections(products,picks=[],featured=null) {
 const hidden=[...picks,...(featured?[featured]:[])];
 const newArrivals=homeSelection(products,hidden,'new',3);
 const bestCandidates=homeSelection(products,hidden,'best',products.length);
 const newIds=new Set(newArrivals.map(product=>product.id));
 const distinctBest=bestCandidates.filter(product=>!newIds.has(product.id));
 const bestsellers=[...distinctBest,...bestCandidates.filter(product=>newIds.has(product.id))].slice(0,6);
 return {newArrivals,bestsellers};
}
export function featuredProduct(products,picks=[],preferredId=null) {
 const available=products.filter(p=>p.status===0&&(p.quantity===''||p.quantity==null||Number(p.quantity)>0)&&p.images?.length);
 return available.find(p=>p.id===Number(preferredId))
  ||available.find(p=>p.cat===0&&p.bestseller==='true'&&!picks.some(pick=>pick.id===p.id))
  ||available.find(p=>p.cat===0&&!picks.some(pick=>pick.id===p.id))
  ||available.find(p=>p.cat===0)||available[0];
}
// Keep the owner's chosen item first; only rotate real, orderable products with photos.
export function spotlightProducts(products, picks=[], preferredId=null) {
  const first = featuredProduct(products,picks,preferredId);
  if (!first) return [];
  const excluded = new Set([first.id,...picks.map(p=>p.id)]);
  const candidates = products.filter(p=>p.status===0 && (p.quantity===''||p.quantity==null||Number(p.quantity)>0) && p.images?.length && !excluded.has(p.id));
  const newest = candidates.filter(p=>p.newArrival==='true').sort((a,b)=>b.id-a.id);
  const best = candidates.filter(p=>p.bestseller==='true').sort((a,b)=>b.id-a.id);
  const chosen = [first];
  for (const product of [best[0],newest[0],...best,...newest,...candidates]) {
    if (product && !chosen.some(p=>p.id===product.id)) chosen.push(product);
    if (chosen.length===3) break;
  }
  return chosen;
}
export function productMediaUrl(value) {
  const normalized=normalizeTelegramPost(value);
  return /^https:\/\/t\.me\/h_m_g_pl\/\d+$/.test(normalized||'') ? normalized : null;
}
export function displayBrand(value) {
  const text=String(value??'').trim();
  return text && !text.split(/\s*\/\s*/).every(part=>/^(?:не вказано|не указано|nie podano|unknown|not specified|—|-)$/i.test(part.trim())) ? text : '';
}
export function availabilityRank(p) {
  const qty=p.quantity===''||p.quantity==null?1:Number(p.quantity);
  return p.status===0&&qty>0?0:p.status===1?1:p.status===5?2:p.status===4||p.status===0?3:p.status===2?4:5;
}
export function matchesAvailability(p,value='') {
  const rank=availabilityRank(p);
  return !value ? rank<5 : value==='in-stock'?rank===0:value==='reserved'?rank===1:value==='expected'?rank===2:value==='out-of-stock'?rank===3:value==='sold'?rank===4:false;
}
export function catalogSort(a,b,sort='newest') {
  return availabilityRank(a)-availabilityRank(b) || (sort==='cheap'?effectivePrice(a)-effectivePrice(b):sort==='expensive'?effectivePrice(b)-effectivePrice(a):b.id-a.id) || b.id-a.id;
}
export function comparisonSelection(products,ids) {
  const list=ids.map(id=>products.find(p=>p.id===id)).filter(p=>p&&p.status!==3);
  return list.filter(p=>p.cat===list[0]?.cat).slice(0,3);
}
export function comparisonRows(items,definitions,onlyDifferences=false) {
  return definitions.filter(([key])=>{
    const values=items.map(p=>key==='price'?String(effectivePrice(p)):key==='cpu'?String(p[key]||''):normalizedSpec(key,p[key]).trim().toLowerCase().replace(/\s+/g,' '));
    return (key==='price'||values.some(Boolean)) && (!onlyDifferences||new Set(values).size>1);
  });
}
export function createStorefront(c) {
  const L = (uk, pl) => c.lang === 'pl' ? pl : uk;
  const E = c.esc;
  const specSummary = p => {
    const profile=deviceProfile(p);
    const values=profile.summary.map(key=>{
      if(key==='gpu'&&Number(p.cat)===0&&!/^(NVIDIA|AMD)/i.test(p.gpu||''))return '';
      let value=c.localizedValue(specLabel(key,p[key]));
      if(!value)return '';
      if(key==='ram')value+=' RAM';
      if(key==='ssd'&&Number(p.cat)===0)value+=' SSD';
      if(key==='bluetooth')value='Bluetooth '+value;
      if(key==='hz')value+=' Hz';
      return value;
    }).filter(Boolean);
    return values.length?values.join(' · '):deviceTypeLabel(p,c.lang);
  };
  function card(p, options={}) {
    const compact=Boolean(options&&typeof options==='object'&&options.compact);
    const summary=specSummary(p);
    const specsMarkup=compact
      ? `<div class="hp-specs hp-spec-chips">${summary.split(' · ').filter(Boolean).slice(0,3).map(value=>`<span class="hp-spec-chip">${E(value)}</span>`).join('')}</div>`
      : `<p class="hp-specs">${E(summary)}</p>`;
    const discount=discountPercent(p), tags=[];
    const soldOut=p.status===2;
    const expected=p.status===5;
    const unavailable=soldOut||p.status===1||p.status===4||expected||(p.status===0&&c.stockQty(p)<1);
    const unavailableLabel=soldOut?c.t('statuses')[2]:expected?c.t('statuses')[5]:p.status===1?c.t('statuses')[1]:c.t('outOfStock');
    const siteOrigin=c.origin||globalThis.location?.origin||'';
    const productUrl=siteOrigin?siteOrigin+productPath(p,c.lang):'';
    const orderAction=expected
      ? '<a class="hp-button hp-primary hp-card-order" href="'+E(telegramLink(availabilityRequestText(p,c.lang,productUrl)))+'" target="_blank" rel="noopener noreferrer" data-track-target="telegram_stock_request">'+E(L('Повідомити про наявність','Powiadom o dostępności'))+'</a>'
      : '<button type="button" class="hp-button hp-primary hp-card-order" data-order-one="'+p.id+'" '+(unavailable ? 'disabled aria-disabled="true"' : '')+'>'+(unavailable ? '' : c.icon('send'))+(unavailable ? E(unavailableLabel) : c.t('cardOrder'))+'</button>';
    if(unavailable)tags.push(`<span class="hp-badge-out">${E(unavailableLabel)}</span>`);
    if(discount)tags.push(`<span class="hp-badge-sale">${E(discountBadge(p,'−'))}</span>`);
    if(p.newArrival==='true'&&options.collection!=='best')tags.push(`<span class="hp-badge-new">${c.t('newArrival')}</span>`);
    if(p.bestseller==='true'&&options.collection!=='new')tags.push(`<span class="hp-badge-best">${c.t('bestseller')}</span>`);
    const extras=csv(p.benefits).filter(x=>['touch','keyboard'].includes(x)).map(x=>c.t(x==='touch'?'benefitTouch':'benefitKeyboard'));
    return `<article class="hp-product"><a class="hp-product-open" href="${productPath(p,c.lang)}" data-detail="${p.id}" aria-label="${E(c.t('detail'))}: ${E(p.name)}"><div class="hp-card-badges">${tags.join('')}</div>${c.photo(p)}<div class="hp-product-body">${displayBrand(p.brand)?`<div class="hp-product-meta"><span>${E(displayBrand(p.brand))}</span></div>`:''}<h3 class="hp-product-name">${E(c.productTitle(p))}</h3>${specsMarkup}<div class="hm-card-facts">${p.condition?`<span>${E(c.localizedValue(p.condition))}</span>`:''}${p.warranty?`<span>${c.icon('shield-check')}${E(c.localizedValue(p.warranty))}</span>`:''}</div>${extras.length?`<div class="hm-card-extras">${extras.map(E).join(' · ')}</div>`:''}</div></a><div class="hp-product-foot"><div class="hp-price-row">${c.priceBlock(p)}<button type="button" class="hp-compare-add" data-compare="${p.id}" aria-label="${E(c.t('compare'))}: ${E(p.name)}" aria-pressed="${c.compare.includes(p.id)}">${c.icon(c.compare.includes(p.id)?'check':'columns-2')}</button></div><div class="hp-card-cta"><a class="hp-button hp-card-details" href="${productPath(p,c.lang)}" data-detail="${p.id}">${c.t('cardDetails')}</a>${orderAction}</div></div></article>`;
  }
  function finderButton() {
    return `<button type="button" class="hp-button hp-finder-highlight" data-grow="finder">${c.icon('sparkles')}<span class="hp-finder-label"><strong>${L('Допомогти з вибором','Pomóż mi wybrać')}</strong><small>${L('Підбір ноутбука за 30 секунд','Dobór laptopa w 30 sekund')}</small></span></button>`;
  }
  function spotlight(products,picks) {
    const items=spotlightProducts(products,picks,c.homepage?.featuredProductId);
    if(!items.length)return '';
    const title=L('Знайомся ближче','Poznaj bliżej');
    const controls=items.length>1;
    const label=(product,index)=>index===0
      ? c.homepage?.featuredLabel?.[c.lang]||title
      : product.bestseller==='true'?L('Бестселер','Bestseller'):product.newArrival==='true'?L('Нове надходження','Nowość'):L('Вартий уваги','Warto zobaczyć');
    return '<section class="hm-spotlight" data-home-spotlight role="region" aria-roledescription="'+L('карусель','karuzela')+'" aria-labelledby="hm-spotlight-title">'
      +'<header class="hm-spotlight-head"><span><small>HUGO SELECT</small><strong id="hm-spotlight-title">'+title+'</strong></span>'
      +(controls?'<button type="button" class="hm-spotlight-toggle" data-spotlight-toggle hidden aria-label="'+L('Зупинити автоперемикання','Zatrzymaj automatyczne przewijanie')+'" data-pause-label="'+L('Зупинити автоперемикання','Zatrzymaj automatyczne przewijanie')+'" data-play-label="'+L('Увімкнути автоперемикання','Włącz automatyczne przewijanie')+'" data-pause-text="'+L('Пауза','Pauza')+'" data-play-text="'+L('Авто','Auto')+'"><span class="hm-spotlight-play-icon" aria-hidden="true"></span><span data-spotlight-toggle-text>'+L('Пауза','Pauza')+'</span></button>':'')+'</header>'
      +'<div class="hm-spotlight-stage" data-spotlight-stage aria-live="off" aria-atomic="false">'
      +items.map((product,index)=>'<div class="hm-spotlight-slide'+(!index?' is-active':'')+'" data-spotlight-slide role="group" aria-roledescription="'+L('слайд','slajd')+'" aria-label="'+(index+1)+L(' з ',' z ')+items.length+'" aria-hidden="'+Boolean(index)+'" '+(index?'inert':'')+'>'
        +'<a class="hm-hero-product" href="'+productPath(product,c.lang)+'" data-detail="'+product.id+'" aria-label="'+E(c.productTitle(product))+'" tabindex="'+(index?-1:0)+'">'
        +'<span class="hm-hero-product-label">'+E(label(product,index))+'</span>'
        +c.photo(product,{priority:index===0})
        +'<span class="hm-hero-product-caption"><span><strong>'+E(c.productTitle(product))+'</strong><small>'+specSummary(product).split(' · ').slice(0,3).map(value=>'<span>'+E(value.replace(/\b(\d+) GB SSD\b/,(_,amount)=>Number(amount)>=1024&&Number(amount)%1024===0?(Number(amount)/1024)+' TB SSD':amount+' GB SSD'))+'</span>').join('')+'</small><small>'+[product.condition&&E(c.localizedValue(product.condition)),product.warranty&&E(c.t('warrantyShort'))+': '+E(c.localizedValue(product.warranty))].filter(Boolean).join(' · ')+'</small></span>'
        +'<span class="hm-spotlight-bottom"><b>'+c.money(effectivePrice(product))+' zł</b><span class="hm-spotlight-detail">'+L('Детальніше','Zobacz więcej')+c.icon('arrow-up-right')+'</span></span></span></a></div>').join('')+'</div>'
      +(controls?'<footer class="hm-spotlight-controls" data-spotlight-controls hidden><span class="hm-spotlight-count"><b data-spotlight-current>01</b><span aria-hidden="true"> / '+String(items.length).padStart(2,'0')+'</span></span>'
        +'<div class="hm-spotlight-dots" role="group" aria-label="'+L('Обрати товар','Wybierz produkt')+'">'+items.map((product,index)=>'<button type="button" class="hm-spotlight-dot'+(!index?' is-active':'')+'" data-spotlight-to="'+index+'" aria-label="'+E(c.productTitle(product))+'" aria-disabled="'+(!index)+'"><span></span></button>').join('')+'</div>'
        +'<div class="hm-spotlight-arrows"><button type="button" data-spotlight-step="-1" aria-label="'+L('Попередній товар','Poprzedni produkt')+'">'+c.icon('arrow-left')+'</button><button type="button" data-spotlight-step="1" aria-label="'+L('Наступний товар','Następny produkt')+'">'+c.icon('arrow-right')+'</button></div></footer>':'')
      +'</section>';
  }
  function home(products, picks, seoPage={}) {
    const campaign=homeCampaign(c.lang);
    const seoCopy=visibleSeoContent(seoPage,L('Твій наступний ноутбук. За розумну ціну.','Twój kolejny laptop. W rozsądnej cenie.'),E);
    const available=products.filter(p=>p.status===0&&c.stockQty(p)>0);
    const featured=featuredProduct(products,picks,c.homepage?.featuredProductId);
    const {newArrivals,bestsellers}=homeCollections(products,picks,featured);
    const displayedPicks=picks.filter(p=>p.id!==featured?.id);
    const collection = (id,title,subtitle,items,empty,compact=false) =>
      '<section class="hm-home-collection" aria-labelledby="'+id+'-title"><div class="hm-collection-heading"><h3 id="'+id+'-title">'+E(title)+'</h3><p>'+E(subtitle)+'</p></div><div class="hp-grid">'+(items.length?items.map(item=>card(item,{compact,collection:compact?'best':'new'})).join(''):'<p class="hp-empty">'+E(empty)+'</p>')+'</div></section>';
    return `<section class="hm-hero hm-hero-premium"><div class="hm-hero-copy"><span class="hp-kicker">HUGO MEDIA · ${L('ТЕХНІКА В ПОЛЬЩІ','ELEKTRONIKA W POLSCE')}</span><h1><span>${E(campaign.lead)}</span> <span class="hm-hero-accent">${E(campaign.accent)}</span></h1><p>${E(campaign.description)}</p><div class="hm-hero-actions"><button type="button" class="hp-button hp-primary" data-cat="-1">${L('Обрати техніку','Wybierz sprzęt')}${c.icon('arrow-right')}</button>${finderButton()}</div><div class="hm-hero-proof"><span>${c.icon('shield-check')}${L('Гарантія в картці товару','Gwarancja w karcie produktu')}</span><span>${c.icon('message-circle')}${L('Консультація українською / польською','Pomoc po polsku / ukraińsku')}</span></div></div>${spotlight(products,picks)}</section>
      <section class="hm-quick"><span>${L('Швидкий вибір','Szybki wybór')}</span>${[1000,1500,2500].map(n=>`<button type="button" data-budget="${n}">${L('До','Do')} ${n} zł</button>`).join('')}<button type="button" data-purpose="study">${c.t('purposeStudy')}</button><button type="button" data-purpose="office">${c.t('purposeOffice')}</button><button type="button" data-cat="-1">${L('Уся техніка','Cały asortyment')} ↗</button></section>
      ${displayedPicks.length?`<section class="hp-home-section hm-daily"><div class="hp-section-title"><div><span class="hp-kicker">HUGO SELECT</span><h2>${c.t('dailyPicks')}</h2><p>${L('Наш вибір із того, що зараз у наявності.','Nasz wybór z aktualnie dostępnych modeli.')}</p></div></div><div class="hm-picks">${displayedPicks.slice(0,2).map(card).join('')}</div></section>`:''}
       <section class="hp-home-section hm-selection">
         <div class="hp-section-title"><div><h2>${L('Знайди свій варіант','Znajdź coś dla siebie')}</h2><p>${available.length} ${L('товарів у наявності','produktów w ofercie')}</p></div><button type="button" class="hp-home-link" data-cat="-1">${L('Увесь каталог','Cały katalog')}${c.icon('arrow-right')}</button></div>
         <div class="hm-home-collections">
           ${collection('hm-new-arrivals',L('Нові надходження','Nowości'),c.t('newArrivalsSub'),newArrivals,L('Зараз нових надходжень немає.','Brak nowych produktów w tej chwili.'))}
           ${collection('hm-bestsellers',c.t('bestChoice'),c.t('bestChoiceSub'),bestsellers,L('Поки немає позначених бестселерів.','Nie ma jeszcze oznaczonych bestsellerów.'),true)}
         </div>
       </section>
      ${seoCopy.intro ? `<section class="hm-seo-copy">${seoCopy.intro}</section>` : ""}
      <aside class="hm-channel"><span class="hm-channel-icon">${c.icon('send')}</span><div><span class="hp-kicker">HUGO · TELEGRAM</span><h2>${L('Підписникам — доставка за наш рахунок.','Dla subskrybentów — dostawa na nasz koszt.')}</h2><p>${L('Нові надходження, живі огляди й спеціальні пропозиції в каналі. Про підписку скажи нам під час замовлення.','Nowości, prezentacje sprzętu i oferty specjalne w kanale. Powiedz nam o subskrypcji przy zamówieniu.')}</p></div><a class="hp-button hp-primary" href="https://t.me/h_m_g_pl" target="_blank" rel="noopener noreferrer" data-track-target="telegram_channel">${L('Приєднатися до каналу','Dołącz do kanału')}${c.icon('arrow-up-right')}</a></aside>
      ${c.reviewsBlock(4)}<section class="hp-home-section hm-how"><div><span class="hp-kicker">${L('УСЕ ПРОСТО','TO PROSTE')}</span><h2>${L('Від вибору до отримання','Od wyboru do odbioru')}</h2></div><ol><li><b>01</b><strong>${L('Обери техніку','Wybierz sprzęt')}</strong><p>${L('Порівняй моделі, ціну й комплектацію.','Porównaj modele, ceny i wyposażenie.')}</p></li><li><b>02</b><strong>${L('Напиши нам','Napisz do nas')}</strong><p>${L('Уточнимо стан, оплату та доставку в Telegram.','Ustalimy stan, płatność i dostawę na Telegramie.')}</p></li><li><b>03</b><strong>${L('Отримай свій пристрій','Odbierz swój sprzęt')}</strong><p>${L('Перед відправленням узгодимо всі деталі.','Przed wysyłką potwierdzimy wszystkie szczegóły.')}</p></li></ol></section><div id="hm-home-terms"></div>`;
  }
  function start() {
    return `<section class="hm-start"><div class="hm-start-brand"><img src="/brand-start.svg" width="1262" height="644" alt="HMG — Hugo Media Group" fetchpriority="high"></div><span class="hp-kicker">${L('ТЕХНІКА В ПОЛЬЩІ','ELEKTRONIKA W POLSCE')}</span><h1>${L('Ноутбуки, які варто<br>побачити ближче.','Laptopy, które warto<br>poznać bliżej.')}</h1><p>${L('Живі огляди — у Telegram. Ціни, характеристики <br>та весь асортимент — у каталозі.','Prezentacje — w Telegramie. Ceny, parametry <br>i cały asortyment — w katalogu.')}</p><a class="hm-start-main" href="https://t.me/h_m_g_pl" target="_blank" rel="noopener noreferrer" data-track-target="telegram_channel"><img class="hm-start-action-mark" src="/brand-mark.svg" width="44" height="44" alt="" aria-hidden="true"><span><strong>${L('Приєднатися до Telegram','Dołącz do Telegrama')}</strong><small>${L('Спеціальні пропозиції та безкоштовна доставка для підписників','Oferty specjalne i bezpłatna dostawa dla subskrybentów')}</small></span>${c.icon('arrow-up-right')}</a><a href="${pagePath({lang:c.lang,view:'home'})}" class="hm-start-catalog" data-start-catalog><img class="hm-start-action-mark" src="/brand-mark.svg" width="44" height="44" alt="" aria-hidden="true"><span><strong>${L('Увесь асортимент на сайті','Cały asortyment na stronie')}</strong><small>${L('Ціни, фото, характеристики та наявність','Ceny, zdjęcia, parametry i dostępność')}</small></span>${c.icon('arrow-right')}</a><a class="hm-start-contact" href="https://t.me/HGM_Manager" target="_blank" rel="noopener noreferrer" data-track-target="telegram_contact">${L('Потрібна порада? Напиши нам','Potrzebujesz porady? Napisz do nas')} ↗</a><details class="hm-start-help"><summary>${L('Telegram не відкривається?','Telegram się nie otwiera?')}</summary><p>${L('Відкрий меню браузера в TikTok (⋯) та обери відкриття у зовнішньому браузері. Або знайди канал у Telegram:','Otwórz menu przeglądarki TikToka (⋯) i wybierz otwarcie w zewnętrznej przeglądarce. Możesz też znaleźć kanał w Telegramie:')} <strong>@h_m_g_pl</strong></p></details></section>`;
  }
  return {card,home,start,specSummary,finderButton};
}
