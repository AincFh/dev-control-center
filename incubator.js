import{STAGES,CHECKS,MAX_CANDIDATES,loadCandidates,addCandidate,patchCandidate,removeCandidate,tallyCandidates,searchCandidates,createBackup,restoreBackup,issueDraft}from'./incubator-core.js';
const STORE='atlas-candidate-incubator-v1',$=id=>document.getElementById(id);
let items=[],query='',stageFilter='all',editing=null;
const visible=Object.fromEntries(STAGES.map(x=>[x.id,12]));
const make=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined&&text!==null)el.textContent=String(text);if(cls)el.className=cls;return el;};
function feedback(message){
 const el=$('candidateFeedback');el.textContent=message;el.classList.add('is-visible');
 clearTimeout(feedback.timeout);feedback.timeout=setTimeout(()=>el.classList.remove('is-visible'),3600);
}
function save(){
 try{localStorage.setItem(STORE,JSON.stringify(items));return true}
 catch{feedback('当前浏览器无法保存本地数据。请检查存储权限，或导出备份。');return false}
}
function progress(item){return CHECKS.filter(c=>item.checks[c.id]).length}
function shift(item,direction){
 const order=STAGES.filter(x=>x.id!=='hold').map(x=>x.id),idx=order.indexOf(item.stage);
 if(idx<0)return;
 const stage=order[idx+direction];if(!stage)return;
 items=patchCandidate(items,item.name,{stage});save();render();
 feedback(item.name+' → '+STAGES.find(x=>x.id===stage).label);
}
function add(name,genre){
 const next=addCandidate(items,name,genre);
 if(next===items){feedback(items.some(x=>x.name.toLowerCase()===String(name).toLowerCase())?'该项目已在候选池：'+name:'候选池已达到 '+MAX_CANDIDATES+' 条上限');return}
 items=next;save();render();feedback('已进入项目候选池：'+name);
}
function card(item){
 const el=make('article',null,'candidate-card');
 el.dataset.repo=item.name;
 const header=make('div',null,'candidate-card-head'),category=make('span',item.genre,'candidate-genre'),score=make('span',progress(item)+' / '+CHECKS.length,'candidate-score');
 header.append(category,score);
 const name=make('h3',item.name,'candidate-name');name.title=item.name;
 const snippet=make('p',item.note||'尚未填写研究说明。请先核查开源许可、素材权利和实际运行效果。','candidate-snippet');
 const actions=make('div',null,'candidate-actions');
 const edit=make('button','打开评估','candidate-button primary');edit.type='button';edit.addEventListener('click',()=>openEditor(item.name));
 const gh=make('a','源码 ↗','candidate-button');gh.href='https://github.com/'+item.name;gh.target='_blank';gh.rel='noopener noreferrer';
 actions.append(edit,gh);
 const bottom=make('div',null,'candidate-actions candidate-movement');
 if(item.stage==='hold'){
  const resume=make('button','恢复研究 →','candidate-button');resume.type='button';
  resume.onclick=()=>{items=patchCandidate(items,item.name,{stage:'inbox'});save();render()};
  bottom.append(resume);
 }else{
  const order=STAGES.filter(x=>x.id!=='hold');
  if(item.stage!=='inbox'){const back=make('button','← 上一阶段','candidate-button subtle');back.type='button';back.onclick=()=>shift(item,-1);bottom.append(back)}
  if(item.stage!=='ready'){const next=make('button','推进 →','candidate-button');next.type='button';next.onclick=()=>shift(item,1);bottom.append(next)}
  const hold=make('button','暂缓','candidate-button subtle');hold.type='button';
  hold.onclick=()=>{items=patchCandidate(items,item.name,{stage:'hold'});save();render();feedback('已暂缓 '+item.name)};
  bottom.append(hold);
 }
 el.append(header,name,snippet,actions,bottom);
 return el;
}
function render(){
 const stats=tallyCandidates(items);
 $('candidateTotal').textContent=String(stats.total);
 $('candidateChecked').textContent=String(stats.checked);
 $('candidateCount').textContent=String(stats.total);
 $('candidateCount').hidden=stats.total===0;
 const matching=searchCandidates(items,query,stageFilter);
 $('candidateMatched').textContent=matching.length+' 个候选项目 · 仅浏览器本地数据';
 const board=$('candidateBoard');board.replaceChildren();
 for(const lane of STAGES){
  if(stageFilter!=='all'&&stageFilter!==lane.id)continue;
  const subset=matching.filter(x=>x.stage===lane.id);
  const col=make('section',null,'candidate-lane'),head=make('header',null,'candidate-lane-head');
  head.append(make('h3',lane.label),make('b',String(subset.length)));
  col.append(head,make('p',lane.hint,'candidate-lane-hint'));
  const stack=make('div',null,'candidate-stack');
  for(const item of subset.slice(0,visible[lane.id]))stack.append(card(item));
  if(!subset.length)stack.append(make('p','尚无项目，前往星图挑选值得研究的源码。','candidate-lane-empty'));
  col.append(stack);
  if(subset.length>visible[lane.id]){
   const more=make('button','继续显示 '+Math.min(12,subset.length-visible[lane.id])+' 个','candidate-load-more');
   more.onclick=()=>{visible[lane.id]+=12;render()};col.append(more);
  }
  board.append(col);
 }
}
function openEditor(name){
 const c=items.find(x=>x.name.toLowerCase()===name.toLowerCase());if(!c)return;
 editing=c.name;$('candidateDelete').dataset.armed='false';$('candidateDelete').textContent='移出候选池';
 $('candidateEditorTitle').textContent=c.name;$('candidateEditorGenre').textContent=c.genre;
 $('candidateEditStage').value=c.stage;$('candidateEditNote').value=c.note;
 for(const g of CHECKS)$('candidateCheck_'+g.id).checked=c.checks[g.id];
 const draft=issueDraft(c);$('candidateIssue').href=draft.url;
 $('candidateEditor').showModal();
}
function closeEditor(){$('candidateEditor').close();editing=null}
function exportBackup(){
 const data=JSON.stringify(createBackup(items),null,2),blob=new Blob([data],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob);
 const a=make('a');a.href=url;a.download='atlas-candidate-backup-'+new Date().toISOString().slice(0,10)+'.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 feedback('已导出 '+items.length+' 条候选项目及研究记录');
}
async function importBackup(file){
 if(!file)return;
 try{
  if(file.size>3000000)throw Error('备份文件大于 3 MB');
  const data=JSON.parse(await file.text()),next=restoreBackup(data,items);
  const count=next.length-items.length;
  items=next;save();render();feedback('备份已恢复；现有 '+items.length+' 条记录（净增 '+count+' 条）');
 }catch(e){feedback('导入失败：'+e.message)}
 finally{$('candidateImport').value=''}
}
export function initIncubator(){
 try{items=loadCandidates(JSON.parse(localStorage.getItem(STORE)||'[]'))}catch{items=[]}
 $('candidateSearch').addEventListener('input',e=>{query=e.target.value;for(const s of STAGES)visible[s.id]=12;render()});
 $('candidateStage').addEventListener('change',e=>{stageFilter=e.target.value;render()});
 $('candidateExport').onclick=exportBackup;
 $('candidateImport').addEventListener('change',e=>importBackup(e.target.files?.[0]));
 $('candidateEditorClose').onclick=closeEditor;
 $('candidateEditor').addEventListener('click',e=>{if(e.target===$('candidateEditor'))closeEditor()});
 $('candidateForm').addEventListener('submit',e=>{
  e.preventDefault();if(!editing)return;
  const checks=Object.fromEntries(CHECKS.map(x=>[x.id,$('candidateCheck_'+x.id).checked]));
  items=patchCandidate(items,editing,{stage:$('candidateEditStage').value,note:$('candidateEditNote').value,checks});
  save();render();feedback('已保存研究记录：'+editing);closeEditor();
 });
 $('candidateDelete').onclick=()=>{
  if(!editing)return;
  const button=$('candidateDelete');
  if(button.dataset.armed!=='true'){button.dataset.armed='true';button.textContent='确认移出该候选';return}
  const name=editing;items=removeCandidate(items,editing);save();render();closeEditor();feedback('已移出候选池：'+name);
 };
 window.addEventListener('atlas:add-candidate',e=>{
  const name=e.detail?.name,genre=e.detail?.genre;
  add(name,genre||'未分类');
 });
 render();
}
