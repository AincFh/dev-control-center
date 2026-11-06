/** ATLAS / All-project execution board. Explicitly browser-local;
 * GitHub statuses are read-only and opening an Issue is a user action.
 */
import {
 WORK_STAGES,WORK_CATEGORIES,WORK_PRIORITIES,MAX_WORK_ITEMS,normalizeWorkboard,
 upsertWorkItem,deleteWorkItem,workBlockers,workMetrics,filterWorkItems,
 issueDraft,createWorkBackup,restoreWorkBackup,workSuggestions
} from './workboard-core.js';

const STORE='atlas-workboard-v1';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{
 const node=document.createElement(tag);
 if(text!==null&&text!==undefined)node.textContent=String(text);
 if(cls)node.className=cls;
 return node;
};
const button=(label,fn,cls='')=>{
 const b=el('button',label,cls);b.type='button';b.addEventListener('click',fn);return b;
};
const labelFor=(options,value)=>options.find(x=>x.id===value)?.label||value;
let items=[],projects=[],query='',activeRepo='all',activeCategory='all',activeStage='all',activePriority='all',editing=null;
let feedbackTimer;
function announce(message){
 const node=$('workFeedback');node.textContent=message;node.hidden=false;
 clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>node.hidden=true,4600);
}
function persist(){
 try{localStorage.setItem(STORE,JSON.stringify(items));return true}
 catch{announce('本地浏览器保存失败：请检查存储空间，然后尝试导出数据');return false}
}
function makeId(){
 const cryptoObj=window.crypto;
 if(cryptoObj?.randomUUID)return 'w_'+cryptoObj.randomUUID().replaceAll('-','');
 return 'w_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12);
}
function download(name,raw,mime){
 const url=URL.createObjectURL(new Blob([raw],{type:mime}));
 const a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),25000);
}
function selectOptions(select,options,chosen){
 select.replaceChildren();
 for(const [value,name]of options){
  const opt=el('option',name);opt.value=value;select.append(opt);
 }
 select.value=chosen;
}
function repoNames(){
 return [...new Set([...projects.map(p=>p.name),...items.map(x=>x.repo)])]
  .sort((a,b)=>a.localeCompare(b,'en'));
}
function refreshFilters(){
 const choices=[['all','全部仓库'],...repoNames().map(name=>[name,name])];
 selectOptions($('workRepoFilter'),choices,activeRepo);
 if($('workRepoFilter').value!==activeRepo)activeRepo='all';
 selectOptions($('workCategoryFilter'),
  [['all','全部类型'],...WORK_CATEGORIES.map(x=>[x.id,x.label])],activeCategory);
 selectOptions($('workStageFilter'),
  [['all','全部阶段'],...WORK_STAGES.map(x=>[x.id,x.label])],activeStage);
 selectOptions($('workPriorityFilter'),
  [['all','所有优先级'],...WORK_PRIORITIES.map(x=>[x,x])],activePriority);
}
function commit(next,success){
 if(next===items)return;
 items=next;persist();render();
 if(success)announce(success);
}
function statusMini(item){
 const unresolved=workBlockers(items,item);
 const meta=el('div',null,'work-card-meta');
 meta.append(el('span',item.priority,'work-priority '+item.priority.toLowerCase()),
  el('span',labelFor(WORK_CATEGORIES,item.category)));
 if(item.dueDate)meta.append(el('span','期限 '+item.dueDate,'work-date'));
 if(unresolved.length)meta.append(el('span','受依赖阻塞 '+unresolved.length,'work-dep-blocked'));
 return meta;
}
function card(item){
 const box=el('article',null,'work-card');
 box.dataset.workId=item.id;
 box.dataset.stage=item.stage;
 box.append(statusMini(item),el('h3',item.title));
 const summary=el('p',item.description||'尚未补充实施范围与验收条件。','work-card-description');
 box.append(summary);
 const repo=el('div',null,'work-card-repo');
 repo.append(el('strong',item.repo),el('span',item.owner||'未分配负责人'));
 box.append(repo);
 if(item.dependsOn.length){
  const list=el('div',null,'work-dependencies');
  list.append(el('small','前置任务'));
  for(const dependency of item.dependsOn){
   const parent=items.find(x=>x.id===dependency);
   if(parent){
    const jump=button((parent.stage==='done'?'✓ ':'◷ ')+parent.title,()=>edit(parent.id),'work-dep-link');
    list.append(jump);
   }
  }
  box.append(list);
 }
 const actions=el('div',null,'work-card-actions');
 actions.append(button('编辑',()=>edit(item.id),'work-button'));
 const stages=WORK_STAGES.filter(x=>x.id!==item.stage);
 const select=el('select');
 select.setAttribute('aria-label','切换 '+item.title+' 的阶段');
 selectOptions(select,[[item.stage,labelFor(WORK_STAGES,item.stage)],...stages.map(x=>[x.id,x.label])],item.stage);
 select.addEventListener('change',()=>{
  const result=upsertWorkItem(items,{...item,stage:select.value});
  if(result.reason){
   select.value=item.stage;announce(result.reason==='blocked'?'前置任务尚未完成，不能进入开发、验收或完成':'阶段变更未通过校验：'+result.reason);
  }else commit(result.items,item.title+' → '+labelFor(WORK_STAGES,select.value));
 });
 actions.append(select);
 const gh=el('a','Issue 草稿 ↗','work-button work-link');
 gh.href=issueDraft(item);gh.target='_blank';gh.rel='noopener noreferrer';
 gh.title='打开 GitHub 新建 Issue 页面，需要人工提交';
 actions.append(gh);box.append(actions);
 return box;
}
function render(){
 const metrics=workMetrics(items);
 $('workTotal').textContent=String(metrics.total);
 $('workActive').textContent=String(metrics.active);
 $('workBlocked').textContent=String(metrics.blocked);
 $('workDone').textContent=String(metrics.done);
 $('workOverdue').textContent=String(metrics.overdue);
 const nav=$('workNavCount');nav.textContent=String(items.filter(x=>x.stage!=='done').length);
 nav.hidden=items.length===0;
 refreshFilters();
 const visible=filterWorkItems(items,{query,repo:activeRepo,category:activeCategory,
  stage:activeStage,priority:activePriority});
 $('workVisible').textContent=visible.length+' 个工作包 · '+items.length+' 个本地记录';
 const board=$('workBoard');board.replaceChildren();
 for(const stage of WORK_STAGES){
  if(activeStage!=='all'&&activeStage!==stage.id)continue;
  const lane=el('section',null,'work-lane');
  lane.dataset.stage=stage.id;
  const head=el('header',null,'work-lane-head');
  head.append(el('h2',stage.label),el('strong',visible.filter(x=>x.stage===stage.id).length));
  lane.append(head);
  const body=el('div',null,'work-lane-stack');
  const matching=visible.filter(x=>x.stage===stage.id);
  for(const item of matching)body.append(card(item));
  if(!matching.length)body.append(el('p','该阶段没有匹配的工作包。','work-lane-empty'));
  lane.append(body);board.append(lane);
 }
 renderSuggestions();
}
function renderSuggestions(){
 const candidates=workSuggestions(projects)
  .filter(x=>!items.some(item=>item.repo===x.repo&&item.title===x.title));
 const holder=$('workSuggestions');holder.replaceChildren();
 $('workSuggestionCount').textContent=candidates.length+' 条公开状态建议';
 if(!candidates.length){
  holder.append(el('p','当前快照没有新的已识别建议。没有信号不等于项目已经完成。','work-lane-empty'));
  return;
 }
 for(const data of candidates.slice(0,20)){
  const row=el('div',null,'work-suggestion');
  const info=el('div');info.append(el('strong',data.title),el('small',data.repo+' · '+data.priority));
  const add=button('加入计划',()=>{
   const record={...data,id:makeId(),stage:'backlog',dependsOn:[],owner:''};
   const result=upsertWorkItem(items,record);
   if(result.reason){announce('无法添加建议：'+result.reason);return}
   commit(result.items,'已加入工作包：'+data.repo+' / '+data.title);
  },'work-button work-suggestion-add');
  row.append(info,add);holder.append(row);
 }
}
function closeDialog(){if($('workEditor').open)$('workEditor').close();editing=null}
function edit(id=null){
 editing=id;
 const item=items.find(x=>x.id===id)||null;
 $('workEditorHeading').textContent=item?'编辑工作包':'创建工作包';
 const names=repoNames();
 selectOptions($('workEditRepo'),names.map(x=>[x,x]),item?.repo||activeRepo!=='all'&&names.includes(activeRepo)?item?.repo||activeRepo:names[0]||'dev-control-center');
 if(!names.length){
  const o=el('option','dev-control-center');o.value='dev-control-center';$('workEditRepo').append(o);
 }
 $('workEditTitle').value=item?.title||'';
 $('workEditDescription').value=item?.description||'';
 $('workEditOwner').value=item?.owner||'';
 selectOptions($('workEditCategory'),WORK_CATEGORIES.map(x=>[x.id,x.label]),item?.category||'web');
 selectOptions($('workEditPriority'),WORK_PRIORITIES.map(x=>[x,x]),item?.priority||'P2');
 selectOptions($('workEditStage'),WORK_STAGES.map(x=>[x.id,x.label]),item?.stage||'backlog');
 $('workEditDate').value=item?.dueDate||'';
 const list=$('workEditDependencies');list.replaceChildren();
 for(const candidate of items){
  if(candidate.id===id)continue;
  const label=el('label',null,'work-dependency-check');
  const check=el('input');check.type='checkbox';check.value=candidate.id;
  check.checked=!!item?.dependsOn.includes(candidate.id);
  label.append(check,el('span',candidate.title+' · '+candidate.repo));list.append(label);
 }
 if(!items.some(x=>x.id!==id))list.append(el('p','暂无其他工作包。创建后可再设置前置依赖。'));
 $('workDelete').hidden=!item;
 $('workEditor').showModal();
 $('workEditTitle').focus();
}
function saveEdit(event){
 event.preventDefault();
 const input={
  id:editing||makeId(),repo:$('workEditRepo').value,
  title:$('workEditTitle').value,description:$('workEditDescription').value,
  owner:$('workEditOwner').value,category:$('workEditCategory').value,
  priority:$('workEditPriority').value,stage:$('workEditStage').value,
  dueDate:$('workEditDate').value||null,
  dependsOn:[...$('workEditDependencies').querySelectorAll('input:checked')].map(x=>x.value)
 };
 const result=upsertWorkItem(items,input);
 if(result.reason){
  announce({blocked:'依赖未完成，无法标记开发中、待验收或已完成',dependency:'依赖构成循环，无法保存',
   duplicate:'工作包 ID 重复',invalid:'标题、仓库或字段不合法',limit:'工作包已达到容量限制'}[result.reason]||result.reason);
  return;
 }
 const label=editing?'已修改工作包':'已创建工作包';
 closeDialog();commit(result.items,label+'：'+input.title);
}
function remove(){
 if(!editing)return;
 if($('workDelete').dataset.armed!=='yes'){
  $('workDelete').dataset.armed='yes';
  $('workDelete').textContent='确认移除（并解除依赖）';return;
 }
 const toDelete=editing;
 closeDialog();commit(deleteWorkItem(items,toDelete),'已移除工作包，后续任务的相关依赖也已解除');
}
function exportBoard(){
 const payload=JSON.stringify(createWorkBackup(items),null,2);
 download('atlas-cross-project-workboard-'+new Date().toISOString().slice(0,10)+'.json',
  payload,'application/json;charset=utf-8');
 announce('工作包备份已导出：'+items.length+' 条，不包含 GitHub 凭据');
}
async function importBoard(file){
 if(!file)return;
 try{
  if(file.size>3000000)throw Error('备份文件不能超过 3 MB');
  const parsed=JSON.parse(await file.text());
  const next=restoreWorkBackup(parsed,items),added=next.length-items.length;
  if(added)commit(next,'已恢复备份并新增 '+added+' 个工作包；同 ID 已存在记录保持不变');
  else announce('备份有效，没有需要导入的新工作包');
 }catch(error){announce('导入失败，未修改现有记录：'+error.message)}
 finally{$('workImport').value=''}
}
export function initWorkboard(){
 try{items=normalizeWorkboard(JSON.parse(localStorage.getItem(STORE)||'[]'))}
 catch{items=[]}
 $('workCreate').onclick=()=>edit();
 $('workExport').onclick=exportBoard;
 $('workImport').addEventListener('change',ev=>importBoard(ev.target.files?.[0]));
 $('workSearch').addEventListener('input',ev=>{query=ev.target.value;render()});
 for(const [id,key]of [['workRepoFilter','activeRepo'],['workCategoryFilter','activeCategory'],
  ['workStageFilter','activeStage'],['workPriorityFilter','activePriority']]){
  $(id).addEventListener('change',ev=>{
   if(key==='activeRepo')activeRepo=ev.target.value;
   if(key==='activeCategory')activeCategory=ev.target.value;
   if(key==='activeStage')activeStage=ev.target.value;
   if(key==='activePriority')activePriority=ev.target.value;
   render();
  });
 }
 $('workEditForm').addEventListener('submit',saveEdit);
 $('workEditorClose').onclick=closeDialog;
 $('workEditor').addEventListener('close',()=>{editing=null});
 $('workDelete').onclick=remove;
 $('workEditor').addEventListener('click',event=>{if(event.target===$('workEditor'))closeDialog()});
 $('workCreate').disabled=false;
 render();
 return function updateWorkboard(p){projects=Array.isArray(p)?p:[];render()};
}
