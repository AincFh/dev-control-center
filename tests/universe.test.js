import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{normalizeCatalog,filterCatalog,pageOf,statsOf,validRepoName,balanceGenres,PAGE_SIZE}from'../universe-core.js';
const file=JSON.parse(readFileSync('data/github-universe.json','utf8'));
const catalog=normalizeCatalog(file);
test('GitHub-based external index exceeds thousand REAL unique upstream repository names',()=>{
 assert.ok(catalog.items.length>=1000,'Expected at least 1,000 real GitHub source names');
 assert.equal(new Set(catalog.items.map(x=>x.name.toLowerCase())).size,catalog.items.length);
 assert.ok(catalog.queries>=24);assert.ok(catalog.categories.length>=8);
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

test('GitHub Universe V2 contains independent software and game catalogs from actual public searches',()=>{
 const domains=statsOf(catalog.items).domains;
 assert.ok(domains.software>=1000,'Expected at least 1,000 additional non-game source names');
 assert.ok(domains.game>=1700,'The original gaming corpus must be preserved');
 assert.ok(catalog.categories.length>=20);
 assert.ok(catalog.queries>=55);
 for(const id of ['ai','agents','devtools','desktop','mobile','webapp','automation','data','creative','education','infra','productivity'])
  assert.ok(catalog.categories.some(c=>c.id===id&&c.domain==='software'),id);
 assert.ok(dataSourceIsBacked());
 function dataSourceIsBacked(){return file.lastCrossDomainSourceRun?.successful>=20&&file.lastCrossDomainSourceRun?.added>=1000}
});
test('domain switch and category filtering never mix gaming and software projects',()=>{
 const software=filterCatalog(catalog.items,{domain:'software'});
 const games=filterCatalog(catalog.items,{domain:'game'});
 assert.ok(software.length>=1000&&games.length>=1700);
 assert.ok(software.every(x=>x.domain==='software'));
 assert.ok(games.every(x=>x.domain==='game'));
 assert.equal(software.length+games.length,catalog.items.length);
 assert.ok(filterCatalog(catalog.items,{domain:'software',genre:'game'}).length===0);
 assert.ok(filterCatalog(catalog.items,{domain:'software',genre:'ai'}).every(x=>x.genre==='ai'));
 assert.ok(new Set(balanceGenres(software).slice(0,24).map(x=>x.genre)).size>=8);
});
