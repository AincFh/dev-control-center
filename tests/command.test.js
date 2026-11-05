import test from'node:test';import assert from'node:assert/strict';
import{COMMAND_ROUTES,commandCollection,searchCommands,rememberCommand}from'../command-core.js';
const fixtures=commandCollection({projects:[{name:'wildlands-anglerfishing-world-3d',label:'山野钓行',description:'真实 3D 生态',ci:{state:'success'}}],games:[{id:'wild',repo:'wildlands-anglerfishing-world-3d',title:'山野钓行 NEXT',english:'WILDLANDS NEXT',tag:'3D 钓鱼',status:'prototype',play:'https://aincfh.github.io/wildlands-anglerfishing-world-3d/next/'},{id:'bad',repo:'azure-coast',title:'海滨城市',status:'blocked',play:'https://aincfh.github.io/azure-coast/'}],external:[{name:'owner/lifegame',owner:'owner',repo:'lifegame',genreName:'生活模拟'}]});
test('routes include mission, incubator, galaxy and 11 real workspaces',()=>{assert.equal(COMMAND_ROUTES.length,11);assert.equal(fixtures.filter(x=>x.kind==='route').length,11);});
test('game commands only launch explicitly verified playable or prototype titles',()=>{
 assert.match(fixtures.find(x=>x.id==='game:wild').url,/github\.io/);
 assert.equal(fixtures.find(x=>x.id==='game:bad').url,'https://github.com/AincFh/azure-coast');
});
test('global search spans pages, game launches, own repositories and external GitHub',()=>{
 assert.equal(searchCommands(fixtures,'研发总控')[0].id,'route:mission');
 assert.ok(searchCommands(fixtures,'3D 钓鱼').some(x=>x.id==='game:wild'));
 assert.ok(searchCommands(fixtures,'wildlands').some(x=>x.kind==='repo'));
 assert.equal(searchCommands(fixtures,'owner/life')[0].kind,'external');
 assert.equal(searchCommands(fixtures,'never-matches').length,0);
});
test('blank search stays lightweight and recent selection is ordered',()=>{
 const recent=rememberCommand(['route:home','route:home'],'game:wild');
 assert.deepEqual(recent,['game:wild','route:home']);
 assert.equal(searchCommands(fixtures,'',{recent})[0].id,'game:wild');
 assert.ok(searchCommands(fixtures,'').every(x=>x.kind==='route'||x.kind==='game'));
});
test('untrusted names are rejected; external references stay third-party',()=>{
 const c=commandCollection({projects:[{name:'../../secret'}],external:[{name:'javascript:bad'},{name:'x/test'},{name:'X/Test'}]});
 assert.equal(c.filter(x=>x.kind==='repo').length,0);
 assert.equal(c.filter(x=>x.kind==='external').length,1);
 assert.equal(c.find(x=>x.kind==='external').url,'https://github.com/x/test');
});
