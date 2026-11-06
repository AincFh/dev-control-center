import test from'node:test';
import assert from'node:assert/strict';
import{externalWorkPackages,importExternalWorkPackages}from'../external-workplan-core.js';
import{upsertWorkItem,MAX_WORK_ITEMS}from'../workboard-core.js';
const source={category:'devtools',repository:'hoppscotch/hoppscotch',label:'开发者工具'};
test('external upstream creates five actual independent work packages with sequential dependencies',()=>{
 const result=externalWorkPackages(source);
 assert.equal(result.length,5);
 assert.equal(new Set(result.map(x=>x.id)).size,5);
 assert.ok(result.every(x=>x.repo==='dev-control-center'&&x.stage==='backlog'));
 assert.ok(result.every(x=>x.category==='tool'));
 assert.ok(result.every(x=>x.description.includes('https://github.com/hoppscotch/hoppscotch')));
 assert.deepEqual(result[0].dependsOn,[]);
 for(let i=1;i<result.length;i++)assert.deepEqual(result[i].dependsOn,[result[i-1].id]);
});
test('import is transactional and repeat import preserves original task progress',()=>{
 const first=importExternalWorkPackages([],source,'2026-11-06T00:00:00.000Z');
 assert.equal(first.reason,null);assert.equal(first.added,5);assert.equal(first.items.length,5);
 const sourceTask=first.items.find(x=>x.dependsOn.length===0);
 const changed=upsertWorkItem(first.items,{...sourceTask,stage:'done'},'2026-11-06T01:00:00.000Z');
 assert.equal(changed.reason,null);
 const repeated=importExternalWorkPackages(changed.items,source);
 assert.equal(repeated.added,0);assert.equal(repeated.reason,null);
 assert.equal(repeated.items.find(x=>x.id===sourceTask.id).stage,'done');
});
test('bad upstream paths are refused without modifying existing plans',()=>{
 const fixtures=[{category:'ai',repository:'../secret'},{category:'unknown',repository:'X/Y'},{category:'ai',repository:'javascript://bad'}];
 const initial=importExternalWorkPackages([],source);
 for(const input of fixtures){const out=importExternalWorkPackages(initial.items,input);assert.ok(out.reason);assert.strictEqual(out.items,initial.items);}
});
test('sectors map to correct execution categories without fake ownership',()=>{
 const ai=externalWorkPackages({category:'ai',repository:'ollama/ollama'});assert.ok(ai.every(x=>x.category==='ai'));
 const game=externalWorkPackages({category:'builder',repository:'owner/builder'});assert.ok(game.every(x=>x.category==='game'));
 const mobile=externalWorkPackages({category:'mobile',repository:'owner/android'});assert.ok(mobile.every(x=>x.category==='mobile'));
 assert.ok(ai.every(x=>x.repo!=='ollama'));
});
test('capacity limits and source hash collisions fail closed without partial commit',()=>{
 const original=importExternalWorkPackages([],source).items;
 const corrupted=original.map((x,i)=>i===0?{...x,description:'different source'}:x);
 assert.equal(importExternalWorkPackages(corrupted,source).reason,'same-id-conflict');
 const fake=Array.from({length:MAX_WORK_ITEMS-2},(_,i)=>({...original[0],id:'dummy_'+String(i).padStart(6,'0')}));
 const result=importExternalWorkPackages(fake,{category:'ai',repository:'ollama/ollama'});
 assert.equal(result.reason,'capacity-limit');assert.strictEqual(result.items,fake);
});
