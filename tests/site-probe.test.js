import test from'node:test';import assert from'node:assert/strict';
import{allowedSiteUrl,assetCandidates,probeSite,probeOverview}from'../site-probe-core.js';
const ROOT='https://aincfh.github.io/demo/';
const response=(body,status=200,type='text/html')=>({
 status,ok:status>=200&&status<300,
 headers:{get:k=>k==='content-type'?type:k==='location'?null:null},
 text:async()=>body
});
test('only exact owned GitHub Pages project paths can be probed',()=>{
 assert.equal(allowedSiteUrl(ROOT,'demo'),ROOT);
 assert.equal(allowedSiteUrl(ROOT+'index.html','demo'),ROOT+'index.html');
 assert.equal(allowedSiteUrl('https://evil.invalid/demo/','demo'),null);
 assert.equal(allowedSiteUrl('https://aincfh.github.io/demos/','demo'),null);
 assert.equal(allowedSiteUrl('https://aincfh.github.io/demo/?token=a','demo'),null);
 assert.equal(allowedSiteUrl(ROOT,'../demo'),null);
});
test('asset list excludes cross origin and traversal and de-duplicates',()=>{
 const html='<html><head><link rel="stylesheet" href="./style.css"><script src="./app.js"></script><script src="./app.js"></script><script src="https://cdn.example/x.js"></script><script src="/outside.js"></script></head></html>';
 const assets=assetCandidates(html,ROOT,'demo');
 assert.deepEqual(assets.map(x=>x.url),[ROOT+'style.css',ROOT+'app.js']);
});
test('healthy HTML and a successful JS asset are reachable, not a game playtest',async()=>{
 const fetcher=async url=>response(url===ROOT?'<html><script src="app.js"></script></html>':'export default 1',200,url===ROOT?'text/html':'text/javascript');
 const result=await probeSite({repo:'demo',url:ROOT,fetcher,now:()=> '2026-11-05T11:00:00Z'});
 assert.equal(result.state,'reachable');assert.equal(result.assetCount,1);assert.equal(result.assetFailures,0);
 assert.equal(result.httpStatus,200);assert.equal(result.checkedAt,'2026-11-05T11:00:00Z');
});
test('HTTP, resource failures, non HTML and network outages stay separate',async()=>{
 const http=await probeSite({repo:'demo',url:ROOT,fetcher:async()=>response('404',404)});assert.equal(http.state,'http_error');
 const asset=await probeSite({repo:'demo',url:ROOT,fetcher:async u=>u===ROOT?response('<html><script src="app.js"></script></html>'):response('missing',404)});
 assert.equal(asset.state,'resource_error');assert.equal(asset.assetFailures,1);
 const content=await probeSite({repo:'demo',url:ROOT,fetcher:async()=>response('text',200,'text/plain')});assert.equal(content.state,'content_error');
 const network=await probeSite({repo:'demo',url:ROOT,fetcher:async()=>{throw Error('offline')}});
 assert.equal(network.state,'network_error');
});
test('invalid and hostile redirects do not get checked as healthy',async()=>{
 const result=await probeSite({repo:'demo',url:'http://localhost:5000/',fetcher:async()=>{throw Error('must not fetch')}});
 assert.equal(result.state,'unknown');assert.equal(result.reason,'unsupported_url');
});
test('overview never confuses lack of probe with success',()=>{
 const result=probeOverview([{probe:{state:'reachable'}},{probe:{state:'resource_error'}},{probe:null}]);
 assert.deepEqual(result,{checked:2,reachable:1,broken:1,missing:1});
});
