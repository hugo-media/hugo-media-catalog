import {deviceTypeChoices,resolveDeviceType,deviceProfile,deviceFieldLabel,deviceSpecRows,DEVICE_RESET_KEYS,parseCustomSpecs,CONSOLE_BRANDS} from '../../../src/device-fields.js';

import {toRow,fromRow,effectivePrice,normalizeTelegramPost,UPGRADES,capacityGB} from '../../../src/core.js';

export const MENU={keyboard:[['📊 Звіт зараз','➕ Додати товар'],['📅 Звіт за вчора','📈 Звіт за 7 днів'],['🗓 Звіт за 30 днів','📝 Продовжити товар'],['🔎 Керувати товарами','⚙️ Адмінка сайту']],resize_keyboard:true,is_persistent:true};
export const CATEGORIES=['Ноутбуки','Телефони','Планшети','Навушники та аудіо','Смартгодинники','Монітори','Смартдевайси','Ігрові консолі'];
export const STATUSES=['У наявності','Заброньовано','Розпродано','Чернетка','Немає в наявності','Очікується'];
const steps=['cat','deviceType','name','brand','price','discount','condition','warranty','status','quantity','newArrival','specs','descUk','descPl','charger','telegramPost','photoKind','photos','preview'];
const optional=new Set(['salePrice','seoTitleUk','seoTitlePl','seoDescriptionUk','seoDescriptionPl','discount','warranty','specs','descUk','descPl','charger','telegramPost']);
const labels={bestseller:'Бестселер',salePrice:'Акційна ціна',seoTitleUk:'SEO-заголовок UA',seoTitlePl:'SEO-заголовок PL',seoDescriptionUk:'SEO-опис UA',seoDescriptionPl:'SEO-опис PL',cat:'Категорія',deviceType:'Тип пристрою',name:'Назва',brand:'Бренд',price:'Ціна',discount:'Знижка',condition:'Стан',warranty:'Гарантія',status:'Наявність',quantity:'Кількість',newArrival:'Нове надходження',specs:'Характеристики',descUk:'Опис українською',descPl:'Опис польською',charger:'Зарядка',telegramPost:'Пост у Telegram',photoKind:'Тип фото',photos:'Фото'};
const specKeys={'процесор':'cpu','cpu':'cpu','покоління':'generation','ram':'ram','озп':'ram','ssd':'ssd','пам’ять':'ssd','память':'ssd','gpu':'gpu','відеокарта':'gpu','екран':'screen','акб':'battery','батарея':'battery','ос':'os','роздільність':'resolution','гц':'hz','sim':'sim','gps':'gps','lte':'lte','сумісність':'compatibility','bluetooth':'bluetooth','вага':'weight','розміри':'dimensions','тип':'type'};
const reply=(text,keyboard)=>({text,reply_markup:keyboard?{keyboard,resize_keyboard:true}:MENU});
const clean=value=>String(value||'').trim();
const money=value=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2}).format(value)+' zł';
export function parseNumber(text,{min=0,max=10000000,integer=false}={}){
 const raw=clean(text).replace(/\s/g,'').replace(',','.');
 if(!/^\d+(?:\.\d{1,2})?$/.test(raw))throw Error('Введи число, наприклад 1299 або 1299,50.');
 const n=Number(raw);if(n<min||n>max||(integer&&!Number.isInteger(n)))throw Error('Введи '+(integer?'ціле ':'')+'число від '+min+' до '+max+'.');
 return n;
}
export function parseSpecs(text,cat,deviceType){
 const profile=deviceProfile({cat,deviceType}),allowed=new Set(profile.fields),out={},custom=[];
 const aliases={...specKeys,connection:'connection','підключення':'connection','роз’єм':'connection',pickuppattern:'pickupPattern'};
 if(Number(cat)===7)Object.assign(aliases,{'ram':'consoleMemory','озп':'consoleMemory','оперативна пам’ять':'consoleMemory','ssd':'consoleStorage','пам’ять':'consoleStorage','память':'consoleStorage','накопичувач':'consoleStorage','графіка':'gpu','платформа':'consolePlatform','модель':'consoleModel','версія':'consoleEdition','комплект':'consoleBundle','геймпад':'controller'});
 for(const key of profile.fields){aliases[key.toLowerCase()]=key;aliases[deviceFieldLabel(key,'uk',deviceType).toLocaleLowerCase('uk')]=key;}
 for(const line of clean(text).split('\n')){
  const match=/^([^:]+):\s*(.+)$/.exec(line.trim());
  if(!match)throw Error('Кожну характеристику пиши окремим рядком: Назва: значення');
  const key=match[1].trim().toLocaleLowerCase('uk'),value=match[2].trim();
  if(value.length>500)throw Error('Значення характеристики має бути до 500 символів.');
  if(['додатковий диск','додатковий накопичувач'].includes(key)){
   const m=/^(SSD|HDD)\s+(\d+(?:[.,]\d+)?)\s*(GB|TB|ГБ|ТБ)$/i.exec(value);
   if(Number(cat)!==0||!m||Number(m[2].replace(',','.'))<=0)throw Error('Для ноутбука: Додатковий диск: HDD 1 TB');
   out.extraStorageType=m[1].toUpperCase();out.extraStorageCapacity=m[2].replace(',','.');out.extraStorageUnit=/^(TB|ТБ)$/i.test(m[3])?'TB':'GB';
  }else if(aliases[key]){
   const field=aliases[key];if(!allowed.has(field))throw Error('Ця характеристика не належить до обраного типу пристрою: '+match[1]+'.');
   out[field]=value;
  }else custom.push({label:match[1].trim(),value});
 }
 out.customSpecs=parseCustomSpecs(custom);
 return out;
}
export function describeDraft(state){
 const p=state.values||{},lines=[
  state.mode==='manage'?'HMG-'+String(state.productId).padStart(3,'0')+' · Перевір зміни:':'Перевір товар перед збереженням:','',
  p.name||'Без назви',CATEGORIES[p.cat]+' · '+(p.brand||''),
  'Ціна: '+money(p.price)+(Number(p.discount)?' → '+money(effectivePrice(p))+' (−'+p.discount+'%)':''),
  'Стан: '+(p.condition||'Не вказано'),'Гарантія: '+(p.warranty||'Не вказано'),
  'Статус: '+STATUSES[p.status]+' · Кількість: '+p.quantity,
  'Нове надходження: '+(p.newArrival==='true'?'Так':'Ні')+' · Бестселер: '+(p.bestseller==='true'?'Так':'Ні'),
  ...deviceSpecRows(p,'uk').map(([label,value])=>label+': '+value),
  p.extraStorageType?'Додатковий диск: '+p.extraStorageType+' '+p.extraStorageCapacity+' '+p.extraStorageUnit:'',
  'Зарядка: '+({adapter:'Блок і кабель',cable:'Лише кабель',none:'Без зарядки'}[p.charger]||'Не вказано'),
  'Фото: '+(state.photos?.length||0)+' із 8 · '+({actual:'цього товару',model:'моделі',mixed:'змішані'}[p.photoKind]||'Не вказано'),
  'Пост: '+(p.telegramPost||'Не додано'),'', 'Опис: '+(p.descUk||'Не вказано'),
  p.descPl?'\nОпис польською: '+p.descPl:''
 ];
 const text=lines.filter(x=>x!==null).join('\n');
 return text.length>3700?text.slice(0,3600)+'\n… Повний опис збережений.':text;
}
function prompt(state,notice=''){
 const s=state.step,p=state.values||{};
 const prompts={
  bestseller:'Показувати товар серед бестселерів?',
  salePrice:'Введи точну акційну ціну у zł. «Пропустити» прибере фіксовану ціну й залишить розрахунок за відсотком.',
  seoTitleUk:'Введи SEO-заголовок українською (до 80 символів).',
  seoTitlePl:'Введи SEO-заголовок польською (до 80 символів).',
  seoDescriptionUk:'Введи SEO-опис українською (до 200 символів).',
  seoDescriptionPl:'Введи SEO-опис польською (до 200 символів).',
  cat:'Обери категорію товару.',
  deviceType:'Що це за пристрій? Обери тип кнопкою.',
  name:'Напиши повну назву товару (до 180 символів).',
  brand:Number(p.cat)===7?'Обери виробника консолі кнопкою або введи свого.':'Напиши бренд: Lenovo, Apple, Samsung тощо.',
  price:'Введи базову ціну у злотих, наприклад 1299.',
  discount:'Знижка у відсотках: 0–99. Ціна зі знижкою округлюється до цілого zł.',
  condition:'Вкажи стан товару. Нюанси й дефекти обов’язково додай в опис.',
  warranty:'Вкажи гарантію, наприклад 12 місяців. Або пропусти.',
  status:'Обери наявність.',
  quantity:'Скільки одиниць? Введи ціле число від 0 до 99.',
  newArrival:'Позначити як нове надходження?\n\nЦе позначка для блоку «Нові надходження» на сайті. Її можна змінити в адмінці.',
  specs:'Надішли характеристики одним повідомленням: Назва: значення, кожну з нового рядка. Або пропусти.\n\nДля цього пристрою:\n'+deviceProfile(p).fields.map(key=>deviceFieldLabel(key,'uk',resolveDeviceType(p))+': …').join('\n')+(Number(p.cat)===0?'\nДодатковий диск: HDD 1 TB':'')+'\n\nМожна додати власні характеристики у такому самому форматі.',
  descUk:'Надішли опис українською: особливості, комплект і всі нюанси стану. Можна вставити текст оголошення.',
  descPl:'Надішли опис польською або натисни «Пропустити».',
  charger:'Що йде із зарядкою?',
  telegramPost:'Встав посилання на фото/відео в каналі https://t.me/h_m_g_pl/… або пропусти.',
  photoKind:'Це фото саме цього товару чи зображення моделі?',
  photos:'Надішли до 8 фото по одному або альбомом. Перше буде головним. Можна JPEG, PNG, WebP до 10 МБ.\nОтримано: '+(state.photos?.length||0)+'. Коли всі фото додані, натисни «✅ Фото додано».',
  preview:describeDraft(state),
  edit:'Що змінити?'
 };
 let keys=s==='cat'?CATEGORIES.map(x=>[x]):s==='deviceType'?deviceTypeChoices(p.cat).map(o=>[o.uk]):s==='status'?STATUSES.map(x=>[x]):s==='condition'?[['Новий','Вживаний — відмінний'],['Вживаний — добрий','З нюансами']]:s==='warranty'?[['12 місяців','6 місяців','3 місяці']]:s==='charger'?[['Блок і кабель','Лише кабель','Без зарядки']]:s==='photoKind'?[['Фото цього товару'],['Зображення моделі','Змішані фото']]:s==='photos'?[['✅ Фото додано'],['➖ Прибрати останнє фото','🗑 Очистити фото']]:s==='preview'?[['✅ Опублікувати'],['💾 Зберегти чернетку','✏️ Виправити']]:s==='edit'?Object.values(labels).map(x=>[x]):[];
 if(s==='brand'&&Number(p.cat)===7)keys=CONSOLE_BRANDS.reduce((rows,name,i)=>{if(i%3===0)rows.push([]);rows.at(-1).push(name);return rows;},[]);
 if(s==='discount')keys=[['0','5','10','15','20']];
 if(s==='quantity')keys=[['1','2','3']];
 if(s==='newArrival'||s==='bestseller')keys=[['Так','Ні']];
 if(s==='preview'&&state.mode==='manage')keys=[['💾 Зберегти зміни'],['Ціна','Знижка','Наявність'],['Кількість','Нове надходження','Бестселер'],['Характеристики','Фото'],['✏️ Виправити','🗑 Видалити товар']];
 if(s==='edit')keys=Object.entries(labels).filter(([k])=>k!=='charger'||[0,1,2].includes(Number(p.cat))).reduce((rows,[,label],i)=>{if(i%2===0)rows.push([]);rows.at(-1).push(label);return rows;},[]);
 if(optional.has(s))keys.push(['Пропустити']);
 keys.push(['⬅️ Назад','❌ Скасувати']);
 const current=state.mode==='manage'&&state.editing&&s!=='photos'?(s==='specs'?deviceSpecRows(p,'uk').map(([k,v])=>k+': '+v).join('\n'):s==='status'?STATUSES[p.status]:s==='cat'?CATEGORIES[p.cat]:s==='newArrival'||s==='bestseller'?(p[s]==='true'?'Так':'Ні'):p[s]):'';
 return reply(((notice?notice+'\n\n':'')+prompts[s]+(current?'\n\nЗараз: '+String(current).slice(0,1600):'')).slice(0,4000),keys);
}
function advance(state){
 if(state.editing){
  if(state.step==='cat'&&deviceTypeChoices(state.values.cat).length>1){state.step='deviceType';return;}
  delete state.editing;state.step='preview';return;
 }
 let i=steps.indexOf(state.step)+1;
 if(steps[i]==='deviceType'&&deviceTypeChoices(state.values.cat).length===1){state.values.deviceType=resolveDeviceType(state.values);i++;}
 if(steps[i]==='charger'&&![0,1,2].includes(Number(state.values.cat)))i++;
 state.step=steps[i];
}
export function transition(previous,input,newDraftId){
 const state=structuredClone(previous||{}),text=clean(input.text),command=text.toLowerCase().split('@')[0];
 const periods={'📊 Звіт зараз':'today','📅 Звіт за вчора':'yesterday','📈 Звіт за 7 днів':'7','🗓 Звіт за 30 днів':'30','/report':'today','/today':'today','/yesterday':'yesterday','/week':'7','/month':'30'};
 if(periods[text]||periods[command])return {state,report:periods[text]||periods[command]};

 if(text==='🔎 Керувати товарами'||command==='/products'){
  if(state.step&&!['manageSearch','manageResults'].includes(state.step))return {state,reply:reply('Є незавершені зміни. Продовж їх або натисни «❌ Скасувати».',[['📝 Продовжити товар','❌ Скасувати']])};
  return {state:{step:'manageSearch'},reply:searchPrompt()};
 }
 if(state.step==='manageSearch'||state.step==='manageResults'){
  if(text==='❌ Скасувати'||command==='/cancel')return {state:{},reply:reply('Повернулись у головне меню.')};
  if(['/start','/menu','/help'].includes(command))return {state:{},reply:reply('Обери дію.')};
  if(text==='🔎 Інший пошук'||text==='⬅️ Назад')return {state:{step:'manageSearch'},reply:searchPrompt()};
  const selected=state.results?.find(item=>item.label===text);
  if(selected)return {state,openProduct:selected.id};
  if(text==='Далі ➡️'&&state.hasMore)return {state,lookup:{query:state.query,offset:state.offset+6}};
  if(text==='⬅️ Попередні'&&state.offset>0)return {state,lookup:{query:state.query,offset:Math.max(0,state.offset-6)}};
  if(text==='Останні товари')return {state,lookup:{query:'',offset:0}};
  if(text.length>180)return {state,reply:searchPrompt('Пошук — до 180 символів.')};
  if(command==='/resume'||text==='📝 Продовжити товар')return {state,reply:searchPrompt()};
  return {state,lookup:{query:text,offset:0}};
 }
 if(state.step==='confirmDelete'){
  const code='HMG-'+String(state.productId).padStart(3,'0');
  if(text==='ВИДАЛИТИ '+code)return {state,remove:true,reply:reply('✅ Товар '+code+' видалено. Фото збережені в сховищі.')};
  if(text==='❌ Скасувати'||text==='⬅️ Назад'||command==='/cancel'){state.step='preview';return {state,reply:prompt(state,'Видалення скасовано.')};}
  return {state,reply:deletePrompt(state)};
 }
 if(text==='⚙️ Адмінка сайту'||command==='/admin')return {state,reply:{text:'Адмінка сайту: редагування товарів, позначки нових надходжень, ціни та наявність.',reply_markup:{inline_keyboard:[[{text:'⚙️ Відкрити адмінку',url:'https://www.hugomedia.pl/?admin'}]]}}};
 if(text==='❌ Скасувати'||command==='/cancel')return {state:{},reply:reply(state.mode==='manage'?'Зміни скасовано. Збережений товар залишився без змін.':'Додавання скасовано. Товар на сайт не додано.')};
 if(text==='➕ Додати товар'||command==='/add'){
  if(state.step)return {state,reply:prompt(state,'У тебе вже є незавершений товар. Продовж його або натисни «Скасувати».')};
  const next={step:'cat',draftId:newDraftId,values:{status:0,quantity:'1',discount:'0',newArrival:''},photos:[]};
  return {state:next,reply:prompt(next)};
 }
 if(text==='📝 Продовжити товар'||command==='/resume')return {state,reply:state.step?prompt(state):reply('Незавершених товарів немає. Натисни «➕ Додати товар».')};
 if(['/start','/menu','/help'].includes(command))return {state,reply:reply('HUGO MEDIA · керування сайтом\n\n📊 Звіт зараз — статистика за сьогодні на поточну хвилину.\n➕ Додати товар — заповнення, фото, перевірка й публікація.\n🔎 Керувати товарами — знайти товар, змінити ціну, наявність, фото та характеристики.\n⚙️ Адмінка сайту — відкрити сайт.\n\nЩоденний звіт надходить о 09:00 за Варшавою.'+(state.step?'\n\nНезавершений товар збережений. Натисни «📝 Продовжити товар».':''))};
 if(!state.step)return {state,reply:reply('Обери дію кнопкою нижче. Для товару спочатку натисни «➕ Додати товар».')};
 if(text==='⬅️ Назад'){
  if(state.mode==='manage'&&state.step==='preview')return {state,reply:prompt(state,'Збережи зміни або натисни «Скасувати».')};
  if(state.editing||state.step==='edit'){delete state.editing;state.step='preview';}
  else state.step=steps[Math.max(0,steps.indexOf(state.step)-1)];
  return {state,reply:prompt(state)};
 }
 if(state.step==='edit'){
  const field=Object.keys(labels).find(k=>labels[k]===text);
  if(!field)return {state,reply:prompt(state)};
  state.step=field;state.editing=true;return {state,reply:prompt(state)};
 }
 if(state.step==='preview'){
  if(state.mode==='manage'){
   if(text==='🗑 Видалити товар'){state.step='confirmDelete';return {state,reply:deletePrompt(state)};}
   const field=Object.keys(labels).find(k=>labels[k]===text);
   if(field){state.step=field;state.editing=true;return {state,reply:prompt(state)};}
   if(text==='💾 Зберегти зміни'){
    try{toRow({...state.values,images:state.photos.map((p,i)=>p.path||'pending-'+i)});}
    catch(error){return {state,reply:prompt(state,'Перевір поле «'+(labels[error.field]||deviceFieldLabel(error.field||'','uk',state.values.deviceType)||error.field||'характеристики')+'». Значення несумісне з іншими даними товару.')};}
    if(Number(state.values.status)!==3&&!state.photos.length)return {state,reply:prompt(state,'Для публічного товару потрібне хоча б одне фото. Додай фото або обери статус «Чернетка».')};
    return {state,saveExisting:true,reply:reply('✅ Зміни збережені. HMG-'+String(state.productId).padStart(3,'0')+'\n'+state.values.name+'\nЦіна: '+money(effectivePrice(state.values))+' · '+STATUSES[state.values.status]+'\nhttps://www.hugomedia.pl/?product='+state.productId)};
   }
   if(text==='✅ Опублікувати'||text==='💾 Зберегти чернетку')return {state,reply:prompt(state,'Для наявного товару натисни «Зберегти зміни».')};
  }
  if(text==='✏️ Виправити'){state.step='edit';return {state,reply:prompt(state)};}
  if(text==='✅ Опублікувати'||text==='💾 Зберегти чернетку'){
   const draft=text==='💾 Зберегти чернетку';
   if(!draft&&state.photos.length===0)return {state,reply:prompt(state,'Для публікації додай хоча б одне фото через «Виправити» → «Фото».')};
   if(!draft&&Number(state.values.status)===3)return {state,reply:prompt(state,'Обрано статус «Чернетка». Зміни наявність або натисни «Зберегти чернетку».')};
   try{toRow({...state.values,status:draft?3:state.values.status,images:state.photos.map((_,i)=>'pending-'+i)});}
   catch{return {state,reply:prompt(state,'Перевір поля товару через «Виправити».')};}
   return {state,publish:true,draft,reply:reply(draft?'Чернетку збережено в адмінці.':'✅ Товар опубліковано на сайті.')};
  }
  return {state,reply:prompt(state)};
 }
 if(state.step==='photos'){
  if(text==='➖ Прибрати останнє фото'){state.photos.pop();return {state,reply:prompt(state)};}
  if(text==='🗑 Очистити фото'){state.photos=[];return {state,reply:prompt(state)};}
  if(text==='✅ Фото додано'){advance(state);return {state,reply:prompt(state)};}
  if(!input.photo)return {state,reply:prompt(state,'Надішли фото або натисни «Фото додано».')};
  if(state.photos.length>=8)return {state,reply:prompt(state,'Уже є 8 фото.')};
  if(input.photo.size>10*1024*1024)return {state,reply:prompt(state,'Фото завелике. Максимум 10 МБ.')};
  if(!state.photos.some(p=>p.uniqueId===input.photo.uniqueId))state.photos.push(input.photo);
  return {state,reply:prompt(state,'Фото отримано ✅')};
 }
 try{
  if(input.photo&&!text)throw Error('На цьому кроці потрібен текст. Фото додамо наприкінці.');
  const step=state.step,skip=text==='Пропустити';
  if(!text)throw Error('Введи значення або обери кнопку.');
  if(skip&&!optional.has(step))throw Error('Це поле потрібно заповнити.');
  let value=skip?'':text;
  if(step==='cat'){
   const n=CATEGORIES.indexOf(text==='Навушники'?'Навушники та аудіо':text);if(n<0)throw Error('Обери категорію кнопкою.');
   value=n;state.values.deviceType=resolveDeviceType({cat:n,name:state.values.name});
   const allowed=new Set(deviceProfile({cat:n,deviceType:state.values.deviceType}).fields);
   for(const key of DEVICE_RESET_KEYS)if(!allowed.has(key)&&key!=='customSpecs')delete state.values[key];
   if(n!==0)for(const k of ['extraStorageType','extraStorageCapacity','extraStorageUnit','purposes','bundles',...Object.keys(UPGRADES).flatMap(k=>[k+'Enabled',k+'Price'])])delete state.values[k];
  }else if(step==='deviceType'){
   const selected=deviceTypeChoices(state.values.cat).find(o=>o.uk===text);if(!selected)throw Error('Обери тип кнопкою.');
   value=selected.value;const allowed=new Set(deviceProfile({cat:state.values.cat,deviceType:value}).fields);
   for(const key of DEVICE_RESET_KEYS)if(!allowed.has(key)&&key!=='customSpecs')delete state.values[key];
   state.values.type='';
  }else if(step==='name'||step==='brand'){
   if(text.length>(step==='name'?180:80))throw Error('Текст задовгий.');
  }else if(step==='price')value=parseNumber(text);
  else if(step==='discount'){value=skip?'0':String(parseNumber(text,{max:99,integer:true}));state.values.salePrice='';}
  else if(step==='salePrice'){value=skip?'':String(parseNumber(text,{min:0.01}));if(value&&Number(value)>Number(state.values.price))throw Error('Акційна ціна не може перевищувати базову.');}
  else if(step.startsWith('seoTitle')&&value.length>80)throw Error('Заголовок — до 80 символів.');
  else if(step.startsWith('seoDescription')&&value.length>200)throw Error('Опис — до 200 символів.');
  else if(step==='quantity')value=String(parseNumber(text,{max:99,integer:true}));
  else if(step==='newArrival'||step==='bestseller'){const answer=text.toLocaleLowerCase('uk');if(!['так','ні'].includes(answer))throw Error('Обери «Так» або «Ні».');value=answer==='так'?'true':'';}
  else if(step==='status'){value=STATUSES.indexOf(text);if(value<0)throw Error('Обери статус кнопкою.');}
  else if(step==='telegramPost'&&!skip){value=normalizeTelegramPost(text);if(value===null)throw Error('Потрібне посилання https://t.me/h_m_g_pl/номер_поста');}
  else if(step==='charger'&&!skip){value={'Блок і кабель':'adapter','Лише кабель':'cable','Без зарядки':'none'}[text];if(!value)throw Error('Обери варіант кнопкою.');}
  else if(step==='photoKind'){value={'Фото цього товару':'actual','Зображення моделі':'model','Змішані фото':'mixed'}[text];if(!value)throw Error('Обери тип фото кнопкою.');}
  else if(['condition','warranty'].includes(step)&&value.length>500)throw Error('До 500 символів.');
  else if(['descUk','descPl'].includes(step)&&value.length>10000)throw Error('Опис має бути до 10000 символів.');
  if(step==='specs'){
   for(const k of DEVICE_RESET_KEYS)delete state.values[k];
   Object.assign(state.values,skip?{}:parseSpecs(text,state.values.cat,state.values.deviceType));
   for(const [key,option] of Object.entries(UPGRADES))if(Number(state.values.cat)!==0||option.target<=capacityGB(state.values[option.group]))state.values[key+'Enabled']='';
  }else state.values[step]=value;
  advance(state);return {state,reply:prompt(state)};
 }catch(error){return {state:previous,reply:prompt(previous,error.message)};}
}
export function formatOnDemandReport(r){
 const s=r.current||{},c=r.changes||{},date=d=>String(d).split('-').reverse().join('.');
 const label=r.fromDate===r.toDate?date(r.fromDate):date(r.fromDate)+'–'+date(r.toDate);
 const change=k=>Number.isFinite(c[k])?' ('+(c[k]>0?'+':'')+c[k]+'%)':'';
 const lines=['HUGO MEDIA · звіт '+label,r.partial?'Сьогодні станом на '+r.generatedAt+' · Варшава':'Завершений період · Варшава','',
  '👤 Відвідувачі: '+(s.visitors||0)+change('visitors'),
  '📊 Перегляди сайту: '+(s.pageViews||0)+change('pageViews'),
  '🛍 Перегляди товарів: '+(s.productViews||0)+change('productViews'),
  '📩 Кліки звернення: '+(s.contactClicks||0)+change('contactClicks'),
  '🛒 Додали у вибір: '+(s.cartAdds||0)+change('cartAdds'),'',
  r.partial?'Зміни — проти вчора до цієї ж години.':'Зміни — проти попереднього періоду такої самої тривалості.',''];
 if(r.productNames?.top)lines.push('✅ Найбільше дивились: '+String(r.productNames.top).slice(0,180)+'.');
 if(s.topSource)lines.push('📣 Основне джерело: '+s.topSource[0]+' · '+s.topSource[1]+' переглядів.');
 if(r.productNames?.weak)lines.push('⚠️ '+String(r.productNames.weak).slice(0,180)+': '+s.weakProduct.sessions+' сесій перегляду, '+s.weakProduct.contactSessions+' кліків звернення. Перевір ціну, фото та умови.');
 if(s.noResultSearches)lines.push('🔎 Пошуків без результату: '+s.noResultSearches+'. Перевір асортимент і назви.');
 if(!s.pageViews)lines.push('За цей період немає зафіксованих відвідувань.');
 lines.push('','Враховано браузери зі згодою на аналітику. Кліки не підтверджують покупки.','https://www.hugomedia.pl/?admin=stats&from='+r.fromDate+'&to='+r.toDate);
 return lines.join('\n');
}

