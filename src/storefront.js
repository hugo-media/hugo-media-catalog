import { productPath } from './seo-core.js';
import { effectivePrice, discountPercent, csv } from './core.js';

// Normalize display/filter values without rewriting the source specifications.
export function normalizedSpec(key, value) {
  const text = String(value ?? '').trim();
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
  const normalized = normalizedSpec(key, value);
  return normalized && ['ram', 'ssd'].includes(key) && /^\d+(\.\d+)?$/.test(normalized)
    ? `${normalized} GB`
    : key === 'screen' && /^\d+(\.\d+)?$/.test(normalized) ? `${normalized}″` : normalized;
}
export function filterValues(items, key) {
  return [...new Set(items.map(p => normalizedSpec(key, p[key])).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}
export function homeSelection(products, picks, tab) {
  const excluded = new Set(picks.map(p => p.id));
  const available = products.filter(p => p.status === 0 && (p.quantity === '' || p.quantity == null || Number(p.quantity) > 0) && !excluded.has(p.id));
  return available.filter(p => tab === 'sale' ? discountPercent(p) > 0 : tab === 'best' ? p.bestseller === 'true' : p.newArrival === 'true')
    .sort((a,b) => tab === 'sale' ? discountPercent(b)-discountPercent(a) || b.id-a.id : tab === 'new' ? Number(b.newArrival==='true')-Number(a.newArrival==='true') || b.id-a.id : b.id-a.id).slice(0,4);
}
export function featuredProduct(products,picks=[],preferredId=null) {
 const available=products.filter(p=>p.status===0&&(p.quantity===''||p.quantity==null||Number(p.quantity)>0)&&p.images?.length);
 return available.find(p=>p.id===Number(preferredId))
  ||available.find(p=>p.cat===0&&p.bestseller==='true'&&!picks.some(pick=>pick.id===p.id))
  ||available.find(p=>p.cat===0&&!picks.some(pick=>pick.id===p.id))
  ||available.find(p=>p.cat===0)||available[0];
}
export function createStorefront(c) {
  const L = (uk, pl) => c.lang === 'pl' ? pl : uk;
  const E = c.esc;
  const specSummary = p => (p.cat===3 ? [p.noise, p.connection] : p.cat===5 ? [specLabel('screen',p.screen),p.resolution,p.refreshRate] : [p.cpu,p.ram && `${specLabel('ram',p.ram)} RAM`,p.ssd && `${specLabel('ssd',p.ssd)}${p.cat===0?' SSD':''}`, p.cat===0 && specLabel('screen',p.screen),p.cat===0 && /^(NVIDIA|AMD)/i.test(p.gpu||'') && p.gpu]).filter(Boolean).join(' · ');
  function card(p) {
    const discount=discountPercent(p), tags=[];
    if(discount)tags.push(`<span class="hp-badge-sale">−${discount}%</span>`);
    if(p.newArrival==='true')tags.push(`<span class="hp-badge-new">${c.t('newArrival')}</span>`);
    else if(p.bestseller==='true')tags.push(`<span class="hp-badge-best">${c.t('bestseller')}</span>`);
    const extras=csv(p.benefits).filter(x=>['touch','keyboard'].includes(x)).map(x=>c.t(x==='touch'?'benefitTouch':'benefitKeyboard'));
    const purpose=csv(p.purposes)[0];
    return `<article class="hp-product"><a class="hp-product-open" href="${productPath(p,c.lang)}" data-detail="${p.id}" aria-label="${E(c.t('detail'))}: ${E(p.name)}"><div class="hp-card-badges">${tags.join('')}</div>${c.photo(p)}<div class="hp-product-body"><div class="hp-product-meta"><span>${E(p.brand)}</span>${purpose?`<span>${E(c.t(c.purposeKey(purpose)))}</span>`:''}</div><h3 class="hp-product-name">${E(c.productTitle(p))}</h3><p class="hp-specs">${E(specSummary(p))}</p><div class="hm-card-facts">${p.condition?`<span>${E(c.localizedValue(p.condition))}</span>`:''}${p.warranty?`<span>${c.icon('shield-check')}${E(c.localizedValue(p.warranty))}</span>`:''}</div>${extras.length?`<div class="hm-card-extras">${extras.map(E).join(' · ')}</div>`:''}</div></a><div class="hp-product-foot"><div class="hp-price-row">${c.priceBlock(p)}<button type="button" class="hp-compare-add" data-compare="${p.id}" aria-label="${E(c.t('compare'))}: ${E(p.name)}" aria-pressed="${c.compare.includes(p.id)}">${c.icon(c.compare.includes(p.id)?'check':'columns-2')}</button></div><div class="hp-card-cta"><a class="hp-button hp-card-details" href="${productPath(p,c.lang)}" data-detail="${p.id}">${c.t('cardDetails')}</a><button type="button" class="hp-button hp-primary hp-card-order" data-order-one="${p.id}">${c.icon('send')}${c.t('cardOrder')}</button></div></div></article>`;
  }
  function home(products, picks, tab) {
    const available=products.filter(p=>p.status===0&&c.stockQty(p)>0);
    const featured=featuredProduct(products,picks,c.homepage?.featuredProductId);
    const items=homeSelection(products,featured?[...picks,featured]:picks,tab);
    const choices=[['new',L('Нові надходження','Nowości')],['best',c.t('bestseller')],['sale',L('Знижки','Promocje')]];
    return `<section class="hm-hero"><div class="hm-hero-copy"><span class="hp-kicker">HUGO MEDIA · ${L('ТЕХНІКА В ПОЛЬЩІ','ELEKTRONIKA W POLSCE')}</span><h1>${L('Твій наступний ноутбук.<br>За розумну ціну.','Twój kolejny laptop.<br>W rozsądnej cenie.')}</h1><p>${L('Порівняй характеристики, обери під свій бюджет і напиши нам у Telegram. Допоможемо з вибором.','Porównaj parametry, wybierz w swoim budżecie i napisz do nas na Telegramie. Pomożemy Ci wybrać.')}</p><div class="hm-hero-actions"><button type="button" class="hp-button hp-primary" data-cat="0">${L('Переглянути ноутбуки','Zobacz laptopy')}${c.icon('arrow-right')}</button><button type="button" class="hp-button" data-grow="finder">${L('Допомогти з вибором','Pomóż mi wybrać')}</button></div><div class="hm-hero-proof"><span>${c.icon('shield-check')}${L('Гарантія в картці товару','Gwarancja w karcie produktu')}</span><span>${c.icon('message-circle')}${L('Консультація українською / польською','Pomoc po polsku / ukraińsku')}</span></div></div>${featured?`<a class="hm-hero-product" href="${productPath(featured,c.lang)}" data-detail="${featured.id}" aria-label="${E(featured.name)}"><span class="hm-hero-product-label">${E(c.homepage?.featuredLabel?.[c.lang]||L('Знайомся ближче','Poznaj bliżej'))}</span>${c.photo(featured)}<span class="hm-hero-product-caption"><span><strong>${E(c.productTitle(featured))}</strong><small>${E(specSummary(featured))}</small><small>${[featured.condition&&E(c.localizedValue(featured.condition)),featured.warranty&&E(c.t('warrantyShort'))+': '+E(c.localizedValue(featured.warranty))].filter(Boolean).join(' · ')}</small></span><b>${c.money(effectivePrice(featured))} zł ${c.icon('arrow-up-right')}</b></span></a>`:''}</section>
      <section class="hm-quick"><span>${L('Швидкий вибір','Szybki wybór')}</span>${[1000,1500,2500].map(n=>`<button type="button" data-budget="${n}">${L('До','Do')} ${n} zł</button>`).join('')}<button type="button" data-purpose="study">${c.t('purposeStudy')}</button><button type="button" data-purpose="office">${c.t('purposeOffice')}</button><button type="button" data-cat="-1">${L('Уся техніка','Cały asortyment')} ↗</button></section>
      ${picks.length?`<section class="hp-home-section hm-daily"><div class="hp-section-title"><div><span class="hp-kicker">HUGO SELECT</span><h2>${c.t('dailyPicks')}</h2><p>${L('Наш вибір із того, що зараз у наявності.','Nasz wybór z aktualnie dostępnych modeli.')}</p></div></div><div class="hm-picks">${picks.slice(0,2).map(card).join('')}</div></section>`:''}
      <section class="hp-home-section hm-selection"><div class="hp-section-title"><div><h2>${L('Знайди свій варіант','Znajdź coś dla siebie')}</h2><p>${available.length} ${L('товарів у наявності','produktów w ofercie')}</p></div><button type="button" class="hp-home-link" data-cat="-1">${L('Увесь каталог','Cały katalog')}${c.icon('arrow-right')}</button></div><div class="hm-tabs" role="group" aria-label="${L('Добірки товарів','Kolekcje produktów')}">${choices.map(([k,label])=>`<button type="button" data-home-tab="${k}" aria-pressed="${k===tab}">${label}</button>`).join('')}</div><div class="hp-grid hp-home-products hm-tab-products">${items.length?items.map(card).join(''):`<p class="hp-empty">${L('У цій добірці поки немає інших товарів. Переглянь рекомендації вище або весь каталог.','W tej kolekcji nie ma teraz innych produktów. Zobacz polecane wyżej lub cały katalog.')}</p>`}</div></section>
      <aside class="hm-channel"><span class="hm-channel-icon">${c.icon('send')}</span><div><span class="hp-kicker">HUGO · TELEGRAM</span><h2>${L('Підписникам — доставка за наш рахунок.','Dla subskrybentów — dostawa na nasz koszt.')}</h2><p>${L('Нові надходження, живі огляди й спеціальні пропозиції в каналі. Про підписку скажи нам під час замовлення.','Nowości, prezentacje sprzętu i oferty specjalne w kanale. Powiedz nam o subskrypcji przy zamówieniu.')}</p></div><a class="hp-button hp-primary" href="https://t.me/h_m_g_pl" target="_blank" rel="noopener noreferrer" data-track-target="telegram_channel">${L('Приєднатися до каналу','Dołącz do kanału')}${c.icon('arrow-up-right')}</a></aside>
      ${c.reviewsBlock(4)}<section class="hp-home-section hm-how"><div><span class="hp-kicker">${L('УСЕ ПРОСТО','TO PROSTE')}</span><h2>${L('Від вибору до отримання','Od wyboru do odbioru')}</h2></div><ol><li><b>01</b><strong>${L('Обери техніку','Wybierz sprzęt')}</strong><p>${L('Порівняй моделі, ціну й комплектацію.','Porównaj modele, ceny i wyposażenie.')}</p></li><li><b>02</b><strong>${L('Напиши нам','Napisz do nas')}</strong><p>${L('Уточнимо стан, оплату та доставку в Telegram.','Ustalimy stan, płatność i dostawę na Telegramie.')}</p></li><li><b>03</b><strong>${L('Отримай свій пристрій','Odbierz swój sprzęt')}</strong><p>${L('Перед відправленням узгодимо всі деталі.','Przed wysyłką potwierdzimy wszystkie szczegóły.')}</p></li></ol></section><div id="hm-home-terms"></div>`;
  }
  function start() {
    return `<section class="hm-start"><div class="hm-start-brand">HUGO<span>MEDIA GROUP</span></div><span class="hp-kicker">${L('ТЕХНІКА В ПОЛЬЩІ','ELEKTRONIKA W POLSCE')}</span><h1>${L('Ноутбуки, які варто<br>побачити ближче.','Laptopy, które warto<br>poznać bliżej.')}</h1><p>${L('У каналі — живі огляди та нові пропозиції.<br>У каталозі — зручний вибір за ціною й характеристиками.','W kanale — prezentacje i nowe oferty.<br>W katalogu — wygodny wybór według ceny i parametrów.')}</p><a class="hm-start-main" href="https://t.me/h_m_g_pl" target="_blank" rel="noopener noreferrer" data-track-target="telegram_channel">${c.icon('send')}<span><strong>${L('Приєднатися до Telegram','Dołącz do Telegrama')}</strong><small>${L('Безкоштовна доставка для підписників + спеціальні пропозиції','Bezpłatna dostawa dla subskrybentów + oferty specjalne')}</small></span>${c.icon('arrow-up-right')}</a><button type="button" class="hm-start-catalog" data-start-catalog>${c.icon('layout-grid')}<span><strong>${L('Переглянути весь асортимент','Zobacz cały asortyment')}</strong><small>${L('Ціни, фото, характеристики та наявність','Ceny, zdjęcia, parametry i dostępność')}</small></span>${c.icon('arrow-right')}</button><a class="hm-start-contact" href="https://t.me/HUGO_Media" target="_blank" rel="noopener noreferrer" data-track-target="telegram_contact">${L('Потрібна порада? Напиши нам','Potrzebujesz porady? Napisz do nas')} ↗</a><details class="hm-start-help"><summary>${L('Telegram не відкривається?','Telegram się nie otwiera?')}</summary><p>${L('Відкрий меню браузера в TikTok (⋯) та обери відкриття у зовнішньому браузері. Або знайди канал у Telegram:','Otwórz menu przeglądarki TikToka (⋯) i wybierz otwarcie w zewnętrznej przeglądarce. Możesz też znaleźć kanał w Telegramie:')} <strong>@h_m_g_pl</strong></p></details></section>`;
  }
  return {card,home,start,specSummary};
}
