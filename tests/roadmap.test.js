import test from 'node:test';import assert from 'node:assert/strict';import {TRACKS,trackedWorkstreams,trackMetrics,readiness} from '../roadmap.js';
test('distinct repositories and several real game workstreams',()=>{assert.equal(new Set(TRACKS.map(x=>x.repo)).size,TRACKS.length);assert.ok(TRACKS.filter(x=>x.category==='game').length>=3);assert.ok(TRACKS.some(x=>x.repo==='cozy-bistro-sim'))});
test('unseen repositories remain unknown',()=>{const a=trackedWorkstreams([]);assert.ok(a.every(t=>!t.known&&t.ci==='unknown'))});
test('success in CI cannot bypass product release gate',()=>{const x=trackedWorkstreams([{name:'azure-coast',ci:{state:'success'}}]).find(t=>t.repo==='azure-coast');assert.equal(x.ci,'success');assert.equal(x.maturity,'blocked')});
test('roadmap summaries use actual repo visibility',()=>{const a=trackMetrics([{name:'dev-control-center'},{name:'cozy-bistro-sim'},{name:'fishing-world-3d'}]);assert.equal(a.visible,3);assert.equal(a.prototypes,1)});
test('maturity labels are truthful',()=>{assert.equal(readiness('prototype'),'原型期');assert.equal(readiness('blocked'),'发布门禁未满足')});
test('public non-game tracks are first-class and cover systems, web, mobile and tools',()=>{
 const nonGame=TRACKS.filter(x=>x.category!=='game');
 assert.ok(nonGame.length>=5);
 for(const repo of ['dev-control-center','AincFh','my-anime-blog','QingJi','squiffy'])
  assert.ok(nonGame.some(x=>x.repo===repo),repo);
 for(const cat of ['platform','system','web','mobile','tool'])
  assert.ok(nonGame.some(x=>x.category===cat),cat);
 const metric=trackMetrics(nonGame.map(x=>({name:x.repo,ci:{state:'unknown'}})));
 assert.equal(metric.nonGames,nonGame.length);
 assert.equal(metric.visible,nonGame.length);
});
test('private Saint Laurent projects never enter the public project roadmap',()=>{
 assert.ok(!TRACKS.some(x=>['Saintlaurent','shengluolan-app'].includes(x.repo)));
 assert.equal(readiness('fork-reference'),'Fork · 验收待核对');
});
