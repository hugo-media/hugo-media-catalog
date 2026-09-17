import {TABLE,BUCKET,toRow,fromRow,publicConfigValid} from './core.js';
let client;
export const ready = publicConfigValid(window.HUGO_CONFIG||{});
export const authCallback = /(?:[?#&](?:type=invite|type=recovery|code)=)/.test(location.href);
export async function connect(){
 if(!ready)throw Error('configuration');
 if(!client){const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.57.4');client=createClient(window.HUGO_CONFIG.supabaseUrl,window.HUGO_CONFIG.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'hmg-catalog-auth'}});}
 return client;
}
export async function listProducts(){const c=await connect();const products=[];for(let start=0;;start+=500){const {data,error}=await c.from(TABLE).select('*').order('id',{ascending:false}).range(start,start+499);if(error)throw error;products.push(...data.map(fromRow));if(data.length<500)break;}return products;}
export async function isAdmin(){const c=await connect();const {data:{session}}=await c.auth.getSession();if(!session)return false;const {data,error}=await c.rpc('hmg_catalog_is_admin');if(error)throw error;return data===true;}
export async function signIn(email,password){const c=await connect();const {error}=await c.auth.signInWithPassword({email,password});if(error)throw error;if(!await isAdmin()){await c.auth.signOut();throw Error('notAdmin');}}
export async function signOut(){const c=await connect();const {error}=await c.auth.signOut({scope:'local'});if(error)throw error;}
export async function updatePassword(password){const c=await connect();const {error}=await c.auth.updateUser({password});if(error)throw error;}
export function photoUrl(path){if(!path)return '';const url=window.HUGO_CONFIG?.supabaseUrl;if(!url)return '';return `${url}/storage/v1/object/public/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;}
export async function compressPhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('imageError');
 const bitmap=await createImageBitmap(file);try{if(bitmap.width*bitmap.height>60000000)throw Error('imageError');const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('imageError')),'image/webp',.84));}finally{bitmap.close();}
}
export async function saveProduct(p,pictures){
 if(!await isAdmin())throw Error('notAdmin');const c=await connect();const {data:{user},error:userError}=await c.auth.getUser();if(userError||!user)throw Error('notAdmin');
 const staged=[];let row;let writingRow=false;
 try{const paths=[];for(const image of pictures){if(typeof image==='string'){paths.push(image);continue;}const path=`${user.id}/${crypto.randomUUID()}.webp`;const {error}=await c.storage.from(BUCKET).upload(path,image.blob,{contentType:'image/webp',upsert:false,cacheControl:'3600'});if(error)throw error;staged.push(path);paths.push(path);}
 const values=toRow({...p,images:paths});writingRow=true;let request=p.id?c.from(TABLE).update(values).eq('id',p.id):c.from(TABLE).insert(values);const {data,error}=await request.select().single();if(error)throw error;row=data;
 }catch(e){if(staged.length&&!writingRow)await c.storage.from(BUCKET).remove(staged);throw e;}
 return fromRow(row);
}
export async function setStatus(id,status){if(!await isAdmin())throw Error('notAdmin');const c=await connect();const {data,error}=await c.from(TABLE).update({status}).eq('id',id).select().single();if(error)throw error;return fromRow(data);}
export async function deleteProduct(id){if(!await isAdmin())throw Error('notAdmin');const c=await connect();const {data,error}=await c.from(TABLE).delete().eq('id',id).select('id').single();if(error)throw error;return data;}
// Photos aren't deleted automatically: archive/duplicates may share a file.
// The admin can explicitly clean unattached files via the storage dashboard.
