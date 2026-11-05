import{traceOverview,filterTrace,traceReport}from'./trace-core.js';
const $=id=>document.getElementById(id);
const make=(tag,label,cls)=>{const e=document.createElement(tag);if(label!==undefined&&label!==null)e.textContent=String(label);if(cls)e.className=cls;return e;};
const link=(url,label,cls='')=>{const a=make('a',label,cls);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
const STATE={success:'通过',failure:'失败',unknown:'无证据',running:'运行中',neutral:'中立'};
const PHASE={draft:'草稿待完善',blocked:'PR 检查失败',review:'PR 检查通过 · 待审核',verify:'PR 检查待核验',
 merged_checked:'已合并 · 主分支检查通过',merged_failing:'已合并 · 主分支检查失败',merged_unverified:'已合并 · 检查证据不足'};
let model=traceOverview(),query='',phase='all',repo='all',limit=16,latestStamp=null;
function flash(text){
 const el=$('traceFeedback');el.textContent=text;el.classList.add('visible');
 clearTimeout(flash.timer);flash.timer=setTimeout(()=>el.classList.remove('visible'),3000);
}
function refStage(name,detail,state='neutral',url=null){
 const row=make('div',null,'trace-step '+state);
 const dot=make('span','', 'trace-step-dot'),copy=make('div',null,'trace-step-copy');
 copy.append(make('strong',name),make('small',detail));
 row.append(dot,copy);
 if(url)row.append(link(url,'查看 ↗','trace-stage-open'));
 return row;
}
function drawCard(p){
 const card=make('article',null,'trace-card');
 card.dataset.repo=p.repo;card.dataset.phase=p.phase;
 const eyebrow=make('div',null,'trace-card-overline');
 eyebrow.append(make('span',p.repo,'trace-origin'),make('span',p.state==='open'?'OPEN PR':'MERGED PR','trace-tag '+p.state));
 const title=make('h3',null,'trace-card-title');
 title.append(link(p.url,'#'+p.number+' · '+p.title));
 const head=make('div',null,'trace-card-top');
 head.append(eyebrow,title,make('p',(PHASE[p.phase]||'待核验')+' · '+(p.headBranch||'未知分支'),'trace-card-sub'));
 card.append(head);
 const progress=make('div',null,'trace-lifecycle');
 const issue=p.links.length?p.links[0]:null;
 progress.append(refStage('需求关联',issue?'声明关闭 Issue #'+issue.issueNumber:'无明确关闭引用','neutral',issue?.url||null));
 progress.append(refStage('代码审查',p.state==='merged'?'GitHub 已确认合并于 '+(p.mergedAt?new Date(p.mergedAt).toLocaleDateString('zh-CN'):'未知时间'):p.draft?'PR 草稿阶段':'PR 开放，尚未合并',p.state==='merged'?'ok':p.draft?'warn':'active',p.url));
 const ciText=p.state==='open'?'PR 源提交检查：':'合并提交主分支检查：';
 progress.append(refStage('自动检查',ciText+(STATE[p.checks.state]||'未知')+' · '+p.checks.checked+' 项工作流',p.checks.state==='success'?'ok':p.checks.state==='failure'?'error':p.checks.state==='running'?'active':'warn',p.checks.checks[0]?.url||null));
 const proof=p.state==='merged'&&p.deployment?.sha===p.mergeSha?p.deployment:null;
 const deployment=p.state==='open'?'PR 未合并，尚无本次部署证据':
  proof?.verified?'GitHub Pages 同提交部署确认 · '+proof.sha.slice(0,12):
  proof?.state==='failure'?'GitHub Pages 同提交部署失败':
  proof?.state==='running'?'GitHub Pages 同提交部署进行中':
  p.site.state==='published'?'仓库 Pages 当前存在，但没有此 PR 的部署证明':'没有与此 PR 合并 SHA 匹配的成功部署证据';
 progress.append(refStage('线上发布',deployment,proof?.verified?'ok':proof?.state==='failure'?'error':proof?.state==='running'?'active':'neutral',proof?.evidenceUrl||null));
 card.append(progress);
 const expand=make('details',null,'trace-details'),summary=make('summary','检查来源与关联证据','trace-more');
 expand.append(summary);
 const inner=make('div',null,'trace-detail-body');
 if(p.links.length){
  inner.append(make('small','PR 正文明确声明关闭的 Issue（不是 GitHub 已执行关闭的证明）'));
  for(const x of p.links)inner.append(link(x.url,'Issue #'+x.issueNumber+(x.verifiedOpen?' · 当前开放':' · 状态未验证'),'trace-detail-link'));
 }else inner.append(make('p','没有可解析的 Fixes/Closes/Resolves 关闭引用；不能断言该 PR 没有对应需求。'));
 const sha=make('div','源提交 '+(p.headSha?p.headSha.slice(0,12):'未知')+(p.mergeSha?' · 合并提交 '+p.mergeSha.slice(0,12):''),'trace-sha');
 inner.append(sha);
 if(proof){
  inner.append(make('small','部署环境：'+proof.environment+' · GitHub Deployment #'+proof.id+' · '+(STATE[proof.state]||'无证据')));
  if(proof.evidenceUrl)inner.append(link(proof.evidenceUrl,'同提交 GitHub Deployment 原始记录 ↗','trace-detail-link'));
  if(proof.verified&&proof.url)inner.append(link(proof.url,'打开该部署环境 ↗','trace-detail-link'));
 }
 if(p.checks.checks.length){
  for(const w of p.checks.checks){
   const line=make('div',null,'trace-check-line');
   line.append(make('span',(STATE[w.state]||'未知')+' · '+w.workflow),link(w.url,'GitHub Actions ↗'));
   inner.append(line);
  }
 }else inner.append(make('p','没有找到同 SHA、同分支和正确事件类型的工作流；没有证据时显示未知。'));
 expand.append(inner);card.append(expand);
 return card;
}
function render(){
 $('traceTotal').textContent=String(model.cards.length);
 $('traceOpen').textContent=String(model.open);
 $('traceMerged').textContent=String(model.merged);
 $('traceBlocked').textContent=String(model.failed);
 $('traceLinked').textContent=String(model.explicitLinks);
 $('traceDeployed').textContent=String(model.deployed||0);
 const filtered=filterTrace(model.cards,{query,phase,repo});
 const list=$('traceGrid');list.replaceChildren();
 $('traceMatches').textContent=filtered.length+' 条匹配的公开 PR 链路（样本）';
 for(const p of filtered.slice(0,limit))list.append(drawCard(p));
 if(!filtered.length)list.append(make('p',model.cards.length?'未找到符合条件的链路，请切换筛选。':'当前快照没有开放或近期合并的 PR 链路记录。','trace-empty'));
 $('traceMore').hidden=filtered.length<=limit;
 $('traceMore').textContent='继续显示 '+Math.min(16,filtered.length-limit)+' 条';
 const unlinked=model.issues.filter(x=>!x.relatedPRs.length);
 const holder=$('traceIssues');holder.replaceChildren();
 for(const x of unlinked.slice(0,12)){
  const row=make('div',null,'trace-issue-row'),copy=make('div');
  copy.append(make('span',x.repo+' · #'+x.number),link(x.url,x.title||'未命名 Issue'));
  row.append(copy,make('small','在当前 PR 样本中未发现明确关闭引用'));holder.append(row);
 }
 if(!unlinked.length)holder.append(make('p','当前样本没有可列出的独立开放事项。','trace-empty'));
 $('traceIssueCount').textContent=unlinked.length+' 条（限当前快照）';
 $('traceFreshness').textContent=latestStamp?'快照采集：'+new Date(latestStamp).toLocaleString('zh-CN')+' · 非实时关联；仅公开样本':'等待 GitHub Actions 公开快照。';
}
function rebuildRepoOptions(){
 const select=$('traceRepo'),prior=select.value;
 select.replaceChildren(new Option('全部仓库','all'));
 const names=[...new Set(model.cards.map(x=>x.repo))].sort();
 for(const n of names)select.add(new Option(n,n));
 if(names.includes(prior))select.value=prior;else{select.value='all';repo='all'}
}
function downloadReport(){
 const report=traceReport(model),blob=new Blob([report],{type:'text/markdown;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=make('a');
 a.href=url;a.download='ATLAS-研发链路-'+new Date().toISOString().slice(0,10)+'.md';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),25000);
 flash('已导出链路证据与缺失项，不包含账号凭据');
}
export function initTrace(){
 $('traceQuery').addEventListener('input',e=>{query=e.target.value;limit=16;render()});
 $('tracePhase').addEventListener('change',e=>{phase=e.target.value;limit=16;render()});
 $('traceRepo').addEventListener('change',e=>{repo=e.target.value;limit=16;render()});
 $('traceMore').onclick=()=>{limit+=16;render()};
 $('traceExport').onclick=downloadReport;
 render();
 return function updateTrace(projects,snapshot){model=traceOverview(projects);latestStamp=snapshot?.generatedAt||null;rebuildRepoOptions();render()};
}
