import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const html=readFileSync('index.html','utf8'),css=readFileSync('atlas-v3.css','utf8'),app=readFileSync('app.js','utf8'),build=readFileSync('scripts/build-status.mjs','utf8');
const arcade=readFileSync('arcade.js','utf8');
const pages=['home','arcade','workstreams','projects','discovery','universe','incubator','workboard','utilities','mission','trace','delivery','pipeline','activity'];
test('information architecture has fourteen navigable views, including workboard and developer utilities',()=>{
 for(const id of pages){assert.match(html,new RegExp('id="'+id+'"'));assert.match(html,new RegExp('data-view-link="'+id+'"'));assert.match(app,new RegExp('(?:^|\\n) '+id+":\\['"));}
 assert.match(css,/\.view\.is-active\s*\{display:block\}/);
 assert.match(app,/window\.addEventListener\('hashchange',route\)/);
});
test('important functional widgets are preserved',()=>{
 for(const id of ['arcadeGrid','gameQAPassed','gameQAFailed','gameQAUnknown','gameQAStamp','gameQACards','gameQARunLink','arcadePlayable','arcadeSearch','arcadeGenres','discoveryGrid','discoverySearch','grid','query','sort','tabs','deliveryList','queueList','events','workstreamGrid','universeGrid','universeSearch','universeCanvas','universePrev','universeNext','missionCount','missionGameQAPass','missionGameQAFail','missionProbeGood','missionProbeBad','missionSiteChecks','missionProjects','missionTaskFeed','missionReviewDialog','missionReport','traceGrid','traceTotal','traceDeployed','traceQuery','traceIssues','traceExport','commandDialog','commandInput','commandResults','details','close','refresh','total','live','active','synced','connection'])assert.ok(html.includes('id="'+id+'"'),id);
});
test('real website uses original bundled CSS without remote fonts',()=>{
 assert.match(html,/href="\.\/atlas-v3\.css"/);assert.doesNotMatch(css,/@import\s+url\(https?:/);
 assert.match(build,/atlas-v3\.css/);assert.match(build,/copyFrontendModules/);
});
test('theme/search keyboard features persist and keep accessible controls',()=>{
 assert.match(html,/id="themeBtn"/);assert.match(html,/id="quickFind"/);
 assert.match(app,/atlas-v3-theme/);assert.match(app,/e\.metaKey\|\|e\.ctrlKey/);
 assert.match(app,/aria-current/);assert.match(app,/initCommandPalette/);
});
test('game routes remain real and blocked previews never appear by default',()=>{
 assert.match(html,/href="https:\/\/aincfh\.github\.io\/wildlands-anglerfishing-world-3d\/"/);
 assert.match(arcade,/repo:'City-of-Small-Chances'/);
 assert.match(arcade,/play:'https:\/\/aincfh\.github\.io\/City-of-Small-Chances\/'/);
 assert.doesNotMatch(html,/href="https:\/\/aincfh\.github\.io\/qubecraft\/"/);
});

test('homepage prioritizes real non-game projects without removing the playable game collection',()=>{
 for(const href of ['https://aincfh.github.io/AincFh/','https://aincfh.dpdns.org','https://github.com/AincFh/QingJi'])
  assert.ok(html.includes('href="'+href+'"'),href);
 assert.match(html,/href="#workstreams">探索研发项目/);
 assert.match(html,/href="#arcade">体验游戏作品/);
 assert.match(html,/class="mini-art mini-os"/);
 assert.match(html,/class="mini-art mini-platform"/);
 assert.match(html,/class="mini-art mini-mobile"/);
 assert.match(css,/\.mini-os\{/);
 assert.match(css,/\.mini-platform\{/);
 assert.match(css,/\.mini-mobile\{/);
 assert.ok(html.includes('GitHub 星图现已覆盖系统、AI、桌面应用'));
 assert.ok(html.includes('id="universeDomains"'));
 assert.ok(html.includes('id="arcade"'));
});

test('external open-source app library integrates provenance and functional exploration',()=>{
 for(const id of ['universeFeaturedShelf','universeFeaturedGrid','universeFeaturedToggle','universeFeaturedCount','universeCompare','universeCompareCount','universeCompareClear','universeCompareExport','universeCompareGrid'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(css.includes('.external-shelf-grid{'));
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.ok(html.includes('第三方'));
});

test('comparison workbench is wired to live source lookups instead of fabricated repository telemetry',()=>{
 const universe=readFileSync('universe.js','utf8');
 assert.ok(universe.includes('function toggleCompare(name)'));
 assert.ok(universe.includes('validateComparison'));
 assert.ok(universe.includes('api.github.com/repos/'));
 assert.ok(universe.includes('scene.comparison.size>=4'));
 assert.ok(html.includes('最近推送')||universe.includes('最近推送'));
});

test('external comparison persists safely and has offline Markdown export',()=>{
 const universe=readFileSync('universe.js','utf8');
 assert.ok(universe.includes('COMPARE_STORE'));
 assert.ok(universe.includes('restoreCompare()'));
 assert.ok(universe.includes('comparisonMarkdown'));
 assert.ok(universe.includes('ATLAS-GitHub-Research-'));
});

test('all-domain studio has grouped constellation and real blueprint controls',()=>{
 const source=readFileSync('sector-lab.js','utf8');
 for(const id of ['universeClusters','universeSectorLab','sectorLabCoverage','sectorLabCategory','sectorLabRepo','sectorLabGenerate','sectorLabFeedback','sectorLabResult','sectorLabExport','sectorLabCandidate','sectorLabIssue'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(css.includes('.sector-lab-phases{'));
 assert.ok(source.includes('function generate()'));
 assert.ok(source.includes('domainPlanMarkdown'));
 assert.ok(source.includes('atlas:add-candidate'));
});

test('local developer utilities are navigable and genuinely interactive',()=>{
 for(const id of ['utilsTabs','utilsCurrentTitle','utilsCurrentDescription','utilsInputA','utilsInputB','utilsMode','utilsRun','utilsClear','utilsOutput','utilsStatus','utilsDownload'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(app.includes('initDeveloperUtils()'));
 assert.ok(css.includes('.utils-workspace{'));
 assert.ok(html.includes('data-view-link="utilities"'));
});
