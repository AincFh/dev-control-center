import test from'node:test';import assert from'node:assert/strict';
import{MAX_PREVIEW,RELEASE_CHECKS,normalizePreview,prepareReleaseEvidence,releaseProgress,assessProject,missionSnapshot,filterMission,reportMarkdown}from'../mission-core.js';
const p=(name,ci='success',issues=0,prs=0)=>({name,label:name,category:'game',ci:{state:ci},openIssues:issues,openPRs:prs,site:{state:'unknown'},updated:'2026-11-01T00:00:00Z'});
const NOW=Date.parse('2026-11-05T10:00:00Z');
test('preview builder strictly uses trusted GitHub paths and limits fields',()=>{
 const entries=Array.from({length:9},(_,i)=>({number:i+1,title:'Sample '+i,html_url:'javascript:evil()',updated_at:'2026-11-01',labels:[{name:'bug'}]}));
 const result=normalizePreview(entries,'issue','atlas');
 assert.equal(result.length,MAX_PREVIEW);
 assert.equal(result[0].url,'https://github.com/AincFh/atlas/issues/1');
 assert.deepEqual(result[0].labels,['bug']);assert.equal(result[0].draft,false);
 assert.deepEqual(normalizePreview(entries,'issue','../../private'),[]);
 assert.deepEqual(normalizePreview([{number:1,title:'PR',pull_request:{}}],'issue','atlas'),[]);
});
test('assessments never treat unknown, running or neutral as successful release',()=>{
 for(const state of ['unknown','neutral','running'])assert.notEqual(assessProject(p('a',state),NOW).state,'success');
 assert.equal(assessProject(p('a','failure'),NOW).score,100);
 assert.equal(assessProject(p('b','success',0,1),NOW).signals[0].type,'review');
 assert.equal(assessProject(p('b','success'),NOW).score,0);
 const stale=assessProject({...p('a'),updated:'2026-08-01T00:00:00Z'},NOW);
 assert.equal(stale.signals.some(x=>x.type==='stale'),true);
 assert.equal(stale.needsAttention,false);
});
test('snapshot freshness and API failure disclosures distinguish no evidence from success',()=>{
 const a=missionSnapshot([p('game','failure',2,1),p('tool','unknown')],{generatedAt:'2026-11-05T09:00:00Z',errors:[{source:'api'}]},NOW);
 assert.equal(a.openIssues,2);assert.equal(a.openPRs,1);assert.equal(a.states.failure,1);assert.equal(a.states.unknown,1);
 assert.equal(a.snapshotState,'fresh');assert.equal(a.errors,1);
 assert.equal(missionSnapshot([],{},NOW).snapshotState,'missing');
 assert.equal(missionSnapshot([],{generatedAt:'2026-11-04T00:00:00Z'},NOW).snapshotState,'stale');
});
test('actionable task samples are partial and cannot contain arbitrary destinations',()=>{
 const x=p('safe','success',10,1);
 x.issuePreview=[{kind:'issue',number:17,title:'test',url:'https://evil.example/steal',updatedAt:'2026-11-04T20:00:00Z'}];
 x.prPreview=[{kind:'pull',number:6,title:'PR',draft:true,updatedAt:'2026-11-05T01:00:00Z'}];
 const a=missionSnapshot([x],{},NOW);
 assert.equal(a.taskPreview[0].number,6);assert.equal(a.taskPreview[1].url,'https://github.com/AincFh/safe/issues/17');
 assert.equal(a.taskPreviewIsPartial,true);
});
test('filter and priority work for cross-project triage',()=>{
 const entries=missionSnapshot([p('healthy'),p('broken','failure'),p('pending','unknown'),p('review','success',0,2)],{},NOW).assessments;
 assert.deepEqual(filterMission(entries,{filter:'failure'}).map(x=>x.name),['broken']);
 assert.deepEqual(filterMission(entries,{filter:'review'}).map(x=>x.name),['review']);
 assert.deepEqual(filterMission(entries,{filter:'unverified'}).map(x=>x.name),['pending']);
 assert.equal(filterMission(entries,{query:'BROKEN'})[0].name,'broken');
 assert.equal(filterMission(entries,{pinnedOnly:true,pinned:new Set(['healthy'])})[0].name,'healthy');
});
test('release evidence is only local and preserves six independent checks',()=>{
 const e=prepareReleaseEvidence({healthy:{checks:{playtest:true,mobile:true,rights:'true'},note:'A'.repeat(1400),updatedAt:'2026-11-05T00:00:00Z'}});
 assert.equal(releaseProgress(e.healthy),2);assert.equal(e.healthy.note.length,1200);
 assert.equal(RELEASE_CHECKS.length,6);
 assert.deepEqual(prepareReleaseEvidence({'../evil':{checks:{}}}),{});
});
test('handoff report explicitly labels uncertainty and partial evidence',()=>{
 const result=missionSnapshot([p('broken','failure',0,4),p('no-ci','unknown')],{},NOW);
 const report=reportMarkdown(result,{evidence:{broken:{checks:{playtest:true}}}});
 assert.match(report,/没有可用任务样本/);assert.match(report,/公开数据快照：未获取/);
 assert.match(report,/CI 成功不代表已发布/);assert.match(report,/broken/);assert.match(report,/1\/6/);
});
