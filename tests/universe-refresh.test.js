import test from'node:test';import assert from'node:assert/strict';
import{mergeRows,validPath,workload,searchPublic}from'../scripts/refresh-universe.mjs';
test('dedupe preserves original category and excludes unsafe remote names',()=>{
 const out=mergeRows([['A/Repo','life']],[['a/repo','arcade'],['B/Two','life'],['bad/path/extra','life']],new Set(['life','arcade']));
 assert.deepEqual(out,[['A/Repo','life'],['B/Two','life']]);assert.equal(validPath('http://attack'),false)
});
test('capped growth never deletes originals',()=>assert.deepEqual(mergeRows([['A/One','life']],[['B/Two','life']],new Set(['life']),1),[['A/One','life']]));
test('trusted searches expand into rotating second-page scan',()=>{
 const q=Array.from({length:24},(_,i)=>({genre:'life',q:'game '+i,ok:true}));
 const jobs=workload(q,{secondPages:5,day:4});assert.equal(jobs.length,29);assert.equal(jobs.filter(x=>x.page===2).length,5)
});
test('search rejects private or archived repositories',async()=>{
 const result=await searchPublic({q:'games',page:1},null,async()=>({ok:true,json:async()=>({items:[{full_name:'A/Game',private:false,archived:false},{full_name:'B/Private',private:true},{full_name:'C/Archive',private:false,archived:true}]})}));
 assert.deepEqual(result,['A/Game']);
});
test('rate limits report a failure rather than fabricated projects',async()=>{
 await assert.rejects(()=>searchPublic({q:'games',page:1},null,async()=>({ok:false,status:403})),/403/);
});

test('scheduled refresh retains new software topics without losing legacy game topics',()=>{
 const jobs=workload([{genre:'game',q:'game simulation',ok:true},{genre:'ai',q:'topic:ai-agent',ok:true},{genre:'devtools',q:'topic:developer-tools',ok:true}],{secondPages:2,day:0});
 assert.ok(jobs.some(x=>x.genre==='ai'&&x.q==='topic:ai-agent'));
 assert.ok(jobs.some(x=>x.genre==='devtools'&&x.q==='topic:developer-tools'));
 assert.ok(jobs.some(x=>x.genre==='game'&&x.q==='game simulation'));
});

test('scheduled GitHub refresh scans all disciplines before repeating categories',()=>{
 const topics=Array.from({length:18},(_,i)=>({genre:'group'+i,q:'topic:source-'+i,ok:true}));
 const mixed=[...topics,...Array.from({length:72},(_,i)=>({genre:'game',q:'game '+i,ok:true}))];
 const jobs=workload(mixed,{secondPages:9,day:7,maxBaseQueries:30});
 assert.equal(jobs.filter(x=>x.page===1).length,30);
 assert.equal(new Set(jobs.filter(x=>x.page===1).map(x=>x.genre)).size,19);
 assert.equal(jobs.filter(x=>x.page===2).length,9);
 assert.equal(new Set(jobs.filter(x=>x.page===2).map(x=>x.genre)).size,9);
});
