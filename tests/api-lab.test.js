import test from 'node:test';
import assert from 'node:assert/strict';
import {API_LAB_ENDPOINTS,parsePublicRepo,makePublicRequest,parseRateLimit,publicFacts,flattenResponse,comparePublicFacts,apiLabReport} from '../api-lab-core.js';

test('exactly eight read-only fixed public GitHub endpoints are allowed',()=>{
 assert.equal(API_LAB_ENDPOINTS.length,8);
 assert.equal(new Set(API_LAB_ENDPOINTS.map(x=>x.id)).size,8);
 const requested=API_LAB_ENDPOINTS.map(x=>makePublicRequest('AincFh/dev-control-center',x.id));
 for(const x of requested){
  assert.equal(x.method,'GET');
  assert.match(x.url,/^https:\/\/api\.github\.com\/repos\/AincFh\/dev-control-center(?:\/|\?|$)/);
  assert.doesNotMatch(x.url,/token|authorization|access_token/i);
 }
 assert.match(requested.find(x=>x.endpoint==='issues').url,/per_page=20/);
 assert.throws(()=>makePublicRequest('AincFh/dev-control-center','graphql'),/不支持/);
});
test('strict GitHub owner/repo parser rejects path injection, query or arbitrary URL',()=>{
 assert.equal(parsePublicRepo(' AincFh /dev-control-center '.replace(' /','/')),'AincFh/dev-control-center');
 assert.equal(parsePublicRepo('https://github.com/AincFh/QingJi.git'),'AincFh/QingJi');
 for(const bad of ['','foo','../secrets','AincFh/../xyz','AincFh/.','AincFh/..',
  'https://github.com/AincFh/QingJi/issues','https://github.com/AincFh/QingJi?token=secret',
  'https://evil.com/AincFh/QingJi','https://github.com.evil.com/AincFh/QingJi',
  'AincFh/QingJi?x=1','AincFh/QingJi#frag','AincFh/QingJi/','AincFh/a\nHeader:evil'])
  assert.throws(()=>parsePublicRepo(bad));
});
test('rate headers reflect actual GitHub response, not fabricated quota',()=>{
 const h=new Headers({'x-ratelimit-limit':'60','x-ratelimit-remaining':'9','x-ratelimit-reset':'1783420000'});
 const r=parseRateLimit(h);
 assert.equal(r.limit,60);assert.equal(r.remaining,9);
 assert.ok(r.resetAt?.endsWith('Z'));
 assert.deepEqual(parseRateLimit(new Headers()),{remaining:null,limit:null,resetAt:null});
});
test('metadata and language responses use real API fields without inferring quality',()=>{
 const facts=publicFacts({full_name:'AincFh/QingJi',stargazers_count:24,forks_count:2,open_issues_count:3,
  language:'Kotlin',default_branch:'main',license:{spdx_id:'MIT'}},'repository');
 assert.equal(new Map(facts.facts).get('Stars'),24);
 assert.equal(new Map(facts.facts).get('主语言'),'Kotlin');
 assert.equal(new Map(facts.facts).get('许可'),'MIT');
 const lang=publicFacts({JavaScript:1234,TypeScript:800,Other:12},'languages');
 assert.deepEqual(lang.facts[0],['JavaScript',1234]);
 assert.throws(()=>publicFacts({message:'Bad response'},'repository'),/完整名称/);
});
test('GitHub Issues endpoint excludes PRs from returned issue sample',()=>{
 const records=[{number:10,title:'Real issue',state:'open'},
  {number:11,title:'PR wrapper',pull_request:{url:'https://api.github.com/...'},state:'open'},
  {number:12,title:'Another',state:'open'}];
 const f=publicFacts(records,'issues');
 assert.equal(f.sampleCount,3);
 assert.equal(f.items.length,2);
 assert.match(f.items[0].label,/#10/);
 assert.throws(()=>publicFacts({message:'bad'},'issues'),/格式不正确/);
});
test('workflow run and commit rows show only observed data',()=>{
 const runs=publicFacts({workflow_runs:[{name:'CI',run_number:12,conclusion:'failure'}]},'runs');
 assert.equal(runs.items[0].detail,'failure');
 const commits=publicFacts([{sha:'abcdef1234567890',commit:{message:'fix bug\nextra line',committer:{date:'2026-11-06'}}}],'commits');
 assert.match(commits.items[0].label,/fix bug/);
 assert.doesNotMatch(commits.items[0].label,/extra line/);
});
test('JSON field tree is bounded and cross-repo comparison is source-aware',()=>{
 const cycle={repo:'A'};cycle.self=cycle;
 const x=flattenResponse(cycle,{maxNodes:50});
 assert.ok(x.rows.length<=50);
 assert.match(x.rows[0].path,/^\$$/);
 const a={repository:'AincFh/AincFh',endpoint:'repository',state:'ok',facts:{facts:[['Stars',10],['Forks',2]]}};
 const b={repository:'AincFh/QingJi',endpoint:'repository',state:'ok',facts:{facts:[['Stars',8],['Forks',2]]}};
 const result=comparePublicFacts(a,b);
 assert.deepEqual(result.rows.map(x=>x.different),[true,false]);
 assert.equal(comparePublicFacts(a,{...b,endpoint:'runs'}),null);
});
test('offline report distinguishes HTTP evidence and GitHub limits',()=>{
 const spec=makePublicRequest('AincFh/QingJi','repository');
 const markdown=apiLabReport([{...spec,state:'ok',httpStatus:200,checkedAt:'2026-11-06T14:00:00Z',
  rate:{remaining:8},facts:{facts:[['Stars',7]]}},null,
  {...spec,state:'error',httpStatus:403,message:'API rate limit exceeded',checkedAt:'2026-11-06T14:01:00Z',rate:null}]);
 assert.match(markdown,/HTTP 状态：200/);
 assert.match(markdown,/HTTP 状态：403/);
 assert.match(markdown,/Stars：7/);
 assert.match(markdown,/API rate limit exceeded/);
 assert.match(markdown,/不含用户身份/);
});
test('API lab HTML routing, command search and deploy graph are wired to real entrypoints',async()=>{
 const {readFileSync}=await import('node:fs');
 const html=readFileSync('index.html','utf8'),app=readFileSync('app.js','utf8'),build=readFileSync('scripts/build-status.mjs','utf8');
 for(const id of ['apiLabForm','apiLabRepoA','apiLabRepoB','apiLabCompareEnabled','apiLabEndpoint',
 'apiLabRun','apiLabCancel','apiLabClear','apiLabStatus','apiLabResult1','apiLabResult2',
 'apiLabFilter','apiLabCompare','apiLabExport','apiLabJson'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/data-view-link="api-lab"/);
 assert.match(html,/href="\.\/api-lab\.css"/);
 assert.match(app,/initApiLab\(\)/);
 assert.match(build,/api-lab-core\.js/);
});
