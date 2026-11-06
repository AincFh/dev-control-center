import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareBlueprintExecution,blueprintWorkCategory,blueprintWorkScope} from '../blueprint-execution-core.js';
import {checkWorkGraph,upsertWorkItem,MAX_WORK_ITEMS} from '../workboard-core.js';

const target='dev-control-center';
const request={category:'database',sourceRepo:'sqlite/sqlite',repo:target,label:'数据库工程'};
test('42-domain blueprint converts into five coherent dependent tasks with preserved provenance',()=>{
 const out=prepareBlueprintExecution([],request);
 assert.equal(out.added,5);
 assert.equal(out.skipped,0);
 assert.equal(out.items.length,5);
 assert.equal(checkWorkGraph(out.items),null);
 assert.deepEqual(out.items.map(x=>x.effortUnits),[2,4,12,6,4]);
 assert.equal(out.category,'infra');
 assert.deepEqual(out.items.map(x=>x.dependsOn),[[],[out.ids[0]],[out.ids[1]],[out.ids[2]],[out.ids[3]]]);
 assert(out.items.every(x=>x.repo===target&&x.stage==='backlog'));
 assert(out.items.every(x=>x.description.includes('sqlite/sqlite')));
 assert(out.items.every(x=>x.description.includes('不证明第三方源码授权')));
});
test('re-import never overwrites manual progress, ownership, effort or acceptance edits',()=>{
 const first=prepareBlueprintExecution([],request);
 const altered=upsertWorkItem(first.items,{...first.items[0],stage:'done',owner:'开发组',effortUnits:8});
 assert.equal(altered.reason,null);
 const second=prepareBlueprintExecution(altered.items,request);
 assert.equal(second.added,0);
 assert.equal(second.skipped,5);
 assert.deepEqual(second.items,altered.items);
});
test('same domain with different upstream or destination has independent identity',()=>{
 const a=prepareBlueprintExecution([],request);
 const b=prepareBlueprintExecution(a.items,{...request,sourceRepo:'duckdb/duckdb'});
 const c=prepareBlueprintExecution(b.items,{...request,repo:'AincFh'});
 assert.equal(b.added,5);
 assert.equal(c.added,5);
 assert.equal(c.items.length,15);
 assert.equal(new Set(c.items.map(x=>x.id)).size,15);
});
test('all supported domain group classifications and stable fingerprint',()=>{
 const pairs=[['system','system'],['mobile','mobile'],['automation','ai'],['web3d','game'],
  ['education','web'],['devtools','tool'],['cloud','infra'],['robotics','ai']];
 for(const [domain,expected]of pairs)assert.equal(blueprintWorkCategory(domain),expected);
 assert.equal(blueprintWorkScope(request),blueprintWorkScope(request));
 assert.notEqual(blueprintWorkScope(request),blueprintWorkScope({...request,repo:'AincFh'}));
});
test('reject malformed domain, source, target and timestamps atomically',()=>{
 for(const patch of [{category:'bad-category'},{repo:'../other'},{repo:'owner/foreign'},
  {sourceRepo:'github.com/org/repo'}]){
  assert.throws(()=>prepareBlueprintExecution([],{...request,...patch}));
 }
 assert.throws(()=>prepareBlueprintExecution([],request,'not-a-time'));
});
test('reject existing ID conflict without clobbering it',()=>{
 const initial=prepareBlueprintExecution([],request);
 const conflicting=[{...initial.items[0],description:'Another manually created record'}];
 assert.throws(()=>prepareBlueprintExecution(conflicting,request),/冲突/);
 assert.equal(conflicting[0].description,'Another manually created record');
});
test('capacity limit is atomic (no partial four-of-five imports)',()=>{
 const initial=prepareBlueprintExecution([],request);
 const filler=Array.from({length:MAX_WORK_ITEMS-4},(_,i)=>({
  ...initial.items[0],id:'filler_'+String(i).padStart(5,'0'),
  dependsOn:[],description:'manual item'
 }));
 assert.equal(filler.length,MAX_WORK_ITEMS-4);
 assert.throws(()=>prepareBlueprintExecution(filler,request),/上限/);
 assert.equal(filler.length,MAX_WORK_ITEMS-4);
});
test('invalid pre-existing graph fails closed',()=>{
 const initial=prepareBlueprintExecution([],request).items;
 const broken=[...initial.map(x=>({...x}))];
 broken[0]={...broken[0],dependsOn:[broken[4].id]};
 assert.equal(checkWorkGraph(broken),'dependency');
 assert.throws(()=>prepareBlueprintExecution(broken,request),/损坏/);
});
test('no upstream source is valid as planning only; no false license success',()=>{
 const a=prepareBlueprintExecution([],{category:'web',repo:target});
 assert.equal(a.added,5);
 assert(a.items[0].description.includes('尚未选定'));
 assert(a.items[0].description.includes('必须人工核实'));
});
