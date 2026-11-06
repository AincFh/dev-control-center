import {RELEASE_STATES,RELEASE_DOMAINS,reviewPortfolio,filterReviews,releaseReviewMarkdown} from './release-review-core.js';
const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=String(text);if(cls)e.className=cls;return e;};
const stageLabel={attention:'发现明确风险',human:'进入人工验收',evidence:'证据仍待补齐'};
const stepLabel={pass:'已观测',fail:'异常',running:'进行中',unknown:'未知'};
const categoryLabel={game:'游戏',web:'Web 应用',platform:'研发平台',system:'系统',mobile:'移动应用',tool:'工具'};
const view={projects:[],snapshot:{},portfolio:null,filter:'all',domain:'all',query:''};
function fillSelect(id,items){
 const select=$(id);select.replaceChildren();
 for(const item of items){const opt=node('option',item.label);opt.value=item.id;select.append(opt);}
}
function metrics(){
 const box=$('releaseOverview');box.replaceChildren();
 const totals=view.portfolio.totals;
 for(const [label,count,status,description] of [
  ['公开仓库',totals.all,'all','全部类别分别审查'],
  ['明确风险',totals.attention,'attention','最近证据失败或已知发布限制'],
  ['可进入人工验收',totals.human,'human','仅自动观测齐全；不是已发布'],
  ['证据待补',totals.evidence,'evidence','未查到证据不等于存在故障']]){
  const card=node('div',null,'release-metric '+status);
  card.append(node('small',label),node('strong',count),node('span',description));box.append(card);
 }
}
function renderCards(){
 const box=$('releaseGrid'),items=filterReviews(view.portfolio.records,{query:view.query,domain:view.domain,state:view.filter});
 $('releaseCount').textContent='显示 '+items.length+' / '+view.portfolio.records.length+' 个仓库 · 按风险与证据缺口排序';
 box.replaceChildren();
 if(!items.length){box.append(node('div','当前筛选下没有匹配仓库，尝试调整领域或审查阶段。','release-empty'));return;}
 for(const record of items){
  const card=node('article',null,'release-card release-state-'+record.state);
  card.dataset.repo=record.name;card.dataset.state=record.state;
  const head=node('div',null,'release-card-head'),identity=node('div',null,'release-card-id');
  identity.append(node('span',categoryLabel[record.category]||'其他产品','release-domain'),node('h3',record.label),node('small',record.name));
  const tag=node('span',stageLabel[record.state],'release-stage');
  head.append(identity,tag);card.append(head);
  const lanes=node('div',null,'release-lanes');
  for(const step of record.steps){
   const column=node('div',null,'release-lane release-lane-'+step.status);
   column.title=step.detail;
   column.append(node('div',null,'release-lane-line'),node('span',step.label),node('strong',stepLabel[step.status]));
   lanes.append(column);
  }
  card.append(lanes);
  const why=node('details',null,'release-details');
  const intro=node('summary','查看判定与证据边界');
  const desc=node('ul',null,'release-detail-list');
  for(const step of record.steps)desc.append(node('li',step.label+'｜'+step.detail));
  if(record.isFork)desc.append(node('li','此项目属于 Fork；代码和素材许可仍须按上游独立核验。'));
  if(!record.fresh)desc.append(node('li','主状态快照缺失或过期；不会将旧 CI / Pages 视为当前通过。'));
  why.append(intro,desc);card.append(why);
  const actions=node('div',null,'release-actions');
  const next=node('p',record.next,'release-next');actions.append(next);
  const controls=node('div',null,'release-card-controls');
  if(record.sourceUrl){
   const a=node('a','查看仓库');a.href=record.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';controls.append(a);
  }
  const btn=node('button','加入执行计划');btn.type='button';btn.setAttribute('aria-label','为 '+record.label+' 创建工作包');
  btn.addEventListener('click',()=>{window.dispatchEvent(new CustomEvent('atlas:create-work',{detail:{repo:record.name,category:record.category}}));});
  controls.append(btn);actions.append(controls);card.append(actions);box.append(card);
 }
}
function render(){
 if(!view.portfolio)return;
 metrics();renderCards();
 const fresh=$('releaseFreshness');
 fresh.textContent=view.portfolio.fresh
  ?'最新状态快照：'+new Date(view.portfolio.generatedAt).toLocaleString('zh-CN')+'。自动检查与人工验收分离。'
  :'状态快照不可用或超过 30 小时：旧 CI / Pages 记录均降级为待核验；游戏 QA 仍按自身独立时效判断。';
 fresh.dataset.state=view.portfolio.fresh?'fresh':'stale';
}
function exportReport(){
 if(!view.portfolio)return;
 const selected=filterReviews(view.portfolio.records,{query:view.query,domain:view.domain,state:view.filter});
 const content=releaseReviewMarkdown(view.portfolio,selected),blob=new Blob([content],{type:'text/markdown;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='ATLAS-Release-Evidence-'+new Date().toISOString().slice(0,10)+'.md';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
}
export function initReleaseReview(){
 fillSelect('releaseDomain',RELEASE_DOMAINS);fillSelect('releaseState',RELEASE_STATES);
 $('releaseSearch').addEventListener('input',e=>{view.query=e.target.value;renderCards();});
 $('releaseDomain').addEventListener('change',e=>{view.domain=e.target.value;renderCards();});
 $('releaseState').addEventListener('change',e=>{view.filter=e.target.value;renderCards();});
 $('releaseReport').addEventListener('click',exportReport);
 return(projects,snapshot)=>{
  view.projects=projects;view.snapshot=snapshot;view.portfolio=reviewPortfolio(projects,snapshot);render();
 };
}