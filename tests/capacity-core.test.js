import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWorkItem,upsertWorkItem,normalizeWorkboard,createWorkBackup,restoreWorkBackup}
 from '../workboard-core.js';
import {DEFAULT_CAPACITY,normalizeCapacity,capacityPlan,capacityMarkdown}
 from '../capacity-core.js';

const timestamp='2026-11-06T12:00:00Z';
const make=(id,o={})=>normalizeWorkItem({
 id,repo:'dev-control-center',title:'实施 '+id,
 category:'web',owner:'工程',priority:'P2',stage:'ready',
 dueDate:'2026-12-01',dependsOn:[],effortUnits:3,
 createdAt:timestamp,updatedAt:timestamp,...o
});
test('manual capacity always remains an integer between one and 1000',()=>{
 assert.equal(DEFAULT_CAPACITY,24);
 for(const input of [0,-1,1001,NaN,Infinity,1.4,'junk',null,''])
  assert.equal(normalizeCapacity(input),DEFAULT_CAPACITY);
 assert.equal(normalizeCapacity(1),1);
 assert.equal(normalizeCapacity('35'),35);
 assert.equal(normalizeCapacity(1000),1000);
});
test('work packages retain bounded manually estimated effort with old backup compatibility',()=>{
 assert.equal(make('work0001',{effortUnits:8}).effortUnits,8);
 for(const effortUnits of [0,-1,41,Infinity,1.4,'9',null])
  assert.equal(make('work0001',{effortUnits}).effortUnits,3);
 const old=make('oldwork');
 delete old.effortUnits;
 const restored=normalizeWorkboard([old]);
 assert.equal(restored[0].effortUnits,3);
 const imported=restoreWorkBackup(createWorkBackup(restored,timestamp),[]);
 assert.equal(imported[0].effortUnits,3);
});
test('schedule chooses P0 before P1 and P2, even across non-game repositories',()=>{
 const tasks=[
  make('game0001',{repo:'azure-coast',category:'game',priority:'P2',effortUnits:8}),
  make('infra001',{repo:'dev-control-center',category:'infra',priority:'P0',effortUnits:5}),
  make('android1',{repo:'QingJi',category:'mobile',priority:'P1',effortUnits:3})
 ];
 const plan=capacityPlan(tasks,8);
 assert.deepEqual(plan.scheduled.map(x=>x.id),['infra001','android1']);
 assert.equal(plan.used,8);
 assert.equal(plan.remaining,0);
 assert.equal(plan.waiting.length,1);
 assert.equal(plan.waiting[0].repo,'azure-coast');
 assert.equal(plan.repos.length,2);
 assert.deepEqual(plan.repos.map(x=>x.units),[5,3]);
});
test('due dates break ties and active stage breaks ties where deadline is equal',()=>{
 const tasks=[
  make('later001',{dueDate:'2026-12-21',effortUnits:5}),
  make('urgent01',{dueDate:'2026-11-07',effortUnits:5}),
  make('active01',{dueDate:'2026-11-07',stage:'active',effortUnits:5})
 ];
 const plan=capacityPlan(tasks,5);
 assert.equal(plan.scheduled[0].id,'active01');
 assert.equal(plan.waiting.length,2);
});
test('blocked, dependent and completed work never spend the capacity estimate',()=>{
 const tasks=[
  make('parent01',{stage:'ready',effortUnits:4}),
  make('child001',{stage:'backlog',dependsOn:['parent01'],effortUnits:5}),
  make('manual01',{stage:'blocked',effortUnits:8}),
  make('done0001',{stage:'done',effortUnits:40})
 ];
 const plan=capacityPlan(tasks,24);
 assert.equal(plan.used,4);
 assert.equal(plan.scheduled[0].id,'parent01');
 assert.deepEqual(plan.blocked.map(x=>x.id).sort(),['child001','manual01']);
 assert.equal(plan.completed.length,1);
});
test('lack of capacity does not create partial or imaginary completed work',()=>{
 const p=capacityPlan([
  make('big00001',{priority:'P0',effortUnits:40}),
  make('small001',{priority:'P1',effortUnits:4})
 ],10);
 assert.deepEqual(p.scheduled.map(x=>x.id),['small001']);
 assert.equal(p.used,4);
 assert.equal(p.remaining,6);
 assert.equal(p.unplannedUnits,40);
 assert.equal(p.utilization,40);
 assert.equal(p.requestedUnits,44);
});
test('zero planned work is represented as empty, not fabricated quota usage',()=>{
 const p=capacityPlan([],24);
 assert.equal(p.used,0);
 assert.equal(p.scheduled.length,0);
 assert.equal(p.repos.length,0);
 assert.equal(p.utilization,0);
 assert.equal(p.remaining,24);
});
test('invalid dependency graphs abort capacity calculation',()=>{
 assert.throws(()=>capacityPlan([make('cyclic01',{dependsOn:['cyclic01']})],10));
 assert.throws(()=>capacityPlan([make('missing1',{dependsOn:['other01']})],10));
});
test('read-only capacity planning is deterministic and never mutates task status',()=>{
 const items=[
  make('system01',{category:'system',effortUnits:12}),
  make('ai_app01',{category:'ai',effortUnits:4})
 ];
 const before=JSON.stringify(items);
 const first=capacityPlan(items,20);
 const second=capacityPlan(items,20);
 assert.deepEqual(first,second);
 assert.equal(JSON.stringify(items),before);
 assert.deepEqual(first.repos[0].categories,['ai','system']);
});
test('Markdown report is a concrete project handoff, never a claim about official Codex credits',()=>{
 const p=capacityPlan([
  make('test0001',{category:'tool',repo:'QingJi',priority:'P0',effortUnits:6,owner:'张三',title:'导出功能'}),
  make('blocked1',{dependsOn:['test0001'],title:'移动端验收',effortUnits:8})
 ],7);
 const md=capacityMarkdown(p,{generatedAt:timestamp});
 assert.match(md,/QingJi/);
 assert.match(md,/导出功能/);
 assert.match(md,/张三/);
 assert.match(md,/依赖阻塞/);
 assert.match(md,/不是 Codex 或 ChatGPT 真实可用 Token/);
 assert.match(md,/7 估算工作量单位/);
 assert.match(md,/余量：1 单位/);
 assert.equal(md.includes('已自动完成所有开发'),false);
});
