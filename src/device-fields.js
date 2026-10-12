
export const DEVICE_TYPES={
 laptop:{cats:[0],uk:'Ноутбук',pl:'Laptop',fields:['cpu','generation','ram','ssd','gpu','screen','battery','os'],summary:['cpu','ram','ssd','screen','gpu']},
 phone:{cats:[1],uk:'Смартфон',pl:'Smartfon',fields:['cpu','ram','ssd','screen','resolution','camera','batteryCapacity','battery','os','sim'],summary:['ram','ssd','screen']},
 tablet:{cats:[2],uk:'Планшет',pl:'Tablet',fields:['cpu','ram','ssd','screen','resolution','batteryCapacity','battery','os','sim'],summary:['ram','ssd','screen']},
 headphones:{cats:[3],uk:'Навушники / гарнітура',pl:'Słuchawki / zestaw słuchawkowy',fields:['type','connection','noise','bluetooth','battery','chargingCase','compatibility','waterResistance','weight'],summary:['type','noise','connection']},
 smartwatch:{cats:[4],uk:'Смартгодинник',pl:'Smartwatch',fields:['screen','resolution','cpu','compatibility','gps','lte','battery','waterResistance','caseMaterial','weight'],summary:['screen','compatibility','battery']},
 monitor:{cats:[5],uk:'Монітор',pl:'Monitor',fields:['screen','resolution','hz','panelType','connection','responseTime'],summary:['screen','resolution','hz']},
 glasses:{cats:[6],uk:'Розумні окуляри',pl:'Inteligentne okulary',fields:['type','lensProtection','connection','bluetooth','compatibility','noise','cpu','battery','waterResistance','weight','dimensions'],summary:['type','bluetooth','battery']},
 tracker:{cats:[6],uk:'Трекер',pl:'Lokalizator',fields:['type','compatibility','bluetooth','powerSource','battery','waterResistance','weight','dimensions'],summary:['compatibility','powerSource','battery']},
 microphone:{cats:[3,6],uk:'Мікрофон',pl:'Mikrofon',fields:['type','connection','compatibility','pickupPattern','frequencyResponse','sampleRate','noise','wirelessRange','battery','chargingCase','weight','dimensions'],summary:['type','connection','pickupPattern']},
 speaker:{cats:[3,6],uk:'Колонка',pl:'Głośnik',fields:['type','connection','bluetooth','outputPower','frequencyResponse','compatibility','battery','waterResistance','weight'],summary:['outputPower','connection','battery']},
 other:{cats:[6],uk:'Інший девайс',pl:'Inne urządzenie',fields:['type','connection','compatibility','powerSource','battery','weight','dimensions'],summary:['type','connection','compatibility']}
};
export const DEVICE_SPEC_KEYS=['deviceType','connection','camera','batteryCapacity','chargingCase','waterResistance','caseMaterial','panelType','responseTime','lensProtection','powerSource','pickupPattern','frequencyResponse','sampleRate','wirelessRange','outputPower','customSpecs'];
const legacyTechnical=['cpu','generation','ram','ssd','gpu','screen','battery','os','type','resolution','hz','sim','gps','lte','compatibility','noise','bluetooth','weight','dimensions'];
export const DEVICE_RESET_KEYS=[...new Set([...legacyTechnical,...DEVICE_SPEC_KEYS.filter(k=>k!=='deviceType'),'extraStorageType','extraStorageCapacity','extraStorageUnit','ram16Enabled','ram16Price','ram32Enabled','ram32Price','ssd512Enabled','ssd512Price','ssd1024Enabled','ssd1024Price'])];
const names={
 cpu:['Процесор','Procesor'],generation:['Покоління','Generacja'],ram:['Оперативна пам’ять, GB','Pamięć RAM, GB'],ssd:['Накопичувач, GB','Pamięć / dysk, GB'],gpu:['Відеокарта','Grafika'],screen:['Екран, дюйми','Ekran, cale'],battery:['Автономність / акумулятор','Czas pracy / bateria'],os:['Операційна система','System operacyjny'],type:['Різновид / виконання','Rodzaj / konstrukcja'],resolution:['Роздільність','Rozdzielczość'],hz:['Частота оновлення, Гц','Odświeżanie, Hz'],sim:['SIM / мобільний зв’язок','SIM / łączność komórkowa'],gps:['GPS','GPS'],lte:['LTE / eSIM','LTE / eSIM'],compatibility:['Сумісність','Zgodność'],noise:['Шумозаглушення','Redukcja szumów'],bluetooth:['Bluetooth','Bluetooth'],weight:['Вага','Waga'],dimensions:['Розміри','Wymiary'],connection:['Підключення / роз’єм','Połączenie / złącze'],camera:['Камери','Aparaty'],batteryCapacity:['Ємність акумулятора, мА·год','Pojemność baterii, mAh'],chargingCase:['Зарядний кейс / час роботи з кейсом','Etui ładujące / czas z etui'],waterResistance:['Захист від води / пилу','Odporność na wodę / pył'],caseMaterial:['Матеріал корпусу / ремінця','Materiał koperty / paska'],panelType:['Тип матриці','Typ matrycy'],responseTime:['Час відгуку','Czas reakcji'],lensProtection:['Лінзи / UV-захист','Soczewki / ochrona UV'],powerSource:['Живлення / тип батареї','Zasilanie / typ baterii'],pickupPattern:['Спрямованість мікрофона','Charakterystyka kierunkowa'],frequencyResponse:['Частотний діапазон','Pasmo przenoszenia'],sampleRate:['Частота дискретизації / розрядність','Próbkowanie / rozdzielczość'],wirelessRange:['Дальність бездротового зв’язку','Zasięg bezprzewodowy'],outputPower:['Потужність звуку','Moc dźwięku']
};
const examples={cpu:'Intel Core i5-1135G7',ram:'16',ssd:'512',screen:'15.6',bluetooth:'5.3',weight:'48 g',dimensions:'31 × 9 mm',battery:'До 6 годин / Do 6 godzin',camera:'50 MP + 12 MP',batteryCapacity:'4400',chargingCase:'До 24 годин / Do 24 godzin',waterResistance:'IPX4',caseMaterial:'Сталь / Stal',panelType:'IPS',responseTime:'1 ms',lensProtection:'UV400, поляризація / polaryzacja',powerSource:'CR2032',pickupPattern:'Кардіоїдна / Kardioidalna',frequencyResponse:'20 Hz – 20 kHz',sampleRate:'48 kHz / 24 bit',wirelessRange:'100 m',outputPower:'20 W',connection:'USB-C'};
const suggestions={connection:['USB-C','USB-A','Lightning','3.5 mm','Bluetooth','2.4 GHz wireless','XLR','HDMI','DisplayPort'],compatibility:['Android + iPhone','Apple Find My','Windows + macOS','Android','iPhone / iOS'],noise:['ANC','ENC','Немає / Brak'],bluetooth:['5.2','5.3','5.4'],pickupPattern:['Кардіоїдна / Kardioidalna','Всеспрямована / Dookólna','Суперкардіоїдна / Superkardioidalna'],panelType:['IPS','OLED','VA','TN'],gps:['Є / Tak','Немає / Nie'],lte:['Є / Tak','Немає / Nie']};
const typeSuggestions={headphones:['TWS','Вкладиші / Douszne','Внутрішньоканальні / Dokanałowe','Накладні / Nauszne','Повнорозмірні / Wokółuszne','Ігрова гарнітура / Gaming'],microphone:['Петличний / Krawatowy','Студійний / Studyjny','USB-мікрофон / Mikrofon USB','Бездротовий / Bezprzewodowy'],glasses:['Сонцезахисні / Przeciwsłoneczne','Окуляри з аудіо / Okulary audio'],tracker:['Bluetooth-трекер / Tracker Bluetooth'],speaker:['Портативна / Przenośny','Настільна / Biurkowy','Саундбар / Soundbar']};
const E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function deviceTypeChoices(cat){return Object.entries(DEVICE_TYPES).filter(([,p])=>p.cats.includes(Number(cat))).map(([value,p])=>({value,uk:p.uk,pl:p.pl}));}
export function resolveDeviceType(p={}){
 const options=deviceTypeChoices(p.cat),explicit=String(p.deviceType||'');
 if(options.some(o=>o.value===explicit))return explicit;
 if(Number(p.cat)===3||Number(p.cat)===6){
  const name=String(p.name||'').toLowerCase();
  if(/microphone|mikrofon|мікрофон/.test(name))return 'microphone';
  if(/speaker|głośnik|колонк|soundbar/.test(name))return 'speaker';
  const text=String(p.type||'')+' '+name;
  if(Number(p.cat)===6){
   if(/glasses|okular|окуляр/i.test(text))return 'glasses';
   if(/tracker|find\s*my|трекер|lokalizator/i.test(text))return 'tracker';
   return 'other';
  }
 }
 return options[0]?.value||'other';
}
export function deviceProfile(p={}){return DEVICE_TYPES[resolveDeviceType(p)];}
export function deviceTypeLabel(p={},lang='uk'){return deviceProfile(p)[lang==='pl'?'pl':'uk'];}
export function deviceFieldLabel(key,lang='uk',device= ''){
 if(key==='cpu'&&device==='glasses')return lang==='pl'?'Chip':'Чип';
 if(key==='battery'&&['laptop','phone','tablet'].includes(device))return lang==='pl'?'Stan baterii':'Стан акумулятора';
 return (names[key]||[key,key])[lang==='pl'?1:0];
}
export function parseCustomSpecs(value){
 let rows=value;
 if(value==null||value==='')return [];
 const fail=()=>{const e=Error('validation');e.field='customSpecs';throw e;};
 if(typeof value==='string'){
  const text=value.trim();if(!text)return [];
  if(text.startsWith('[')){try{rows=JSON.parse(text);}catch{fail();}}
  else rows=text.split('\n').filter(line=>line.trim()).map(line=>{const i=line.indexOf(':');if(i<1)fail();return {label:line.slice(0,i),value:line.slice(i+1)};});
 }
 if(!Array.isArray(rows)||rows.length>12)fail();
 return rows.map(row=>{
  if(!row||typeof row!=='object'||typeof row.label!=='string'||typeof row.value!=='string')fail();
  const label=row.label.trim(),content=row.value.trim();
  if(!label||!content||label.length>80||content.length>500)fail();
  return {label,value:content};
 });
}
export function customSpecsText(value){if(typeof value==='string'&&!value.trim().startsWith('['))return value;return parseCustomSpecs(value).map(row=>row.label+': '+row.value).join('\n');}
export function deviceSpecRows(p={},lang='uk',format=(key,value)=>String(value||'')){
 const type=resolveDeviceType(p);
 return [
  [lang==='pl'?'Typ urządzenia':'Тип пристрою',deviceTypeLabel(p,lang)],
  ...deviceProfile(p).fields.map(key=>[deviceFieldLabel(key,lang,type),format(key,p[key])]),
  ...parseCustomSpecs(p.customSpecs).map(row=>[row.label,row.value])
 ].filter(([,value])=>String(value||'').trim());
}
export function deviceFieldSnapshot(values={}){return Object.fromEntries(DEVICE_RESET_KEYS.filter(key=>Object.hasOwn(values,key)).map(key=>[key,values[key]]));}
export function switchDeviceValues(values={},cat,type,cache={}){
 const next={...values,cat:Number(cat),deviceType:type};
 for(const key of DEVICE_RESET_KEYS)next[key]='';
 Object.assign(next,cache);
 return next;
}
export function renderDeviceSelector(p={},lang='uk'){
 const selected=resolveDeviceType(p),options=deviceTypeChoices(p.cat),pl=lang==='pl';
 return '<label class="hp-field">'+(pl?'Typ urządzenia':'Тип пристрою')+'<select name="deviceType" id="hp-form-device-type">'+options.map(o=>'<option value="'+o.value+'"'+(selected===o.value?' selected':'')+'>'+E(pl?o.pl:o.uk)+'</option>').join('')+'</select></label>';
}
export function renderDeviceFields(p={},lang='uk',choices={}){
 const type=resolveDeviceType(p),pl=lang==='pl';
 const fields=deviceProfile(p).fields.map(key=>{
  const values=key==='type'?(typeSuggestions[type]||[]):(suggestions[key]||choices[key]||[]);
  const list='hp-device-choices-'+key,example=examples[key]||'';
  return '<label class="hp-field">'+E(deviceFieldLabel(key,lang,type))+'<input name="'+key+'" maxlength="500" value="'+E(p[key]||'')+'"'+(values.length?' list="'+list+'"':'')+(example?' placeholder="'+E(example)+'"':'')+'>'+ (values.length?'<datalist id="'+list+'">'+values.map(value=>'<option value="'+E(value)+'"></option>').join('')+'</datalist>':'')+'</label>';
 }).join('');
 return fields+'<label class="hp-field hp-wide">'+(pl?'Inne parametry — nazwa: wartość':'Інші характеристики — назва: значення')+'<textarea name="customSpecs" rows="3" placeholder="'+E(pl?'W zestawie: odbiornik USB-C\nSterowanie: wyciszanie i regulacja':'У комплекті: приймач USB-C\nКерування: вимкнення звуку та регулювання')+'">'+E(customSpecsText(p.customSpecs))+'</textarea><small class="hp-muted">'+(pl?'Każdy parametr w osobnym wierszu, do 12. Wypełnij tylko potwierdzone dane.':'Кожна характеристика з нового рядка, до 12. Вказуй лише підтверджені дані.')+'</small></label>';
}
