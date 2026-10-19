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
async function until(read,predicate,description){
 for(let n=0;n<100;n++){const value=await read();if(predicate(value))return value;await sleep(40);}
 throw Error('Timed out: '+description);
}
function fixtureBoot(){
 const root=document.getElementById('hugo-preview'),q=selector=>root.querySelector(selector);
 const dictionary={manage:'Товари',newProduct:'Додати товар',category:'Категорія',status:'Статус',categories:['Ноутбуки','Телефони'],statuses:['В наявності','Резерв','Розпродано','Чернетка','Немає','Очікується'],newArrival:'Новинка',bestseller:'Бестселер',edit:'Редагувати',duplicate:'Дублювати',delete:'Видалити',name:'Назва'};
 const product={name:'HP test laptop',brand:'HP',cat:0,status:0,price:1299,discount:'0',quantity:'1',updated_at:'2026-10-19T06:00:00Z',images:[],ram:'8',ssd:'256',newArrival:'true',bestseller:'true'};
 const fixture={writes:[],pending:new Map(),errors:[]};
 window.fixture=fixture;
 window.addEventListener('error',e=>fixture.errors.push(e.message));
 window.addEventListener('unhandledrejection',e=>fixture.errors.push(String(e.reason?.stack||e.reason)));
 let ui;
 const context={root,admin:true,view:'admin',lang:'uk',products:[{...product,id:1},{...product,id:2,name:'Dell test laptop',brand:'Dell'}],
  t:key=>dictionary[key]||key,esc:value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),
  money:String,icon:name=>'<svg width="16" height="16" aria-hidden="true"><path d="M2 8h12"></path></svg>',photoUrl:()=>'',refreshIcons:()=>{},notify:()=>{},refresh:async()=>{},
  render:()=>{root.innerHTML=ui.render();ui.afterRender();},
  applyProducts:rows=>{context.products=context.products.map(p=>rows.find(row=>row.id===p.id)||p);},
  db:{quickUpdateProducts:changes=>{fixture.writes.push(changes);return new Promise((resolve,reject)=>fixture.pending.set(changes[0].id,{resolve,reject,changes}));}}
 };
 ui=createAdminCatalog(context);context.render();
 fixture.release=(id,fail=false)=>{
  const pending=fixture.pending.get(id);if(!pending)throw Error('Missing pending product '+id);
  fixture.pending.delete(id);
  if(fail){pending.reject(Error('offline'));return;}
  pending.resolve(pending.changes.map(change=>({...context.products.find(p=>p.id===change.id),...change.fields,updated_at:new Date().toISOString()})));
 };
 fixture.context=context;
 new Function('root','q','adminCatalog','view','lang','busy',eventHandlerSource)(root,q,ui,'admin','uk',false);
 fixture.ready=true;
}
function connect(url){
 const socket=new WebSocket(url),pending=new Map();let serial=0;
 const opened=new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',event=>{const result=JSON.parse(event.data);if(result.id&&pending.has(result.id)){const {resolve,reject}=pending.get(result.id);pending.delete(result.id);result.error?reject(Error(result.error.message)):resolve(result.result);}});
 return {close:()=>socket.close(),async send(method,params={}){await opened;return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}};
}
test('real browser group clicks keep other products usable and update rows, mobile layout and retry state',{timeout:45000,skip:!chrome&&!process.env.CI},async()=>{
 assert(chrome,'Chrome must be installed in CI for the browser regression test');
 const app=await readFile(join(rootPath,'src/app.js'),'utf8');
 const start=app.indexOf('  root.addEventListener("click", async (e) => {');
 const end=app.indexOf('\n  root.addEventListener(',start+1);
 assert(start>=0&&end>start,'Use the application click listener in the fixture');
 const handler=app.slice(start,end);
 const js="import {createAdminCatalog} from '/src/admin-catalog.js';\nconst eventHandlerSource="+JSON.stringify(handler)+";\n("+fixtureBoot.toString()+")();";
 const server=createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,'http://localhost').pathname;
   if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="uk"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><body><div id="hugo-preview"></div><script type="module" src="/fixture.js"></script></body></html>');return;}
   if(path==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(js);return;}
   if(!/^\/src\/[a-z-]+\.js$|^\/styles\.css$/.test(path)){res.statusCode=404;res.end();return;}
   res.setHeader('Content-Type',path.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(resolve(rootPath,'.'+path)));
  }catch(error){res.statusCode=500;res.end(String(error));}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port,profile=await mkdtemp(join(tmpdir(),'hmg-browser-test-'));
 const processChrome=spawn(chrome,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--remote-debugging-port=0','--user-data-dir='+profile,'--window-size=1365,1600','about:blank'],{stdio:['ignore','ignore','pipe']});
 let stderr='',cdp;
 try{
  const endpoint=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Chrome debugging endpoint unavailable: '+stderr.slice(-1000))),10000);
   processChrome.stderr.on('data',chunk=>{stderr+=chunk;const match=stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
   processChrome.once('error',reject);
  });
  const port=new URL(endpoint).port;
  const targets=await until(async()=>await(await fetch('http://127.0.0.1:'+port+'/json/list')).json(),rows=>rows.some(row=>row.type==='page'),'Chrome page');
  cdp=connect(targets.find(row=>row.type==='page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');
  const evaluate=async(expression)=>{const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  await cdp.send('Page.navigate',{url:origin});
  await until(()=>evaluate('window.fixture?.ready'),Boolean,'fixture ready');
  const click=async selector=>{
   const pos=await evaluate('(()=>{const el=document.querySelector('+JSON.stringify(selector)+');if(!el)throw Error("Missing click target");el.scrollIntoView({block:"center"});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
   await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...pos});
   await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...pos});
  };
  const button=(id,field='bestseller')=>'[data-admin-row="'+id+'"] [data-admin-mark="'+field+'"]';
  await click(button(1)+' span');
  await until(()=>evaluate('window.fixture.writes.length'),n=>n===1,'first click submits');
  const otherDisabled=await evaluate('document.querySelector('+JSON.stringify(button(2))+').matches(":disabled")');
  assert.equal(otherDisabled,false,'Saving one mark must not disable another product');
  await click(button(2)+' svg');
  await until(()=>evaluate('window.fixture.writes.length'),n=>n===2,'second product submits while first is pending');
  await evaluate('window.fixture.release(1);window.fixture.release(2)');
  await until(()=>evaluate('window.fixture.pending.size'),n=>n===0,'both responses released');
  await until(()=>evaluate('document.querySelector('+JSON.stringify(button(1))+').getAttribute("aria-pressed")'),value=>value==='false','first confirmed removal');
  assert.equal(await evaluate('document.querySelector('+JSON.stringify(button(2))+').getAttribute("aria-pressed")'),'false');
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const mobile=await evaluate('(()=>{const el=document.querySelector('+JSON.stringify(button(1))+');return {width:document.documentElement.scrollWidth,viewport:innerWidth,height:el.getBoundingClientRect().height};})()');
  assert(mobile.width<=mobile.viewport,'Mobile admin must not overflow horizontally');
  assert(mobile.height>=44,'Mobile mark controls must have usable touch targets');
  await click('[data-admin-group="new"]');
  await click(button(1,'newArrival'));
  await until(()=>evaluate('window.fixture.writes.length'),n=>n===3,'mobile mark submits');
  await evaluate('window.fixture.release(1)');
  await until(()=>evaluate('!!document.querySelector("[data-admin-row=\\"1\\"]")'),present=>!present,'removed member disappears from selected group');
  await click(button(2,'newArrival'));
  await until(()=>evaluate('window.fixture.writes.length'),n=>n===4,'retry scenario submits');
  await evaluate('window.fixture.release(2,true)');
  await until(()=>evaluate('document.querySelector('+JSON.stringify(button(2,'newArrival'))+').matches(":disabled")'),disabled=>!disabled,'failed save releases the row controls');
  assert.equal(await evaluate('document.querySelector('+JSON.stringify(button(2,'newArrival'))+').getAttribute("aria-pressed")'),'true');
  assert(await evaluate('!!document.querySelector("[data-admin-mark-status=\\"2\\"][role=\\"alert\\"]")'),'Failed mark must show an inline error');
  assert.deepEqual(await evaluate('window.fixture.errors'),[]);
 }finally{
  cdp?.close();processChrome.kill('SIGTERM');
  await new Promise(resolve=>server.close(resolve));
  await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }
});
