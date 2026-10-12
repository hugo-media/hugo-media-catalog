
import test from 'node:test';
import assert from 'node:assert/strict';
import {deviceProfile,resolveDeviceType,deviceTypeChoices,renderDeviceFields,renderDeviceSelector,deviceSpecRows,parseCustomSpecs,customSpecsText,deviceFieldSnapshot,switchDeviceValues} from '../src/device-fields.js';
import {toRow,fromRow} from '../src/core.js';
import {adminUpgrades} from '../src/configurator.js';
import {transition,parseSpecs} from '../supabase/functions/hmg-telegram-admin/bot-core.mjs';

const base={name:'JBL Quantum Stream Wireless Microphone',brand:'JBL',cat:3,deviceType:'microphone',status:0,price:299,images:[]};
test('headphones, microphone and glasses forms use relevant fields without laptop controls',()=>{
 const mic=renderDeviceFields(base);
 assert.match(mic,/name="pickupPattern"/);assert.match(mic,/name="connection"/);
 assert.doesNotMatch(mic,/name="(?:ram|ssd|gpu|cpu|extraStorageType)"/);
 const headphones=renderDeviceFields({...base,deviceType:'headphones'});
 assert.match(headphones,/name="noise"/);assert.match(headphones,/name="chargingCase"/);
 assert.doesNotMatch(headphones,/name="(?:ram|ssd|pickupPattern)"/);
 const glasses=renderDeviceFields({...base,cat:6,deviceType:'glasses'});
 assert.match(glasses,/name="lensProtection"/);assert.match(glasses,/Чип/);
 assert.doesNotMatch(glasses,/name="(?:ram|ssd|gpu)"/);
 for(const cat of [1,2,3,4,5,6])assert.equal(adminUpgrades({cat},'uk',String),'');
 assert.match(adminUpgrades({cat:0},'uk',String),/Апгрейди RAM/);
 assert.ok(deviceProfile({cat:1}).fields.includes('ram'));
});
test('typed parameters and arbitrary extra rows survive save and reload',()=>{
 const row=toRow({...base,connection:'USB-C',pickupPattern:'Всеспрямована',frequencyResponse:'20 Hz – 20 kHz',customSpecs:'У комплекті: приймач USB-C\nМонтаж: кліпса'});
 const loaded=fromRow(row);
 assert.equal(loaded.deviceType,'microphone');assert.equal(loaded.pickupPattern,'Всеспрямована');
 assert.deepEqual(loaded.customSpecs,[{label:'У комплекті',value:'приймач USB-C'},{label:'Монтаж',value:'кліпса'}]);
 assert.ok(deviceSpecRows(loaded).some(([label,value])=>label==='У комплекті'&&value==='приймач USB-C'));
 assert.equal(customSpecsText(loaded.customSpecs),'У комплекті: приймач USB-C\nМонтаж: кліпса');
 assert.deepEqual(fromRow(toRow({...loaded,connection:'Lightning'})).customSpecs,loaded.customSpecs);
});
test('switching type keeps common product edits and caches previous device values without leaking RAM',()=>{
 const original={...base,cat:0,deviceType:'laptop',name:'Typed name',price:'777',ram:'16',ssd:'512',connection:'USB-C',customSpecs:'Комплект: зарядка'};
 const cache=deviceFieldSnapshot(original);
 const mic=switchDeviceValues(original,3,'microphone');
 assert.equal(mic.name,'Typed name');assert.equal(mic.price,'777');assert.equal(mic.ram,'');assert.equal(mic.customSpecs,'');
 const restored=switchDeviceValues({...mic,price:'888'},0,'laptop',cache);
 assert.equal(restored.ram,'16');assert.equal(restored.ssd,'512');assert.equal(restored.price,'888');
 assert.equal(restored.customSpecs,'Комплект: зарядка');
});
test('legacy records resolve without migrations, including the microphone mislabelled as a tracker',()=>{
 assert.equal(resolveDeviceType({cat:3,type:'TWS'}),'headphones');
 assert.equal(resolveDeviceType({cat:6,type:'Розумні окуляри'}),'glasses');
 assert.equal(resolveDeviceType({cat:6,name:'Find My tracker'}),'tracker');
 assert.equal(resolveDeviceType({...base,cat:6,deviceType:'',type:'Bluetooth-трекер'}),'microphone');
 const loaded=fromRow({name:'Smart Music Glasses',cat:6,price:200,specs:{type:'Розумні окуляри',cpu:'JL'},images:[]});
 assert.equal(loaded.deviceType,'glasses');assert.equal(loaded.cpu,'JL');
 assert.ok(deviceSpecRows(loaded).some(([label,value])=>label==='Чип'&&value==='JL'));
});
test('classification is constrained to its category and custom parameters are bounded and escaped',()=>{
 assert.throws(()=>toRow({...base,cat:0}),e=>e.field==='deviceType');
 assert.throws(()=>toRow({...base,customSpecs:'Missing separator'}),e=>e.field==='customSpecs');
 assert.throws(()=>parseCustomSpecs(Array.from({length:13},()=>({label:'a',value:'b'}))));
 assert.throws(()=>parseCustomSpecs([{label:'x'.repeat(81),value:'b'}]));
 const html=renderDeviceFields({...base,connection:'"><img src=x onerror=alert(1)>',customSpecs:'<script>: <img src=x>'});
 assert.doesNotMatch(html,/<script>|<img src=x/);assert.match(html,/&lt;script&gt;/);
 assert.match(renderDeviceSelector({...base,cat:6},'pl'),/Mikrofon/);
 assert.ok(deviceTypeChoices(6).some(o=>o.value==='other'));
});
test('Telegram uses the same classification and accepts microphone fields while rejecting RAM',()=>{
 let state=transition({},{text:'/add'},'12345678-1234-4234-8234-123456789012').state;
 state=transition(state,{text:'Навушники та аудіо'}).state;
 assert.equal(state.step,'deviceType');
 const next=transition(state,{text:'Мікрофон'});
 assert.equal(next.state.step,'name');assert.equal(next.state.values.deviceType,'microphone');
 const parsed=parseSpecs('Підключення: USB-C\nСпрямованість мікрофона: Всеспрямована\nУ комплекті: приймач',3,'microphone');
 assert.equal(parsed.connection,'USB-C');assert.equal(parsed.pickupPattern,'Всеспрямована');
 assert.deepEqual(parsed.customSpecs,[{label:'У комплекті',value:'приймач'}]);
 assert.throws(()=>parseSpecs('RAM: 16 GB',3,'microphone'));
 const prompt=transition({...next.state,step:'specs'},{text:'/resume'}).reply.text;
 assert.match(prompt,/Спрямованість/);assert.doesNotMatch(prompt,/Оперативна|SSD|Відеокарта/);
});
