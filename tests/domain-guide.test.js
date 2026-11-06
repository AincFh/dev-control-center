import test from'node:test';
import assert from'node:assert/strict';
import {readFileSync} from'node:fs';
import{DOMAIN_GROUPS,DOMAIN_BLUEPRINTS,domainGroup,domainPlan,domainPlanMarkdown,domainCoverage}from'../domain-guide-core.js';
import{normalizeCatalog,filterCatalog}from'../universe-core.js';
const catalog=normalizeCatalog(JSON.parse(readFileSync('data/github-universe.json','utf8')));
test('42 real GitHub research categories have exactly one unique playbook',()=>{
 const ids=DOMAIN_GROUPS.flatMap(g=>g.categories);
 assert.equal(ids.length,42);
 assert.equal(new Set(ids).size,42);
 assert.deepEqual(new Set(ids),new Set(Object.keys(DOMAIN_BLUEPRINTS)));
 const result=domainCoverage(catalog.categories);
 assert.equal(result.covered,42);
 assert.equal(result.total,42);
 assert.deepEqual(result.missing,[]);
 assert.deepEqual(result.untracked,[]);
});
test('a five-stage domain-specific plan exists for every sector',()=>{
 for(const cat of catalog.categories){
  const plan=domainPlan(cat.id,{label:cat.name});
  assert.equal(plan.phases.length,5,cat.id);
  assert.equal(plan.category,cat.id);
  assert.equal(plan.group,domainGroup(cat.id));
  assert.ok(plan.goal.length>4);
  assert.equal(plan.features.length,3);
  assert.ok(plan.phases.every(x=>x.tasks.length>=3));
  assert.ok(plan.acceptance.length>=6);
  assert.ok(filterCatalog(catalog.items,{genre:cat.id}).length>0);
 }
});
test('source-bound blueprint is specific, exportable and explicit about license review',()=>{
 const plan=domainPlan('devtools',{repo:'hoppscotch/hoppscotch',label:'开发者工具'});
 const exported=domainPlanMarkdown(plan,{generatedAt:'2026-11-06T15:00:00Z'});
 assert.equal(plan.source,'https://github.com/hoppscotch/hoppscotch');
 assert.ok(exported.includes('参考来源：https://github.com/hoppscotch/hoppscotch'));
 assert.ok(exported.includes('源码、素材、图标、字体、依赖和模型'));
 assert.ok(exported.includes('产品实现：未开展或待提供真实 commit/CI/功能证据'));
 assert.ok(exported.includes('五阶段')===false);
 assert.ok(exported.includes('05 · 交付与维护'));
});
test('unknown categories, malformed GitHub paths and invalid plans fail closed',()=>{
 assert.throws(()=>domainPlan('totally-fake'),/Unknown ATLAS domain/);
 for(const repo of ['https://github.com/a/b','a/b/c','a/b?token=x','../evil']){
  assert.throws(()=>domainPlan('ai',{repo}),/Invalid GitHub repository/);
 }
 assert.throws(()=>domainPlanMarkdown({category:'missing'}),/Invalid domain plan/);
});
test('no private or non-GitHub sources are accepted as blueprint repository paths',()=>{
 const bad=domainPlan('ai',{repo:'openai/whisper'});
 assert.equal(bad.source,'https://github.com/openai/whisper');
 assert.equal(domainGroup('missing'),null);
});
