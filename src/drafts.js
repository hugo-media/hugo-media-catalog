// Functional, device-local form recovery. Each signed-in administrator has a separate key space.
let connection;
function connect(){
 if(!connection) connection=new Promise((resolve,reject)=>{
  const r=indexedDB.open('hmg-editor-drafts',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('drafts',{keyPath:'key'});
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>{connection=null;reject(r.error);};
 });return connection;
}
async function request(mode, fn){const db=await connect();return new Promise((resolve,reject)=>{
 const tx=db.transaction('drafts',mode);const req=fn(tx.objectStore('drafts'));let result;
 req.onsuccess=()=>{result=req.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
});}
const key=(user,id)=>`${user}:${id||'new'}`;
export const readDraft=(user,id)=>request('readonly',s=>s.get(key(user,id)));
export const removeDraft=(user,id)=>request('readwrite',s=>s.delete(key(user,id)));
export async function saveDraft(user,id,data){if(!user) throw Error('notAdmin');return request('readwrite',s=>s.put({...data,key:key(user,id),user,id:id||null,savedAt:Date.now()}));}
export async function listDrafts(user){const all=await request('readonly',s=>s.getAll());return all.filter(x=>x.user===user).sort((a,b)=>b.savedAt-a.savedAt);}
