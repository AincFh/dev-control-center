/**
 * ATLAS Public API Lab: deterministic, read-only GitHub REST endpoints.
 * No user-defined URL, HTTP methods, token, request body or external proxy.
 * Observed results are limited samples; never present them as repository totals.
 */
export const API_LAB_ENDPOINTS=Object.freeze([
 {id:'repository',label:'仓库概览',path:'',kind:'object',note:'仓库元信息与公开计数'},
 {id:'issues',label:'开放 Issues',path:'/issues?state=open&per_page=20',kind:'list',note:'最多前 20 条，排除 PR'},
 {id:'pulls',label:'开放 PR',path:'/pulls?state=open&per_page=20',kind:'list',note:'最多前 20 条'},
 {id:'commits',label:'最近提交',path:'/commits?per_page=20',kind:'list',note:'最多前 20 条'},
 {id:'runs',label:'Actions 运行',path:'/actions/runs?per_page=20',kind:'workflow',note:'最多前 20 次工作流运行'},
 {id:'releases',label:'发行记录',path:'/releases?per_page=20',kind:'list',note:'最多前 20 条 Release'},
 {id:'languages',label:'语言组成',path:'/languages',kind:'object',note:'GitHub 返回的字节统计'},
 {id:'branches',label:'公开分支',path:'/branches?per_page=20',kind:'list',note:'最多前 20 条'}
]);
const ID=/^[A-Za-z0-9_.-]{1,100}$/,OWNER=/^[A-Za-z0-9-]{1,39}$/;
const safeString=(value,limit=140)=>String(value??'').slice(0,limit);
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function parsePublicRepo(value){
 if(typeof value!=='string')throw Error('请输入 owner/repo 或 GitHub 仓库链接');
 let name=value.trim();
 if(name.startsWith('https://github.com/')){
  const u=new URL(name);
  if(u.hostname!=='github.com'||u.port||u.username||u.password||u.search||u.hash)throw Error('仅支持直接 GitHub 仓库链接');
  const segments=u.pathname.split('/').filter(Boolean);
  if(segments.length!==2)throw Error('GitHub 链接必须指向仓库根目录');
  name=segments[0]+'/'+segments[1].replace(/\.git$/i,'');
 }
 const parts=name.split('/');
 if(parts.length!==2||!OWNER.test(parts[0])||!ID.test(parts[1])||parts[1]==='.'||parts[1]==='..')throw Error('请输入有效的 GitHub owner/repo，不允许其他 URL');
 return parts.join('/');
}
export function makePublicRequest(repository,endpoint){
 const name=parsePublicRepo(repository),item=API_LAB_ENDPOINTS.find(x=>x.id===endpoint);
 if(!item)throw Error('不支持的公开 API 查询');
 const [owner,repo]=name.split('/');
 // Path and query are fixed by a trusted endpoint catalogue.
 return{repository:name,endpoint:item.id,description:item.note,
  method:'GET',url:'https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo)+item.path};
}
export function parseRateLimit(headers){
 const read=key=>{const v=headers?.get?.(key);const n=v===null?NaN:Number(v);return Number.isFinite(n)&&n>=0?n:null};
 const remaining=read('x-ratelimit-remaining'),limit=read('x-ratelimit-limit'),reset=read('x-ratelimit-reset');
 return{remaining,limit,resetAt:reset!==null?new Date(reset*1000).toISOString():null};
}
function listFor(data,endpoint){
 if(endpoint==='runs')return Array.isArray(data?.workflow_runs)?data.workflow_runs:[];
 return Array.isArray(data)?data:[];
}
export function publicFacts(data,endpoint){
 const item=API_LAB_ENDPOINTS.find(x=>x.id===endpoint);
 if(!item)throw Error('Unknown GitHub API endpoint');
 if(endpoint==='repository'){
  if(!obj(data)||typeof data.full_name!=='string')throw Error('仓库 API 未返回预期的完整名称');
  const count=n=>Number.isSafeInteger(n)&&n>=0?n:null;
  return{type:'repository',facts:[
   ['仓库',safeString(data.full_name)],['主语言',safeString(data.language||'未知')],
   ['Stars',count(data.stargazers_count)],['Forks',count(data.forks_count)],
   ['公开 Issues（GitHub 汇总，可能含 PR）',count(data.open_issues_count)],
   ['默认分支',safeString(data.default_branch||'未知')],
   ['许可',safeString(data.license?.spdx_id||'待核验')]
  ],sampleCount:null,items:[]};
 }
 if(endpoint==='languages'){
  if(!obj(data))throw Error('语言接口返回的格式不正确');
  const facts=Object.entries(data).filter(([k,v])=>/^[A-Za-z0-9+.# _-]{1,65}$/.test(k)&&Number.isFinite(v)&&v>=0)
   .sort((a,b)=>b[1]-a[1]).slice(0,15);
  return{type:'languages',facts,items:[],sampleCount:null};
 }
 const rows=listFor(data,endpoint);
 if(endpoint==='runs'&&!obj(data))throw Error('Actions 响应格式不正确');
 if(item.kind==='list'&&!Array.isArray(data))throw Error('列表 API 返回格式不正确');
 const filtered=(endpoint==='issues'?rows.filter(x=>!x?.pull_request):rows).slice(0,20);
 const items=filtered.map((x,i)=>{
  let label='',detail='';
  if(endpoint==='issues'||endpoint==='pulls'){label='#'+safeString(x?.number,18)+' '+safeString(x?.title,140);detail=(x?.draft?'草稿 · ':'')+safeString(x?.state||'未知',32);}
  else if(endpoint==='commits'){label=safeString(x?.sha||'',9)+' · '+safeString(x?.commit?.message?.split('\n')[0],130);detail=safeString(x?.commit?.committer?.date||'',40);}
  else if(endpoint==='runs'){label=safeString(x?.name||'Actions 运行',90)+' #'+safeString(x?.run_number,10);detail=safeString(x?.conclusion||x?.status||'未知',40);}
  else if(endpoint==='releases'){label=safeString(x?.tag_name||'未命名发行',110);detail=(x?.prerelease?'预发布 · ':'')+safeString(x?.published_at||'',40);}
  else if(endpoint==='branches'){label=safeString(x?.name||'未知',140);detail=x?.protected?'受保护':'未标记保护';}
  return{index:i+1,label,detail};
 });
 return{type:'list',facts:[['本次返回',rows.length],['展示条目',items.length]],sampleCount:rows.length,items};
}
export function flattenResponse(data,{maxNodes=100,maxDepth=3}={}){
 const rows=[],seen=new WeakSet(),limit=Math.max(1,Math.min(200,Number(maxNodes)||100));
 function walk(value,path,depth){
  if(rows.length>=limit)return;
  if(value!==null&&typeof value==='object'){
   if(seen.has(value))return;
   seen.add(value);
  }
  const type=Array.isArray(value)?'array':value===null?'null':typeof value;
  let label=type;
  if(type==='array')label='array ('+value.length+')';
  else if(type==='object')label='object ('+Object.keys(value).length+' keys)';
  else if(type==='string')label=safeString(value,100);
  else if(type==='number'||type==='boolean'||type==='null')label=String(value);
  rows.push({path:path||'$',type,value:label});
  if(depth>=maxDepth||rows.length>=limit)return;
  const entries=Array.isArray(value)?value.slice(0,20).map((x,i)=>[String(i),x]):
   obj(value)?Object.entries(value).slice(0,30):[];
  for(const [key,v] of entries){
   if(rows.length>=limit)return;
   const p=Array.isArray(value)?(path||'$')+'['+key+']':(path||'$')+'.'+key;
   walk(v,p,depth+1);
  }
 }
 walk(data,'$',0);
 return{rows,truncated:rows.length===limit};
}
export function comparePublicFacts(left,right){
 if(!left||!right||left.endpoint!==right.endpoint||left.state!=='ok'||right.state!=='ok')return null;
 const a=new Map(left.facts.facts),b=new Map(right.facts.facts);
 const keys=[...new Set([...a.keys(),...b.keys()])];
 return{repositoryA:left.repository,repositoryB:right.repository,endpoint:left.endpoint,
  rows:keys.map(key=>({label:key,left:a.has(key)?a.get(key):null,right:b.has(key)?b.get(key):null,
   different:a.get(key)!==b.get(key)})).slice(0,24)};
}
export function apiLabReport(results){
 const lines=['# ATLAS · GitHub 公共 API 检查记录','',
  '范围：仅公共仓库 GitHub REST GET；不含用户身份、私有权限和 Token。','','> 列表每次最多 20 条，展示数不是完整仓库历史或全量 Issue/PR 计数。',''];
 for(const r of results.filter(Boolean)){
  lines.push('## '+r.repository+' / '+r.endpoint,'','- 请求：'+r.url,'- HTTP 状态：'+(r.httpStatus??'未知'),
   '- 检查结果：'+(r.state==='ok'?'成功':'失败或不可达'),'- 观测时间：'+(r.checkedAt||'未知'),
   '- 来源：GitHub REST API（浏览器直接请求）');
  if(r.rate?.remaining!==null&&r.rate?.remaining!==undefined)lines.push('- GitHub 剩余额度：'+r.rate.remaining);
  if(r.state==='ok')for(const [k,v] of r.facts.facts)lines.push('- '+k+'：'+(v??'未知'));
  else lines.push('- 失败原因：'+safeString(r.message||'未知',240));
  lines.push('');
 }
 lines.push('## 审查边界','','- 结果不证明代码许可、产品完成、安装和发布门禁通过。','- 403/429 可能是 API 限流或权限控制；不代表仓库不存在。','- 本报告为当前浏览器内操作的即时记录，未自动写入任何 GitHub Issue。');
 return lines.join('\n');
}