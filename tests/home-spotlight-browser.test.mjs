import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';

const chrome=process.env.CHROME_BIN||['google-chrome','chromium','chromium-browser'].find(name=>spawnSync('which',[name]).status===0);
const rootPath=fileURLToPath(new URL('../',import.meta.url));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(read,predicate,description,limit=100){
 for(let n=0;n<limit;n++){const value=await read();if(predicate(value))return value;await sleep(40);}
 throw Error('Timed out: '+description);
}
function fixtureBoot(){
 const root=document.getElementById('hugo-preview');
 const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="white"/><rect x="160" y="50" width="480" height="270" rx="20" fill="#6e41b5"/><path d="M100 330h600l-25 20H125z" fill="#251d35"/></svg>');
 const base={cat:0,status:0,quantity:'1',price:1299,images:[image],ram:'16',ssd:'512',cpu:'Intel Core i7',screen:'14',warranty:'12 місяців',condition:'Ідеальний'};
 const products=[{...base,id:1,name:'HP ZBook Studio x360 G5 — професійна мобільна робоча станція'},
  {...base,id:2,name:'Lenovo ThinkPad X390 Yoga',bestseller:'true'},
  {...base,id:3,name:'Apple MacBook Pro 16 M1 Pro',newArrival:'true'}];
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const context={lang:'uk',esc,t:key=>({categories:['Ноутбуки'],statuses:['У наявності'],warrantyShort:'Гарантія'})[key]||key,icon:name=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(name==='arrow-left'?'M19 12H5m7-7-7 7 7 7':'M5 12h14m-7-7 7 7-7 7')+'" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  stockQty:()=>1,reviewsBlock:()=>'',compare:[],homepage:{featuredProductId:1,featuredLabel:{uk:'Професійна мобільна робоча станція',pl:'Mobilna stacja robocza'}},
  photo:p=>'<div class="hp-photo"><img src="'+p.images[0]+'" alt="'+esc(p.name)+'"></div>',productTitle:p=>p.name,
  priceBlock:()=>'',localizedValue:value=>value,money:value=>String(value)};
 const fixture={errors:[],opened:[]};window.fixture=fixture;
 window.addEventListener('error',e=>fixture.errors.push(e.message));
 window.addEventListener('unhandledrejection',e=>fixture.errors.push(String(e.reason?.stack||e.reason)));
 let cleanup=()=>{};
 fixture.render=(lang='uk')=>{
  cleanup();context.lang=lang;document.documentElement.lang=lang;
  root.innerHTML='<main class="hp-main" id="hp-content">'+createStorefront(context).home(products,[])+'</main>';
  cleanup=mountHomeSpotlight(root.querySelector('[data-home-spotlight]'));
 };
 root.addEventListener('click',event=>{
  const link=event.target.closest('a[data-detail]');
  if(link){event.preventDefault();fixture.opened.push(Number(link.dataset.detail));}
 });
 fixture.render();fixture.ready=true;
}
function connect(url){
 const socket=new WebSocket(url),pending=new Map();let serial=0;
 const opened=new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',event=>{const result=JSON.parse(event.data);if(result.id&&pending.has(result.id)){const {resolve,reject}=pending.get(result.id);pending.delete(result.id);result.error?reject(Error(result.error.message)):resolve(result.result);}});
 return {close:()=>socket.close(),async send(method,params={}){await opened;return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}};
}
test('homepage spotlight supports auto, pause, real pointer controls, touch, narrow screens and reduced motion',{timeout:45000,skip:!chrome&&!process.env.CI},async()=>{
 assert(chrome,'Chrome must be installed in CI for the spotlight browser test');
 const js="import {createStorefront} from '/src/storefront.js';\nimport {mountHomeSpotlight} from '/src/home-spotlight.js';\n("+fixtureBoot.toString()+")();";
 const server=createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,'http://localhost').pathname;
   if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="uk"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/storefront.css"><body style="margin:0"><div id="hugo-preview" class="hp-storefront"></div><script type="module" src="/fixture.js"></script></body></html>');return;}
   if(path==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(js);return;}
   if(!/^\/src\/[a-z-]+\.js$|^\/(?:styles|storefront)\.css$/.test(path)){res.statusCode=404;res.end();return;}
   res.setHeader('Content-Type',path.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(resolve(rootPath,'.'+path)));
  }catch(error){res.statusCode=500;res.end(String(error));}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port,profile=await mkdtemp(join(tmpdir(),'hmg-spotlight-test-'));
 const processChrome=spawn(chrome,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--remote-debugging-port=0','--user-data-dir='+profile,'--window-size=1365,1000','about:blank'],{stdio:['ignore','ignore','pipe']});
 let stderr='',cdp;
 try{
  const endpoint=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Chrome debugging endpoint unavailable: '+stderr.slice(-1000))),10000);
   processChrome.stderr.on('data',chunk=>{stderr+=chunk;const match=stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
   processChrome.once('error',reject);
  });
  const targets=await until(async()=>await(await fetch('http://127.0.0.1:'+new URL(endpoint).port+'/json/list')).json(),rows=>rows.some(row=>row.type==='page'),'Chrome page');
  cdp=connect(targets.find(row=>row.type==='page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});
  const evaluate=async(expression)=>{const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const count=()=>evaluate('document.querySelector("[data-spotlight-current]").textContent');
  const active=()=>evaluate('Number(document.querySelector(".hm-spotlight-slide.is-active a").dataset.detail)');
  const playing=()=>evaluate('document.querySelector("[data-home-spotlight]").classList.contains("is-playing")');
  const click=async selector=>{
   const pos=await until(()=>evaluate('(()=>{const el=document.querySelector('+JSON.stringify(selector)+');if(!el)throw Error("Missing click target");const slide=el.closest("[data-spotlight-slide]");if(slide&&getComputedStyle(slide).opacity!=="1")return null;el.scrollIntoView({block:"center",behavior:"instant"});const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);return hit&&(hit===el||el.contains(hit))?{x,y}:null;})()'),Boolean,'click target is visible and receives pointer events');
   await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...pos});
   await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...pos});
  };
  await cdp.send('Page.navigate',{url:origin});
  await until(()=>evaluate('window.fixture?.ready'),Boolean,'spotlight rendered');
  await until(playing,Boolean,'visible carousel starts');
  assert.equal(await count(),'01');
  await until(active,id=>id===2,'automatic rotation',170);
  assert.equal(await count(),'02');
  await until(()=>evaluate('getComputedStyle(document.querySelector(".hm-spotlight-slide.is-active")).opacity'),value=>value==='1','incoming slide is visually ready');
  assert.equal(await evaluate('(()=>{const link=document.querySelector(".hm-spotlight-slide.is-active a");link.focus();return document.activeElement===link;})()'),true,'The visible product link must accept keyboard focus');
  assert.equal(await playing(),false,'Keyboard focus stops rotation until explicit restart');
  assert.equal(await evaluate('document.querySelector("[data-spotlight-toggle]").getAttribute("aria-label")'),'Увімкнути автоперемикання');
  await click('[data-spotlight-step="1"]');
  assert.equal(await active(),3);
  await click('[data-spotlight-step="1"]');
  assert.equal(await active(),1,'Next wraps to the chosen first product');
  await click('[data-spotlight-to="2"]');
  assert.equal(await active(),3);
  const hidden=await evaluate('[...document.querySelectorAll("[data-spotlight-slide]")].filter(el=>!el.classList.contains("is-active")).map(el=>({inert:el.inert,tabIndex:el.querySelector("a").tabIndex,hidden:el.getAttribute("aria-hidden")}))');
  assert(hidden.every(row=>row.inert&&row.tabIndex===-1&&row.hidden==='true'),'Inactive product links must be inaccessible');
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36});
  await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home',windowsVirtualKeyCode:36});
  assert.equal(await active(),1,'Home works from a focused carousel control');
  await click('.hm-spotlight-slide.is-active a');
  assert.deepEqual(await evaluate('window.fixture.opened'),[1]);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  await evaluate('document.querySelector("[data-home-spotlight]").scrollIntoView({block:"center"})');
  const rect=await evaluate('(()=>{const r=document.querySelector("[data-spotlight-stage]").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()');
  const point={x:Math.round(rect.x+rect.width*.8),y:Math.round(rect.y+100)};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:Math.round(rect.x+rect.width*.2),y:point.y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until(active,id=>id===2,'mobile swipe changes product');
  assert.deepEqual(await evaluate('window.fixture.opened'),[1],'Swipe must not open a product');
  for(const width of [390,320]){
   await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
   const layout=await evaluate('({page:document.documentElement.scrollWidth,viewport:innerWidth,targets:[...document.querySelectorAll(".hm-spotlight button")].map(el=>el.getBoundingClientRect().height),height:document.querySelector("[data-home-spotlight]").getBoundingClientRect().height})');
   assert(layout.page<=layout.viewport,'No horizontal overflow at '+width+'px: '+JSON.stringify(layout));
   assert(layout.targets.every(height=>height>=44),'All carousel touch targets are at least 44px');
  }
  const firstHeight=await evaluate('document.querySelector("[data-home-spotlight]").getBoundingClientRect().height');
  await click('[data-spotlight-to="2"]');
  const lastHeight=await evaluate('document.querySelector("[data-home-spotlight]").getBoundingClientRect().height');
  assert(Math.abs(firstHeight-lastHeight)<1,'Changing products must not shift the page');
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await evaluate('window.fixture.render("pl")');
  assert.equal(await playing(),false,'Reduced-motion preference disables automatic rotation');
  assert.equal(await evaluate('document.querySelector("[data-spotlight-toggle]").getAttribute("aria-label")'),'Włącz automatyczne przewijanie');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".hm-spotlight-slide.is-active img")).animationName'),'none');
  await click('[data-spotlight-step="1"]');
  assert.equal(await active(),2,'Manual navigation still works with reduced motion');
  assert.match(await evaluate('document.querySelector(".hm-spotlight-slide.is-active a").getAttribute("href")'),/^\/pl\/product\/2-/);
  assert.deepEqual(await evaluate('window.fixture.errors'),[]);
 }finally{
  cdp?.close();processChrome.kill('SIGTERM');
  await new Promise(resolve=>server.close(resolve));
  await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }
});
