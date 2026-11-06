/**
 * Build-only fingerprinting of GitHub Pages assets.
 *
 * GitHub Pages serves static modules with a 600-second browser cache TTL.
 * Without versioned module URLs, users who have already opened the game hall
 * can see stale catalogs even after a completely successful deployment.
 *
 * The source files stay readable and unmodified. Only dist/ gets stamped.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

export function deploymentVersion({sha='',runId='',fallback='local'}={}){
 const parts=[String(sha).slice(0,12),String(runId)].filter(Boolean);
 const candidate=parts.length?parts.join('-'):fallback;
 if(!/^[a-zA-Z0-9_-]{1,56}$/.test(candidate))
   throw new Error('Invalid static deployment fingerprint: '+candidate);
 return candidate;
}

const JS_IMPORT= /(\b(?:from|import)\s*)(['"])((?:\.\/|\.\.\/)[^'"?#]+\.js)\2/g;

export function versionModuleImports(source,version){
 if(!/^[a-zA-Z0-9_-]{1,56}$/.test(version))
  throw new Error('Invalid static module fingerprint');
 return source.replace(JS_IMPORT,(_match,prefix,quote,target)=>
   prefix+quote+target+'?v='+version+quote);
}

export async function fingerprintDist(dist,copied,version){
 if(!Array.isArray(copied)||!copied.includes('app.js')||!copied.includes('arcade.js'))
   throw new Error('Missing required application modules in output');
 const index=path.join(dist,'index.html');
 let html=await readFile(index,'utf8');
 const required=[
  ['href="./atlas-v3.css"','href="./atlas-v3.css?v='+version+'"'],
  ['src="./app.js"','src="./app.js?v='+version+'"']
 ];
 for(const [before,after] of required){
  if(!html.includes(before))throw new Error('Site entry HTML missing: '+before);
  html=html.replace(before,after);
 }
 // Every linked stylesheet must share the deployment fingerprint; otherwise a
 // cached rail stylesheet can lag behind updated HTML/JS after Pages deploys.
 for(const asset of ['workboard.css','release-review.css','api-lab.css']){
  const before='href="./'+asset+'"';
  if(!html.includes(before))continue;
  if(!copied.includes(asset))throw new Error('Missing linked stylesheet: '+asset);
  html=html.replace(before,'href="./'+asset+'?v='+version+'"');
 }
 await writeFile(index,html);
 for(const name of copied.filter(x=>x.endsWith('.js'))){
  if(name.includes('..')||path.isAbsolute(name))throw new Error('Invalid copied module path');
  const filename=path.join(dist,name);
  const source=await readFile(filename,'utf8');
  await writeFile(filename,versionModuleImports(source,version));
 }
 await mkdir(path.join(dist,'data'),{recursive:true});
 await writeFile(path.join(dist,'data','build.json'),JSON.stringify({
   fingerprint:version, generatedAt:new Date().toISOString()
 },null,2));
 return version;
}
