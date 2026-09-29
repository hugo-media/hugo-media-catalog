import test from 'node:test';import assert from 'node:assert/strict';
import {journey,safeSearch,missedSearches,consistencyIssues,reportMetrics,compareReportMetrics} from '../src/insights-core.js';
const event=(type,minute,extras={})=>({event_type:type,created_at:`2026-09-23T12:0${minute}:00Z`,session_id:'a',visitor_id:'v',product_id:1,...extras});
test('journey respects chronology, deduplicates sessions, and keeps direct orders separate',()=>{
 const rows=[event('telegram_click',0,{destination:'telegram_order'}),event('product_view',1),event('telegram_click',2,{destination:'telegram_order'}),event('cart_add',3),event('page_view',0),event('product_view',4)];
 assert.deepEqual(journey(rows),{visits:1,views:1,cart:1,orders:0,direct:1,channel:0});
 rows.push(event('telegram_click',5,{destination:'telegram_order'}));assert.equal(journey(rows).orders,1);
 assert.equal(journey(rows,2).views,0);
});
test('events from different sessions never form a completed journey',()=>{
 assert.equal(journey([event('product_view',1),event('cart_add',2,{session_id:'b'}),event('telegram_click',3,{session_id:'b',destination:'telegram_order'})]).orders,0);
});
test('search analytics excludes likely contact data and separates filtered searches',()=>{
 for(const s of ['a','user@example.com','+48 123 456 789','https://test.pl'])assert.equal(safeSearch(s),'');
 assert.equal(safeSearch('  MacBook  M1 '),'macbook m1');
 const rows=missedSearches([event('search_no_results',1,{destination:'MacBook',placement:'all'}),event('search_no_results',2,{destination:'macbook',placement:'all'}),event('search_no_results',3,{destination:'macbook',placement:'filtered'})]);
 assert.equal(rows.length,2);assert.equal(rows[0].count,2);assert.equal(rows[0].visitors.size,1);
});
test('quality detects concrete conflicts without guessing missing specs',()=>{
 assert.deepEqual(consistencyIssues({name:'MacBook 16ram/512ssd/16.2”',price:1000,ram:'16',ssd:'512',screen:'16.1',status:0,quantity:'0'}),['stock','mismatch']);
 assert.deepEqual(consistencyIssues({name:'Laptop',price:1000}),[]);
});

test('reportMetrics counts unique visitors and matches contact clicks to product viewing sessions',()=>{const rows=[event('page_view',0,{visitor_id:'v1',traffic_source:'TikTok'}),event('page_view',1,{visitor_id:'v1',traffic_source:'TikTok'}),event('page_view',2,{visitor_id:'v2',traffic_source:'direct'}),event('product_view',3,{session_id:'a',product_id:4}),event('product_view',4,{session_id:'a',product_id:4}),event('product_view',5,{session_id:'b',product_id:9}),event('telegram_click',6,{session_id:'a',destination:'telegram_order'}),event('telegram_click',7,{session_id:'other',destination:'telegram_contact'}),event('search_no_results',8,{destination:'MacBook',placement:'all'})];assert.deepEqual(reportMetrics(rows),{pageViews:3,visitors:2,productViews:3,cartAdds:0,contactClicks:2,productSessions:2,contactSessions:1,noResultSearches:1,topSource:['TikTok',2],topProduct:[4,2],topSearch:'macbook'});});

test('reportMetrics identifies products with enough views but few contact clicks',()=>{
 const rows=[];
 for(let i=0;i<6;i++){rows.push(event('product_view',i,{session_id:'s'+i,product_id:7}));}
 
 const summary=reportMetrics(rows);
 assert.deepEqual(summary.weakProduct,{id:7,views:6,sessions:6,contactSessions:0,rate:0});
});
test('compareReportMetrics reports period changes and treats a new metric as new',()=>{
 const current=[event('page_view',0,{visitor_id:'v1'}),event('page_view',1,{visitor_id:'v2'})];
 const previous=[event('page_view',2,{visitor_id:'v1'})];
 const result=compareReportMetrics(current,previous);
 assert.equal(result.changes.pageViews,100);
 assert.equal(result.changes.visitors,100);
 assert.equal(result.changes.productViews,0);
 assert.equal(result.changes.contactClicks,0);
 assert.equal(compareReportMetrics(current,[]).changes.pageViews,null);
});
