import test from'node:test';import assert from'node:assert/strict';
import{siteEvidence}from'../site-core.js';
const SHA='a'.repeat(40),NOW=Date.parse('2026-11-05T09:00:00Z');
const trace=(updated='2026-11-05T08:30:00Z',url='https://aincfh.github.io/demo/',sha=SHA)=>({prs:[{
 state:'merged',mergeSha:SHA,deployment:{verified:true,state:'success',sha,url,updatedAt:updated}}]});
test('live site can be proven from a same SHA successful GitHub Pages Deployment',()=>{
 const s=siteEvidence({pages:{status:'unknown',html_url:'https://aincfh.github.io/demo/'},trace:trace(),now:NOW});
 assert.equal(s.state,'published');assert.equal(s.url,'https://aincfh.github.io/demo/');
 assert.equal(s.source,'github_deployment');assert.equal(s.deploymentSha,SHA);
});
test('Pages built or active is supported; 404/missing pages means unknown, not not_published',()=>{
 assert.equal(siteEvidence({pages:{status:'active',html_url:'https://aincfh.github.io/demo/'},now:NOW}).state,'published');
 assert.equal(siteEvidence({pages:null,now:NOW}).state,'unknown');
 assert.equal(siteEvidence({pages:{status:'not_active'},now:NOW}).state,'unknown');
});
test('stale, wrong SHA, hostile or mismatching URLs do not become published',()=>{
 assert.equal(siteEvidence({trace:trace('2026-08-01T00:00:00Z'),now:NOW}).state,'unknown');
 assert.equal(siteEvidence({trace:trace('2026-11-05T08:30:00Z','javascript:alert(1)'),now:NOW}).state,'unknown');
 assert.equal(siteEvidence({trace:trace('2026-11-05T08:30:00Z','https://attacker.invalid/'),pages:{html_url:'https://aincfh.github.io/demo/'},now:NOW}).state,'unknown');
 assert.equal(siteEvidence({trace:trace(undefined,undefined,'b'.repeat(40)),now:NOW}).state,'unknown');
});
test('building and errored are not success',()=>{
 assert.equal(siteEvidence({pages:{status:'building'},now:NOW}).state,'building');
 assert.equal(siteEvidence({pages:{status:'errored'},now:NOW}).state,'error');
});
