import test from 'node:test';import assert from 'node:assert/strict';
import {configuration,upgradeOptions,orderText,toRow,fromRow} from '../src/core.js';
const p={id:1,name:'Laptop',brand:'HP',cat:0,status:0,price:1000,discount:'10',ram:'8',ssd:'256',bundles:'mouse,office,software',ram16Enabled:'true',ram16Price:'399',ram32Enabled:'true',ram32Price:'999',ssd512Enabled:'true',ssd512Price:'499',ssd1024Enabled:'true',ssd1024Price:'749'};
test('one option per group, discount only on laptop, exact same total in Telegram',()=>{
 const upgrades={ram:'ram16',ssd:'ssd1024'};const c=configuration(p,'mouse,office,mouse,software',upgrades);
 assert.equal(c.total,2293);assert.equal(c.pending,true);assert.equal(c.lines.length,5);
 assert.match(orderText([p],'uk','',{1:'mouse,office,software'},{1:upgrades}),/Разом: 2293.00 zł/);
 assert.match(orderText([p],'pl','',{1:'mouse'},{1:upgrades}),/SSD → 1 TB/);
});
test('disabled, stale, wrong group or manipulated choices cannot add phantom prices',()=>{
 assert.equal(configuration({...p,ram16Enabled:''},'photoshop,evil',{ram:'ram16',ssd:'ram32'}).total,900);
 assert.equal(upgradeOptions({...p,cat:1}).length,0);
 assert.equal(upgradeOptions({...p,ram:'32',ssd:'1 TB'}).length,0);
 assert.equal(configuration(p,'',null).total,900);
});
test('product persistence roundtrips editable configuration and validates enabled prices/capacity',()=>{
 const restored=fromRow(toRow(p));assert.equal(restored.ram16Price,'399');assert.equal(restored.ssd1024Enabled,'true');
 for(const value of ['-1','NaN','10001',''])assert.throws(()=>toRow({...p,ram16Price:value}),/validation/);
 assert.throws(()=>toRow({...p,ram:'16'}),/validation/);
 assert.equal(configuration({...p,ram16Price:'0'},'',{ram:'ram16'}).total,900);
});
test('per-product configurations do not leak into another cart item and decimals are rounded once in cents',()=>{
 const other={...p,id:2,price:10.15,discount:'0',bundles:'mouse'};
 const text=orderText([p,other],'uk','',{2:'mouse'},{1:{ram:'ram16'}});
 assert.match(text,/Разом: 1354.15 zł/);
});
