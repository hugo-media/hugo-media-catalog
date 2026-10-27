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
function fixtureBoot() {
 const root=document.getElementById('hugo-preview'),q=s=>root.querySelector(s);
 const fixture={writes:[],errors:[],failSave:false};window.fixture=fixture;
 window.addEventListener('error',e=>fixture.errors.push(e.message));
 window.addEventListener('unhandledrejection',e=>fixture.errors.push(String(e.reason?.stack||e.reason)));
 new Function('root','q','fixture','warsawDate','warsawDateTimeToUtc','utcToWarsawDateTime','dailyPicksActive','picksExpiryPreset','validatePicksExpiry','watchPicksExpiry','normalizeDailyPicks', applicationSource)(
  root,q,fixture,warsawDate,warsawDateTimeToUtc,utcToWarsawDateTime,dailyPicksActive,picksExpiryPreset,validatePicksExpiry,watchPicksExpiry,normalizeDailyPicks);
}
function connect(url){
 const socket=new WebSocket(url),pending=new Map();let serial=0;
 const opened=new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',event=>{const result=JSON.parse(event.data);if(result.id&&pending.has(result.id)){const {resolve,reject}=pending.get(result.id);pending.delete(result.id);result.error?reject(Error(result.error.message)):resolve(result.result);}});
 return {close:()=>socket.close(),async send(method,params={}){await opened;return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}};
}
test('recommendation admin saves durations, survives reload, handles failed saves and fits mobile',{timeout:45000,skip:!chrome&&!process.env.CI},async()=>{
 assert(chrome,'Chrome must be installed in CI');
 const app=await readFile(join(rootPath,'src/app.js'),'utf8');
 const section=(start,end)=>{const a=app.indexOf(start),b=app.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return app.slice(a,b);};
 const clickSource=section('  root.addEventListener("click", async (e) => {','\n  root.addEventListener(');
 const change=section('  root.addEventListener("change", async (e) => {','\n  root.addEventListener(');
 const helpers=section('  function publishedPicks()','  function renderAudit()');
 const refresh=section('  async function refresh()','  async function run(');
 const run=section('  async function run(','  function analyticsId(');
 const dictionary=section('dailyPicks: "Рекомендуємо сьогодні",','  });');
 const setup=[
  'let dailyPicks=[],dailyPicksDate="",dailyPicksExpiry="",draftPicks=[],draftPicksPeriod="today",draftPicksUntil="",busy=false,loading=false,view="picks",admin=true,lang="uk",cart=[],compare=[],reviews=[];',
  'let cleanupPicksExpiry=()=>{};',
  'let products=[{id:1,name:"HP ZBook",status:0,price:1500,images:[],cat:0},{id:2,name:"Dell XPS",status:0,price:1700,images:[],cat:0}];',
  'let stored=null;',
  'const stockQty=()=>1,reconcileCart=x=>x,writeLocal=()=>{},comparisonSelection=()=>[],adminNav=()=>"",icon=()=>"",icons=[],money=String,effectivePrice=p=>p.price,pictureUrl=x=>x,refreshIcons=()=>{},notify=message=>fixture.notice=message;',
  'const esc=value=>String(value??"").replace(/[&<>"\\x27]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\\x27":"&#39;"}[c]));',
  'const labels={'+dictionary+'};const t=key=>labels[key]||key;',
  'const adminCatalog={handleClick:async()=>false,handleChange:()=>false},extra={handleClick:async()=>false};',
  'const db={listDailyPicks:async()=>normalizeDailyPicks(stored),listProducts:async()=>products,listReviews:async()=>[],saveDailyPicks:async(ids,endsAt)=>{if(fixture.failSave)throw Error("offline");validatePicksExpiry(endsAt);stored={for_date:warsawDate(),product_ids:[...ids],expires_at:endsAt};fixture.writes.push(structuredClone(stored));}};',
  'function render(){if(view==="picks")renderDailyPicksAdmin();else q("#hp-content").textContent=publishedPicks().length?"visible":"hidden";}',
  refresh,run,helpers,clickSource,change,
  'fixture.reload=async()=>{await refresh();resetPicksDraft();view="picks";render();};',
  'fixture.showExpiry=async()=>{stored={for_date:warsawDate(),product_ids:[1],expires_at:new Date(Date.now()+500).toISOString()};await refresh();view="home";render();};',
  'fixture.ready=false;fixture.reload().then(()=>fixture.ready=true);'
 ].join('\n');
 const js="import {warsawDate,warsawDateTimeToUtc,utcToWarsawDateTime} from '/src/core.js';\nimport {dailyPicksActive,picksExpiryPreset,validatePicksExpiry,watchPicksExpiry,normalizeDailyPicks} from '/src/daily-picks.js';\nconst applicationSource="+JSON.stringify(setup)+";\n("+fixtureBoot.toString()+")();";
 const server=createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,'http://localhost').pathname;
   if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="uk"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><body><div id="hugo-preview"><main id="hp-content"></main></div><script type="module" src="/fixture.js"></script></body></html>');return;}
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

  assert.equal(await evaluate('document.getElementById("hp-save-picks").disabled'),true);
  await click('input[data-pick="1"]');
  await evaluate('(()=>{const el=document.getElementById("hp-picks-period");el.value="72";el.dispatchEvent(new Event("change",{bubbles:true}));})()');
  const deadline=await evaluate('document.getElementById("hp-picks-until").value');
  await click('input[data-pick="2"]');
  assert.equal(await evaluate('document.getElementById("hp-picks-until").value'),deadline,'Product rerender preserves duration');
  await click('#hp-save-picks');
  await until(()=>evaluate('window.fixture.writes.length'),n=>n===1,'first persisted deadline');
  await until(()=>evaluate('document.getElementById("hp-save-picks").disabled'),Boolean,'readback confirmed');
  assert.equal(await evaluate('window.fixture.writes[0].product_ids.length'),2);
  assert(await evaluate('document.querySelector(".hp-picks-published").textContent.includes('+JSON.stringify(deadline.replace('T',' '))+')'));
  await evaluate('window.fixture.reload()');
  assert.equal(await evaluate('document.getElementById("hp-picks-until").value'),deadline,'Deadline survives reload');
  await evaluate('(()=>{const el=document.getElementById("hp-picks-period");el.value="168";el.dispatchEvent(new Event("change",{bubbles:true}));window.fixture.failSave=true;})()');
  assert.equal(await evaluate('document.getElementById("hp-save-picks").disabled'),false,'Deadline-only changes can be saved');
  await click('#hp-save-picks');
  await until(()=>evaluate('document.getElementById("hp-picks-error").textContent'),Boolean,'save failure shown');
  assert.equal(await evaluate('window.fixture.writes.length'),1);
  await evaluate('window.fixture.failSave=false');
  await click('#hp-save-picks');
  await until(()=>evaluate('window.fixture.writes.length'),n=>n===2,'retry saves deadline');
  await until(()=>evaluate('document.getElementById("hp-save-picks").disabled'),Boolean,'retry confirmed');
  await evaluate('(()=>{const el=document.getElementById("hp-picks-until");el.value="2020-01-01T12:00";el.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await click('#hp-save-picks');
  await until(()=>evaluate('document.getElementById("hp-picks-error").textContent'),text=>text.includes('майбутню'),'past date validation');
  assert.equal(await evaluate('window.fixture.writes.length'),2);
  await evaluate('(()=>{const el=document.getElementById("hp-picks-until");el.value="2099-01-03T17:45";el.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await click('#hp-save-picks');
  await until(()=>evaluate('window.fixture.writes.length'),n=>n===3,'custom deadline saves');
  assert.equal(await evaluate('window.fixture.writes[2].expires_at'),'2099-01-03T16:45:00.000Z','Warsaw timezone');
  for(const width of [390,320]){
   await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
   assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'No mobile overflow at '+width);
   assert(await evaluate('document.getElementById("hp-picks-until").getBoundingClientRect().height>=44'));
  }
  await click('input[data-pick="1"]');await click('input[data-pick="2"]');
  await click('#hp-save-picks');
  await until(()=>evaluate('window.fixture.writes.length'),n=>n===4,'clear selection saves');
  assert.deepEqual(await evaluate('window.fixture.writes[3].product_ids'),[]);
  await evaluate('window.fixture.showExpiry()');
  assert.equal(await evaluate('document.getElementById("hp-content").textContent'),'visible');
  await until(()=>evaluate('document.getElementById("hp-content").textContent'),text=>text==='hidden','expiry without reload');
  assert.deepEqual(await evaluate('window.fixture.errors'),[]);
 }finally{
  cdp?.close();processChrome.kill('SIGTERM');
  await new Promise(resolve=>server.close(resolve));
  await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }
});
