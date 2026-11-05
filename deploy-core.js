// GitHub environment deployment evidence. Only an exact merge SHA can attest that
// a specific PR's merge commit was deployed. Never infer from Pages existence.
const NAME=/^[A-Za-z0-9_.-]{1,120}$/;
const SHA=/^[a-f0-9]{40}$/i;
const STATES=new Set(['success','failure','error','inactive','in_progress','queued','pending','waiting']);
const safeDate=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?s:null;
export function planDeploymentChecks(prs=[],records=[],owner='AincFh',repo='dev-control-center',limit=4){
 if(!NAME.test(owner)||!NAME.test(repo)||!Array.isArray(records)||!Array.isArray(prs))return[];
 const keys=new Map();
 for(const pr of prs){
  if(pr?.state!=='merged'||!SHA.test(pr.mergeSha||''))continue;
  keys.set(pr.mergeSha.toLowerCase(),pr.number);
 }
 const found=[],seen=new Set();
 for(const d of records){
  if(!Number.isSafeInteger(d?.id)||d.id<1||d.environment!=='github-pages'||!SHA.test(d.sha||'')||seen.has(d.id))continue;
  const number=keys.get(d.sha.toLowerCase());if(!number||found.some(x=>x.prNumber===number))continue;
  seen.add(d.id);found.push({id:d.id,prNumber:number,sha:d.sha,
   recordUrl:'https://github.com/'+owner+'/'+repo+'/deployments/'+d.id,
   environment:'github-pages',createdAt:safeDate(d.created_at)});
  if(found.length>=Math.max(1,Math.min(limit,8)))break;
 }
 return found;
}
export function normalizeDeploymentEvidence(candidate,statuses=[],pageUrl=null){
 if(!candidate||!Number.isSafeInteger(candidate.id)||!SHA.test(candidate.sha||''))return null;
 // GitHub returns statuses newest-first; fail closed if any metadata is missing.
 const list=Array.isArray(statuses)?statuses.filter(s=>s&&STATES.has(s.state)):[];
 const latest=list.sort((a,b)=>Date.parse(b.created_at||0)-Date.parse(a.created_at||0))[0];
 const raw=latest?.state||'unknown';
 const state=raw==='success'?'success':['failure','error'].includes(raw)?'failure'
  :['in_progress','queued','pending','waiting'].includes(raw)?'running':'unknown';
 let url=null;
 if(typeof latest?.environment_url==='string'&&typeof pageUrl==='string'){
  try{
   const actual=new URL(latest.environment_url),allowed=new URL(pageUrl);
   if(actual.protocol==='https:'&&allowed.protocol==='https:'&&
    actual.origin===allowed.origin&&actual.pathname.startsWith(allowed.pathname)&&
    !actual.username&&!actual.password)url=actual.href;
  }catch{}
 }
 return{state,sha:candidate.sha,id:candidate.id,
  environment:'github-pages',url:state==='success'?url:null,
  evidenceUrl:candidate.recordUrl,updatedAt:safeDate(latest?.created_at),
  scope:'exact_merge_commit_sha',verified:state==='success'};
}
export function applyDeploymentEvidence(trace,lookups=[]){
 if(!trace||!Array.isArray(trace.prs))return trace;
 const byNumber=new Map(lookups.filter(x=>x&&Number.isInteger(x.prNumber)).map(x=>[x.prNumber,x.evidence]));
 return{...trace,prs:trace.prs.map(p=>p.state==='merged'?{...p,deployment:byNumber.get(p.number)||null}:p)};
}
