import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {endOfWarsawDay,normalizeDailyPicks,dailyPicksActive,picksExpiryPreset,validatePicksExpiry,watchPicksExpiry} from '../src/daily-picks.js';
import {warsawDate,warsawDateTimeToUtc,validateDailyPicks} from '../src/core.js';
test('legacy recommendations expire at Warsaw midnight including DST days',()=>{
 assert.equal(endOfWarsawDay('2026-03-29'),'2026-03-29T22:00:00.000Z');
 assert.equal(endOfWarsawDay('2026-10-25'),'2026-10-25T23:00:00.000Z');
 assert.equal(endOfWarsawDay('2026-02-30'),null);
 const p=normalizeDailyPicks({for_date:'2026-10-27',product_ids:[1,2]});
 assert.equal(p.endsAt,'2026-10-27T23:00:00.000Z');
 assert.equal(dailyPicksActive(p,Date.parse('2026-10-27T22:59:59Z')),true);
 assert.equal(dailyPicksActive(p,Date.parse(p.endsAt)),false);
 assert.equal(dailyPicksActive(normalizeDailyPicks(null)),false);
});
test('explicit expiry spans days and ends at the exact instant',()=>{
 const p=normalizeDailyPicks({for_date:'2026-10-27',product_ids:[4],expires_at:'2026-10-30T15:00:00+00:00'});
 assert.equal(p.endsAt,'2026-10-30T15:00:00.000Z');
 assert.equal(dailyPicksActive(p,Date.parse('2026-10-28T08:00:00Z')),true);
 assert.equal(dailyPicksActive(p,Date.parse(p.endsAt)),false);
 assert.equal(dailyPicksActive(p,Date.parse('2026-10-26T08:00:00Z')),false);
});
test('presets and custom Warsaw dates reject invalid, past and ambiguous deadlines',()=>{
 const now=Date.parse('2026-10-27T10:15:00Z');
 assert.equal(picksExpiryPreset('today',now),'2026-10-28T00:00');
 assert.equal(picksExpiryPreset('24',now),'2026-10-28T11:15');
 assert.equal(picksExpiryPreset('72',now),'2026-10-30T11:15');
 assert.equal(picksExpiryPreset('168',now),'2026-11-03T11:15');
 assert.equal(validatePicksExpiry(warsawDateTimeToUtc('2026-11-05T17:30'),now),'2026-11-05T16:30:00.000Z');
 for(const end of ['',null,'bad','2026-10-27T10:15:00Z','2026-10-25T10:00:00Z',warsawDateTimeToUtc('2027-03-28T02:30')])
  assert.throws(()=>validatePicksExpiry(end,now),/picksExpiryInvalid/);
});
test('watcher expires once, handles sleeping tabs, cancellation and long delays',()=>{
 let now=1000,serial=0,calls=0;const timers=new Map(),listeners=new Set();
 const env={now:()=>now,schedule:(fn,delay)=>{timers.set(++serial,{fn,delay});return serial;},cancel:id=>timers.delete(id),
 visibility:{addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)}};
 let stop=watchPicksExpiry(new Date(2000).toISOString(),()=>calls++,env);
 assert.equal([...timers.values()][0].delay,1000);
 now=2000;[...timers.values()][0].fn();assert.equal(calls,1);assert.equal(timers.size,0);assert.equal(listeners.size,0);
 stop();now=3000;stop=watchPicksExpiry(new Date(4000).toISOString(),()=>calls++,env);
 now=5000;[...listeners][0]();assert.equal(calls,2);assert.equal(timers.size,0);
 stop=watchPicksExpiry(new Date(3000000000).toISOString(),()=>calls++,env);
 assert.equal([...timers.values()][0].delay,2147483647);stop();assert.equal(listeners.size,0);assert.equal(timers.size,0);
});
test('data layer never revives older recommendations and writes an exact expiry',async()=>{
 const source=await readFile(new URL('../src/data.js',import.meta.url),'utf8');
 const a=source.indexOf('export async function listDailyPicks()'),b=source.indexOf('export async function isAdmin()',a);
 const date=warsawDate(),rows=[
 {for_date:'2020-01-01',product_ids:[1],expires_at:'2099-01-01T00:00:00Z'},
 {for_date:date,product_ids:[2],expires_at:'2020-02-01T00:00:00Z'}];
 let admin=true,readError=null,written;
 const client={from:table=>{
  assert.equal(table,'hmg_catalog_daily_picks');let filtered=[...rows];
  return {select(){return this;},lte(key,value){filtered=filtered.filter(r=>r[key]<=value);return this;},
  order(key,{ascending}){filtered.sort((a,b)=>ascending?a[key].localeCompare(b[key]):b[key].localeCompare(a[key]));return this;},
  limit(n){filtered=filtered.slice(0,n);return this;},maybeSingle:async()=>({data:filtered[0]||null,error:readError}),
  upsert(row,{onConflict}){assert.equal(onConflict,'for_date');written=row;return this;},single:async()=>({data:written,error:null})};
 }};
 const api=new Function('connect','isAdmin','warsawDate','validateDailyPicks','normalizeDailyPicks','validatePicksExpiry',
 source.slice(a,b).replaceAll('export ','')+';return {listDailyPicks,saveDailyPicks};')(
 async()=>client,async()=>admin,warsawDate,validateDailyPicks,normalizeDailyPicks,validatePicksExpiry);
 const newest=await api.listDailyPicks();assert.deepEqual(newest.ids,[2]);assert.equal(dailyPicksActive(newest),false);
 rows[1].product_ids=[];assert.deepEqual((await api.listDailyPicks()).ids,[]);
 const end='2099-01-01T00:00:00.000Z';assert.equal((await api.saveDailyPicks([1,2],end)).expires_at,end);
 assert.deepEqual(written,{for_date:date,product_ids:[1,2],expires_at:end});
 admin=false;await assert.rejects(api.saveDailyPicks([1],end),/notAdmin/);
 admin=true;await assert.rejects(api.saveDailyPicks([1],''),/picksExpiryInvalid/);
 readError=Error('offline');await assert.rejects(api.listDailyPicks(),/offline/);
});
