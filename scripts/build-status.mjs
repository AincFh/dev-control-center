import {mkdir,copyFile,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {latestWorkflow,workflowState,safeRepositoryPath} from '../status.js';
import {normalizePreview} from '../mission-core.js';
import {traceForRepo,normalizeTraceRun} from '../trace-core.js';
import {planDeploymentChecks,normalizeDeploymentEvidence,applyDeploymentEvidence} from '../deploy-core.js';
import {siteEvidence} from '../site-core.js';
import {normalizeGitHubRelease} from '../native-release-core.js';
import {probeSite} from '../site-probe-core.js';
import {deploymentVersion,fingerprintDist} from './asset-version.mjs';
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
async function readRelease(root,name){
 try{return normalizeGitHubRelease(await get(root+'/releases/latest'),name)}
 catch(e){
  // Many active repositories have no published Release. A GitHub 404 means
  // absent evidence, not an API failure, and must not inflate error metrics.
  if(e.code!==404)errors.push({repository:name,source:'latest_release',httpStatus:Number.isInteger(e.code)?e.code:null});
  return normalizeGitHubRelease(null,name);
 }
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
 const [runs,issues,prs,pages,release]=await Promise.all([
  optional(()=>get(root+'/actions/runs?per_page=12&branch='+encodeURIComponent(branch)),r.name,'actions',null),
  optional(()=>get(root+'/issues?state=open&per_page=100'),r.name,'issues',null),
  optional(()=>get(root+'/pulls?state=open&per_page=100'),r.name,'pull_requests',null),
  optional(()=>get(root+'/pages'),r.name,'pages',null),
  readRelease(root,r.name)
 ]);
 const [closedPRs,prRuns]=await Promise.all([
  optional(()=>get(root+'/pulls?state=closed&sort=updated&direction=desc&per_page=12'),r.name,'recent_closed_prs',null),
  Array.isArray(prs)&&prs.length>0?optional(()=>get(root+'/actions/runs?event=pull_request&per_page=80'),r.name,'pr_checks',null):Promise.resolve(null)
 ]);
 const w=latestWorkflow(runs?.workflow_runs,branch,skip);
 const rawTrace=traceForRepo({owner:OWNER,repo:r.name,issues:issues||[],openPRs:prs||[],closedPRs:closedPRs||[],
  branchRuns:(runs?.workflow_runs||[]).map(x=>normalizeTraceRun(x,OWNER,r.name)).filter(Boolean),
  prRuns:(prRuns?.workflow_runs||[]).map(x=>normalizeTraceRun(x,OWNER,r.name)).filter(Boolean)});
 // Deployment evidence is optional and strictly tied to exact merge SHA.
 // Pages existence or successful main CI never counts as this PR's deployment.
 const hasMerged=rawTrace?.prs.some(p=>p.state==='merged');
 const deployments=hasMerged?await optional(
  ()=>get(root+'/deployments?environment=github-pages&per_page=50'),r.name,'deployments',null):null;
 const candidates=planDeploymentChecks(rawTrace?.prs||[],deployments||[],OWNER,r.name,4);
 const proven=await Promise.all(candidates.map(async candidate=>{
  const statuses=await optional(()=>get(root+'/deployments/'+candidate.id+'/statuses?per_page=10'),r.name,'deployment_status',null);
  return{prNumber:candidate.prNumber,evidence:normalizeDeploymentEvidence(candidate,statuses||[],pages?.html_url||null)};
 }));
 const trace=applyDeploymentEvidence(rawTrace,proven);
 const site=siteEvidence({pages,trace});
 // Probe actual public Pages HTML and same-origin JS/CSS, independently of CI.
 // Only the pinned aincfh.github.io/<repo>/ path is fetched; unknown sites are not probed.
 const probe=site.state==='published'?await probeSite({repo:r.name,url:site.url,timeoutMs:6500}):null;
 return {
  name:r.name,repositoryUrl:r.html_url,description:r.description||'',language:r.language||null,
  updatedAt:r.pushed_at||r.updated_at||null,stars:r.stargazers_count||0,defaultBranch:branch,
  ci:{state:workflowState(w),name:w?.name||null,url:w?.html_url||null,conclusion:w?.conclusion||null,updatedAt:w?.updated_at||null,sha:w?.head_sha?.slice(0,8)||null,runNumber:w?.run_number||null},
  openIssues:Array.isArray(issues)?issues.filter(x=>!x.pull_request).length:null,
  openPRs:Array.isArray(prs)?prs.length:null,
  issuePreview:Array.isArray(issues)?normalizePreview(issues,'issue',r.name,OWNER):null,
  prPreview:Array.isArray(prs)?normalizePreview(prs,'pull',r.name,OWNER):null,
  fork:!!r.fork,archived:!!r.archived,
  release,
  trace,
  countsTruncated:!!(issues?.length>=100||prs?.length>=100),
  site,probe
 };
}
// Copy the actual relative module dependency graph, not a manually curated
// list. A stale list once excluded arcade.js: CI was green, Pages deployed,
// but app.js failed at runtime because the ES module returned 404.
export async function copyFrontendModules(root,dest,entrypoints=['index.html','atlas-v3.css','workboard.css','release-review.css','style.css','app.js','favicon.svg']){
 const pending=[...entrypoints],copied=new Set();
 while(pending.length){
  const filename=pending.shift();
  const normalized=path.posix.normalize(filename.replaceAll('\\','/'));
  if(normalized.startsWith('../')||normalized.startsWith('/')||normalized==='..')
    throw new Error('Refusing to bundle module outside project root: '+filename);
  if(copied.has(normalized))continue;
  const input=path.join(root,normalized),output=path.join(dest,normalized);
  await mkdir(path.dirname(output),{recursive:true});
  if(normalized.endsWith('.js')){
   const source=await readFile(input,'utf8');
   // Supports named imports, namespace imports, export-from and side-effect imports.
   const imports=source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]((?:\.\/|\.\.\/)[^'"]+)['"]/g);
   for(const m of imports){
     const relative=path.posix.normalize(path.posix.join(path.posix.dirname(normalized),m[1]));
     if(!relative.endsWith('.js'))throw new Error('Unsupported runtime ES import '+m[1]+' in '+normalized);
     if(relative.startsWith('../')||relative.startsWith('/'))
       throw new Error('Runtime import escaped project root: '+m[1]);
     pending.push(relative);
   }
  }
  await copyFile(input,output);
  copied.add(normalized);
 }
 return [...copied];
}

async function main(){
 let repos;
 try{repos=await listRepos()}catch(e){console.error('Public repo discovery failed:',e.message);process.exitCode=1;return;}
 const projects=await mapLimited(repos,4,describe);
 const data={schemaVersion:2,owner:OWNER,generatedAt:new Date().toISOString(),source:'GitHub Actions / GitHub REST API',refreshIntervalMinutes:60,publicOnly:true,projects,errors};
 await mkdir(path.join(ROOT,'dist','data'),{recursive:true});
 const copied=await copyFrontendModules(ROOT,path.join(ROOT,'dist'));
 if(!copied.includes('arcade.js'))throw Error('Game arcade module missing from generated Pages artifact');
 if(!copied.includes('atlas-v3.css'))throw Error('V3 workspace stylesheet missing from generated Pages artifact');
 if(!copied.includes('workboard.css')||!copied.includes('workboard.js')||!copied.includes('workboard-core.js')||!copied.includes('capacity-core.js'))throw Error('Cross-domain workboard asset missing from published import graph');
 if(!copied.includes('universe.js')||!copied.includes('universe-core.js')||!copied.includes('studio-motion.js'))throw Error('Galaxy discovery or motion module missing');
 if(!copied.includes('release-review.css')||!copied.includes('release-review.js')||!copied.includes('release-review-core.js'))throw Error('Cross-domain release evidence module missing from Pages artifact');
 await copyFile(path.join(ROOT,'data','github-universe.json'),path.join(ROOT,'dist','data','github-universe.json'));
 await copyFile(path.join(ROOT,'data','game-runtime.json'),path.join(ROOT,'dist','data','game-runtime.json'));
 const buildTag=deploymentVersion({sha:process.env.GITHUB_SHA||'',runId:process.env.GITHUB_RUN_ID||''});
 await fingerprintDist(path.join(ROOT,'dist'),copied,buildTag);
 console.log('Static assets fingerprint:',buildTag);
 console.log('Bundled frontend files:',copied.join(', '));
 await writeFile(path.join(ROOT,'dist','data','status.json'),JSON.stringify(data,null,2));
 console.log('Public project snapshot:',projects.length,'repositories;',errors.length,'nonfatal API errors.');
}
await main();