import test from'node:test';
import assert from'node:assert/strict';
import{TOOLS,MAX_TEXT,jsonTransform,csvToObjects,textDiff,base64Encode,base64Decode,urlTransform,textStats,sha256Text}from'../developer-utils-core.js';
test('seven real developer tools expose unique, navigable categories',()=>{
 assert.equal(TOOLS.length,7);
 assert.equal(new Set(TOOLS.map(x=>x.id)).size,7);
 for(const t of TOOLS)assert.ok(t.description.length>=10);
});
test('JSON validates, formats, minifies and rejects malformed input',()=>{
 assert.equal(jsonTransform(' {"a":1,"b":[2]} '),'{'+'\n  "a": 1,\n  "b": [\n    2\n  ]\n}');
 assert.equal(jsonTransform('{"a":1}',{compact:true}),'{"a":1}');
 assert.throws(()=>jsonTransform('{broken'),/JSON 无法解析/);
 assert.throws(()=>jsonTransform(''),/JSON 无法解析/);
});
test('CSV parser handles BOM, embedded commas, quotes and newlines without losing text',()=>{
 const source='\uFEFFname,note\r\n"Alice","Hello, \"\"World\"\""\r\nBob,"line 1\nline 2"\r\n';
 assert.deepEqual(csvToObjects(source),[
  {name:'Alice',note:'Hello, "World"'},
  {name:'Bob',note:'line 1\nline 2'}
 ]);
 assert.deepEqual(csvToObjects('x,y\n1,2'),[{x:'1',y:'2'}]);
});
test('CSV rejects dangerous ambiguities rather than silently producing wrong rows',()=>{
 for(const value of ['x,x\n1,2','a,b\n1','a,b\n"unfinished','a,\n1,2','a,b\nfoo"bar,1'])
  assert.throws(()=>csvToObjects(value),/CSV/);
});
test('line diff produces real additions and deletions with resource guards',()=>{
 const rows=textDiff('one\ntwo\nthree','one\nnew\nthree');
 assert.equal(rows.filter(x=>x.kind==='same').length,2);
 assert.equal(rows.filter(x=>x.kind==='added').length,1);
 assert.equal(rows.filter(x=>x.kind==='removed').length,1);
 assert.throws(()=>textDiff('a\n'.repeat(300),'ok'),/250 行/);
});
test('Base64 encodes real UTF-8, rejects corruption and invalid unicode',()=>{
 for(const input of ['hello','中文 😀\nsecond line','']){
  assert.equal(base64Decode(base64Encode(input)),input);
 }
 assert.throws(()=>base64Decode('????'),/Base64/);
 assert.throws(()=>base64Decode('/w=='),/UTF-8/);
});
test('URL conversion is reversible and rejects invalid percent escapes',()=>{
 const original='a b/中文#参数';
 assert.equal(urlTransform(urlTransform(original),{decode:true}),original);
 assert.throws(()=>urlTransform('%ZZ',{decode:true}),/URL 编码/);
});
test('text statistics count Unicode, bytes and lines independently',()=>{
 assert.deepEqual(textStats('A😀\n字'),{characters:4,utf16Units:5,bytes:9,lines:2,words:2,spaces:0,nonSpace:3});
 assert.equal(textStats('').lines,0);
});
test('SHA-256 is a genuine cryptographic digest using the platform API',async()=>{
 assert.equal(await sha256Text('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 await assert.rejects(()=>sha256Text('test',{}),/Web Crypto/);
});
test('all transforms enforce an input bound to protect browser responsiveness',()=>{
 const large='x'.repeat(MAX_TEXT+1);
 for(const fn of [jsonTransform,csvToObjects,base64Encode,base64Decode,urlTransform,textStats])
  assert.throws(()=>fn(large),/本地处理上限/);
});
