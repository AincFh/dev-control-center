// Local-only, source-attributed research queue. This is not a GitHub issue/PR tracker.
export const STAGES=[
 {id:'inbox',label:'待研究',hint:'先判断玩法与项目质量'},
 {id:'review',label:'技术评估',hint:'核查可运行性、实现难度与维护'},
 {id:'design',label:'方案设计',hint:'确定差异化设计与交互'},
 {id:'ready',label:'待立项',hint:'准备 GitHub Issue 与开发计划'},
 {id:'hold',label:'暂缓',hint:'保留来源，不代表已经立项'}
];
export const CHECKS=[
 {id:'license',label:'代码许可证已人工核查'},
 {id:'assets',label:'第三方素材权利已人工核查'},
 {id:'runtime',label:'实际运行环境已人工测试'},
 {id:'scope',label:'差异化方案及范围已明确'}
];
export const MAX_CANDIDATES=2000;
const IDS=new Set(STAGES.map(x=>x.id));
const REPO=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export function validCandidateName(x){return typeof x==='string'&&x.length<=240&&REPO.test(x)}
export function normalizeCandidate(raw){
 if(!raw||!validCandidateName(raw.name))return null;
 const checks={};for(const c of CHECKS)checks[c.id]=raw.checks?.[c.id]===true;
 return{
  name:raw.name,genre:String(raw.genre||'未分类').slice(0,64),
  stage:IDS.has(raw.stage)?raw.stage:'inbox',
  note:String(raw.note||'').slice(0,2000),
  checks,
  updated:typeof raw.updated==='string'&&!Number.isNaN(Date.parse(raw.updated))?raw.updated:new Date(0).toISOString()
 };
}
export function loadCandidates(raw){
 if(!Array.isArray(raw))return [];
 const output=[],seen=new Set();
 for(const item of raw.slice(0,MAX_CANDIDATES)){
  const c=normalizeCandidate(item);if(!c)continue;
  const key=c.name.toLowerCase();if(seen.has(key))continue;
  seen.add(key);output.push(c);
 }
 return output;
}
export function addCandidate(items,name,genre='未分类',now=new Date().toISOString()){
 if(!validCandidateName(name))return items;
 if(items.some(x=>x.name.toLowerCase()===name.toLowerCase()))return items;
 if(items.length>=MAX_CANDIDATES)return items;
 return[{name,genre:String(genre).slice(0,64),stage:'inbox',note:'',checks:Object.fromEntries(CHECKS.map(x=>[x.id,false])),updated:now},...items];
}
export function patchCandidate(items,name,patch={},now=new Date().toISOString()){
 return items.map(old=>{
  if(old.name.toLowerCase()!==String(name).toLowerCase())return old;
  return normalizeCandidate({...old,...patch,name:old.name,checks:{...old.checks,...patch.checks},updated:now});
 });
}
export function removeCandidate(items,name){return items.filter(x=>x.name.toLowerCase()!==String(name).toLowerCase())}
export function tallyCandidates(items){
 const counts=Object.fromEntries(STAGES.map(x=>[x.id,0]));
 for(const x of items)if(counts[x.stage]!==undefined)counts[x.stage]++;
 return{total:items.length,counts,checked:items.filter(x=>CHECKS.every(c=>x.checks?.[c.id])).length};
}
export function searchCandidates(items,query='',stage='all'){
 const words=String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 return items.filter(x=>(stage==='all'||x.stage===stage)&&words.every(w=>(x.name+' '+x.genre+' '+x.note).toLocaleLowerCase().includes(w)))
  .sort((a,b)=>Date.parse(b.updated)-Date.parse(a.updated)||a.name.localeCompare(b.name));
}
export function createBackup(items){
 return{kind:'atlas-candidate-backup',schemaVersion:1,exportedAt:new Date().toISOString(),candidates:loadCandidates(items)};
}
export function restoreBackup(data,current=[]){
 if(data?.kind!=='atlas-candidate-backup'||data.schemaVersion!==1||!Array.isArray(data.candidates)||data.candidates.length>MAX_CANDIDATES)throw Error('不支持的候选池备份格式');
 const imported=loadCandidates(data.candidates),by=new Set(imported.map(x=>x.name.toLowerCase()));
 return loadCandidates([...current.filter(x=>!by.has(x.name.toLowerCase())),...imported]);
}
export function issueDraft(candidate){
 const c=normalizeCandidate(candidate);if(!c)throw Error('Invalid candidate');
 const stage=STAGES.find(x=>x.id===c.stage)?.label||'待研究';
 const checks=CHECKS.map(x=>(c.checks[x.id]?'[x] ':'[ ] ')+x.label).join('\n');
 const title='[研发评估] '+c.name;
 const body=[
  '## 来源与性质',
  '- 第三方来源：https://github.com/'+c.name,
  '- 类型：'+c.genre,
  '- 本地评估阶段：'+stage+'（不是 GitHub 的实际研发状态）',
  '',
  '## 研究说明',c.note||'待补充玩法目标、用户价值及技术方案。',
  '',
  '## 人工检查（本地自述，立项前必须复核）',checks,
  '',
  '## 立项验收条件',
  '- [ ] 明确原创方向及与上游的差异',
  '- [ ] 核实代码、依赖及所有素材的复用许可',
  '- [ ] 完成独立仓库及任务拆分方案',
  '- [ ] 制定性能、移动端与真实浏览器验收标准',
  '- [ ] 未通过完整 Playtest 前不在大厅标记为可玩',
  '',
  '> ATLAS 候选池生成的 Issue 草稿。点击提交前请人工检查，不代表已经创建 Issue。'
 ].join('\n');
 return{title,body,url:'https://github.com/AincFh/dev-control-center/issues/new?title='+encodeURIComponent(title)+'&body='+encodeURIComponent(body)};
}
