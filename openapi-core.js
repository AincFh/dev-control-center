/**
 * ATLAS OpenAPI contract review: deliberate subset of OAS 3.0 / 3.1 checks.
 * JSON-only and fully local. No remote $ref resolving or server requests.
 * Reports findings, NOT an official specification conformance certificate.
 */
export const OPENAPI_METHODS=Object.freeze(['get','post','put','patch','delete','head','options','trace']);
export const MAX_OPENAPI_SIZE=500000;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const brief=(x,n=160)=>String(x??'').slice(0,n);
const issue=(level,code,path,message)=>({level,code,path:brief(path,180),message:brief(message,260)});
const isResponseKey=k=>/^(?:default|[1-5]\d\d|[1-5]XX)$/.test(k);
export function inspectOpenApi(text){
 if(typeof text!=='string'||text.length>MAX_OPENAPI_SIZE)throw Error('OpenAPI JSON 不能超过 500 KB');
 let data;try{data=JSON.parse(text)}catch{throw Error('无法解析 JSON；本工具暂不支持 YAML')}
 if(!object(data))throw Error('OpenAPI 文档根节点必须为 JSON 对象');
 const version=brief(data.openapi||'',30);
 if(!/^3\.(?:0|1)\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version))throw Error('仅支持 OpenAPI 3.0.x / 3.1.x JSON');
 if(!object(data.paths))throw Error('缺少 paths 对象，无法枚举接口');
 const issues=[],ops=[],seenIds=new Map(),paths=Object.entries(data.paths);
 if(paths.length>200)throw Error('单个文档不能超过 200 条路径');
 if(!object(data.info)||typeof data.info.title!=='string'||!data.info.title.trim()||
  typeof data.info.version!=='string'||!data.info.version.trim())
  issues.push(issue('warning','info','info','info.title 和 info.version 应完整提供'));
 if(!paths.length)issues.push(issue('warning','empty_paths','paths','文档没有可分析的接口路径'));
 const servers=Array.isArray(data.servers)?data.servers.filter(x=>object(x)&&typeof x.url==='string')
  .slice(0,8).map(x=>brief(x.url,180)):[];
 for(const [pathName,pathItem] of paths){
  if(!pathName.startsWith('/')||pathName.length>230){
   issues.push(issue('error','invalid_path',pathName,'接口路径必须从 / 开始且长度合理'));continue;
  }
  if(!object(pathItem)){
   issues.push(issue('warning','path_ref',pathName,'该路径不是普通对象，引用或结构无法在本地展开'));continue;
  }
  const pathTokens=[...new Set([...pathName.matchAll(/\{([^{}]+)\}/g)].map(x=>x[1]))];
  const sharedParams=Array.isArray(pathItem.parameters)?pathItem.parameters:[];
  for(const method of OPENAPI_METHODS){
   if(!Object.prototype.hasOwnProperty.call(pathItem,method))continue;
   const spec=pathItem[method],location=pathName+' '+method.toUpperCase();
   if(!object(spec)){issues.push(issue('error','invalid_operation',location,'HTTP operation 必须为对象'));continue}
   if(ops.length>=300)throw Error('单个文档最多检查 300 个 HTTP operation');
   const operationId=typeof spec.operationId==='string'?brief(spec.operationId,100):null;
   if(operationId){
    if(seenIds.has(operationId))issues.push(issue('error','duplicate_operation_id',location,
     'operationId 与 '+seenIds.get(operationId)+' 重复：'+operationId));
    else seenIds.set(operationId,location);
   }
   const responses=object(spec.responses)?Object.keys(spec.responses):[];
   if(!responses.length)issues.push(issue('error','missing_responses',location,'该操作没有 responses 定义'));
   else if(!responses.some(isResponseKey))issues.push(issue('warning','unrecognized_responses',location,'未识别标准 HTTP 响应状态码'));
   const params=[...sharedParams,...(Array.isArray(spec.parameters)?spec.parameters:[])];
   const declared=new Map();
   let unresolvedRefs=false;
   for(const parameter of params){
    if(!object(parameter))continue;
    if(typeof parameter.$ref==='string'){unresolvedRefs=true;continue;}
    if(parameter.in==='path'&&typeof parameter.name==='string')
      declared.set(parameter.name,parameter.required===true);
   }
   if(unresolvedRefs)issues.push(issue('warning','unresolved_parameter_ref',location,'参数包含 $ref；本地检查不会解析其目标'));
   for(const token of pathTokens){
    if(!declared.has(token)){
     if(!unresolvedRefs)issues.push(issue('error','missing_path_parameter',location,'路径变量 {'+token+'} 缺少 in:path 参数声明'));
    }else if(declared.get(token)!==true)issues.push(issue('error','optional_path_parameter',location,'路径变量 {'+token+'} 必须标记 required:true'));
   }
   const tags=Array.isArray(spec.tags)?spec.tags.filter(x=>typeof x==='string').slice(0,8).map(x=>brief(x,65)):[];
   const signature=location;
   ops.push({method:method.toUpperCase(),path:pathName,signature,operationId,summary:brief(spec.summary||spec.description||'',160),
    tags,responses:responses.slice(0,24),pathVariables:pathTokens,hasBody:object(spec.requestBody)||false});
  }
 }
 const byMethod=Object.fromEntries(OPENAPI_METHODS.map(x=>[x.toUpperCase(),ops.filter(o=>o.method===x.toUpperCase()).length]).filter(([,v])=>v));
 const errors=issues.filter(x=>x.level==='error').length,warnings=issues.filter(x=>x.level==='warning').length;
 return{kind:'openapi-review',version,title:brief(data.info?.title||'未命名 API'),apiVersion:brief(data.info?.version||'未知'),
  servers,operations:ops,issues,counts:{paths:paths.length,operations:ops.length,errors,warnings,byMethod},
  note:'仅做本地部分结构、响应和路径参数检查；未解析 $ref、YAML 或完整 JSON Schema，不能替代官方规范验证。'};
}
export function filterOpenApiOperations(result,{query='',method='all'}={}){
 const q=brief(query,200).toLocaleLowerCase().trim();
 return(result?.operations||[]).filter(op=>(method==='all'||op.method.toLowerCase()===method.toLowerCase())&&
  (!q||[op.path,op.operationId,op.summary,...op.tags].some(x=>String(x||'').toLocaleLowerCase().includes(q))));
}
export function openApiReviewMarkdown(review,generatedAt=new Date().toISOString()){
 if(review?.kind!=='openapi-review')throw Error('Missing reviewed OpenAPI document');
 const lines=['# ATLAS · OpenAPI 本地契约审查','',
  '- API：'+review.title,'- OpenAPI：'+review.version,'- API 版本：'+review.apiVersion,
  '- 检查时间：'+generatedAt,'- 路径：'+review.counts.paths+'；操作：'+review.counts.operations,
  '- 错误：'+review.counts.errors+'；提醒：'+review.counts.warnings,'',
  '> 仅检查 JSON 格式的有限规范子集；没有执行网络请求、外部 $ref 或端到端服务测试。','',
  '## HTTP Operations',''];
 for(const op of review.operations){
  lines.push('- '+op.signature+(op.summary?' — '+op.summary:'')+
   '；响应：'+(op.responses.join(', ')||'未声明')+
   (op.operationId?'；operationId：'+op.operationId:''));
 }
 lines.push('','## 结构问题','');
 if(!review.issues.length)lines.push('- 本轮有限检查未发现对应问题；不代表完整 OAS 验证通过。');
 for(const i of review.issues)lines.push('- '+(i.level==='error'?'ERROR':'WARN')+' ['+i.code+'] '+i.path+'：'+i.message);
 lines.push('','## 使用边界','','- 未解析 YAML 和 external $ref，无法检查运行时鉴权、服务器可达性及真实 HTTP 合约。','- API 规范可能包含敏感信息，请在本地判断报告是否可以共享。');
 return lines.join('\n');
}
export const OPENAPI_EXAMPLE=JSON.stringify({
 openapi:'3.1.0',info:{title:'ATLAS Example API',version:'1.0.0'},
 servers:[{url:'https://example.invalid/api'}],
 paths:{
  '/items':{get:{operationId:'listItems',summary:'列出项目',responses:{'200':{description:'OK'}}},
   post:{operationId:'createItem',summary:'创建项目',requestBody:{content:{'application/json':{schema:{type:'object'}}}},
    responses:{'201':{description:'Created'}}}},
  '/items/{id}':{get:{operationId:'getItem',summary:'读取项目',
   parameters:[{name:'id',in:'path',required:true,schema:{type:'string'}}],
   responses:{'200':{description:'OK'},'404':{description:'Not found'}}}}
 }
},null,2);