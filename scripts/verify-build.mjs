import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import * as source from '../src/core.js';
import * as production from '../dist/src/core.js';

const run=promisify(execFile);
async function files(directory){
 const result=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=directory+'/'+entry.name;
  if(entry.isDirectory())result.push(...await files(path));
  else if(entry.isFile())result.push(path);
 }
 return result;
}
const sourceModules=(await files('src')).filter(file=>file.endsWith('.js'));
for(const file of ['brand.svg','brand-mark.svg','favicon.jpg','brand-start.svg']){
 assert.ok((await readFile(file)).equals(await readFile('dist/'+file)),file+' must be copied unchanged');
}
for(const file of ['styles.css','intro.css','storefront.css',...sourceModules]){
 assert.ok((await stat('dist/'+file)).size>0,file+' must have a production asset');
}
await Promise.all(sourceModules.map(file=>run(process.execPath,['--check','dist/'+file])));
await run(process.execPath,['--check','dist/config.js']);
assert.deepEqual(Object.keys(production).sort(),Object.keys(source).sort(),'Public pricing/configuration exports must stay available');
for(const product of [
 {price:1250,discount:5},
 {price:1299,discount:17},
 {price:350,discount:29,salePrice:'250'},
 {price:65,discount:23,salePrice:'50'},
 {price:19.99,discount:0}
]){
 assert.equal(production.effectivePrice(product),source.effectivePrice(product),'Minified output must preserve actual/rounded promotional prices');
 assert.equal(production.discountBadge(product),source.discountBadge(product),'Minified output must preserve discount labels');
}
const message='Вітаю! Ноутбук HMG-008 — 1188 zł / 512 GB SSD';
assert.equal(production.telegramLink(message),source.telegramLink(message),'Ukrainian/Polish Telegram text must survive production minification');
assert.equal(production.normalizeTelegramPost('https://t.me/h_m_g_pl/123'),source.normalizeTelegramPost('https://t.me/h_m_g_pl/123'));
console.log('Production smoke checks passed: all assets, JS parsing, exports, prices, discount labels, and Telegram text.');
