/** Deterministic, offline ATLAS capacity allocation.
 *
 * Units are the user's own estimates of task effort. They are NOT Codex tokens,
 * API credits or an automatic reading of ChatGPT/Codex usage quotas.
 */
import {WORK_PRIORITIES,workBlockers,checkWorkGraph} from './workboard-core.js';
export const CAPACITY_MIN=1;
export const CAPACITY_MAX=1000;
export const DEFAULT_CAPACITY=24;
export function normalizeCapacity(value){
 const n=typeof value==='string'&&value.trim()?Number(value):value;
 return Number.isSafeInteger(n)&&n>=CAPACITY_MIN&&n<=CAPACITY_MAX?n:DEFAULT_CAPACITY;
}
const priorityRank=x=>Math.max(0,WORK_PRIORITIES.indexOf(x.priority));
const dayRank=d=>d&&/^\d{4}-\d\d-\d\d$/.test(d)?d:'9999-12-31';
/**
 * Prefer user-assigned priority, then nearest target date, then currently
 * active work. Never schedule a blocked task, a finished task, or an invalid
 * dependency graph. No fake partial completion: effort must fit the balance.
 */
export function capacityPlan(items,units=DEFAULT_CAPACITY){
 if(!Array.isArray(items)||checkWorkGraph(items))throw Error('invalid-workboard');
 const capacity=normalizeCapacity(units);
 const completed=items.filter(x=>x.stage==='done');
 const pending=items.filter(x=>x.stage!=='done');
 const blocked=pending.filter(x=>x.stage==='blocked'||workBlockers(items,x).length>0);
 const blockedIds=new Set(blocked.map(x=>x.id));
 const eligible=pending.filter(x=>!blockedIds.has(x.id)).sort((a,b)=>
  priorityRank(a)-priorityRank(b)||
  dayRank(a.dueDate).localeCompare(dayRank(b.dueDate))||
  Number(b.stage==='active')-Number(a.stage==='active')||
  a.repo.localeCompare(b.repo,'en')||a.id.localeCompare(b.id,'en'));
 let remaining=capacity;
 const scheduled=[],waiting=[];
 for(const item of eligible){
  const cost=Number.isInteger(item.effortUnits)&&item.effortUnits>=1&&item.effortUnits<=40?
   item.effortUnits:3;
  if(cost<=remaining){remaining-=cost;scheduled.push({...item,cost})}
  else waiting.push({...item,cost});
 }
 const grouped={};
 for(const task of scheduled){
  const group=grouped[task.repo]||{repo:task.repo,units:0,tasks:0,categories:new Set()};
  group.units+=task.cost;group.tasks++;
  group.categories.add(task.category);
  grouped[task.repo]=group;
 }
 const repos=Object.values(grouped).map(x=>({
  repo:x.repo,units:x.units,tasks:x.tasks,categories:[...x.categories].sort()
 })).sort((a,b)=>b.units-a.units||a.repo.localeCompare(b.repo,'en'));
 const planned=scheduled.reduce((n,x)=>n+x.cost,0);
 const outstanding=waiting.reduce((n,x)=>n+x.cost,0);
 return {capacity,used:planned,remaining,scheduled,waiting,blocked,completed,
  eligibleCount:eligible.length,unplannedUnits:outstanding,
  requestedUnits:planned+outstanding,
  utilization:Math.round(planned/capacity*100),repos};
}
const safe=x=>String(x??'').replace(/[\r\n|]/g,' ').slice(0,350);
export function capacityMarkdown(plan,{generatedAt=new Date().toISOString()}={}){
 const lines=[
  '# ATLAS · 跨项目开发容量与执行交接','',
  '- 导出时间：'+generatedAt,
  '- 本轮投入容量：'+plan.capacity+' 估算工作量单位（手动输入）',
  '- 已规划使用：'+plan.used+' 单位 / 余量：'+plan.remaining+' 单位',
  '- 入选：'+plan.scheduled.length+' 项 / 容量不足：'+plan.waiting.length+
   ' 项 / 依赖阻塞：'+plan.blocked.length+' 项 / 已完成：'+plan.completed.length+' 项','',
  '> 这些单位不是 Codex 或 ChatGPT 真实可用 Token、Credits、速率限制或费用；数据来自 ATLAS 浏览器本地手动估算。系统没有自动执行代码或读写官方额度。','',
  '## 本轮建议实施','',
  '| 优先级 | 仓库 | 工作包 | 负责人 | 工作量 | 目标日期 |',
  '| --- | --- | --- | --- | ---: | --- |'
 ];
 for(const x of plan.scheduled)lines.push('| '+safe(x.priority)+' | '+safe(x.repo)+' | '+
  safe(x.title)+' | '+safe(x.owner||'待分配')+' | '+x.cost+' | '+safe(x.dueDate||'未设定')+' |');
 lines.push('','## 仓库分配','');
 for(const group of plan.repos)lines.push('- '+safe(group.repo)+'：'+group.units+' 单位 / '+group.tasks+' 个工作包');
 if(!plan.repos.length)lines.push('- 本轮尚未安排工作。');
 lines.push('','## 尚未排入本轮（容量不足）','');
 for(const x of plan.waiting)lines.push('- ['+safe(x.priority)+'] '+safe(x.repo)+' / '+safe(x.title)+'（估算 '+x.cost+' 单位）');
 if(!plan.waiting.length)lines.push('- 没有容量不足的工作包。');
 lines.push('','## 前置依赖或人工阻塞','');
 for(const x of plan.blocked)lines.push('- '+safe(x.repo)+' / '+safe(x.title)+'：'+
  (x.stage==='blocked'?'已人工标记受阻；':'')+
  (x.dependsOn?.length?'前置工作包 '+safe(x.dependsOn.join(', ')):'需人工排除阻塞'));
 if(!plan.blocked.length)lines.push('- 暂无阻塞。');
 lines.push('','## 验收说明','',
  '- GitHub Issue、PR、CI、Pages 发布结果必须另外核验；计划完成不等于代码合并或正式发布。',
  '- 工时/容量估算需根据实测随时更新；请优先处理 P0 安全与构建异常。',
  '- 本交接文件只反映导出时本地计划快照，不会自动变更 GitHub。');
 return lines.join('\n');
}
