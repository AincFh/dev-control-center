import test from'node:test';import assert from'node:assert/strict';import{normalize,filtered,sorted,summary,ago}from'../core.js';
const data=[normalize({name:'fish',description:'Fishing world',language:'JS',updated_at:'2026-11-05',stargazers_count:2},{category:'game',preview:'https://example.org'}),normalize({name:'web',language:'HTML',updated_at:'2026-09-01',stargazers_count:5},{category:'web'})];
test('repo fields',()=>{assert.equal(data[0].stars,2);assert.equal(data[0].category,'game')});
test('search & category',()=>{assert.equal(filtered(data,'fishing','game').length,1);assert.equal(filtered(data,'fishing','web').length,0)});
test('sort is immutable',()=>{assert.equal(sorted(data,'stars')[0].name,'web');assert.equal(data[0].name,'fish')});
test('summarize live / active',()=>assert.deepEqual(summary(data,Date.parse('2026-11-05T12:00:00Z')),{total:2,live:1,active:1}));
test('last-updated text',()=>{assert.equal(ago(null),'未知');assert.equal(ago('2026-11-05',Date.parse('2026-11-05T12:00:00Z')),'今天')});