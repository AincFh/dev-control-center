import{readFile,writeFile}from'node:fs/promises';
import{fileURLToPath,pathToFileURL}from'node:url';
import path from'node:path';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FILE=path.join(ROOT,'data/github-universe.json');
const API='https://api.github.com/search/repositories',sleep=ms=>new Promise(r=>setTimeout(r,ms));
export const validPath=s=>typeof s==='string'&&s.length<=240&&/^[\w.-]+\/[\w.-]+$/.test(s);
export function mergeRows(previous,incoming,genres,cap=12000){
 const out=new Map();
 for(const row of [...previous,...incoming]){
  if(!Array.isArray(row)||!validPath(row[0])||!genres.has(row[1]))continue;
  const key=row[0].toLowerCase();
  if(!out.has(key)&&out.size<cap)out.set(key,[row[0],row[1]]);
 }
 return [...out.values()];
}
export function workload(searches,{secondPages=9,day=Math.floor(Date.now()/86400000)}={}){
 const seen=new Set();
 const base=searches.filter(s=>s&&typeof s.q==='string'&&/^[a-z0-9]+$/.test(s.genre)).filter(s=>{const key=s.genre+'|'+s.q;if(seen.has(key))return false;seen.add(key);return true}).map(s=>({genre:s.genre,q:s.q,page:1}));
 const broad=base.filter(s=>/game|simulation|adventure/i.test(s.q));
 for(let k=0;k<Math.min(secondPages,broad.length);k++){const p=broad[(day+k)%broad.length];base.push({...p,page:2})}
 return base;
}
export async function searchPublic({q,page},token,fetcher=fetch){
 const params=new URLSearchParams({q:q+' stars:>5 archived:false',per_page:'100',page:String(page)});
 const headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'atlas-public-indexer'};
 if(token)headers.Authorization='Bearer '+token;
 const response=await fetcher(API+'?'+params,{headers,signal:AbortSignal.timeout(18000)});
 if(!response.ok)throw Error('GitHub search HTTP '+response.status);
 const data=await response.json();
 if(!Array.isArray(data.items))throw Error('Invalid public search response');
 return data.items.filter(x=>x&&x.private===false&&!x.archived&&validPath(x.full_name)).map(x=>x.full_name);
}
export async function refresh({file=FILE,token=process.env.GITHUB_TOKEN||'',fetcher=fetch,delay=2600,dryRun=false}={}){
 const previous=JSON.parse(await readFile(file,'utf8'));
 if(previous.schemaVersion!==1||previous.kind!=='external-discovery'||!Array.isArray(previous.rows))throw Error('Reject invalid existing index');
 const genres=new Set(previous.categories.map(x=>x[0])),queries=workload(previous.searches||[]);
 if(queries.length<20)throw Error('Missing prior source queries');
 const incoming=[],logs=[];let ok=0;
 for(const [i,task]of queries.entries()){
  if(i)await sleep(delay);
  try{
   const names=await searchPublic(task,token,fetcher);ok++;
   incoming.push(...names.map(name=>[name,task.genre]));logs.push({...task,n:names.length,ok:true});
  }catch(e){logs.push({...task,n:0,ok:false});console.warn('Public source search unavailable:',task.q,e.message)}
 }
 if(!ok)throw Error('All GitHub searches failed; original index preserved');
 const next=mergeRows(previous.rows,incoming,genres),added=next.length-previous.rows.length;
 if(added<=0){console.log('No new names; preserved validated index',previous.rows.length);return{count:next.length,added:0}}
 // Keep original research queries immutable. Daily page-two logs must never
 // become new base queries and cause unbounded API calls on later runs.
 const data={...previous,source:'GitHub public REST search; scheduled collection',compiledOn:new Date().toISOString().slice(0,10),lastSourceRun:{attempts:logs.length,ok,failed:logs.length-ok,added},rows:next};
 if(!dryRun)await writeFile(file,JSON.stringify(data)+'\n');
 console.log(JSON.stringify({old:previous.rows.length,count:next.length,added,queries:queries.length,passed:ok,failed:queries.length-ok,dryRun}));
 return{count:next.length,added};
}
const invoked=process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href;
if(invoked)await refresh({dryRun:process.argv.includes('--dry-run')});