function searchPrompt(notice=''){
 return reply((notice?notice+'\n\n':'')+'Знайди товар: напиши назву, бренд або код, наприклад HMG-051. Або покажи останні товари.',[['Останні товари'],['❌ Скасувати']]);
}
function deletePrompt(state){
 const code='HMG-'+String(state.productId).padStart(3,'0');
 return reply('Видалити '+code+' — '+state.values.name+'?\n\nТовар буде прибрано з каталогу. Якщо хочеш лише сховати його, обери статус «Чернетка».\n\nДля видалення напиши точно: ВИДАЛИТИ '+code,[['⬅️ Назад','❌ Скасувати']]);
}
export function productSearchResult(data,query='',offset=0){
 const results=(data.items||[]).map(p=>({id:p.id,label:'HMG-'+String(p.id).padStart(3,'0')+' · '+String(p.name).slice(0,80)}));
 const state={step:'manageResults',query,offset,hasMore:!!data.hasMore,results};
 const lines=(data.items||[]).map((p,i)=>results[i].label+'\n'+money(effectivePrice(fromRow(p)))+' · '+STATUSES[p.status]);
 const keys=results.map(p=>[p.label]);
 const paging=[];if(offset>0)paging.push('⬅️ Попередні');if(state.hasMore)paging.push('Далі ➡️');if(paging.length)keys.push(paging);
 keys.push(['🔎 Інший пошук','❌ Скасувати']);
 return {state,reply:reply(results.length?'Обери товар кнопкою:\n\n'+lines.join('\n\n'):'Нічого не знайдено. Спробуй іншу назву або HMG-код.',keys)};
}
export function openManagedProduct(data,draftId){
 if(!data?.product)return {state:{step:'manageSearch'},reply:searchPrompt('Товар уже видалено. Обери інший.')};
 const values=fromRow(data.product),photos=values.images.map((path,i)=>({path,uniqueId:'stored-'+i}));
 delete values.desc_uk;delete values.desc_pl;
 const state={mode:'manage',step:'preview',productId:values.id,fingerprint:data.fingerprint,draftId,values,photos};
 return {state,reply:prompt(state,'Відкрито з бази. Зміни набудуть чинності після «Зберегти зміни».')};
}
