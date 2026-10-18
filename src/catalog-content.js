import { capacityGB, effectivePrice, ramUpgradesSupported } from './core.js';

export function plainDescription(value='') {
 return String(value??'').replace(/\\n/g,'\n').replace(/^\s{0,3}#{1,6}\s+/gm,'').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/__([^_]+)__/g,'$1').trim();
}
const SEARCH_ALIASES={леново:'lenovo',хп:'hp',делл:'dell',дел:'dell',асус:'asus',азус:'asus',епл:'apple',еппл:'apple',апл:'apple',макбук:'macbook',ейсер:'acer',фуджитсу:'fujitsu',фуджітсу:'fujitsu',самсунг:'samsung',соні:'sony',сони:'sony',плейстейшн:'playstation',нінтендо:'nintendo',світч:'switch',айфон:'iphone',айпад:'ipad',райзен:'ryzen',інтел:'intel'};
function searchText(value) {
 return String(value??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).map(token=>SEARCH_ALIASES[token]||token).join(' ');
}
export function matchesProductSearch(p={},query='') {
 const tokens=searchText(query).split(' ').filter(Boolean);
 const text=searchText([p.name,p.brand,p.cpu,p.gpu,p.ram,p.ssd,p.modelCode,p.platform].join(' '));
 return tokens.every(token=>text.includes(token));
}
function moneyMentions(text) {
 return [...String(text||'').matchAll(/(\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*(?:zł|pln|зл(?:отих)?)/gi)].map(m=>Number(m[1].replace(/\s/g,''))+(Number(m[2]||0)/(m[2]?.length===1?10:100)));
}
export function productContentIssues(p={},lang) {
 const issues=[];
 const descriptions=lang?[lang==='pl'?p.descPl:p.descUk]:[p.descUk,p.descPl];
 const texts=[p.name,...descriptions].map(plainDescription);
 const family=String(p.cpu||'').match(/\bi[3579]\b/i)?.[0].toLowerCase();
 if(family&&texts.some(text=>[...text.matchAll(/\bi[3579]\b/gi)].some(m=>m[0].toLowerCase()!==family)))issues.push('cpuMismatch');
 const storage=capacityGB(p.ssd);
 if(Number(p.cat)===0&&storage>0&&texts.some(text=>{
  const mentions=[...text.matchAll(/(?:SSD|Накопичувач|Dysk)\s*[:—-]?\s*(\d+(?:[.,]\d+)?)\s*(GB|ГБ|TB|ТБ)|(\d+(?:[.,]\d+)?)\s*(GB|ГБ|TB|ТБ)\s*SSD/gi)];
  return mentions.some(m=>capacityGB((m[1]||m[3])+' '+(m[2]||m[4]))!==storage);
 }))issues.push('storageMismatch');
 const diagonal=Number(String(p.screen||'').replace(',','.'));
 if(Number(p.cat)===0&&diagonal>0&&texts.some(text=>[...text.matchAll(/(?:Екран|Дисплей|Ekran|Wyświetlacz)\s*:\s*(\d+(?:[.,]\d+)?)\s*["″”]/gi)].some(m=>Math.abs(Number(m[1].replace(',','.'))-diagonal)>.05)))issues.push('screenMismatch');
 const gpu=String(p.gpu||'').match(/\b(?:GTX|RTX|P)\s*([0-9]{3,4})\b/i)?.[1];
 if(gpu&&texts.some(text=>[...text.matchAll(/\b(?:GTX|RTX|P)\s*([0-9]{3,4})\b/gi)].some(m=>m[1]!==gpu)))issues.push('gpuMismatch');
 if((p.ram16Enabled==='true'||p.ram32Enabled==='true')&&!ramUpgradesSupported(p))issues.push('ramUpgrade');
 const languages=lang?[lang]:['uk','pl'];
 if(languages.some(l=>{
  const suffix=l==='pl'?'Pl':'Uk';
  const prices=moneyMentions([p['seoTitle'+suffix],p['seoDescription'+suffix]].join(' '));
  return prices.length>0&&!prices.some(value=>Math.abs(value-effectivePrice(p))<.011);
 }))issues.push('seoPrice');
 if((!lang||lang==='pl')&&/\p{Script=Cyrillic}/u.test(String(p.descPl||'')))issues.push('plTranslation');
 if(/\bmacbook\b/i.test(p.name||'')&&String(p.benefits||'').split(',').includes('touch'))issues.push('touchMismatch');
 return [...new Set(issues)];
}
