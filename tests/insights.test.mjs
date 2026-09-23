import test from 'node:test';import assert from 'node:assert/strict';
import {journey,safeSearch,missedSearches,consistencyIssues} from '../src/insights-core.js';
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
