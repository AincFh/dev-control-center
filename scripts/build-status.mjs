import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {latestWorkflow,workflowState,safeRepositoryPath} from '../status.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OWNER='AincFh', API='https://api.github.com', TOKEN=process.env.GITHUB_TOKEN||'';
const exclude=process.env.GITHUB_RUN_ID, currentRepo=process.env.GITHUB_REPOSITORY||'';
const errors=[];
async function get(uri){
 const headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'atlas-status-publisher/2.0'};
 if(TOKEN)headers.Authorization='Bearer '+TOKEN;
 const res=await fetch(API+uri,{headers,signal:AbortSignal.timeout(18000)});
 if(!res.ok){const err=new Error('HTTP '+res.status);err.code=res.status;throw err;}
 return res.json();
}
async function optional(fn,repo,kind,fallback){
 try{return await fn()}catch(e){errors.push({repository:repo,source:kind,httpStatus:Number.isInteger(e.code)?e.code:null});return fallback;}
}
async function listRepos(){
 const list=[];
 for(let page=1;page<=5;page++){
  const chunk=await get('/users/'+OWNER+'/repos?per_page=100&page='+page+'&sort=updated&type=public');
  if(!Array.isArray(chunk))throw Error('Unexpected public repository list');
  list.push(...chunk.filter(x=>!x.private));
  if(chunk.length<100)break;
 }
 return list;
}
async function mapLimited(items,limit,fn){
 let next=0;const result=new Array(items.length);
 await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
  while(next<items.length){const i=next++;result[i]=await fn(items[i]);}
 }));
 return result;
}
async function describe(r){
 const root=safeRepositoryPath(OWNER,r.name),branch=r.default_branch||'main',skip=currentRepo===OWNER+'/'+r.name?exclude:null;
 const [runs,issues,prs,pages]=await Promise.all([
  optional(()=>get(root+'/actions/runs?per_page=12&branch='+encodeURIComponent(branch)),r.name,'actions',null),
  optional(()=>get(root+'/issues?state=open&per_page=100'),r.name,'issues',null),
  optional(()=>get(root+'/pulls?state=open&per_page=100'),r.name,'pull_requests',null),
  optional(()=>get(root+'/pages'),r.name,'pages',null)
 ]);
 const w=latestWorkflow(runs?.workflow_runs,branch,skip);
 return {
  name:r.name,repositoryUrl:r.html_url,description:r.description||'',language:r.language||null,
  updatedAt:r.pushed_at||r.updated_at||null,stars:r.stargazers_count||0,defaultBranch:branch,
  ci:{state:workflowState(w),name:w?.name||null,url:w?.html_url||null,conclusion:w?.conclusion||null,updatedAt:w?.updated_at||null,sha:w?.head_sha?.slice(0,8)||null,runNumber:w?.run_number||null},
  openIssues:Array.isArray(issues)?issues.filter(x=>!x.pull_request).length:null,
  openPRs:Array.isArray(prs)?prs.length:null,
  countsTruncated:!!(issues?.length>=100||prs?.length>=100),
  site:pages?.html_url&&pages?.status==='built'?{state:'published',url:pages.html_url}:{state:pages?.status==='building'?'building':pages?'not_published':'unknown',url:null}
 };
}
async function main(){
 let repos;
 try{repos=await listRepos()}catch(e){console.error('Public repo discovery failed:',e.message);process.exitCode=1;return;}
 const projects=await mapLimited(repos,4,describe);
 const data={schemaVersion:2,owner:OWNER,generatedAt:new Date().toISOString(),source:'GitHub Actions / GitHub REST API',refreshIntervalMinutes:60,publicOnly:true,projects,errors};
 await mkdir(path.join(ROOT,'dist','data'),{recursive:true});
 for(const file of ['index.html','style.css','app.js','core.js','status.js','roadmap.js','discovery.js','favicon.svg'])await copyFile(path.join(ROOT,file),path.join(ROOT,'dist',file));
 await writeFile(path.join(ROOT,'dist','data','status.json'),JSON.stringify(data,null,2));
 console.log('Public project snapshot:',projects.length,'repositories;',errors.length,'nonfatal API errors.');
}
await main();