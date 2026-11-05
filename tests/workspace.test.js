import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const html=readFileSync('index.html','utf8'),css=readFileSync('atlas-v3.css','utf8'),app=readFileSync('app.js','utf8'),build=readFileSync('scripts/build-status.mjs','utf8');
const pages=['home','arcade','workstreams','projects','discovery','universe','incubator','mission','delivery','pipeline','activity'];
test('information architecture has eleven separate navigable views',()=>{
 for(const id of pages){assert.match(html,new RegExp('id="'+id+'"'));assert.match(html,new RegExp('data-view-link="'+id+'"'));assert.match(app,new RegExp('(?:^|\\n) '+id+":\\['"));}
 assert.match(css,/\.view\.is-active\s*\{display:block\}/);
 assert.match(app,/window\.addEventListener\('hashchange',route\)/);
});
test('important functional widgets are preserved',()=>{
 for(const id of ['arcadeGrid','arcadePlayable','arcadeSearch','arcadeGenres','discoveryGrid','discoverySearch','grid','query','sort','tabs','deliveryList','queueList','events','workstreamGrid','universeGrid','universeSearch','universeCanvas','universePrev','universeNext','missionCount','missionProjects','missionTaskFeed','missionReviewDialog','missionReport','details','close','refresh','total','live','active','synced','connection'])assert.ok(html.includes('id="'+id+'"'),id);
});
test('real website uses original bundled CSS without remote fonts',()=>{
 assert.match(html,/href="\.\/atlas-v3\.css"/);assert.doesNotMatch(css,/@import\s+url\(https?:/);
 assert.match(build,/atlas-v3\.css/);assert.match(build,/copyFrontendModules/);
});
test('theme/search keyboard features persist and keep accessible controls',()=>{
 assert.match(html,/id="themeBtn"/);assert.match(html,/id="quickFind"/);
 assert.match(app,/atlas-v3-theme/);assert.match(app,/e\.metaKey\|\|e\.ctrlKey/);
 assert.match(app,/aria-current/);
});
test('game routes remain real and blocked previews never appear by default',()=>{
 assert.match(html,/href="https:\/\/aincfh\.github\.io\/wildlands-anglerfishing-world-3d\/"/);
 assert.match(html,/href="https:\/\/aincfh\.github\.io\/City-of-Small-Chances\/"/);
 assert.doesNotMatch(html,/href="https:\/\/aincfh\.github\.io\/qubecraft\/"/);
});
