import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesProductSearch,plainDescription,productContentIssues} from '../src/catalog-content.js';
import {ramUpgradesSupported,upgradeOptions,toRow} from '../src/core.js';
import {adminUpgrades} from '../src/configurator.js';
import {normalizedSpec,specLabel,filterValues,comparisonRows} from '../src/storefront.js';
import {localizedSpecValue,deviceSpecRows} from '../src/device-fields.js';
import {productItemCondition} from '../src/seo-core.js';

const laptop={name:'HP EliteBook 840 G5 / Core i7 / 8 GB / 256 GB SSD',cat:0,brand:'HP',cpu:'Intel Core i7',ram:'8',ssd:'256',screen:'14',price:1199,status:0,quantity:'1',descUk:'Процесор: Intel Core i7\nНакопичувач: SSD 256 ГБ\nЕкран: 14″',descPl:'Procesor: Intel Core i7\nDysk: 256 GB SSD\nEkran: 14″',seoDescriptionUk:'Ціна: 1199 zł'};
test('Cyrillic brand aliases and split configuration queries find the same matching products',()=>{
 const lenovo={...laptop,brand:'Lenovo',name:'Lenovo ThinkPad T14',ram:'16',ssd:'512'};
 for(const query of ['леново','Lenovo 16/512','леново 16 512'])assert(matchesProductSearch(lenovo,query),query);
 assert(!matchesProductSearch(lenovo,'леново 32 512'));
 assert(matchesProductSearch({name:'Apple MacBook Pro A1989'},'макбук'));
 assert(matchesProductSearch(laptop,'хп i7'));
 assert(matchesProductSearch({name:'Apple iPhone 13'},'айфон'));
});
test('Core family filters include full CPU models while visible specs and comparisons keep model differences',()=>{
 const a={cpu:'Intel Core i7'},b={cpu:'Intel Core i7-1065G7'};
 assert.deepEqual(filterValues([a,b],'cpu'),['Intel Core i7']);
 assert.equal(normalizedSpec('cpu',b.cpu),'Intel Core i7');
 assert.equal(specLabel('cpu',b.cpu),b.cpu);
 assert.deepEqual(comparisonRows([a,b],[['cpu','CPU']],true),[['cpu','CPU']]);
});
test('soldered models cannot expose or persist RAM upgrades; SSD upgrade stays available',()=>{
 const enabled={...laptop,ram16Enabled:'true',ram16Price:'399',ssd512Enabled:'true',ssd512Price:'499'};
 for(const name of ['Lenovo ThinkPad T490s','Lenovo ThinkPad T14s Gen1','Dell XPS 13 9370','Apple MacBook Pro']){
  const item={...enabled,name};assert.equal(ramUpgradesSupported(item),false,name);
  assert.deepEqual(upgradeOptions(item).map(o=>o.key),['ssd512']);
  assert.throws(()=>toRow(item),/validation/);
  assert.match(adminUpgrades(item,'uk',String),/name="ram16Enabled" disabled/);
 }
 assert.equal(ramUpgradesSupported(laptop),true);
 assert.equal(ramUpgradesSupported({...laptop,name:'Lenovo ThinkPad T14 Gen1'}),true);
});
test('bilingual specification values localize without truncating ports, platforms or controller text',()=>{
 assert.equal(localizedSpecValue('Ідеальний / Idealny','pl'),'Idealny');
 assert.equal(localizedSpecValue('Клавіатура / Klawiatura','uk'),'Клавіатура');
 for(const value of ['USB / USB-C / HDMI','Windows / macOS','Sony DualSense'])assert.equal(localizedSpecValue(value,'pl'),value);
 const rows=deviceSpecRows({...laptop,customSpecs:[{label:'Клавіатура / Klawiatura',value:'З підсвіткою / Podświetlana'}]},'pl');
 assert(rows.some(([key,value])=>key==='Klawiatura'&&value==='Podświetlana'));
});
test('like new is a used condition in both languages, independently of new arrival merchandising',()=>{
 for(const value of ['Як новий / Jak nowy','Jak nowa','Like new','Майже новий'])assert.equal(productItemCondition(value),'https://schema.org/UsedCondition');
 assert.equal(productItemCondition('Новий / Nowy'),'https://schema.org/NewCondition');
 assert.equal(productItemCondition('Стан уточнюється / Stan do ustalenia'),null);
 assert.equal(productItemCondition('Відновлений / Odnowiony'),'https://schema.org/RefurbishedCondition');
});
test('content checks catch CPU, storage, GPU, screen, translation and SEO price contradictions',()=>{
 assert.deepEqual(productContentIssues(laptop),[]);
 assert(productContentIssues({...laptop,descUk:'Процесор Intel Core i5'}).includes('cpuMismatch'));
 assert(productContentIssues({...laptop,descUk:'Накопичувач: SSD 512 ГБ'}).includes('storageMismatch'));
 assert(!productContentIssues({...laptop,ssd:'1024',name:'Laptop SSD 1 TB',descUk:'SSD 1 ТБ',descPl:'Dysk: 1 TB SSD'}).includes('storageMismatch'));
 assert(productContentIssues({...laptop,descUk:'Екран: 15.6″'}).includes('screenMismatch'));
 assert(productContentIssues({...laptop,gpu:'NVIDIA GTX 1050',descUk:'NVIDIA GTX 1060'}).includes('gpuMismatch'));
 assert(!productContentIssues({...laptop,gpu:'NVIDIA Quadro P1000',descUk:'NVIDIA Quadro P1000 та Intel UHD Graphics P630'}).includes('gpuMismatch'));
 assert(productContentIssues({...laptop,descPl:'Laptop ze стилусом'}).includes('plTranslation'));
 assert(productContentIssues({...laptop,discount:'10'}).includes('seoPrice'));
 assert(!productContentIssues({...laptop,discount:'10',seoDescriptionUk:'Зараз 1079 zł замість 1199 zł'}).includes('seoPrice'));
 assert(productContentIssues({...laptop,seoDescriptionUk:'Ціна 1 199,50 zł'}).includes('seoPrice'));
});
test('pasted Markdown is readable plain text and never turns HTML into executable markup',()=>{
 assert.equal(plainDescription('# **Заголовок**\\n\\n__Опис__'),'Заголовок\n\nОпис');
 assert.equal(plainDescription('<img src=x onerror=alert(1)>'),'<img src=x onerror=alert(1)>');
});

test('laptop specification rows expose verified display type, resolution and refresh rate',()=>{
 const rows=deviceSpecRows({...laptop,panelType:'IPS',resolution:'1920×1080',hz:'60'},'uk');
 for(const value of ['IPS','1920×1080','60'])assert(rows.some(row=>row[1]===value));
});
