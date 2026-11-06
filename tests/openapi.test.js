import test from 'node:test';
import assert from 'node:assert/strict';
import {OPENAPI_EXAMPLE,OPENAPI_METHODS,MAX_OPENAPI_SIZE,inspectOpenApi,filterOpenApiOperations,openApiReviewMarkdown}from'../openapi-core.js';
const api=x=>JSON.stringify({openapi:'3.1.0',info:{title:'Test API',version:'1.0'},paths:x});
test('real sample has three operations, two paths and no false error',()=>{
 const r=inspectOpenApi(OPENAPI_EXAMPLE);
 assert.equal(r.version,'3.1.0');
 assert.deepEqual(r.counts,{paths:2,operations:3,errors:0,warnings:0,byMethod:{GET:2,POST:1}});
 assert.equal(r.operations.find(x=>x.method==='POST').hasBody,true);
 assert.equal(r.operations.find(x=>x.path==='/items/{id}').pathVariables[0],'id');
 assert.equal(OPENAPI_METHODS.length,8);
});
test('strict JSON-only and OAS version checks reject unsupported formats and sizes',()=>{
 for(const input of ['','openapi: 3.1.0','<xml/>'])assert.throws(()=>inspectOpenApi(input),/JSON/);
 assert.throws(()=>inspectOpenApi(JSON.stringify({openapi:'2.0',paths:{}})),/3\.0/);
 assert.throws(()=>inspectOpenApi(JSON.stringify({openapi:'3.2.0',paths:{}})),/3\.0/);
 assert.throws(()=>inspectOpenApi(JSON.stringify({openapi:'3.1.0',paths:[]})),/paths/);
 assert.throws(()=>inspectOpenApi(' '.repeat(MAX_OPENAPI_SIZE+1)),/500 KB/);
});
test('duplicate operation IDs are errors, not silently overwritten',()=>{
 const x=inspectOpenApi(api({'/a':{get:{operationId:'same',responses:{200:{}}}},
  '/b':{post:{operationId:'same',responses:{201:{}}}}}));
 assert.equal(x.counts.errors,1);
 assert.equal(x.issues[0].code,'duplicate_operation_id');
});
test('path parameter must be declared required true, or explicitly unresolved',()=>{
 const doc=api({'/users/{id}':{
  get:{responses:{200:{}}},
  patch:{parameters:[{name:'id',in:'path',required:false}],responses:{200:{}}},
  delete:{parameters:[{$ref:'#/components/parameters/UserId'}],responses:{204:{}}}
 }});
 const x=inspectOpenApi(doc);
 assert.ok(x.issues.some(i=>i.code==='missing_path_parameter'));
 assert.ok(x.issues.some(i=>i.code==='optional_path_parameter'));
 assert.ok(x.issues.some(i=>i.code==='unresolved_parameter_ref'));
 assert.ok(!x.issues.some(i=>i.code==='unresolved_parameter_ref'&&i.level==='error'));
});
test('missing responses and incorrect shapes are reported with source paths',()=>{
 const x=inspectOpenApi(api({'/ping':{get:{summary:'Ping'},post:'invalid'},wrong:{get:{responses:{200:{}}}}}));
 assert.ok(x.issues.some(i=>i.code==='missing_responses'&&i.path==='/ping GET'));
 assert.ok(x.issues.some(i=>i.code==='invalid_operation'&&i.path==='/ping POST'));
 assert.ok(x.issues.some(i=>i.code==='invalid_path'));
});
test('operation filters select by method, path, description and tags',()=>{
 const r=inspectOpenApi(api({'/a':{get:{summary:'Search articles',tags:['news'],responses:{200:{}}}},
 '/b':{post:{summary:'Create note',tags:['notes'],responses:{201:{}}}}}));
 assert.equal(filterOpenApiOperations(r,{method:'get'}).length,1);
 assert.equal(filterOpenApiOperations(r,{query:'news'})[0].path,'/a');
 assert.equal(filterOpenApiOperations(r,{query:'CREATE'})[0].method,'POST');
 assert.equal(filterOpenApiOperations(r,{query:'not-present'}).length,0);
});
test('report preserves observed endpoints and findings while denying full certification',()=>{
 const r=inspectOpenApi(api({'/x':{get:{responses:{}}}}));
 const md=openApiReviewMarkdown(r,'2026-11-06T14:30:00Z');
 assert.match(md,/\/x GET/);
 assert.match(md,/missing_responses/);
 assert.match(md,/JSON 格式的有限规范子集/);
 assert.match(md,/没有执行网络请求/);
 assert.throws(()=>openApiReviewMarkdown({}),/reviewed/);
});
test('OpenAPI local editor is present and linked from API lab bundle',async()=>{
 const {readFileSync}=await import('node:fs');
 const html=readFileSync('index.html','utf8'),lab=readFileSync('api-lab.js','utf8');
 for(const id of ['oasWorkbench','oasInput','oasExample','oasAnalyze','oasClear','oasFile',
  'oasFilter','oasMethod','oasResults','oasStatus','oasExport','oasCount'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(lab,/initOpenApiWorkbench\(\)/);
 assert.match(html,/本地 JSON/);
});
