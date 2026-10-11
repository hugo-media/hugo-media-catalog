import { analyticsBuckets, dailyAnalytics, analyticsDateLabel, analyticsPeriodLabel } from './analytics-core.js';

export const ANALYTICS_TREND_KEYS = ['visitors', 'productViews', 'contactClicks'];
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export function analyticsTrendData(events, range) {
  const days = dailyAnalytics(events, range);
  const visitors = new Set();
  for (const bucket of analyticsBuckets(events, range)) {
    for (const event of bucket.rows) {
      if (event.event_type === 'page_view' && event.visitor_id) visitors.add(event.visitor_id);
    }
  }
  const totals = {
    visitors: visitors.size,
    productViews: days.reduce((sum, day) => sum + day.productViews, 0),
    contactClicks: days.reduce((sum, day) => sum + day.contactClicks, 0),
  };
  return { days, totals };
}

export function analyticsTrendScale(days, metric = 'visitors') {
  const key = ANALYTICS_TREND_KEYS.includes(metric) ? metric : 'visitors';
  const maximum = Math.max(0, ...days.map(day => day[key]));
  const step = Math.max(1, Math.ceil(maximum / 4));
  return { key, maximum, ceiling: step * 4, ticks: Array.from({length:5}, (_, index) => index * step),
    peakDates: maximum ? days.filter(day => day[key] === maximum).map(day => day.date) : [] };
}

export function renderAnalyticsOverview({ events, range, metric = 'visitors', lang = 'uk' }) {
  const uk = lang !== 'pl';
  const number = value => new Intl.NumberFormat(uk ? 'uk-UA' : 'pl-PL').format(value);
  const labels = uk
    ? {visitors:'Унікальні відвідувачі',productViews:'Перегляди товарів',contactClicks:'Звернення в Telegram'}
    : {visitors:'Unikalni odwiedzający',productViews:'Wyświetlenia produktów',contactClicks:'Kontakty w Telegramie'};
  const descriptions = uk
    ? {visitors:'Той самий відвідувач рахується один раз за день і один раз у підсумку періоду.',
       productViews:'Скільки разів відкривали картки товарів.',
       contactClicks:'Кліки контакту або замовлення в Telegram, а не підтверджені покупки.'}
    : {visitors:'Ten sam odwiedzający jest liczony raz dziennie i raz w podsumowaniu okresu.',
       productViews:'Liczba otwarć kart produktów.',
       contactClicks:'Kliknięcia kontaktu lub zamówienia w Telegramie, nie potwierdzone zakupy.'};
  const { days, totals } = analyticsTrendData(events, range);
  const { key, maximum, ceiling, ticks, peakDates } = analyticsTrendScale(days, metric);
  const peak = peakDates.length
    ? '<strong>'+analyticsDateLabel(peakDates[0],lang)+'</strong><span>'+number(maximum)+(peakDates.length>1 ? ' · '+(uk?'Днів із таким піком: ':'Dni z takim szczytem: ')+peakDates.length : '')+'</span>'
    : '<strong>'+(uk?'Немає активності':'Brak aktywności')+'</strong><span>0</span>';
  const controls = ANALYTICS_TREND_KEYS.map(id =>
    '<button type="button" class="hp-trend-choice" data-trend-metric="'+id+'" aria-pressed="'+(key===id)+'">'+
    '<span>'+labels[id]+'</span><strong>'+number(totals[id])+'</strong><small>'+(uk?'За обраний період':'W wybranym okresie')+'</small></button>').join('');
  const axis = ticks.map(value => '<span style="bottom:'+value/ceiling*100+'%">'+number(value)+'</span>').join('');
  const grid = ticks.map(value => '<i style="bottom:'+value/ceiling*100+'%"></i>').join('');
  const columns = days.map(day => {
    const peakDay = peakDates.includes(day.date), label = analyticsDateLabel(day.date,lang);
    const pointDescription = label+' · '+ANALYTICS_TREND_KEYS.map(id=>labels[id]+': '+number(day[id])).join(' · ');
    const height = day[key]/ceiling*100;
    return '<button type="button" class="hp-trend-column'+(peakDay?' is-peak':'')+'" data-stats-date="'+day.date+'" aria-label="'+escapeHtml(pointDescription)+'" title="'+escapeHtml(pointDescription)+'">'+
      '<span class="hp-trend-track"><b style="bottom:calc('+height+'% + 6px)">'+number(day[key])+'</b><i style="height:'+height+'%"></i></span>'+
      '<span class="hp-trend-date">'+day.date.slice(8,10)+'.'+day.date.slice(5,7)+'</span></button>';
  }).join('');
  return '<section class="hp-analytics-overview" aria-labelledby="hp-trend-title" data-active-trend="'+key+'">'+
    '<div class="hp-trend-heading"><div><h2 id="hp-trend-title">'+(uk?'Трафік за днями':'Ruch według dni')+'</h2><p>'+analyticsPeriodLabel(range,lang)+'</p></div>'+
    '<span class="hp-trend-timezone">'+(uk?'Час Варшави':'Czas Warszawy')+'</span></div>'+
    '<div class="hp-trend-choices" role="group" aria-label="'+(uk?'Показник графіка':'Wskaźnik wykresu')+'">'+controls+'</div>'+
    '<div class="hp-trend-summary"><div><h3>'+labels[key]+'</h3><p>'+descriptions[key]+'</p></div>'+
    '<div class="hp-trend-peak"><small>'+(uk?'Найактивніший день':'Najaktywniejszy dzień')+'</small>'+peak+'</div></div>'+
    '<div class="hp-trend-graph"><div class="hp-trend-y-axis" aria-hidden="true">'+axis+'</div>'+
    '<div class="hp-trend-scroll" role="region" tabindex="0" aria-label="'+(uk?'Денний графік. Гортай вбік, щоб побачити всі дати.':'Wykres dzienny. Przewiń w bok, aby zobaczyć wszystkie daty.')+'">'+
    '<div class="hp-trend-plot" style="--hp-trend-points:'+days.length+'"><div class="hp-trend-grid" aria-hidden="true">'+grid+'</div><div class="hp-trend-columns">'+columns+'</div></div></div></div>'+
    '<p class="hp-trend-hint">'+(uk?'Натисни стовпчик, щоб відкрити цей день. Якщо дат багато, гортай графік вбік.':'Kliknij słupek, aby otworzyć ten dzień. Przy wielu datach przewiń wykres w bok.')+'</p></section>';
}
