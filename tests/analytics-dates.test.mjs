import test from 'node:test';
import assert from 'node:assert/strict';
import {validAnalyticsDate,validateAnalyticsDates,presetAnalyticsDates,shiftAnalyticsDate,analyticsDayCount,analyticsBuckets,dailyAnalytics,analyticsPeriodLabel} from '../src/analytics-core.js';
const now=new Date('2026-10-11T18:00:00Z');
test('calendar dates validate real days, ordering, future dates and 366-day limit',()=>{
 assert.equal(validAnalyticsDate('2024-02-29'),true);
 for(const day of ['0000-01-01','2026-02-29','2026-04-31','2026-13-01','2026-1-01','bad']) assert.equal(validAnalyticsDate(day),false);
 for(const range of [{from:'2026-10-12',to:'2026-10-12'},{from:'2026-10-11',to:'2026-10-10'},{from:'2025-01-01',to:'2026-10-11'},{}]) assert.throws(()=>validateAnalyticsDates(range,now),/analyticsDates/);
 assert.deepEqual(validateAnalyticsDates({from:'2026-10-01',to:'2026-10-11'},now),{from:'2026-10-01',to:'2026-10-11'});
 assert.equal(analyticsDayCount('2024-01-01','2024-12-31'),366);
});
test('presets use the Warsaw date and inclusive calendar arithmetic',()=>{
 const midnight=new Date('2026-10-10T22:30:00Z');
 assert.deepEqual(presetAnalyticsDates(7,midnight),{from:'2026-10-05',to:'2026-10-11'});
 assert.deepEqual(presetAnalyticsDates('yesterday',midnight),{from:'2026-10-10',to:'2026-10-10'});
 assert.equal(shiftAnalyticsDate('2024-03-01',-1),'2024-02-29');
 assert.equal(analyticsDayCount('2026-03-28','2026-03-30'),3);
});
test('daily buckets retain zero days and assign UTC events to their Warsaw calendar day',()=>{
 const range={from:'2026-10-09',to:'2026-10-11'};
 const rows=[{created_at:'2026-10-09T21:59:59Z',event_type:'page_view',visitor_id:'a'},
 {created_at:'2026-10-10T22:00:00Z',event_type:'page_view',visitor_id:'a'},
 {created_at:'2026-10-10T23:00:00Z',event_type:'page_view',visitor_id:'a'},
 {created_at:'2026-10-11T10:00:00Z',event_type:'product_view'},
 {created_at:'2026-10-11T10:01:00Z',event_type:'telegram_click',destination:'telegram_order'},
 {created_at:'2026-10-11T10:02:00Z',event_type:'telegram_click',destination:'telegram_channel'},
 {created_at:'2026-10-11T22:00:00Z',event_type:'page_view',visitor_id:'out'}];
 assert.deepEqual(dailyAnalytics(rows,range),[
 {date:'2026-10-09',visitors:1,pageViews:1,productViews:0,contactClicks:0},
 {date:'2026-10-10',visitors:0,pageViews:0,productViews:0,contactClicks:0},
 {date:'2026-10-11',visitors:1,pageViews:2,productViews:1,contactClicks:1}]);
});
test('hour charts use the chosen historical day and Warsaw hours across DST',()=>{
 const spring=analyticsBuckets([{created_at:'2026-03-29T01:30:00Z'}],{from:'2026-03-29',to:'2026-03-29'},true);
 assert.equal(spring.length,24);assert.equal(spring[2].rows.length,0);assert.equal(spring[3].rows.length,1);
 const fall=analyticsBuckets([{created_at:'2025-10-26T00:30:00Z'},{created_at:'2025-10-26T01:30:00Z'}],{from:'2025-10-26',to:'2025-10-26'},true);
 assert.equal(fall[2].rows.length,2);
 assert.equal(analyticsBuckets([{created_at:'2026-10-11T10:00:00Z'}],{from:'2026-10-10',to:'2026-10-10'},true).every(point=>point.rows.length===0),true);
});
test('date labels include the full selected period',()=>{
 assert.equal(analyticsPeriodLabel({from:'2026-10-01',to:'2026-10-05'},'uk'),'01.10.2026 — 05.10.2026');
 assert.equal(analyticsPeriodLabel({from:'2026-10-01',to:'2026-10-01'},'pl'),'01.10.2026');
});
