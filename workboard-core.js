/** ATLAS / Cross-domain execution workboard.
 * This is a local planning ledger, not a simulated GitHub write API.
 * Repos and suggestions are drawn from the real portfolio snapshot.
 */
export const WORKBOARD_VERSION=1;
export const MAX_WORK_ITEMS=500;
export const WORK_STAGES=Object.freeze([
 {id:'backlog',label:'待规划'},
 {id:'ready',label:'待实施'},
 {id:'active',label:'开发中'},
 {id:'review',label:'待验收'},
 {id:'done',label:'已完成'},
 {id:'blocked',label:'受阻'}
]);
export const WORK_CATEGORIES=Object.freeze([
 {id:'system',label:'操作系统'},
 {id:'web',label:'Web 产品'},
 {id:'mobile',label:'移动端'},
 {id:'ai',label:'AI / 自动化'},
 {id:'tool',label:'开发工具'},
 {id:'game',label:'游戏'},
 {id:'infra',label:'基础设施'},
 {id:'other',label:'其他'}
]);
export const WORK_PRIORITIES=Object.freeze(['P0','P1','P2','P3']);
const STAGES=new Set(WORK_STAGES.map(x=>x.id));
const CATEGORIES=new Set(WORK_CATEGORIES.map(x=>x.id));
const ID=/^[A-Za-z0-9_-]{6,64}$/;
const REPO=/^[A-Za-z0-9_.-]{1,120}$/;
const validDate=x=>{
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
 const d=new Date(x+'T00:00:00Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x;
};
export function validRepo(name){return typeof name==='string'&&REPO.test(name)&&name!=='.'&&name!=='..'}
export function normalizeWorkItem(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!ID.test(raw.id||'')||
    !validRepo(raw.repo)||typeof raw.title!=='string'||!raw.title.trim())return null;
 const dependencies=Array.isArray(raw.dependsOn)?
  [...new Set(raw.dependsOn.filter(x=>typeof x==='string'&&ID.test(x)&&x!==raw.id))].slice(0,25):[];
 return {
  id:raw.id,repo:raw.repo,title:raw.title.trim().slice(0,160),
  description:typeof raw.description==='string'?raw.description.trim().slice(0,3000):'',
  category:CATEGORIES.has(raw.category)?raw.category:'other',
  stage:STAGES.has(raw.stage)?raw.stage:'backlog',
  priority:WORK_PRIORITIES.includes(raw.priority)?raw.priority:'P2',
  dependsOn:dependencies,
  dueDate:validDate(raw.dueDate)?raw.dueDate:null,
  issueNumber:Number.isSafeInteger(raw.issueNumber)&&raw.issueNumber>0&&raw.issueNumber<100000000?raw.issueNumber:null,
  createdAt:typeof raw.createdAt==='string'&&Number.isFinite(Date.parse(raw.createdAt))?raw.createdAt:new Date(0).toISOString(),
  updatedAt:typeof raw.updatedAt==='string'&&Number.isFinite(Date.parse(raw.updatedAt))?raw.updatedAt:new Date(0).toISOString()
 };
}
/** Reject malformed and circular graphs rather than silently adding a broken project plan. */
export function checkWorkGraph(items){
 const byId=new Map(items.map(item=>[item.id,item]));
 if(byId.size!==items.length)return 'duplicate';
 const visiting=new Set(),visited=new Set();
 function visit(id){
  if(visiting.has(id))return false;
  if(visited.has(id))return true;
  visiting.add(id);
  for(const dep of byId.get(id).dependsOn){
   if(!byId.has(dep)||!visit(dep))return false;
  }
  visiting.delete(id);visited.add(id);return true;
 }
 for(const item of items)if(!visit(item.id))return 'dependency';
 return null;
}
export function normalizeWorkboard(raw){
 if(!Array.isArray(raw))return [];
 const items=[],seen=new Set();
 for(const value of raw.slice(0,MAX_WORK_ITEMS)){
  const item=normalizeWorkItem(value);
  if(!item||seen.has(item.id))continue;
  seen.add(item.id);items.push(item);
 }
 // Stored local data may have been edited by extensions. Drop damaged
 // references one by one, preserving the maximum number of usable tasks.
 const known=new Set(items.map(x=>x.id));
 for(const item of items)item.dependsOn=item.dependsOn.filter(x=>known.has(x));
 for(const item of items){
  for(const dep of [...item.dependsOn]){
   if(checkWorkGraph(items)){item.dependsOn=item.dependsOn.filter(x=>x!==dep)}
  }
 }
 return items;
}
export function workBlockers(items,item){
 const byId=new Map(items.map(x=>[x.id,x]));
 return item.dependsOn.filter(id=>byId.get(id)?.stage!=='done')
  .map(id=>byId.get(id)).filter(Boolean);
}
export function upsertWorkItem(items,raw,now=new Date().toISOString()){
 if(!Array.isArray(items)||items.length>MAX_WORK_ITEMS)return {items,reason:'limit'};
 const previous=items.find(x=>x.id===raw?.id);
 if(!previous&&items.length>=MAX_WORK_ITEMS)return {items,reason:'limit'};
 const normalized=normalizeWorkItem({...previous,...raw,
  createdAt:previous?.createdAt||now,updatedAt:now});
 if(!normalized)return {items,reason:'invalid'};
 const next=previous?items.map(x=>x.id===normalized.id?normalized:x):[normalized,...items];
 const issue=checkWorkGraph(next);
 if(issue)return {items,reason:issue};
 if(['active','review','done'].includes(normalized.stage)&&workBlockers(next,normalized).length)
  return {items,reason:'blocked'};
 return {items:next,reason:null};
}
export function deleteWorkItem(items,id){
 if(!items.some(x=>x.id===id))return items;
 return items.filter(x=>x.id!==id).map(x=>({...x,
  dependsOn:x.dependsOn.filter(dep=>dep!==id)}));
}
export function workMetrics(items,now=new Date().toISOString().slice(0,10)){
 const result={total:items.length,active:0,blocked:0,done:0,overdue:0};
 for(const item of items){
  if(item.stage==='active')result.active++;
  if(item.stage==='blocked'||workBlockers(items,item).length)result.blocked++;
  if(item.stage==='done')result.done++;
  if(item.stage!=='done'&&item.dueDate&&item.dueDate<now)result.overdue++;
 }
 return result;
}
export function filterWorkItems(items,{query='',repo='all',category='all',stage='all',priority='all'}={}){
 const q=String(query).toLocaleLowerCase().trim();
 return items.filter(x=>(repo==='all'||x.repo===repo)&&
  (category==='all'||x.category===category)&&
  (stage==='all'||x.stage===stage)&&(priority==='all'||x.priority===priority)&&
  (!q||[x.repo,x.title,x.description].some(v=>v.toLocaleLowerCase().includes(q))))
 .sort((a,b)=>WORK_PRIORITIES.indexOf(a.priority)-WORK_PRIORITIES.indexOf(b.priority)||
  Date.parse(b.updatedAt)-Date.parse(a.updatedAt)||a.title.localeCompare(b.title));
}
export function issueDraft(item){
 const t=encodeURIComponent('[ATLAS / '+item.priority+'] '+item.title).slice(0,1000);
 const body=['## 目标',item.description||'请补充目标、范围与验收标准。','',
  '## 项目信息','- 仓库：AincFh/'+item.repo,'- 分类：'+item.category,
  '- 优先级：'+item.priority,'- 当前阶段：'+item.stage,
  '- 计划日期：'+(item.dueDate||'未设定'),
  '- 前置工作包：'+(item.dependsOn.join(', ')||'无'),'',
  '## 验收','- [ ] 关键功能与测试用例','- [ ] 桌面/移动端真实使用验证',
  '- [ ] 权限、数据及异常场景','- [ ] 交付证据和发布核验','',
  '> 这是 ATLAS 浏览器本地生成的 GitHub Issue 草稿，尚未提交。'].join('\n');
 return 'https://github.com/AincFh/'+encodeURIComponent(item.repo)+
  '/issues/new?title='+t+'&body='+encodeURIComponent(body);
}
export function createWorkBackup(items,now=new Date().toISOString()){
 if(checkWorkGraph(items))throw Error('invalid-work-graph');
 return {format:'atlas-workboard',version:WORKBOARD_VERSION,exportedAt:now,items};
}
export function restoreWorkBackup(input,existing=[]){
 if(!input||input.format!=='atlas-workboard'||input.version!==WORKBOARD_VERSION||
  !Array.isArray(input.items)||input.items.length>MAX_WORK_ITEMS)throw Error('invalid-format');
 const incoming=[];
 for(const raw of input.items){
  const item=normalizeWorkItem(raw);
  if(!item)throw Error('invalid-item');
  incoming.push(item);
 }
 if(checkWorkGraph(incoming))throw Error('invalid-dependency');
 const old=normalizeWorkboard(existing);
 const seen=new Set(old.map(x=>x.id));
 const merged=[...old];
 for(const item of incoming)if(!seen.has(item.id)){
  if(merged.length>=MAX_WORK_ITEMS)throw Error('too-many-items');
  seen.add(item.id);merged.push(item);
 }
 if(checkWorkGraph(merged))throw Error('invalid-dependency');
 return merged;
}
/** Read-only indications from real GitHub snapshot, never fabricated tasks. */
export function workSuggestions(projects=[]){
 const tasks=[];
 for(const p of projects){
  if(!validRepo(p?.name))continue;
  const category=CATEGORIES.has(p.category)?p.category:'other';
  if(p.ci?.state==='failure')tasks.push({repo:p.name,category,priority:'P0',
   title:'排查主分支 CI 失败',description:'阅读最近主分支 Actions 失败日志，复现并修复；合并前进行回归验收。'});
  if(p.runtimeQa?.isCurrent&&['fail','timeout'].includes(p.runtimeQa.status))
   tasks.push({repo:p.name,category,priority:'P0',title:'修复浏览器真实流程验收失败',
    description:'分析现有 Chromium 失败步骤及运行日志，修复后验证不同屏幕的完整用户流程。'});
  if(p.openPRs>0)tasks.push({repo:p.name,category,priority:'P1',
   title:'复核 '+p.openPRs+' 个待审 PR',description:'检查差异、风险和 CI/真实体验验收，仅在满足标准后合并。'});
  if(['http_error','resource_error','network_error','content_error'].includes(p.probe?.state))
   tasks.push({repo:p.name,category,priority:'P0',title:'修复已发布站点资源异常',
    description:'检查站点 HTML、模块依赖及 JS/CSS 请求失败；核验 GitHub Pages 实际可访问性。'});
 }
 return tasks.slice(0,100);
}
