import {mkdir,copyFile,writeFile,rm,readFile} from 'node:fs/promises';
import {publicConfigValid} from '../src/core.js';
const fallback=JSON.parse(await readFile('public-config.json','utf8'));
const supabaseUrl=process.env.SUPABASE_URL||fallback.supabaseUrl||'';
const supabaseKey=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||fallback.supabaseKey||'';
if((supabaseUrl||supabaseKey)&&!publicConfigValid({supabaseUrl,supabaseKey}))throw Error('Provide a valid Supabase HTTPS URL and publishable/anon key. Secret and service-role keys are forbidden.');
await rm('dist',{recursive:true,force:true});await mkdir('dist/src',{recursive:true});
for(const f of ['styles.css','storefront.css','src/seo-core.js','src/seo-client.js','src/storefront.js','src/configurator.js','src/insights.js','src/insights-core.js','src/app.js','src/core.js','src/data.js','src/enhancements.js','src/enhancement-core.js','src/drafts.js'])await copyFile(f,`dist/${f}`);
await writeFile('dist/config.js','window.HUGO_CONFIG = '+JSON.stringify({supabaseUrl,supabaseKey})+';\n');
console.log(supabaseUrl?'Build ready with public Supabase configuration.':'Build ready. Supabase not configured; site will show an honest setup state.');

// Reuse the original brand image for the browser tab icon.
const template=await readFile("index.html","utf8");
const logo=template.match(/class="hp-logo" src="data:image\/jpeg;base64,([^"]+)"/);
if(!logo) throw Error("Brand image missing: cannot build favicon");
await writeFile("dist/favicon.jpg",Buffer.from(logo[1],"base64"));
