import{OPENAPI_EXAMPLE,MAX_OPENAPI_SIZE,OPENAPI_METHODS,inspectOpenApi,filterOpenApiOperations,openApiReviewMarkdown}from'./openapi-core.js';
const $=id=>document.getElementById(id);
const el=(tag,text=null,cls='')=>{const x=document.createElement(tag);if(text!==null)x.textContent=String(text);if(cls)x.className=cls;return x;};
let report=null,query='',method='all';
function status(message,error=false){$('oasStatus').textContent=message;$('oasStatus').dataset.kind=error?'error':'success'}
function updateResult(){
 const node=$('oasResults');node.replaceChildren();
 $('oasExport').disabled=!report;
 if(!report){node.append(el('p','尚无检查结果。载入示例或粘贴 OpenAPI 3.x JSON 后开始分析。','api-empty'));return}
 const overview=el('div',null,'oas-summary');
 for(const [label,value]of [['路径',report.counts.paths],['HTTP 操作',report.counts.operations],['结构错误',report.counts.errors],['审查提醒',report.counts.warnings]]){
  const card=el('div',null,'oas-summary-item');card.append(el('small',label),el('strong',value));overview.append(card);
 }
 node.append(overview);
 const title=el('div',null,'oas-report-heading');
 title.append(el('strong',report.title+' · '+report.version),el('small','已解析 '+report.counts.operations+' 个 operation · 所有数据保留在当前浏览器'));
 node.append(title);
 const findings=el('details',null,'oas-findings'),summary=el('summary','结构问题 · '+report.issues.length+' 项');
 findings.append(summary);
 const list=el('div',null,'oas-issues');
 if(!report.issues.length)list.append(el('p','未发现本工具覆盖范围内的结构问题；这不是 OpenAPI 官方认证。','api-lab-note'));
 for(const issue of report.issues){
  const row=el('div',null,'oas-issue '+issue.level);
  row.append(el('b',issue.level==='error'?'ERROR':'WARN'),el('code',issue.path),el('span',issue.message));
  list.append(row);
 }
 findings.append(list);node.append(findings);
 const filtered=filterOpenApiOperations(report,{query,method});
 $('oasCount').textContent='显示 '+filtered.length+' / '+report.operations.length+' 个 HTTP 操作';
 const grid=el('div',null,'oas-operation-grid');
 for(const op of filtered){
  const card=el('article',null,'oas-operation');
  const head=el('div',null,'oas-operation-head');
  head.append(el('b',op.method,'oas-method '+op.method.toLowerCase()),el('code',op.path));
  card.append(head);
  card.append(el('h4',op.summary||op.operationId||'未填写操作摘要'));
  const notes=el('div',null,'oas-operation-details');
  notes.append(el('span','响应 '+(op.responses.join(' / ')||'未定义')));
  if(op.operationId)notes.append(el('span','ID '+op.operationId));
  if(op.pathVariables.length)notes.append(el('span','路径变量 '+op.pathVariables.join(', ')));
  if(op.hasBody)notes.append(el('span','请求体已声明'));
  card.append(notes);grid.append(card);
 }
 if(!filtered.length)grid.append(el('p','没有匹配的 HTTP 操作。','api-empty'));
 node.append(grid);
}
function parseCurrent(){
 try{
  report=inspectOpenApi($('oasInput').value);
  query='';method='all';$('oasFilter').value='';$('oasMethod').value='all';
  updateResult();
  status('已完成本地 JSON 审查：'+report.counts.errors+' 项结构错误、'+report.counts.warnings+' 项提醒。未向任何 API 发送请求。');
 }catch(error){
  report=null;updateResult();status(String(error.message||'OpenAPI 解析失败'),true);
 }
}
async function readLocalFile(file){
 if(!file)return;
 if(file.size>MAX_OPENAPI_SIZE){
  report=null;updateResult();status('本地 JSON 文件超过 500 KB 限制，未读取',true);return;
 }
 try{
  $('oasInput').value=await file.text();parseCurrent();
 }catch(error){status('文件读取失败：'+String(error.message||'未知错误'),true)}
}
function exportReview(){
 if(!report)return;
 const blob=new Blob([openApiReviewMarkdown(report)],{type:'text/markdown;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='ATLAS-OpenAPI-Contract-'+new Date().toISOString().slice(0,10)+'.md';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
}
export function initOpenApiWorkbench(){
 $('oasExample').onclick=()=>{$('oasInput').value=OPENAPI_EXAMPLE;parseCurrent()};
 $('oasAnalyze').onclick=parseCurrent;
 $('oasClear').onclick=()=>{$('oasInput').value='';$('oasFile').value='';report=null;updateResult();status('已清空文档和检查记录。')};
 $('oasExport').onclick=exportReview;
 $('oasFile').addEventListener('change',event=>{void readLocalFile(event.target.files?.[0]);event.target.value=''});
 $('oasInput').addEventListener('input',()=>{report=null;updateResult();status('文档已修改，请重新执行本地分析。')});
 $('oasFilter').addEventListener('input',event=>{query=event.target.value;if(report)updateResult()});
 for(const id of ['all',...OPENAPI_METHODS]){
  const option=el('option',id==='all'?'全部 HTTP 方法':id.toUpperCase());option.value=id;$('oasMethod').append(option);
 }
 $('oasMethod').onchange=event=>{method=event.target.value;if(report)updateResult()};
 updateResult();
}