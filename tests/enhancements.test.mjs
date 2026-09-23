import test from 'node:test';import assert from 'node:assert/strict';
import {rankLaptops, selectionIds, shareSelection, normalizeInvite, validateSettings, productIssues, publicProduct} from '../src/enhancement-core.js';
const p={id:1,cat:0,status:0,price:1500,ram:'16',ssd:'256',screen:'14',quantity:'1',purposes:'study,office'};
test('finder respects final discounted price, stock and screen; never silently increases budget',()=>{
 const rows=[p,{...p,id:2,price:1600,discount:'10'},{...p,id:3,price:999,status:3},{...p,id:4,quantity:'0'},{...p,id:5,screen:'15.6'}];
 assert.deepEqual(rankLaptops(rows,{budget:1450,purpose:'office',size:'compact'}).map(x=>x.product.id),[2]);
 assert.equal(rankLaptops(rows,{budget:500,purpose:'office',size:'any'}).length,0);
 assert.equal(rankLaptops(rows,{budget:2000,purpose:'gaming',size:'any'}).length,0);
});
test('finder only recommends tagged gaming models; returns no more than three',()=>{const rows=Array.from({length:8},(_,i)=>({...p,id:i+1,purposes:'gaming'}));assert.equal(rankLaptops(rows,{budget:2000,purpose:'gaming',size:'any'}).length,3);});
test('shared choice sanitizes malicious input, deduplicates and carries no private fields',()=>{assert.deepEqual(selectionIds('1,2,2,3<script>,0,-1,4'),[1,2,4]);const u=new URL(shareSelection([1,2,2],'https://example.com'));assert.equal(u.search,'?selection=1%2C2');assert.equal(publicProduct({...p,status:3}),false);});
test('invite links only allow intended Telegram forms without redirects or query tracking',()=>{assert.equal(normalizeInvite('https://t.me/+abcdefgh_123'),'https://t.me/+abcdefgh_123');for(const v of ['javascript:alert(1)','https://evil.test/+abcdefgh','https://t.me@evil.test/h_m_g_pl','https://t.me/+abcdefgh?url=evil','https://t.me/another_shop'])assert.equal(normalizeInvite(v),null);assert.throws(()=>validateSettings({links:{catalog:'https://evil.test'}}),/invalidInvite/);});
test('quality identifies missing real post, charger, translations and photo provenance',()=>{const issues=productIssues({...p,telegramPost:'https://t.me/h_m_g_pl',images:['example.webp']});assert(issues.includes('post'));assert(issues.includes('charger'));assert(issues.includes('pl'));assert(issues.includes('photoKind'));assert(!issues.includes('photos'));});
