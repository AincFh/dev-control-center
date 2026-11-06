/** Cross-domain engineering playbook UI. All actions are user-initiated.
 * No GitHub credentials, hidden writes, remote code execution or claimed completions.
 */
import{DOMAIN_GROUPS,domainCoverage,domainPlan,domainPlanMarkdown}from'./domain-guide-core.js';
const $=id=>document.getElementById(id),REPO=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const node=(tag,text,cls)=>{const element=document.createElement(tag);if(text!=null)element.textContent=String(text);if(cls)element.className=cls;return element};
let categories=[],currentPlan=null,initialized=false;
const sendFeedback=(value,bad=false)=>{const el=$('sectorLabFeedback');el.textContent=value;el.dataset.state=bad?'error':'info'};
function issueUrl(plan){
 const lines=[
  '## 目标',plan.goal,'',
  '## 产品与功能','',
  ...plan.features.map(x=>'- [ ] '+x),'',
  '## 验收','- [ ] '+plan.acceptance,
  '- [ ] 检查许可证、素材、模型及商标条款',
  '- [ ] 隔离环境真实运行、自动测试、人工交互和回滚验收','',
  '## 风险',plan.risk,'',
  '## 原始来源',plan.source||'尚未选定上游仓库','',
  '注意：本 Issue 是开发草稿；不代表已有实现、授权或部署成功。'
 ];
 const title='[ATLAS / '+plan.label+'] '+plan.goal;
 return 'https://github.com/AincFh/dev-control-center/issues/new?'+new URLSearchParams({title,body:lines.join('\n')});
}
function renderPlan(plan){
 const root=$('sectorLabResult');root.replaceChildren();
 const intro=node('div',null,'sector-lab-intro');
 intro.append(node('strong',plan.label+' · '+plan.goal),node('span',plan.groupLabel+(plan.source?' · '+plan.source:' · 尚未指定上游')));
 root.append(intro);
 const list=node('div',null,'sector-lab-phases');
 for(const phase of plan.phases){
  const article=node('article',null,'sector-lab-phase');
  article.append(node('h3',phase.title));
  const tasks=node('ul');for(const t of phase.tasks)tasks.append(node('li',t));
  article.append(tasks);list.append(article);
 }
 root.append(list);
 $('sectorLabCandidate').disabled=!plan.source;
 $('sectorLabWorkboard').disabled=!plan.source;
 $('sectorLabIssue').href=issueUrl(plan);
}
function generate(){
 const category=$('sectorLabCategory').value,raw=$('sectorLabRepo').value.trim();
 if(raw&&(!REPO.test(raw)||raw.length>240||raw.split('/').some(part=>part==='.'||part==='..'))){sendFeedback('仓库路径应为 owner/repo；请输入 GitHub 仓库路径或留空。',true);return;}
 if(!categories.some(c=>c.id===category)){sendFeedback('请选择已收录的技术领域。',true);return;}
 try{
  const label=categories.find(c=>c.id===category).name;
  currentPlan=domainPlan(category,{repo:raw||null,label});
  renderPlan(currentPlan);
  sendFeedback(raw?'针对 '+raw+' 生成了工程研究计划；尚未核实该仓库是否可合法复用。':'已生成独立研发蓝图，可在仓库卡片点击「制定蓝图」绑定真实来源。');
 }catch(err){sendFeedback('蓝图生成失败：'+err.message,true);}
}
function download(){
 if(!currentPlan){sendFeedback('请先生成蓝图。',true);return;}
 const raw=domainPlanMarkdown(currentPlan);
 const blob=new Blob([raw],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob);
 const a=node('a');a.href=url;a.download='ATLAS-Blueprint-'+currentPlan.category+'-'+new Date().toISOString().slice(0,10)+'.md';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 sendFeedback('已生成可保存的 Markdown 研发交接文档；真实源代码审查及功能开发仍需执行。');
}
export function setSectorLabSource(genre,name){
 if(!initialized||!categories.some(c=>c.id===genre))return false;
 $('sectorLabCategory').value=genre;$('sectorLabRepo').value=typeof name==='string'&&REPO.test(name)?name:'';
 generate();
 const anchor=$('universeSectorLab');anchor.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 return true;
}
export function initSectorLab(catalogCategories){
 if(initialized)return;
 categories=(Array.isArray(catalogCategories)?catalogCategories:[]).filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string');
 if(!categories.length)return;
 const select=$('sectorLabCategory');select.replaceChildren();
 const grouped=DOMAIN_GROUPS.map(group=>{
  const entries=categories.filter(c=>group.categories.includes(c.id));return{group,entries};
 });
 for(const {group,entries}of grouped){
  if(!entries.length)continue;
  const section=node('optgroup');section.label=group.label;
  for(const entry of entries){const option=node('option',entry.name);option.value=entry.id;section.append(option)}
  select.append(section);
 }
 const coverage=domainCoverage(categories);
 $('sectorLabCoverage').textContent=coverage.covered+' / '+coverage.total+' 类领域具备专属工程蓝图';
 if(coverage.missing.length||coverage.untracked.length)sendFeedback('部分领域蓝图未匹配。请核对类别与蓝图配置。',true);
 initialized=true;
 $('sectorLabGenerate').onclick=generate;
 $('sectorLabExport').onclick=download;
 $('sectorLabCategory').onchange=generate;
 $('sectorLabWorkboard').onclick=()=>{
  if(!currentPlan?.source)return;
  const detail={category:currentPlan.category,repository:currentPlan.source.slice('https://github.com/'.length),label:currentPlan.label,result:null};
  window.dispatchEvent(new CustomEvent('atlas:import-domain-plan',{detail}));
  if(detail.result?.reason)sendFeedback('导入执行工作台失败：'+detail.result.reason,true);
  else if(detail.result)sendFeedback('已新增 '+detail.result.added+' 个本地执行工作包；已有任务不覆盖。');
  else sendFeedback('执行工作台尚未提供导入处理器。',true);
 };
 $('sectorLabCandidate').onclick=()=>{
  if(!currentPlan?.source)return;
  const name=currentPlan.source.slice('https://github.com/'.length);
  window.dispatchEvent(new CustomEvent('atlas:add-candidate',{detail:{name,genre:currentPlan.label}}));
  sendFeedback('已发送至浏览器本地研发候选池：'+name+'。未向 GitHub 写入 Issue。');
 };
 generate();
}
