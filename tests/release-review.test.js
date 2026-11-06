import test from 'node:test';
import assert from 'node:assert/strict';
import {isSnapshotFresh,reviewRepository,reviewPortfolio,filterReviews,releaseReviewMarkdown} from '../release-review-core.js';
const NOW=Date.parse('2026-11-06T10:00:00.000Z');
const SNAPSHOT={generatedAt:'2026-11-06T09:00:00.000Z'};
const web=(fields={})=>({name:'my-anime-blog',label:'A.T. FIELD',category:'web',
 ci:{state:'success'},site:{state:'published',source:'pages_api'},probe:{state:'reachable'},...fields});
const game=(fields={})=>({name:'cozy-bistro-sim',label:'Bistro',category:'game',
 ci:{state:'success'},site:{state:'published'},runtimeQa:{status:'pass',isCurrent:true},...fields});
const review=p=>reviewRepository(p,{generatedAt:SNAPSHOT.generatedAt,now:NOW});
test('snapshot validity rejects stale, unknown and future timestamps',()=>{
 assert.equal(isSnapshotFresh(SNAPSHOT.generatedAt,NOW),true);
 assert.equal(isSnapshotFresh('2026-11-04T00:00:00Z',NOW),false);
 assert.equal(isSnapshotFresh('2026-11-06T12:00:00Z',NOW),false);
 assert.equal(isSnapshotFresh('bad timestamp',NOW),false);
});
test('a green CI and Pages URL are not a public product release certificate',()=>{
 const a=review(web());
 assert.equal(a.state,'human');
 assert.equal(a.steps.find(s=>s.key==='manual').status,'unknown');
 assert.equal(a.passed,4);
 assert.match(a.next,/人工验收/);
 const unknown=review(web({probe:{state:'unknown'}}));
 assert.equal(unknown.state,'evidence');
 assert.equal(unknown.steps.find(s=>s.key==='run').status,'unknown');
});
test('native Android and OS products do not inherit web Pages gates',()=>{
 const android=reviewRepository({name:'QingJi',category:'mobile',ci:{state:'success'},site:{state:'published'},probe:{state:'reachable'}},{...SNAPSHOT,now:NOW});
 assert.equal(android.state,'evidence');
 assert.equal(android.steps.find(s=>s.key==='ship').status,'unknown');
 assert.equal(android.steps.find(s=>s.key==='run').status,'unknown');
 assert.match(android.next,/安装产物/);
 const os=review({name:'AincFh',category:'system',ci:{state:'success'}});
 assert.equal(os.state,'evidence');
 assert.equal(os.web,false);
});
test('fresh browser QA is independent of stale CI; old success never promotes the release',()=>{
 const stale=reviewRepository(game(),{generatedAt:'2026-10-01T00:00:00Z',now:NOW});
 assert.equal(stale.state,'evidence');
 assert.equal(stale.steps.find(s=>s.key==='ci').status,'unknown');
 assert.equal(stale.steps.find(s=>s.key==='run').status,'pass');
 const noQa=review(game({runtimeQa:{status:'pass',isCurrent:false}}));
 assert.equal(noQa.state,'evidence');
});
test('current workflow and runtime errors outrank apparent successes',()=>{
 assert.equal(review(web({ci:{state:'failure'}})).state,'attention');
 assert.equal(review(web({probe:{state:'resource_error'}})).state,'attention');
 assert.equal(review(game({runtimeQa:{status:'timeout',isCurrent:true}})).state,'attention');
 assert.equal(review(game({maturity:'blocked'})).state,'attention');
});
test('cross-domain filters, totals, markdown and validated source URL work',()=>{
 const projects=[web(),game({runtimeQa:{status:'fail',isCurrent:true}}),{name:'QingJi',category:'mobile',ci:{state:'success'}},{name:'AincFh',category:'system',ci:{state:'unknown'}}];
 const p=reviewPortfolio(projects,SNAPSHOT,NOW);
 assert.deepEqual({...p.totals},{all:4,attention:1,human:1,evidence:2,software:1,game:1,web:1,mobile:1});
 assert.equal(filterReviews(p.records,{domain:'software'}).length,1);
 assert.equal(filterReviews(p.records,{domain:'web',state:'human'})[0].name,'my-anime-blog');
 assert.equal(filterReviews(p.records,{query:'qingji'})[0].category,'mobile');
 assert.equal(filterReviews(p.records)[0].name,'cozy-bistro-sim');
 assert.match(releaseReviewMarkdown(p),/并非|不是自动发布审批/);
 assert.match(releaseReviewMarkdown(p),/A\.T\. FIELD/);
 assert.equal(reviewRepository({name:'evil/path',category:'tool'}).sourceUrl,null);
});
test('Delivery view exposes accessible, interactive cross-domain evidence controls',async()=>{
 const {readFileSync}=await import('node:fs');
 const html=readFileSync('index.html','utf8');
 const app=readFileSync('app.js','utf8');
 const build=readFileSync('scripts/build-status.mjs','utf8');
 for(const id of ['releaseOverview','releaseSearch','releaseDomain','releaseState','releaseCount','releaseGrid','releaseReport','releaseFreshness'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/href="\.\/release-review\.css"/);
 assert.match(app,/initReleaseReview/);
 assert.match(app,/updateReleaseReview\(projects,snapshot\)/);
 assert.match(build,/release-review\.css/);
 assert.match(build,/release-review-core\.js/);
});