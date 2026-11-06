import test from 'node:test';
import assert from 'node:assert/strict';
import {
 WORK_STAGES,WORK_CATEGORIES,WORK_PRIORITIES,MAX_WORK_ITEMS,
 normalizeWorkItem,normalizeWorkboard,checkWorkGraph,upsertWorkItem,deleteWorkItem,
 workBlockers,workMetrics,filterWorkItems,issueDraft,createWorkBackup,
 restoreWorkBackup,workSuggestions
} from '../workboard-core.js';

const NOW='2026-11-06T12:00:00Z';
const task=(id,overrides={})=>({
 id,repo:'dev-control-center',title:'开发 '+id,description:'必须经过源码审查与验收',
 category:'web',stage:'backlog',priority:'P2',dependsOn:[],owner:'工程组',
 dueDate:'2026-11-20',createdAt:NOW,updatedAt:NOW,...overrides
});
function add(items,x){const result=upsertWorkItem(items,x,NOW);assert.equal(result.reason,null);return result.items}

test('all stages, cross-domain categories, and priorities are distinct',()=>{
 assert.equal(WORK_STAGES.length,6);
 assert.equal(new Set(WORK_STAGES.map(x=>x.id)).size,6);
 assert.equal(WORK_CATEGORIES.length,8);
 assert.equal(WORK_CATEGORIES.some(x=>x.id==='system'),true);
 assert.equal(WORK_CATEGORIES.some(x=>x.id==='mobile'),true);
 assert.equal(WORK_CATEGORIES.some(x=>x.id==='ai'),true);
 assert.equal(WORK_CATEGORIES.some(x=>x.id==='game'),true);
 assert.deepEqual(WORK_PRIORITIES,['P0','P1','P2','P3']);
});
test('work item validates repo/name/date and sanitizes freeform text',()=>{
 assert.equal(normalizeWorkItem(task('req_001')).title,'开发 req_001');
 assert.equal(normalizeWorkItem(task('req_001',{title:'  实施目标  '})).title,'实施目标');
 assert.equal(normalizeWorkItem(task('req_001',{title:' '})),null);
 assert.equal(normalizeWorkItem(task('req_001',{repo:'../other'})),null);
 assert.equal(normalizeWorkItem(task('req_001',{repo:'other?x=123'})),null);
 assert.equal(normalizeWorkItem(task('req_001',{id:'a'})),null);
 assert.equal(normalizeWorkItem(task('req_001',{dueDate:'2026-02-30'})).dueDate,null);
 assert.equal(normalizeWorkItem(task('req_001',{dueDate:'2026-02-28'})).dueDate,'2026-02-28');
 assert.equal(normalizeWorkItem(task('req_001',{category:'unknown',priority:'severe'})).category,'other');
 assert.equal(normalizeWorkItem(task('req_001',{category:'unknown',priority:'severe'})).priority,'P2');
});
test('work items cover non-game repositories, assigned owners, and deadline',()=>{
 const x=normalizeWorkItem(task('system_one',{repo:'kernel-lab',category:'system',
  owner:'系统工程组',stage:'ready',priority:'P0',dueDate:'2026-11-09'}));
 assert.equal(x.repo,'kernel-lab');
 assert.equal(x.owner,'系统工程组');
 assert.equal(x.category,'system');
 assert.equal(x.priority,'P0');
 assert.equal(x.dueDate,'2026-11-09');
});
test('create, edit and remove work packages without hidden changes',()=>{
 let items=add([],task('system01'));
 assert.equal(items.length,1);
 const original=items[0];
 items=add(items,{...original,title:'修复授权页',priority:'P0'});
 assert.equal(items.length,1);
 assert.equal(items[0].title,'修复授权页');
 assert.equal(original.title,'开发 system01');
 assert.equal(items[0].priority,'P0');
 assert.equal(deleteWorkItem(items,'not-there'),items);
 assert.deepEqual(deleteWorkItem(items,original.id),[]);
});
test('cannot activate or complete work packages while prerequisites are incomplete',()=>{
 let items=add([],task('depends01'));
 items=add(items,task('depends02',{dependsOn:['depends01']}));
 const rejected=upsertWorkItem(items,{...items[0],stage:'active'},NOW);
 assert.equal(rejected.reason,'blocked');
 assert.strictEqual(rejected.items,items);
 // Topological dependency can be satisfied once parent completed.
 items=add(items,{...items.find(x=>x.id==='depends01'),stage:'done'});
 const result=upsertWorkItem(items,{...items.find(x=>x.id==='depends02'),stage:'active'},NOW);
 assert.equal(result.reason,null);
 assert.equal(result.items.find(x=>x.id==='depends02').stage,'active');
});
test('transitive work graph refuses cycles, missing IDs and duplicate IDs',()=>{
 const a=task('cyclic_1',{dependsOn:['cyclic_2']});
 const b=task('cyclic_2',{dependsOn:['cyclic_1']});
 assert.equal(checkWorkGraph([a,b]),'dependency');
 assert.equal(checkWorkGraph([a,a]),'duplicate');
 assert.equal(checkWorkGraph([task('unknown1',{dependsOn:['missing']})]),'dependency');
 let items=add([],task('cyclic_1'));
 items=add(items,task('cyclic_2',{dependsOn:['cyclic_1']}));
 const r=upsertWorkItem(items,{...items.find(x=>x.id==='cyclic_1'),dependsOn:['cyclic_2']},NOW);
 assert.equal(r.reason,'dependency');
 assert.strictEqual(r.items,items);
});
test('delete rescopes dependent references rather than leaving broken links',()=>{
 let items=add([],task('parent01'));
 items=add(items,task('child_01',{dependsOn:['parent01']}));
 const clean=deleteWorkItem(items,'parent01');
 assert.equal(clean.length,1);
 assert.deepEqual(clean[0].dependsOn,[]);
 assert.equal(checkWorkGraph(clean),null);
});
test('restore of malformed local state keeps safe tasks without crashing',()=>{
 const items=normalizeWorkboard([
  task('valid001',{dependsOn:['missing999']}),
  task('valid001',{title:'duplicate'}),
  task('valid002',{dependsOn:['valid003']}),
  task('valid003',{dependsOn:['valid002']}),
  {id:'bad-name',title:'broken',repo:'../../foreign'}
 ]);
 assert.equal(items.length,3);
 assert.equal(checkWorkGraph(items),null);
 assert.equal(items[0].title,'开发 valid001');
 assert.deepEqual(items[0].dependsOn,[]);
});
test('work metrics identify active, blocked, completed and overdue independently',()=>{
 const items=[
  task('step001',{stage:'done',dueDate:'2026-10-10'}),
  task('step002',{stage:'active',dueDate:'2026-11-04'}),
  task('step003',{stage:'blocked',dependsOn:['step002'],dueDate:null}),
  task('step004',{stage:'ready',dependsOn:['step002'],dueDate:null})
 ];
 const result=workMetrics(items,'2026-11-06');
 assert.deepEqual(result,{total:4,active:1,blocked:2,done:1,overdue:1});
});
test('filters search, category, priority, repo and stage with stable ordering',()=>{
 const items=[
  task('tool_001',{repo:'QingJi',category:'tool',stage:'active',priority:'P0',title:'调音工具'}),
  task('game_001',{repo:'azure-coast',category:'game',stage:'ready',priority:'P2',title:'载具内饰'}),
  task('ai__001',{repo:'Saintlaurent',category:'ai',stage:'ready',priority:'P1',title:'AI 问答'})
 ];
 assert.deepEqual(filterWorkItems(items,{category:'game'}).map(x=>x.repo),['azure-coast']);
 assert.deepEqual(filterWorkItems(items,{query:'问答'}).map(x=>x.repo),['Saintlaurent']);
 assert.deepEqual(filterWorkItems(items,{repo:'QingJi'}).map(x=>x.repo),['QingJi']);
 assert.equal(filterWorkItems(items,{priority:'P0',stage:'active'}).length,1);
 assert.deepEqual(filterWorkItems(items).map(x=>x.repo),['QingJi','Saintlaurent','azure-coast']);
});
test('Issue draft targets the selected owned repository and is never submitted automatically',()=>{
 const url=new URL(issueDraft(task('remote01',{repo:'Saintlaurent',priority:'P0',owner:'后台工程师'})));
 assert.equal(url.origin,'https://github.com');
 assert.equal(url.pathname,'/AincFh/Saintlaurent/issues/new');
 assert.ok(url.searchParams.get('title').includes('P0'));
 assert.ok(url.searchParams.get('body').includes('后台工程师'));
 assert.ok(url.searchParams.get('body').includes('尚未提交'));
});
test('export/import preserves dependencies and manual data without overwriting same ID',()=>{
 const items=[task('source01',{stage:'done'}),task('source02',{dependsOn:['source01']})];
 const backup=createWorkBackup(items,NOW);
 assert.equal(backup.format,'atlas-workboard');
 assert.equal(backup.version,1);
 assert.equal(backup.items.length,2);
 const merged=restoreWorkBackup(JSON.parse(JSON.stringify(backup)),[task('local001'),items[0]]);
 assert.equal(merged.length,3);
 assert.equal(merged.find(x=>x.id==='source02').dependsOn[0],'source01');
 assert.equal(merged.find(x=>x.id==='source01').title,items[0].title);
});
test('malicious or mismatched imported backups cannot alter original records',()=>{
 const local=[task('local001')];
 const cases=[
  null,{}, {format:'atlas-workboard',version:99,items:[]},
  {format:'atlas-workboard',version:1,items:[{id:'invalid'}]},
  {format:'atlas-workboard',version:1,items:[task('dep0101',{dependsOn:['no-such-task']})]},
  {format:'atlas-workboard',version:1,items:[task('duplicate01'),task('duplicate01')]},
  {format:'atlas-workboard',version:1,items:[task('cyclic_a',{dependsOn:['cyclic_b']}),task('cyclic_b',{dependsOn:['cyclic_a']})]}
 ];
 const before=JSON.stringify(local);
 for(const bad of cases)assert.throws(()=>restoreWorkBackup(bad,local));
 assert.equal(JSON.stringify(local),before);
});
test('capacity cap rejects oversized imported backups',()=>{
 const input={format:'atlas-workboard',version:1,items:Array.from({length:MAX_WORK_ITEMS+1},
  (_,i)=>task('batch_'+i.toString().padStart(6,'0')))};
 assert.throws(()=>restoreWorkBackup(input),/invalid-format/);
});
test('GitHub suggestions are only grounded in visible failure, QA, PR and HTTP evidence',()=>{
 const p=[
  {name:'dev-control-center',category:'web',ci:{state:'failure'},openPRs:2},
  {name:'QingJi',category:'tool',runtimeQa:{isCurrent:true,status:'fail'}},
  {name:'azure-coast',category:'game',probe:{state:'resource_error'}},
  {name:'Saintlaurent',category:'web',ci:{state:'success'},openPRs:0},
  {name:'../unsafe',category:'game',ci:{state:'failure'}},
  {name:'oldgame',runtimeQa:{isCurrent:false,status:'timeout'}}
 ];
 const suggested=workSuggestions(p);
 assert.equal(suggested.length,4);
 assert.ok(suggested.some(x=>x.repo==='dev-control-center'&&x.priority==='P0'));
 assert.ok(suggested.some(x=>x.repo==='QingJi'&&x.title.includes('浏览器')));
 assert.ok(suggested.some(x=>x.repo==='azure-coast'&&x.title.includes('站点')));
 assert.ok(!suggested.some(x=>x.repo==='Saintlaurent'||x.repo==='../unsafe'||x.repo==='oldgame'));
});
