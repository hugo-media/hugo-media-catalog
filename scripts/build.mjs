import {mkdir,copyFile,writeFile,rm,readFile,readdir} from 'node:fs/promises';
import {transform} from 'esbuild';
import {gzipSync} from 'node:zlib';
import {publicConfigValid} from '../src/core.js';

const fallback=JSON.parse(await readFile('public-config.json','utf8'));
const supabaseUrl=process.env.SUPABASE_URL||fallback.supabaseUrl||'';
const supabaseKey=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||fallback.supabaseKey||'';
if((supabaseUrl||supabaseKey)&&!publicConfigValid({supabaseUrl,supabaseKey}))throw Error('Provide a valid Supabase HTTPS URL and publishable/anon key. Secret and service-role keys are forbidden.');

export async function moduleFiles(directory='src'){
 const entries=await readdir(directory,{withFileTypes:true});
 const files=[];
 for(const entry of entries){
  const path=directory+'/'+entry.name;
  if(entry.isDirectory())files.push(...await moduleFiles(path));
  else if(entry.isFile()&&entry.name.endsWith('.js'))files.push(path);
 }
 return files.sort();
}

await rm('dist',{recursive:true,force:true});
await mkdir('dist/src',{recursive:true});
for(const file of ['brand.svg','brand-mark.svg','favicon.jpg','brand-start.svg'])await copyFile(file,'dist/'+file);

// Keep public URLs, ES module imports/exports, and the intro's classic-script behavior.
// Transform minifies with a parser; it does not bundle, mangle properties, or remove code.
const assets=['styles.css','intro.css','storefront.css',...await moduleFiles()];
let sourceBytes=0,outputBytes=0,sourceGzip=0,outputGzip=0;
for(const file of assets){
 const source=await readFile(file,'utf8');
 const css=file.endsWith('.css');
 const result=await transform(source,{
  loader:css?'css':'js',
  sourcefile:file,
  target:'es2020',
  charset:'utf8',
  minify:true,
  legalComments:'inline',
  treeShaking:false,
  ...(!css?{keepNames:true,...(file!=='src/intro.js'?{format:'esm'}:{})}:{})
 });
 const output='dist/'+file;
 await mkdir(output.slice(0,output.lastIndexOf('/')),{recursive:true});
 await writeFile(output,result.code);
 sourceBytes+=Buffer.byteLength(source);outputBytes+=Buffer.byteLength(result.code);
 sourceGzip+=gzipSync(source).length;outputGzip+=gzipSync(result.code).length;
}
await writeFile('dist/config.js','window.HUGO_CONFIG = '+JSON.stringify({supabaseUrl,supabaseKey})+';\n');
console.log('Production JS/CSS: '+sourceBytes+' -> '+outputBytes+' bytes; gzip estimate '+sourceGzip+' -> '+outputGzip+' bytes.');
console.log(supabaseUrl?'Build ready with public Supabase configuration.':'Build ready. Supabase not configured; site will show an honest setup state.');
