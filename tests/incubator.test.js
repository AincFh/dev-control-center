import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGES,CHECKS,MAX_CANDIDATES,validCandidateName,loadCandidates,addCandidate,patchCandidate,removeCandidate,tallyCandidates,searchCandidates,createBackup,restoreBackup,issueDraft} from '../incubator-core.js';
test('candidate stages are independent of real GitHub and publication states',()=>{
 assert.deepEqual(STAGES.map(x=>x.id),['inbox','review','design','ready','hold']);
 assert.equal(CHECKS.length,4);
});
test('validates GitHub repository names and deduplicates without trusting input',()=>{
 assert.equal(validCandidateName('a/example'),true);
 for(const bad of ['https://github.com/a/b','a/b/c','javascript:alert(1)','a/','',null])assert.equal(validCandidateName(bad),false);
 const items=loadCandidates([{name:'A/Test',stage:'unknown',checks:{license:'true'},note:'X'.repeat(2200)},{name:'a/test'},{name:'B/Next',checks:{license:true}}]);
 assert.equal(items.length,2);assert.equal(items[0].stage,'inbox');assert.equal(items[0].note.length,2000);
 assert.equal(items[0].checks.license,false);assert.equal(items[1].checks.license,true);
});
test('adding and updating candidates preserves unrelated cards',()=>{
 const one=addCandidate([],'Org/MyGame','生活');
 const again=addCandidate(one,'org/mygame','x');
 assert.strictEqual(again,one);
 const updated=patchCandidate(one,'ORG/MYGAME',{stage:'design',note:'new scope',checks:{license:true}});
 assert.equal(updated[0].stage,'design');
 assert.equal(updated[0].checks.license,true);
 assert.equal(updated[0].checks.assets,false);
 assert.equal(one[0].stage,'inbox');
 assert.deepEqual(removeCandidate(updated,'Org/MyGame'),[]);
});
test('counts stages, supports search and stable date-order',()=>{
 const items=loadCandidates([{name:'A/Fishing',genre:'钓鱼',stage:'review',updated:'2026-11-01T00:00:00Z',checks:{}},{name:'B/City',genre:'城市',stage:'ready',updated:'2026-11-03T00:00:00Z',checks:Object.fromEntries(CHECKS.map(c=>[c.id,true]))}]);
 assert.equal(tallyCandidates(items).checked,1);
 assert.equal(tallyCandidates(items).counts.ready,1);
 assert.equal(searchCandidates(items)[0].name,'B/City');
 assert.equal(searchCandidates(items,'钓鱼').length,1);
 assert.equal(searchCandidates(items,'','review').length,1);
});
test('backup format validates and roundtrips, importing matching record intentionally replaces it',()=>{
 const a=addCandidate([],'A/Repo');const b=patchCandidate(a,'A/Repo',{note:'updated'});
 const backup=createBackup(b);
 assert.equal(backup.schemaVersion,1);
 assert.deepEqual(restoreBackup(backup,a),b);
 assert.throws(()=>restoreBackup({schemaVersion:1,candidates:[]}),/备份/);
 assert.throws(()=>restoreBackup({...backup,candidates:Array(MAX_CANDIDATES+1).fill({name:'A/x'})}),/备份/);
});
test('issue drafts never pretend a candidate is already released or a real PR',()=>{
 const item=patchCandidate(addCandidate([],'a/fishing'),'a/fishing',{stage:'ready',note:'Build an accessible fishing sim',checks:{license:true}});
 const draft=issueDraft(item);
 assert.match(draft.body,/第三方来源/);
 assert.match(draft.body,/\[x\] 代码许可证/);
 assert.match(draft.body,/未通过完整 Playtest/);
 assert.match(decodeURIComponent(draft.url),/issues\/new\?title=/);
});
