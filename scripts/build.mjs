import {mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {publicConfigValid} from '../src/core.js';
const supabaseUrl=process.env.SUPABASE_URL||'';
const supabaseKey=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||'';
if((supabaseUrl||supabaseKey)&&!publicConfigValid({supabaseUrl,supabaseKey}))throw Error('Provide a valid Supabase HTTPS URL and publishable/anon key. Secret and service-role keys are forbidden.');
await rm('dist',{recursive:true,force:true});await mkdir('dist/src',{recursive:true});
for(const f of ['index.html','styles.css','src/app.js','src/core.js','src/data.js'])await copyFile(f,`dist/${f}`);
await writeFile('dist/config.js','window.HUGO_CONFIG = '+JSON.stringify({supabaseUrl,supabaseKey})+';\n');
console.log(supabaseUrl?'Build ready with public Supabase configuration.':'Build ready. Supabase not configured; site will show an honest setup state.');
