import test from 'node:test';
import assert from 'node:assert/strict';
import {analyticsTrendData,analyticsTrendScale,renderAnalyticsOverview} from '../src/analytics-chart.js';

const range={from:'2026-10-01',to:'2026-10-03'};
const page=(date,id)=>({created_at:date+'T10:00:00Z',event_type:'page_view',visitor_id:id});

test('period visitor total is distinct across days, while daily peaks retain zero days',()=>{
 const events=[page('2026-09-30','outside'),page('2026-10-01','a'),page('2026-10-01','a'),page('2026-10-03','a'),page('2026-10-03','b'),page('2026-10-04','outside')];
 const data=analyticsTrendData(events,range);
 assert.equal(data.totals.visitors,2);
 assert.deepEqual(data.days.map(day=>[day.date,day.visitors]),[['2026-10-01',1],['2026-10-02',0],['2026-10-03',2]]);
 assert.deepEqual(analyticsTrendScale(data.days).peakDates,['2026-10-03']);
});

test('zero-based integer axes cover the real maximum and identify every tied peak',()=>{
 const days=[{date:'2026-10-01',visitors:109},{date:'2026-10-02',visitors:0},{date:'2026-10-03',visitors:109}];
 const scale=analyticsTrendScale(days);
 assert.equal(scale.maximum,109);
 assert.equal(scale.ticks[0],0);
 assert.ok(scale.ceiling>=109);
 assert.ok(scale.ticks.every(Number.isInteger));
 assert.deepEqual(scale.peakDates,['2026-10-01','2026-10-03']);
 const empty=analyticsTrendData([],range);
 assert.deepEqual(analyticsTrendScale(empty.days,'contactClicks').peakDates,[]);
 assert.ok(analyticsTrendScale(empty.days,'contactClicks').ceiling>0);
});

test('contacts combine order and direct contact clicks, excluding channel and media views',()=>{
 const events=['telegram_order','telegram_cart_order','telegram_contact','telegram_channel','telegram_product'].map(destination=>({created_at:'2026-10-01T10:00:00Z',event_type:'telegram_click',destination}));
 assert.equal(analyticsTrendData(events,range).totals.contactClicks,3);
 const html=renderAnalyticsOverview({events,range,metric:'contactClicks'});
 assert.match(html,/data-active-trend="contactClicks"/);
 assert.match(html,/data-trend-metric="contactClicks" aria-pressed="true"/);
 assert.match(html,/01\.10\.2026/);
 assert.match(html,/Унікальні відвідувачі: 0 · Перегляди товарів: 0 · Звернення в Telegram: 3/);
});

test('overview preserves all 366 date points and never draws empty days as positive bars',()=>{
 const leapRange={from:'2024-01-01',to:'2024-12-31'};
 const html=renderAnalyticsOverview({events:[],range:leapRange,metric:'unrecognized',lang:'pl'});
 assert.equal((html.match(/data-stats-date=/g)||[]).length,366);
 assert.equal((html.match(/<i style="height:0%"><\/i>/g)||[]).length,366);
 assert.match(html,/data-active-trend="visitors"/);
 assert.match(html,/data-stats-date="2024-12-31"/);
 assert.match(html,/Brak aktywności/);
 assert.doesNotMatch(html,/NaN|Infinity|undefined/);
});
