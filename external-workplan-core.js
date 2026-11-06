/** Pure bridge from any public third-party source into ATLAS's local execution board.
 * Creates proposals only. No GitHub write, license approval, deployment or execution.
 */
import{domainPlan}from'./domain-guide-core.js';
import{MAX_WORK_ITEMS,upsertWorkItem}from'./workboard-core.js';
const repoCategory=id=>id==='system'?'system':id==='mobile'?'mobile':id==='web'?'web':
 ['ai','automation','mlops','robotics'].includes(id)?'ai':
 ['devtools','cli','testing','browsers','documentation'].includes(id)?'tool':
 ['infra','cloud','database','networking','iot'].includes(id)?'infra':
 ['life','builder','survival','management','industry','story','arcade','web3d'].includes(id)?'game':'other';
function stableHash(value){
 let hash=2166136261;
 for(const char of value){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619)>>>0;}
 return hash.toString(36).padStart(7,'0');
}
export function externalWorkPackages({category,repository,label}={}){
 if(!repository)throw Error('Missing third-party GitHub source');
 const plan=domainPlan(category,{repo:repository,label:label||category});
 const fingerprint=stableHash(plan.source+':'+plan.category);
 const scope=repository.length>54?repository.slice(0,54)+'…':repository;
 const efforts=[2,3,5,3,2];
 return plan.phases.map((phase,i)=>({
  id:'ext_'+fingerprint+'_'+phase.id,
  repo:'dev-control-center',
  title:'['+scope+'] '+phase.title,
  description:[
   '第三方研究来源：'+plan.source,
   '工程领域：'+plan.label+' · '+plan.groupLabel,
   '任务目标：'+plan.goal,
   ...phase.tasks.map(x=>'- '+x),
   '注意：仅为本地规划，不代表已获得开源复用许可、已经实施或已创建 GitHub Issue。'
  ].join('\n').slice(0,3000),
  owner:'',category:repoCategory(category),stage:'backlog',
  priority:'P2',effortUnits:efforts[i],dueDate:null,
  dependsOn:i?[('ext_'+fingerprint+'_'+plan.phases[i-1].id)]:[]
 }));
}
export function importExternalWorkPackages(items,input,now=new Date().toISOString()){
 if(!Array.isArray(items))return {items,added:0,reason:'invalid-state'};
 let proposed;
 try{proposed=externalWorkPackages(input)}catch(error){return{items,added:0,reason:error.message};}
 const known=new Map(items.map(x=>[x.id,x]));
 for(const task of proposed){
  const existing=known.get(task.id);
  if(existing&&!existing.description.includes('第三方研究来源：https://github.com/'+input.repository))
   return{items,added:0,reason:'same-id-conflict'};
 }
 const fresh=proposed.filter(x=>!known.has(x.id));
 if(items.length+fresh.length>MAX_WORK_ITEMS)return {items,added:0,reason:'capacity-limit'};
 let next=items;
 for(const task of fresh){
  const r=upsertWorkItem(next,task,now);
  if(r.reason)return {items,added:0,reason:r.reason};
  next=r.items;
 }
 return {items:next,added:fresh.length,reason:null,source:'https://github.com/'+input.repository};
}
