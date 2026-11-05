// ATLAS Delivery Trace: evidence-linked public PR, issue, workflow and release data.
const NAME=/^[A-Za-z0-9_.-]{1,120}$/;
const SHA=/^[a-f0-9]{40}$/i;
const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?v:null;
const brief=(v,n=180)=>String(v??'').slice(0,n);
const href=(owner,repo,kind,n)=>'https://github.com/'+owner+'/'+repo+'/'+kind+'/'+n;
export function issueReferences(body,owner='AincFh',repo='dev-control-center'){
 if(!NAME.test(owner)||!NAME.test(repo))return[];
 const input=brief(body,12000).replace(/^\s*~~~[\s\S]*?^\s*~~~/gm,' ').replace(new RegExp('\\x60[^\\x60\\n]+\\x60','g'),' ');
 const found=new Set();
 for(const m of input.matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+(?:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+))?#([1-9]\d{0,7})\b/gi)){
  const [,who,which,num]=m;
  if(who&&(who.toLowerCase()!==owner.toLowerCase()||which.toLowerCase()!==repo.toLowerCase()))continue;
  found.add(Number(num));
 }
 return [...found].slice(0,15).sort((a,b)=>a-b);
}
export function normalizeTracePR(pr,owner,repo){
 if(!NAME.test(owner)||!NAME.test(repo)||!Number.isInteger(pr?.number)||pr.number<1)return null;
 const state=pr.state==='open'?'open':pr.merged_at?'merged':null;
 if(!state)return null;
 return{
  id:repo+'#'+pr.number,repo,number:pr.number,
  title:brief(pr.title||'Untitled'),url:href(owner,repo,'pull',pr.number),
  state,draft:pr.draft===true,updatedAt:date(pr.updated_at),
  mergedAt:state==='merged'?date(pr.merged_at):null,
  headSha:SHA.test(pr.head?.sha||'')?pr.head.sha:null,
  mergeSha:state==='merged'&&SHA.test(pr.merge_commit_sha||'')?pr.merge_commit_sha:null,
  headBranch:brief(pr.head?.ref,140),baseBranch:brief(pr.base?.ref||'main',140),
  closes:issueReferences(pr.body,owner,repo)
 };
}
export function normalizeTraceRun(run,owner='AincFh',repo='dev-control-center'){
 if(!NAME.test(owner)||!NAME.test(repo)||!Number.isInteger(run?.id)||run.id<1||!SHA.test(run.head_sha||''))return null;
 const state=run.status!=='completed'?'running':run.conclusion==='success'?'success'
  :['failure','timed_out','action_required','startup_failure'].includes(run.conclusion)?'failure'
  :['cancelled','neutral','skipped','stale'].includes(run.conclusion)?'neutral':'unknown';
 return{id:run.id,workflow:brief(run.name,110),sha:run.head_sha,branch:brief(run.head_branch,140),event:brief(run.event,35),
  state,updatedAt:date(run.updated_at)||date(run.created_at),url:href(owner,repo,'actions/runs',run.id)};
}
export function associateChecks(pr,runs=[]){
 const rows=(Array.isArray(runs)?runs:[]).filter(r=>r?.sha&&(pr.state==='open'
  ?r.sha===pr.headSha&&r.branch===pr.headBranch&&r.event==='pull_request'
  :r.sha===pr.mergeSha&&r.branch===pr.baseBranch&&['push','workflow_dispatch'].includes(r.event)))
  .sort((a,b)=>(Date.parse(b.updatedAt||'')||0)-(Date.parse(a.updatedAt||'')||0));
 const workflows=new Set(),checks=[];
 for(const r of rows){
  const key=r.workflow.toLowerCase();if(workflows.has(key))continue;
  workflows.add(key);checks.push({...r,scope:pr.state==='open'?'pull_request_head':'merged_branch_commit'});
  if(checks.length>=6)break;
 }
 const states=checks.map(r=>r.state);
 const state=!checks.length?'unknown':states.includes('failure')?'failure':states.includes('running')?'running'
  :states.every(s=>s==='success')?'success':states.includes('neutral')?'neutral':'unknown';
 return{state,checked:checks.length,checks};
}
export function traceForRepo({owner='AincFh',repo,issues=[],openPRs=[],closedPRs=[],prRuns=[],branchRuns=[]}={}){
 if(!NAME.test(owner)||!NAME.test(repo))return null;
 const candidates=[...(Array.isArray(openPRs)?openPRs:[]).slice(0,8),
  ...(Array.isArray(closedPRs)?closedPRs:[]).filter(x=>x?.merged_at).slice(0,6)];
 const seen=new Set(),prs=[];
 for(const raw of candidates){
  const p=normalizeTracePR(raw,owner,repo);if(!p||seen.has(p.number))continue;
  seen.add(p.number);
  const checks=associateChecks(p,p.state==='open'?prRuns:branchRuns);
  const phase=p.state==='open'?(p.draft?'draft':checks.state==='failure'?'blocked':checks.state==='success'?'review':'verify')
   :checks.state==='success'?'merged_checked':checks.state==='failure'?'merged_failing':'merged_unverified';
  prs.push({...p,checks,phase,links:p.closes.map(number=>({
   issueNumber:number,url:href(owner,repo,'issues',number),basis:'PR 正文关闭关键字',
   verifiedOpen:Array.isArray(issues)&&issues.some(i=>i.number===number&&!i.pull_request)
  }))});
 }
 const issueRows=(Array.isArray(issues)?issues:[]).filter(i=>i&&!i.pull_request&&Number.isInteger(i.number)&&i.number>0).slice(0,8)
  .map(i=>({number:i.number,title:brief(i.title),url:href(owner,repo,'issues',i.number),updatedAt:date(i.updated_at),
    relatedPRs:prs.filter(p=>p.closes.includes(i.number)).map(p=>p.number)}));
 return{repo,prs,issues:issueRows,partial:true,source:'GitHub 公开快照；仅记录 SHA 可验证的检查与明确关闭引用'};
}
export function traceOverview(projects=[]){
 const cards=[],issues=[];
 for(const project of projects){
  if(!NAME.test(project?.name)||!project.trace)continue;
  for(const x of project.trace.prs||[]){
   if(x?.repo!==project.name)continue;
   cards.push({...x,site:project.site||{state:'unknown'},mainCI:project.ci||{state:'unknown'},
    label:project.label||project.name,description:project.description||'',category:project.category||'tool'});
  }
  for(const x of project.trace.issues||[])issues.push({...x,repo:project.name,label:project.label||project.name});
 }
 cards.sort((a,b)=>Number(b.state==='open')-Number(a.state==='open')||
  (Date.parse(b.updatedAt||b.mergedAt||'')||0)-(Date.parse(a.updatedAt||a.mergedAt||'')||0));
 return{cards,issues,open:cards.filter(x=>x.state==='open').length,merged:cards.filter(x=>x.state==='merged').length,
  failed:cards.filter(x=>x.checks.state==='failure').length,unknown:cards.filter(x=>x.checks.state==='unknown').length,
  deployed:cards.filter(x=>x.state==='merged'&&x.deployment?.verified&&x.deployment?.sha===x.mergeSha).length,
  explicitLinks:cards.reduce((sum,x)=>sum+x.links.length,0),partial:true};
}
export function filterTrace(cards,{query='',phase='all',repo='all'}={}){
 const words=String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
 return cards.filter(c=>(repo==='all'||c.repo===repo)&&
  (phase==='all'||phase==='open'&&c.state==='open'||phase==='merged'&&c.state==='merged'||
   phase==='failing'&&c.checks.state==='failure'||phase==='unknown'&&c.checks.state==='unknown'||phase===c.phase)&&
  words.every(w=>[c.title,c.repo,c.label,c.description,c.headBranch,...c.links.map(l=>'#'+l.issueNumber)]
   .some(t=>String(t).toLowerCase().includes(w))));
}
export function traceReport(overview,{generatedAt=new Date().toISOString()}={}){
 const clean=x=>String(x??'').replace(/[\r\n|]/g,' ').slice(0,250);
 const lines=['# ATLAS · 研发链路追踪报告','',
 '- 导出时间：'+generatedAt,'- PR 样本：'+overview.cards.length+'（开放 '+overview.open+'，最近已合并 '+overview.merged+'）',
 '- 检查失败：'+overview.failed+' / 检查无证据：'+overview.unknown,
 '- 已验证同合并提交 Pages 部署：'+(overview.deployed||0),
 '- 发现明确关闭引用：'+overview.explicitLinks,'',
 '> 仅采集公开 Issue/PR 样本，非完整历史。PR 检查、合并后的主分支检查、GitHub Pages 部署相互独立，不能互相充当完成证据。','',
 '| 仓库 | PR | 阶段 | 关联检查 | 同提交部署 | 明确关闭引用 |',
 '| --- | --- | --- | --- | --- | --- |'];
 for(const c of overview.cards)lines.push('| '+clean(c.repo)+' | [#'+c.number+']('+c.url+') '+clean(c.title)+' | '+c.phase+' | '+c.checks.state+' ('+c.checks.checked+') | '+(c.deployment?.verified&&c.deployment.sha===c.mergeSha?'[Pages 部署成功]('+c.deployment.evidenceUrl+')':'未验证')+' | '+(c.links.length?c.links.map(l=>'[#'+l.issueNumber+']('+l.url+')').join('、'):'无')+' |');
 lines.push('','## 使用约束','',
 '- 关闭关键字仅代表 PR 正文中声明的关联，并不证明 GitHub 已正式建立跨事项自动关闭关系。',
 '- PR 检查成功不等于已合并；合并也不自动意味着目标页面已部署。',
 '- Pages 已发布是仓库当前状态，不能证明某个特定 PR 已发布。',
 '- 如无对应提交的 CI/部署事件，统一显示未知。');
 return lines.join('\n');
}
