import test from'node:test';import assert from'node:assert/strict';
import{planDeploymentChecks,normalizeDeploymentEvidence,applyDeploymentEvidence}from'../deploy-core.js';
const SHA='a'.repeat(40),OTHER='b'.repeat(40);
test('only exact merged commit sha and github-pages environment are eligible',()=>{
 const prs=[{number:4,state:'merged',mergeSha:SHA,baseBranch:'main'},{number:5,state:'open',mergeSha:OTHER,baseBranch:'main'}];
 const rows=[{id:1,sha:OTHER,environment:'github-pages'},{id:2,sha:SHA,environment:'staging'},{id:3,sha:SHA,ref:'main',environment:'github-pages'},{id:4,sha:SHA,ref:'dev',environment:'github-pages'}];
 const candidates=planDeploymentChecks(prs,rows,'AincFh','demo');
 assert.equal(candidates.length,1);assert.equal(candidates[0].id,3);
 assert.equal(candidates[0].recordUrl,'https://github.com/AincFh/demo/deployments/3');
 assert.deepEqual(planDeploymentChecks(prs,rows,'AincFh','../unsafe'),[]);
});
test('successful status with trusted Pages URL is deployment evidence',()=>{
 const candidate={id:10,sha:SHA,recordUrl:'https://github.com/AincFh/demo/deployments/10'};
 const result=normalizeDeploymentEvidence(candidate,[{state:'success',created_at:'2026-11-05T08:00:00Z',environment_url:'https://aincfh.github.io/demo/'}],'https://aincfh.github.io/demo/');
 assert.equal(result.state,'success');assert.equal(result.verified,true);
 assert.equal(result.url,'https://aincfh.github.io/demo/');
 assert.equal(result.scope,'exact_merge_commit_sha');
});
test('unknown status, failures and cross-origin URLs must not imply release',()=>{
 const candidate={id:8,sha:SHA,recordUrl:'https://github.com/AincFh/demo/deployments/8'};
 assert.equal(normalizeDeploymentEvidence(candidate,[]).state,'unknown');
 assert.equal(normalizeDeploymentEvidence(candidate,[{state:'error'}]).state,'failure');
 const hostile=normalizeDeploymentEvidence(candidate,[{state:'success',environment_url:'javascript:alert(1)'}],'https://aincfh.github.io/demo/');
 assert.equal(hostile.url,null);
 const origin=normalizeDeploymentEvidence(candidate,[{state:'success',environment_url:'https://evil.github.io/demo/'}],'https://aincfh.github.io/demo/');
 assert.equal(origin.url,null);
 assert.equal(normalizeDeploymentEvidence(candidate,[{state:'waiting'}]).verified,false);
});
test('evidence attaches only to merged PR, preserves original trace and unknowns',()=>{
 const trace={repo:'demo',prs:[{number:1,state:'open'},{number:2,state:'merged'},{number:3,state:'merged'}]};
 const proof={state:'success',sha:SHA};
 const next=applyDeploymentEvidence(trace,[{prNumber:2,evidence:proof}]);
 assert.equal(next.prs[1].deployment,proof);assert.equal(next.prs[2].deployment,null);
 assert.equal(next.prs[0].deployment,undefined);assert.equal(trace.prs[1].deployment,undefined);
});
