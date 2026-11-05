import test from 'node:test';import assert from 'node:assert/strict';
import {DISCOVERY,GENRES,searchDiscovery,discoverySummary,canReuseWithoutLicenseReview} from '../discovery.js';
test('no duplicate curated GitHub sources',()=>assert.equal(new Set(DISCOVERY.map(x=>x.origin.toLowerCase())).size,DISCOVERY.length));
test('all curated sources have direct GitHub identifiers and classifications',()=>{
 for(const x of DISCOVERY){assert.match(x.origin,/^[\w.-]+\/[\w.-]+$/);assert.ok(GENRES.some(g=>g.id===x.genre));assert.ok(x.description.length>=12)}
});
test('forks are explicitly identified as imported, never implied original',()=>{const a=discoverySummary();assert.equal(a.total,DISCOVERY.length);assert.ok(a.forks>=5);assert.equal(a.reference+a.forks,a.total)});
test('filters work for life games, forked games and text',()=>{assert.ok(searchDiscovery(DISCOVERY,'','life').length>=4);assert.equal(searchDiscovery(DISCOVERY,'','fork').length,5);assert.equal(searchDiscovery(DISCOVERY,'mynecraft').length,1)});
test('unverified licenses are not treated as MIT grants',()=>{assert.equal(canReuseWithoutLicenseReview(DISCOVERY.find(x=>x.origin==='lo-th/3d.city')),false);assert.equal(canReuseWithoutLicenseReview(DISCOVERY[0]),true)});
