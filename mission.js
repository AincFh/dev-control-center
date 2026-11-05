import{MISSION_FILTERS,RELEASE_CHECKS,prepareReleaseEvidence,releaseChecklist,releaseProgress,missionSnapshot,filterMission,reportMarkdown}from'./mission-core.js';
import{repoHealthLabel,isoAge}from'./status.js';
const $=id=>document.getElementById(id);
const STORE_PINS='atlas-mission-pins-v1',STORE_EVIDENCE='atlas-mission-evidence-v1';
const NAME=/^[A-Za-z0-9_.-]+$/;
const n=(tag,content,cls)=>{const e=document.createElement(tag);if(content!==null&&content!==undefined)e.textContent=String(content);if(cls)e.className=cls;return e;};
const gh=(name,suffix='')=>'https://github.com/AincFh/'+encodeURIComponent(name)+suffix;
function safeRead(key,fallback){
 try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}
}
let model=missionSnapshot([],{}),pinned=new Set(),evidence={},filter='all',sort='urgency',query='',pinnedOnly=false,limit=18,editing=null;
function announce(message){
 const el=$('missionFeedback');el.textContent=message;el.classList.add('is-visible');
 clearTimeout(announce.timer);announce.timer=setTimeout(()=>el.classList.remove('is-visible'),3500);
}
function persist(key,data){
 try{localStorage.setItem(key,JSON.stringify(data));return true}
 catch{announce('浏览器存储失败。请检查空间或浏览器隐私设置，并导出报告。');return false}
}
function external(url,label,cls=''){
 const a=n('a',label,cls);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function tone(state){return ['success','failure','running','neutral','unknown'].includes(state)?state:'unknown'}
function size(num){return num==null?'未知':String(num)}
function snapshotNotice(){
 const state=model.snapshotState,warning=model.errors?' · '+model.errors+' 个采集异常':'';
 const stamp=model.generatedAt?new Date(model.generatedAt).toLocaleString('zh-CN'):'未知';
 $('missionFreshness').textContent=state==='fresh'?'最近快照：'+stamp+warning:state==='stale'?'数据可能过期：'+stamp+warning:'暂无有效状态快照，CI 结论不能视为最新'+warning;
 $('missionFreshness').dataset.state=state;
 $('missionCount').textContent=String(model.assessments.length);
 $('missionFail').textContent=String(model.states.failure);
 $('missionReview').textContent=String(model.openPRs)+(model.countsTruncated?'+':'');
 $('missionIssues').textContent=String(model.openIssues)+(model.countsTruncated?'+':'');
 $('missionUnknown').textContent=String(model.states.unknown+model.states.neutral);
 $('missionProbeGood').textContent=String(model.probes?.reachable??0);
 $('missionProbeBad').textContent=String(model.probes?.broken??0);
 const nav=$('missionNavCount');if(nav){const c=model.states.failure;nav.textContent=String(c);nav.hidden=!c}
 const health=$('missionStateBreakdown');health.replaceChildren();
 const kinds=[
  ['success','通过',model.states.success],['failure','失败',model.states.failure],
  ['running','进行中',model.states.running],['neutral','已取消/跳过',model.states.neutral],
  ['unknown','未知',model.states.unknown]
 ];
 for(const [id,label,count]of kinds){
  const block=n('div',null,'mission-bar-row'),title=n('div',null,'mission-bar-title'),track=n('div',null,'mission-track'),fill=n('span',null,'mission-bar '+id);
  title.append(n('span',label),n('strong',String(count)));
  fill.style.width=(model.assessments.length?count/model.assessments.length*100:0)+'%';
  track.setAttribute('role','progressbar');track.setAttribute('aria-label',label+'项目比例');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(model.assessments.length));track.setAttribute('aria-valuenow',String(count));
  track.append(fill);block.append(title,track);health.append(block);
 }
 const summary=$('missionDataNote');summary.textContent='来自 GitHub Actions 的公开快照；Issue/PR 显示最多 5 条最新样本/仓库，数据不是实时订阅。' +(model.countsTruncated?' 有任务计数达到接口上限，已标记为下限。':'');
}
function filteredList(){return filterMission(model.assessments,{query,filter,sort,pinnedOnly,pinned})}
function card(a){
 const p=a.project,container=n('article',null,'mission-project'),head=n('div',null,'mission-card-head');
 container.dataset.repo=a.name;container.dataset.state=a.state;
 const left=n('div',null,'mission-card-identity');left.append(n('small',p.category==='game'?'GAME / PRODUCT':'PUBLIC / REPOSITORY'),n('h3',p.label||a.name),n('span',a.name,'mission-slug'));
 const mark=n('span',repoHealthLabel(a.state),'mission-ci '+tone(a.state));head.append(left,mark);
 const pin=n('button',pinned.has(a.name.toLowerCase())?'★':'☆','mission-pin');
 pin.type='button';pin.title='本地优先关注';pin.setAttribute('aria-label',(pinned.has(a.name.toLowerCase())?'取消关注 ':'关注 ')+a.name);
 pin.setAttribute('aria-pressed',String(pinned.has(a.name.toLowerCase())));
 pin.onclick=()=>{
  const id=a.name.toLowerCase();if(pinned.has(id))pinned.delete(id);else pinned.add(id);
  persist(STORE_PINS,[...pinned]);render();announce(pinned.has(id)?'已优先关注 '+a.name:'已取消关注 '+a.name);
 };
 const indicators=n('div',null,'mission-card-indicators');
 indicators.append(n('span','Issue '+size(a.issues)+(p.countsTruncated?'+':'')),n('span','PR '+size(a.prs)+(p.countsTruncated?'+':'')));
 if(p.isFork)indicators.append(n('span','Fork · 上游项目','mission-fork'));
 if(p.probe?.state==='reachable')indicators.append(n('span','HTTP 可达 · 资源检查通过','mission-probe-ok'));
 else if(p.probe&&['http_error','resource_error','network_error','content_error'].includes(p.probe.state))
  indicators.append(n('span','在线资源异常 · '+p.probe.state,'mission-probe-error'));
 const summary=n('p',p.description||'暂无仓库说明。','mission-card-description');
 const signals=n('div',null,'mission-card-signals');
 if(a.signals.length)for(const signal of a.signals.slice(0,2)){
  const t=n('span',signal.title,'mission-signal '+signal.level);t.title=signal.description;signals.append(t);
 }else signals.append(n('span','未发现需要立即处理的公开信号','mission-signal clear'));
 const foot=n('div',null,'mission-card-footer'),actions=n('div',null,'mission-card-links');
 actions.append(external(gh(a.name),'仓库 ↗'),external(gh(a.name,'/actions'),'CI ↗'));
 if(a.prs>0)actions.append(external(gh(a.name,'/pulls'),'待审 PR ↗'));
 if(a.issues>0)actions.append(external(gh(a.name,'/issues'),'Issue ↗'));
 if(p.preview)actions.append(external(p.preview,'Pages ↗'));
 const record=releaseChecklist(evidence[a.name]),gate=n('button','验收记录 '+releaseProgress(record)+'/6','mission-review-button');
 gate.type='button';gate.onclick=()=>openReview(a.name);
 foot.append(actions,gate);
 container.append(pin,head,indicators,summary,signals,foot);
 return container;
}
function renderProjects(){
 const list=filteredList(),subset=list.slice(0,limit),holder=$('missionProjects');
 $('missionMatches').textContent=list.length+' 个匹配的公开项目';
 $('missionRange').textContent=list.length?'展示 '+subset.length+' / '+list.length:'无匹配项目';
 holder.replaceChildren();
 if(!list.length)holder.append(n('div','没有匹配结果。请更改搜索条件或关闭优先关注筛选。','mission-empty'));
 else for(const a of subset)holder.append(card(a));
 $('missionMore').hidden=list.length<=limit;
 $('missionMore').textContent='再显示 '+Math.min(18,list.length-limit)+' 个项目';
 $('missionOnlyPinned').setAttribute('aria-pressed',String(pinnedOnly));
 $('missionOnlyPinned').classList.toggle('selected',pinnedOnly);
}
function renderTasks(){
 const tasks=model.taskPreview,holder=$('missionTaskFeed');holder.replaceChildren();
 $('missionTaskCount').textContent=tasks.length+' 条公开事项样本';
 if(!tasks.length){holder.append(n('p','当前快照没有可展示的开放任务样本。可能因无任务、API 限制或采集错误；不能据此推断没有工作待办。','mission-no-tasks'));return}
 for(const x of tasks.slice(0,22)){
  const item=n('article',null,'mission-task');
  const badge=n('span',x.kind==='pull'?'PR':'Issue','mission-task-kind '+x.kind);
  const info=n('div',null,'mission-task-info');info.append(n('span',x.repoLabel+' / #'+x.number),external(x.url,x.title,'mission-task-title'));
  const date=n('small',x.updatedAt?isoAge(x.updatedAt):'更新时间未知','mission-task-date');
  if(x.draft)date.textContent='草稿 PR · '+date.textContent;
  item.append(badge,info,date);holder.append(item);
 }
}
function renderProbes(){
 const holder=$('missionSiteChecks');holder.replaceChildren();
 const checks=model.assessments.filter(a=>a.project.probe).sort((a,b)=>{
  const broken=x=>['http_error','resource_error','network_error','content_error'].includes(x.project.probe.state)?1:0;
  return broken(b)-broken(a)||a.name.localeCompare(b.name,'en');
 });
 if(!checks.length){holder.append(n('p','尚无可访问性检测数据。只有确认 Pages 部署的仓库才会进行公开 HTTP 检查。','mission-no-tasks'));return}
 for(const a of checks.slice(0,16)){
  const p=a.project,r=p.probe,line=n('article',null,'mission-probe-line');
  const icon=n('span',r.state==='reachable'?'正常':'异常','mission-probe-state '+(r.state==='reachable'?'good':'bad'));
  const info=n('div',null,'mission-probe-copy');
  info.append(n('strong',p.label||p.name),n('small',(r.httpStatus?'HTTP '+r.httpStatus+' · ':'')+r.assetCount+' 个静态引用，'+r.assetFailures+' 个失败'));
  const target=p.site?.url?external(p.site.url,'打开 ↗','mission-probe-link'):external(gh(a.name),'仓库 ↗','mission-probe-link');
  line.append(icon,info,target);holder.append(line);
 }
}
function render(){snapshotNotice();renderProjects();renderTasks();renderProbes()}
function openReview(name){
 const a=model.assessments.find(x=>x.name===name);if(!a)return;
 editing=name;const r=releaseChecklist(evidence[name]);
 $('missionReviewTitle').textContent=a.project.label||name;
 $('missionReviewRepo').textContent=name+' · 此表仅保存在当前浏览器';
 $('missionReviewNote').value=r.note;
 for(const c of RELEASE_CHECKS)$('missionCheck_'+c.id).checked=r.checks[c.id];
 $('missionReviewDialog').showModal();
}
function closeReview(){$('missionReviewDialog').close();editing=null}
function saveReview(ev){
 ev.preventDefault();if(!editing)return;
 const updated=releaseChecklist({checks:Object.fromEntries(RELEASE_CHECKS.map(x=>[x.id,$('missionCheck_'+x.id).checked])),
  note:$('missionReviewNote').value,updatedAt:new Date().toISOString()});
 evidence[editing]=updated;const ok=persist(STORE_EVIDENCE,evidence);
 closeReview();render();if(ok)announce('已保存本地验收记录：'+editing);
}
function downloadReport(){
 const report=reportMarkdown(model,{evidence,generatedAt:new Date().toISOString()});
 const blob=new Blob([report],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='ATLAS-研发态势-'+new Date().toISOString().slice(0,10)+'.md';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
 announce('已导出公开状态与本地核验记录，不包含 GitHub 访问凭据');
}
export function initMission(){
 const rawPins=safeRead(STORE_PINS,[]);
 pinned=new Set(Array.isArray(rawPins)?rawPins.filter(x=>typeof x==='string'&&NAME.test(x)).slice(0,200).map(x=>x.toLowerCase()):[]);
 evidence=prepareReleaseEvidence(safeRead(STORE_EVIDENCE,{}));
 $('missionSearch').addEventListener('input',e=>{query=e.target.value;limit=18;renderProjects()});
 $('missionFilter').addEventListener('change',e=>{filter=e.target.value;limit=18;renderProjects()});
 $('missionSort').addEventListener('change',e=>{sort=e.target.value;renderProjects()});
 $('missionOnlyPinned').onclick=()=>{pinnedOnly=!pinnedOnly;limit=18;renderProjects()};
 $('missionMore').onclick=()=>{limit+=18;renderProjects()};
 $('missionReport').onclick=downloadReport;
 $('missionReviewClose').onclick=closeReview;
 $('missionReviewDialog').addEventListener('click',e=>{if(e.target===$('missionReviewDialog'))closeReview()});
 $('missionReviewDialog').addEventListener('close',()=>{editing=null});
 $('missionReviewForm').addEventListener('submit',saveReview);
 window.addEventListener('atlas:open-mission',()=>{location.hash='#mission'});
 render();
 return function updateMission(projects,snapshot){model=missionSnapshot(projects,snapshot);render()};
}
