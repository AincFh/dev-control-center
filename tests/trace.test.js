import test from'node:test';import assert from'node:assert/strict';
import{issueReferences,normalizeTracePR,normalizeTraceRun,associateChecks,traceForRepo,traceOverview,filterTrace,traceReport}from'../trace-core.js';
const sha=x=>x.repeat(40),head=sha('a'),merge=sha('b');
const pr=(number,body,state='open')=>({number,title:'Implement game #'+number,body,state,draft:false,
 updated_at:'2026-11-05T08:00:00Z',merged_at:state==='closed'?'2026-11-05T08:15:00Z':null,
 merge_commit_sha:merge,head:{sha:head,ref:'feat/angler'},base:{ref:'main'}});
const run=(id,s,b,event,conclusion='success')=>({id,name:'Test game',head_sha:s,head_branch:b,event,
 status:'completed',conclusion,updated_at:'2026-11-05T08:10:00Z'});
test('closing keywords only refer to the same repo, with duplicates removed',()=>{
 const input=['Fixes #2','Closes AincFh/demo#3','resolves Other/demo#8','ref #13','fixes #3'].join('\n');
 assert.deepEqual(issueReferences(input,'AincFh','demo'),[2,3]);
 assert.deepEqual(issueReferences('Fixes AincFh/other#6','AincFh','demo'),[]);
});
test('PR identity URLs do not trust arbitrary HTML destinations',()=>{
 const p=normalizeTracePR({...pr(12,'Fixes #2'),html_url:'javascript:evil()'},'AincFh','demo');
 assert.equal(p.url,'https://github.com/AincFh/demo/pull/12');assert.deepEqual(p.closes,[2]);
 assert.equal(normalizeTracePR(pr(13,'','closed'),'AincFh','demo').mergeSha,merge);
 assert.equal(normalizeTracePR({...pr(13,'','closed'),merged_at:null},'AincFh','demo'),null);
});
test('PR checks only match exact head sha, branch and pull_request event',()=>{
 const rows=[normalizeTraceRun(run(1,head,'feat/angler','pull_request'),'AincFh','demo'),
 normalizeTraceRun(run(2,head,'other','pull_request','failure'),'AincFh','demo'),
 normalizeTraceRun(run(3,head,'main','push','failure'),'AincFh','demo')];
 const state=associateChecks(normalizeTracePR(pr(2,''),'AincFh','demo'),rows);
 assert.equal(state.state,'success');assert.equal(state.checked,1);
 assert.equal(associateChecks(normalizeTracePR(pr(2,'','closed'),'AincFh','demo'),rows).state,'unknown');
 const main=associateChecks(normalizeTracePR(pr(2,'','closed'),'AincFh','demo'),
 [normalizeTraceRun(run(4,merge,'main','push'),'AincFh','demo')]);
 assert.equal(main.state,'success');
});
test('collector includes recent merged work, excludes closed-unmerged and labels issue references',()=>{
 const t=traceForRepo({repo:'demo',issues:[{number:2,title:'Roadmap'},{number:9,pull_request:{}}],
 openPRs:[pr(12,'Fixes #2'),pr(13,'Closes #77')],
 closedPRs:[pr(14,'fixes #3','closed'),{...pr(15,'','closed'),merged_at:null}],
 prRuns:[normalizeTraceRun(run(1,head,'feat/angler','pull_request'),'AincFh','demo')],
 branchRuns:[normalizeTraceRun(run(2,merge,'main','push'),'AincFh','demo')]});
 assert.equal(t.prs.length,3);assert.equal(t.issues.length,1);
 assert.equal(t.prs[0].phase,'review');
 assert.equal(t.prs[0].links[0].verifiedOpen,true);
 assert.equal(t.prs[1].links[0].verifiedOpen,false);
 assert.equal(t.prs[2].phase,'merged_checked');
});
test('overview report explicitly distinguishes source evidence and deployment',()=>{
 const raw=traceForRepo({repo:'demo',openPRs:[pr(1,'Fixes #2')]});
 const summary=traceOverview([{name:'demo',trace:raw,site:{state:'published'},ci:{state:'success'}}]);
 assert.equal(summary.open,1);assert.equal(summary.unknown,1);
 assert.equal(filterTrace(summary.cards,{query:'demo',phase:'open'}).length,1);
 assert.equal(filterTrace(summary.cards,{phase:'failing'}).length,0);
 const report=traceReport(summary);
 assert.match(report,/非完整历史/);assert.match(report,/合并也不自动意味着/);
});