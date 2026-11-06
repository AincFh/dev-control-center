/**
 * ATLAS blueprint -> execution ledger bridge.
 * A research reference remains an external source. Work is always assigned
 * to an explicitly chosen AincFh portfolio repository, never to an upstream.
 * Pure and deterministic: no network, credentials, side effects or fake CI.
 */
import {domainPlan} from './domain-guide-core.js';
import {WORK_CATEGORIES,MAX_WORK_ITEMS,validRepo,normalizeWorkItem,checkWorkGraph} from './workboard-core.js';

export const BLUEPRINT_EFFORT=Object.freeze([2,4,12,6,4]);
const PHASES=['source','prototype','product','quality','release'];
const GAME_DOMAINS=new Set(['life','builder','survival','management','industry','story','arcade','web3d']);
const INFRA_DOMAINS=new Set(['infra','cloud','database','networking','energy']);
const AI_DOMAINS=new Set(['ai','automation','mlops','robotics','iot','science']);
const SYSTEM_DOMAINS=new Set(['system','hardware']);
const MOBILE_DOMAINS=new Set(['mobile']);
const WEB_DOMAINS=new Set(['web','commerce','communication','education','productivity','business','healthtech','office','documentation','gis']);
const TOOL_DOMAINS=new Set(['devtools','desktop','browsers','cli','testing','media','design','security','accessibility','data']);
const PRIORITIES=['P1','P1','P1','P1','P2'];
const MARKER='ATLAS-BLUEPRINT/';

export function blueprintWorkCategory(domain){
 if(GAME_DOMAINS.has(domain))return 'game';
 if(INFRA_DOMAINS.has(domain))return 'infra';
 if(AI_DOMAINS.has(domain))return 'ai';
 if(SYSTEM_DOMAINS.has(domain))return 'system';
 if(MOBILE_DOMAINS.has(domain))return 'mobile';
 if(WEB_DOMAINS.has(domain))return 'web';
 if(TOOL_DOMAINS.has(domain))return 'tool';
 return 'other';
}
function hash32(value,seed){
 let n=seed>>>0;
 for(let i=0;i<value.length;i++){
  n^=value.charCodeAt(i);
  n=Math.imul(n,16777619)>>>0;
 }
 return n.toString(16).padStart(8,'0');
}
/** Stable identity makes repeated imports idempotent, even across page reloads. */
export function blueprintWorkScope({category,sourceRepo=null,repo}){
 return hash32([category,sourceRepo||'-',repo].join('\u001f'),2166136261)+
  hash32([repo,sourceRepo||'-',category].join('\u001f'),2246822519);
}
/**
 * Import five connected human-planned work packages atomically.
 * Existing records (including manual edits) are left untouched on re-import.
 * An ID clash with a non-blueprint record aborts rather than overwrites data.
 */
export function prepareBlueprintExecution(existing,{category,sourceRepo=null,repo,label=null},
 now='2026-01-01T00:00:00.000Z'){
 if(!Array.isArray(existing)||checkWorkGraph(existing))throw Error('工作包数据依赖关系已损坏，请先修复或恢复备份');
 if(!validRepo(repo))throw Error('请选择一个有效的 ATLAS 自有仓库');
 const plan=domainPlan(category,{repo:sourceRepo,label});
 const scope=blueprintWorkScope({category,sourceRepo,repo});
 const categoryId=blueprintWorkCategory(category);
 if(!WORK_CATEGORIES.some(x=>x.id===categoryId))throw Error('不支持的工作包分类');
 if(!Number.isFinite(Date.parse(now)))throw Error('Invalid timestamp');
 const byId=new Map(existing.map(item=>[item.id,item]));
 const ids=PHASES.map(phase=>'bp_'+scope+'_'+phase);
 const marker=MARKER+scope;
 const incoming=[];
 let skipped=0;
 for(let i=0;i<PHASES.length;i++){
  const phase=plan.phases[i];
  if(!phase||phase.id!==PHASES[i])throw Error('蓝图阶段不完整');
  const id=ids[i],prior=byId.get(id);
  if(prior){
   // The marker is a provenance field, NOT evidence of a verified license.
   if(prior.repo!==repo||prior.category!==categoryId||
      typeof prior.description!=='string'||!prior.description.includes(marker))
    throw Error('检测到不同来源的工作包标识冲突，未覆盖任何旧记录');
   skipped++;continue;
  }
  const description=[
   '工程研发蓝图 · '+plan.groupLabel+' / '+plan.goal,
   '蓝图批次：'+marker,
   '公开上游参考：'+(plan.source||'尚未选定；必须人工核实'),
   '本阶段工作范围：',
   ...phase.tasks.map(t=>'• '+t),
   '跨阶段验收：'+plan.acceptance,
   '领域风险：'+plan.risk,
   '边界：该工作包是待执行计划，不证明第三方源码授权、测试通过或产品发布。'
  ].join('\n');
  const item=normalizeWorkItem({
   id,repo,title:'['+plan.label+'] '+phase.title,description,
   category:categoryId,stage:'backlog',priority:PRIORITIES[i],
   effortUnits:BLUEPRINT_EFFORT[i],owner:'',dueDate:null,
   dependsOn:i?[ids[i-1]]:[],createdAt:now,updatedAt:now
  });
  if(!item)throw Error('蓝图生成了不合法的工作包');
  incoming.push(item);
 }
 if(existing.length+incoming.length>MAX_WORK_ITEMS)throw Error('已达到 '+MAX_WORK_ITEMS+' 个工作包上限；请先归档旧任务');
 const merged=[...existing,...incoming];
 if(checkWorkGraph(merged))throw Error('蓝图依赖关系发生冲突，未修改现有记录');
 return {items:merged,added:incoming.length,skipped,ids,scope,category:categoryId,plan};
}
