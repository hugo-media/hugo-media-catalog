import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizedSpec,specLabel,filterValues,homeSelection} from '../src/storefront.js';
test('mixed existing screen and capacity formats produce usable sorted filters',()=>{
 assert.deepEqual(filterValues([{ram:'16'},{ram:'8 GB'},{ram:'32'},{ram:'8'}],'ram'),['8','16','32']);
 assert.equal(normalizedSpec('screen','15,6″ Full HD'),'15.6');
 assert.equal(normalizedSpec('screen','15.6'),'15.6');
 assert.equal(specLabel('screen','15.6'),'15.6″');
 assert.equal(normalizedSpec('ssd','1 TB'),'1024');
 assert.equal(specLabel('ram','16 GB'),'16 GB');
});
test('home collections exclude unavailable and daily picks while preserving source data',()=>{
 const products=[{id:1,status:0,quantity:'1',price:1000,bestseller:'true',discount:'10'}, {id:2,status:0,quantity:'1',price:1000,newArrival:'true'}, {id:3,status:0,quantity:'0',price:1000}, {id:4,status:1,quantity:'1',price:1000}, {id:5,status:0,quantity:'1',price:1000}];
 assert.deepEqual(homeSelection(products,[products[0]],'new').map(x=>x.id),[2]);
 assert.deepEqual(homeSelection(products,[products[0]],'best'),[]);
 assert.equal(products[0].id,1);
});
