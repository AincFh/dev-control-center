import test from'node:test';import assert from'node:assert/strict';
import{GAME_QA_CASES,normalizeGameReport,gameReportFreshness,gameEvidenceFor}from'../game-runtime-core.js';
const at='2026-11-05T09:00:00Z',NOW=Date.parse(at);
const report=(items,extra={})=>normalizeGameReport({schemaVersion:1,owner:'AincFh',generatedAt:at,runUrl:'https://github.com/AincFh/dev-control-center/actions/runs/41999431754',results:items,...extra});
test('all ten playable games have real browser scenarios, blocked release remains excluded',()=>{
 assert.equal(GAME_QA_CASES.length,10);
 assert.deepEqual(GAME_QA_CASES.map(x=>x.id),['bistro','paradise','wildlands','fishing','factory','citylife','mori','qube','cimulity','spacefortress']);
});
test('strict provenance accepts only known game and proper checks; failures dominate',()=>{
 const a=report([{id:'bistro',repo:'cozy-bistro-sim',status:'pass',checks:[{id:'start',label:'开店',status:'pass'},{id:'order',label:'新订单',status:'fail',reason:'missing'}]},
 {id:'bistro',repo:'cozy-bistro-sim',status:'pass'}, {id:'unapproved',repo:'evil',status:'pass'},
 {id:'paradise',repo:'wrong-repo',status:'pass'}]);
 assert.equal(a.results.length,1);assert.equal(a.results[0].status,'fail');assert.equal(a.failed,1);
});
test('freshness is distinct from game completion',()=>{
 const r=report([{id:'wildlands',repo:'wildlands-anglerfishing-world-3d',status:'pass',checks:[{id:'webgl',status:'pass'}]}]);
 assert.equal(gameReportFreshness(r,NOW+60000),'fresh');
 assert.equal(gameReportFreshness(r,NOW+37*3600000),'stale');
 assert.equal(gameEvidenceFor('wildlands-anglerfishing-world-3d',r,NOW+37*3600000).isCurrent,false);
 assert.equal(gameEvidenceFor('cozy-bistro-sim',r,NOW).status,'unknown');
});
test('untrusted URLs never appear in QA report links',()=>{
 const x=report([{id:'fishing',repo:'fishing-world-3d',status:'timeout',message:'No WebGL'}],{runUrl:'javascript:alert(1)'});
 assert.equal(x.runUrl,null);
 assert.equal(x.results[0].status,'timeout');
 assert.equal(normalizeGameReport(null).valid,false);
});

test('real game visual evidence names and measured timings are strictly sanitized',()=>{
 const x=report([{id:'qube',repo:'qubecraft',status:'pass',elapsedMs:14012.3,
  screenshots:['qube-game.png','qube-mobile.png','../../secrets.txt','https://evil.example/x.png','qube-game.png'],
  navigation:{domContentLoadedMs:481.6,loadEventMs:1205,resourceCount:82}}]);
 const row=x.results[0];
 assert.deepEqual(row.screenshots,['qube-game.png','qube-mobile.png']);
 assert.deepEqual(row.navigation,{domContentLoadedMs:482,loadEventMs:1205,resourceCount:82});
 assert.equal(row.elapsedMs,14012);
 const invalid=report([{id:'mori',repo:'Tamagochi---Open-Source-Game',status:'fail',
  screenshots:['qube-mobile.png','mori-failure.png'],
  navigation:{domContentLoadedMs:-100,loadEventMs:Infinity,resourceCount:10000000}}]).results[0];
 assert.deepEqual(invalid.screenshots,['mori-failure.png']);
 assert.deepEqual(invalid.navigation,{domContentLoadedMs:null,loadEventMs:null,resourceCount:10000});
});
