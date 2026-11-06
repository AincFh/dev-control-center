import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{normalizeCatalog,filterCatalog,pageOf,statsOf,validRepoName,balanceGenres,chooseHighlights,comparisonMarkdown,PAGE_SIZE}from'../universe-core.js';
const file=JSON.parse(readFileSync('data/github-universe.json','utf8'));
const catalog=normalizeCatalog(file);
test('GitHub-based external index exceeds thousand REAL unique upstream repository names',()=>{
 assert.ok(catalog.items.length>=1000,'Expected at least 1,000 real GitHub source names');
 assert.equal(new Set(catalog.items.map(x=>x.name.toLowerCase())).size,catalog.items.length);
 assert.ok(catalog.queries>=36);assert.ok(catalog.categories.length>=20);
});
test('all names are safe and no source is presented as owned or verified',()=>{
 for(const item of catalog.items){assert.ok(validRepoName(item.name));assert.equal(item.external,true);assert.equal(item.license,'unreviewed')}
});
test('search and exact genre filters are stable, case-insensitive and can match repository owners',()=>{
 assert.ok(filterCatalog(catalog.items,{query:'github'}).every(x=>x.name.toLowerCase().includes('github')||x.genreName.toLowerCase().includes('github')));
 assert.ok(filterCatalog(catalog.items,{genre:'builder'}).every(x=>x.genre==='builder'));
 assert.ok(filterCatalog(catalog.items,{genre:'life'}).length>100);
});
test('pagination clamps to 24 visible cards even with thousands indexed',()=>{
 const first=pageOf(catalog.items,1);assert.equal(PAGE_SIZE,24);assert.equal(first.items.length,24);
 assert.equal(pageOf(catalog.items,999999).end,catalog.items.length);
 assert.equal(pageOf(catalog.items,-8).page,1);
});
test('local watchlist stays separate from GitHub repositories',()=>{
 const name=catalog.items[0].name.toLowerCase(),saved=new Set([name]);
 assert.equal(filterCatalog(catalog.items,{savedOnly:true,bookmarks:saved}).length,1);
 assert.equal(statsOf(catalog.items,saved).saved,1);
 assert.equal(statsOf(catalog.items).total,catalog.items.length);
});
test('balanced discovery shows distinct genres rather than the first 24 results of one query',()=>{
 const first=balanceGenres(catalog.items).slice(0,24);
 assert.ok(new Set(first.map(x=>x.genre)).size>=6);
});
test('malformed, duplicated, and non-GitHub source values are removed',()=>{
 const result=normalizeCatalog({schemaVersion:1,kind:'external-discovery',categories:[['life','生活']],rows:[['A/Repo','life'],['a/repo','life'],['github.com/owner/repo','life'],['A/Thing','fake']]});
 assert.equal(result.items.length,1);
});

test('cross-domain index contains source-backed software and game families',()=>{
 const software=catalog.items.filter(x=>x.family==='software');
 const games=catalog.items.filter(x=>x.family==='game');
 assert.ok(software.length>=300,'Non-game project sources missing');
 assert.ok(games.length>=1000,'Existing game sources must remain intact');
 for(const id of ['system','ai','desktop','mobile','web','devtools','automation','data','media','education','infra','design']){
  const matches=filterCatalog(catalog.items,{family:'software',genre:id});
  assert.ok(matches.length>=10,'Missing category '+id);assert.ok(matches.every(x=>x.family==='software'&&x.genre===id));
 }
 assert.equal(filterCatalog(catalog.items,{family:'game'}).length,games.length);
 assert.equal(filterCatalog(catalog.items,{family:'software'}).length,software.length);
 assert.equal(statsOf(catalog.items).byFamily.software,software.length);
 assert.equal(statsOf(catalog.items).byFamily.game,games.length);
 assert.ok(catalog.categories.every(x=>['software','game'].includes(x.family)));
});

test('third-party software spotlights are verified GitHub-sourced but never owned or pre-cleared',()=>{
 assert.equal(catalog.featured.length,52);
 const indexed=new Set(catalog.items.map(x=>x.name.toLowerCase()));
 for(const item of catalog.featured){assert.ok(indexed.has(item.name.toLowerCase()));assert.equal(item.family,'software');assert.ok(validRepoName(item.name));assert.ok(item.summary.length<=210);}
 const first=chooseHighlights(catalog.featured,{limit:6});assert.equal(first.length,6);
 assert.equal(new Set(first.map(x=>x.genre)).size,6);
 assert.equal(chooseHighlights(catalog.featured,{family:'game'}).length,0);
 assert.equal(chooseHighlights(catalog.featured,{genre:'ai'}).length,2);
 assert.equal(chooseHighlights(catalog.featured,{query:'a-query-with-no-repo-match'}).length,0);
});
test('broader discovery covers productivity, security, science, finance and accessibility',()=>{
 assert.ok(catalog.items.length>=5100);
 assert.ok(catalog.categories.length>=42);
 for(const genre of ['productivity','communication','security','science','business','accessibility']){
  assert.ok(filterCatalog(catalog.items,{family:'software',genre}).length>=70,genre);
 }
});
test('spotlight index rejects unknown, duplicate or malformed external records',()=>{
 const input={schemaVersion:1,kind:'external-discovery',categories:[['ai','AI']],rows:[['A/Repo','ai']],spotlights:[
  {name:'A/Repo',genre:'ai',summary:'Valid',stars:3},
  {name:'a/repo',genre:'ai',summary:'Duplicated'},
  {name:'A/B/C',genre:'ai',summary:'Invalid'},
  {name:'Missing/Repo',genre:'ai',summary:'Not indexed'}]};
 assert.equal(normalizeCatalog(input).featured.length,1);
});

test('comparison research export is portable, provenance-labelled and escapes repository text',()=>{
 const result=comparisonMarkdown([{name:'A/Repo',genreName:'AI | systems',stars:42,language:'JS',license:null,state:'unavailable',pushedAt:'2026-11-06'},{name:'bad/repo/path',genreName:'invalid',stars:1}],{generatedAt:'2026-11-06T12:00:00Z'});
 assert.ok(result.includes('https://github.com/A/Repo'));
 assert.ok(result.includes('AI \\| systems'));
 assert.ok(result.includes('待核验'));
 assert.ok(result.includes('接口不可用；待复核'));
 assert.ok(!result.includes('bad/repo/path'));
});

test('all 42 categories are classified into navigable groups and have repositories',()=>{
 const names=catalog.categories.map(x=>x.id);
 assert.equal(names.length,42);
 assert.equal(new Set(names).size,42);
 assert.ok(catalog.categories.every(x=>['foundation','intelligent','creative','games'].includes(x.group)));
 for(const category of catalog.categories){
  assert.ok(catalog.items.some(x=>x.genre===category.id),'empty '+category.id);
  assert.ok(filterCatalog(catalog.items,{group:category.group,genre:category.id}).length>0);
 }
 assert.equal(filterCatalog(catalog.items,{family:'game',group:'games'}).length,filterCatalog(catalog.items,{family:'game'}).length);
 assert.equal(filterCatalog(catalog.items,{family:'software',group:'foundation'}).every(x=>x.group==='foundation'),true);
});
test('verified external highlights span all new engineering categories',()=>{
 for(const cat of ['database','cloud','iot','robotics','gis','hardware','networking','browsers','cli','commerce','testing','documentation','office','healthtech','energy','mlops']){
  assert.ok(catalog.featured.some(x=>x.genre===cat),'no GitHub profile for '+cat);
 }
});
