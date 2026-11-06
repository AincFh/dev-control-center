import{API_LAB_ENDPOINTS,makePublicRequest,parseRateLimit,publicFacts,flattenResponse,comparePublicFacts,apiLabReport}from'./api-lab-core.js';
const $=id=>document.getElementById(id);
const make=(tag,value='',cls='')=>{const e=document.createElement(tag);if(value!==null)e.textContent=String(value);if(cls)e.className=cls;return e;};
const state={results:[null,null],controllers:[],requestId:0,running:false,filter:'',rawExpanded:[false,false]};
const endpointLabel=id=>API_LAB_ENDPOINTS.find(x=>x.id===id)?.label||id;
function status(text,kind='neutral'){
 const el=$('apiLabStatus');el.textContent=text;el.dataset.kind=kind;
}
function renderInspector(parent,result,index){
 if(result.state!=='ok')return;
 const toolbar=make('div',null,'api-inspect-toolbar');
 const more=make('button',state.rawExpanded[index]?'收起字段树':'展开响应字段树');
 more.type='button';more.setAttribute('aria-expanded',String(state.rawExpanded[index]));
 more.onclick=()=>{state.rawExpanded[index]=!state.rawExpanded[index];render()};
 toolbar.append(more);parent.append(toolbar);
 if(!state.rawExpanded[index])return;
 const structured=flattenResponse(result.raw),matching=structured.rows.filter(x=>
  (x.path+' '+x.value).toLocaleLowerCase().includes(state.filter.toLocaleLowerCase()));
 const holder=make('div',null,'api-tree');
 holder.setAttribute('aria-label','响应 JSON 字段路径');
 for(const entry of matching.slice(0,100)){
  const row=make('div',null,'api-tree-row');
  row.append(make('code',entry.path),make('span',entry.value));holder.append(row);
 }
 if(!matching.length)holder.append(make('p','没有匹配的字段路径。','api-no-results'));
 if(structured.truncated)parent.append(make('small','字段树仅展示前 100 个节点；请导出 JSON 查看本次完整响应。','api-lab-note'));
 parent.append(holder);
}
function renderResult(index){
 const holder=$('apiLabResult'+(index+1)),result=state.results[index];
 holder.replaceChildren();
 if(!result){holder.append(make('p','尚未执行请求。选择公开端点后运行查询。','api-empty'));return}
 const top=make('div',null,'api-result-top');
 const title=make('div',null,'api-result-title');
 title.append(make('small','REQUEST 0'+(index+1)+' / '+result.repository),
  make('h3',result.state==='ok'?endpointLabel(result.endpoint)+' · '+(result.httpStatus||200):'请求未完成'));
 const flag=make('span',result.state==='ok'?'HTTP '+result.httpStatus:result.httpStatus?'HTTP '+result.httpStatus:'不可达','api-http api-http-'+result.state);
 top.append(title,flag);holder.append(top);
 const request=make('p',result.method+' '+result.url,'api-request-url');holder.append(request);
 if(result.state!=='ok'){
  holder.append(make('p',result.message||'公开 GitHub API 暂不可达。','api-error'));return;
 }
 const metrics=make('dl',null,'api-facts');
 for(const [key,value]of result.facts.facts){
  const box=make('div',null,'api-fact');box.append(make('dt',key),make('dd',value??'未知'));metrics.append(box);
 }
 holder.append(metrics);
 if(result.facts.items?.length){
  const sample=make('ol',null,'api-sample-items');
  for(const item of result.facts.items){
   const li=make('li',null);li.append(make('strong',item.label),make('small',item.detail));sample.append(li);
  }
  holder.append(sample);
 }
 if(result.rate){
  holder.append(make('div',result.rate.remaining===null?'本次未返回速率限制头':'当前 GitHub API 剩余额度：'+result.rate.remaining+
   (result.rate.limit!==null?' / '+result.rate.limit:'')+
   (result.rate.resetAt?' · 重置 '+new Date(result.rate.resetAt).toLocaleTimeString('zh-CN'):''),
   'api-rate'));
 }
 renderInspector(holder,result,index);
}
function renderCompare(){
 const holder=$('apiLabCompare');holder.replaceChildren();
 const comparison=comparePublicFacts(...state.results);
 if(!comparison){holder.append(make('p','执行两组相同端点的成功请求后，可在此比较各自返回的公开指标。','api-empty'));return}
 const head=make('div',null,'api-compare-head');
 head.append(make('strong','同端点并排对比'),make('small',comparison.repositoryA+'  /  '+comparison.repositoryB));
 holder.append(head);
 const table=make('div',null,'api-compare-table');
 for(const row of comparison.rows){
  const item=make('div',null,'api-compare-row'+(row.different?' changed':''));
  item.append(make('span',row.label),make('strong',row.left??'未知'),make('strong',row.right??'未知'));
  table.append(item);
 }
 holder.append(table);
 holder.append(make('p','对比仅依据当前返回的字段和前 20 条记录，不能推断完整项目质量或全量开发活动。','api-lab-note'));
}
function render(){
 renderResult(0);renderResult(1);renderCompare();
 const done=state.results.filter(Boolean).length,valid=state.results.filter(x=>x?.state==='ok').length;
 $('apiLabExport').disabled=!done;
 $('apiLabJson').disabled=!valid;
 $('apiLabResultCount').textContent=done+' 项记录 · '+valid+' 项成功';
}
async function request(spec,index,signal){
 const started=performance.now(),checkedAt=new Date().toISOString();
 try{
  const response=await fetch(spec.url,{
   method:'GET',headers:{Accept:'application/vnd.github+json'},credentials:'omit',
   referrerPolicy:'no-referrer',cache:'no-store',signal
  });
  const rate=parseRateLimit(response.headers);
  const rawText=await response.text();
  if(rawText.length>1000000)throw Error('公共响应超过 1 MB 限额，已拒绝展示');
  let raw;
  try{raw=JSON.parse(rawText)}catch{throw Error('GitHub 未返回有效 JSON')}
  if(!response.ok){
   return{...spec,index,method:'GET',state:'error',httpStatus:response.status,
    message:response.status===403||response.status===429?'GitHub API 可能限流或暂时拒绝访问：'+String(raw?.message||'').slice(0,160):
     'GitHub 返回 HTTP '+response.status+'：'+String(raw?.message||'').slice(0,160),
    checkedAt,elapsedMs:Math.round(performance.now()-started),rate};
  }
  const facts=publicFacts(raw,spec.endpoint);
  return{...spec,index,method:'GET',state:'ok',httpStatus:response.status,
   checkedAt,elapsedMs:Math.round(performance.now()-started),facts,rate,raw};
 }catch(error){
  return{...spec,index,method:'GET',state:'error',httpStatus:null,rate:null,checkedAt,
   message:error?.name==='AbortError'?'请求已取消或超出 12 秒时限':String(error?.message||'请求失败').slice(0,180)};
 }
}
async function run(){
 if(state.running)return;
 let spec1,spec2;
 try{
  spec1=makePublicRequest($('apiLabRepoA').value,$('apiLabEndpoint').value);
  if($('apiLabCompareEnabled').checked)spec2=makePublicRequest($('apiLabRepoB').value,$('apiLabEndpoint').value);
 }catch(error){status(error.message,'error');return;}
 const number=++state.requestId;
 state.running=true;state.controllers=[];state.results=[null,null];state.rawExpanded=[false,false];
 $('apiLabRun').disabled=true;$('apiLabCancel').disabled=false;
 status('正在直接查询公开 GitHub REST API。未提交令牌或写入请求…','busy');render();
 const specs=[spec1,spec2].filter(Boolean);
 const responses=await Promise.all(specs.map(async (spec,index)=>{
  const ctrl=new AbortController();state.controllers.push(ctrl);
  const timer=setTimeout(()=>ctrl.abort(),12000);
  try{return await request(spec,index,ctrl.signal)}finally{clearTimeout(timer)}
 }));
 if(number!==state.requestId)return;
 state.running=false;state.controllers=[];state.results=[responses[0]||null,responses[1]||null];
 $('apiLabRun').disabled=false;$('apiLabCancel').disabled=true;
 render();
 status(responses.every(x=>x.state==='ok')?'请求完成。响应来自 GitHub API，属于当次实际观察。':'部分请求失败；具体 HTTP 状态与原因已保留。',responses.every(x=>x.state==='ok')?'success':'error');
}
function download(name,content,mime){
 const url=URL.createObjectURL(new Blob([content],{type:mime})),a=make('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function exportReport(){
 if(!state.results.some(Boolean))return;
 download('ATLAS-Public-API-'+new Date().toISOString().slice(0,10)+'.md',apiLabReport(state.results),'text/markdown;charset=utf-8');
}
function exportJson(){
 const valid=state.results.filter(x=>x?.state==='ok');
 if(!valid.length)return;
 download('ATLAS-Public-API-JSON-'+new Date().toISOString().slice(0,10)+'.json',
  JSON.stringify({schemaVersion:1,source:'GitHub public REST',records:valid.map(x=>({
   repository:x.repository,endpoint:x.endpoint,url:x.url,httpStatus:x.httpStatus,
   checkedAt:x.checkedAt,elapsedMs:x.elapsedMs,rate:x.rate,response:x.raw
  }))},null,2),'application/json;charset=utf-8');
}
export function initApiLab(){
 const select=$('apiLabEndpoint');
 for(const item of API_LAB_ENDPOINTS){const opt=make('option',item.label+' · '+item.note);opt.value=item.id;select.append(opt)}
 $('apiLabCompareEnabled').addEventListener('change',e=>{
  $('apiLabSecond').hidden=!e.target.checked;
  if(!e.target.checked){state.results[1]=null;state.rawExpanded[1]=false;render()}
 });
 $('apiLabForm').addEventListener('submit',e=>{e.preventDefault();void run()});
 $('apiLabCancel').onclick=()=>{
  for(const ctrl of state.controllers)ctrl.abort();
  status('正在取消当前请求…','busy');
 };
 $('apiLabExport').onclick=exportReport;$('apiLabJson').onclick=exportJson;
 $('apiLabClear').onclick=()=>{
  for(const ctrl of state.controllers)ctrl.abort();
  state.requestId++;state.running=false;state.controllers=[];state.results=[null,null];
  state.rawExpanded=[false,false];state.filter='';$('apiLabFilter').value='';
  $('apiLabRun').disabled=false;$('apiLabCancel').disabled=true;
  render();status('已清空会话记录。没有写入本地存储。');
 };
 $('apiLabFilter').addEventListener('input',e=>{state.filter=e.target.value;render()});
 render();
}