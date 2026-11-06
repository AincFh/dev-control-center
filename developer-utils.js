/** ATLAS Developer Workshop: local-only browser tools, no tracking or backend. */
import{TOOLS,MAX_TEXT,jsonTransform,csvToObjects,textDiff,base64Encode,base64Decode,urlTransform,textStats,sha256Text}from'./developer-utils-core.js';
const $=id=>document.getElementById(id);
const make=(tag,text,cls)=>{const x=document.createElement(tag);if(text!=null)x.textContent=String(text);if(cls)x.className=cls;return x};
const ACTIONS={
 json:[['pretty','格式化'],['compact','压缩']],
 csv:[['convert','转换成 JSON']],
 diff:[['compare','对比文本']],
 base64:[['encode','编码'],['decode','解码']],
 url:[['encode','编码'],['decode','解码']],
 sha256:[['hash','生成 SHA-256']],
 stats:[['count','计算统计']]
};
let selected='json',currentOutput='',running=false;
function tool(){return TOOLS.find(x=>x.id===selected)||TOOLS[0]}
function setStatus(message,isError=false){const el=$('utilsStatus');el.textContent=message;el.dataset.status=isError?'error':'ready'}
function clearOutput(){
 currentOutput='';$('utilsOutput').replaceChildren();$('utilsDownload').disabled=true;
 $('utilsResultSummary').textContent='等待执行';
}
function switchTool(id){
 if(!TOOLS.some(x=>x.id===id))return;
 selected=id;const current=tool();clearOutput();
 for(const b of $('utilsTabs').querySelectorAll('button')){
  const on=b.dataset.tool===id;b.setAttribute('aria-pressed',String(on));b.classList.toggle('active',on);
 }
 $('utilsCurrentTitle').textContent=current.label;
 $('utilsCurrentDescription').textContent=current.description;
 $('utilsInputA').value='';$('utilsInputB').value='';
 $('utilsInputA').placeholder={
  json:'例如：{"name":"ATLAS","areas":["AI","Web","System"]}',
  csv:'例如：name,project\\nATLAS,Developer Studio',
  base64:'输入待编码或解码的 UTF-8 字符串',
  url:'输入待编码的文本或已编码的 URL 片段',
  sha256:'输入需要计算摘要的文本，内容不离开本机',
  stats:'输入任意 Unicode 文本',
  diff:'输入原始版本的文本'
 }[id]||'输入文本';
 $('utilsInputBWrap').hidden=current.mode!=='dual';
 const choices=ACTIONS[id],picker=$('utilsMode');
 picker.replaceChildren(...choices.map(([value,label])=>{const o=make('option',label);o.value=value;return o}));
 $('utilsInputHint').textContent=id==='diff'?'左侧输入原文，右侧输入新文。最多各 250 行。':'最多 '+MAX_TEXT.toLocaleString('en-US')+' 字符；仅本地处理，不上传。';
 setStatus('已切换到 '+current.label+'，输入与结果不会写入浏览器存储。');
}
function drawText(text,kind='text'){
 const output=$('utilsOutput');
 output.replaceChildren();
 const code=make('pre',text,kind==='stats'?'utils-stats-output':'utils-text-output');output.append(code);
 currentOutput=text;
 $('utilsDownload').disabled=false;
 $('utilsResultSummary').textContent=text.length.toLocaleString('en-US')+' 字符输出';
}
function drawDiff(rows){
 const output=$('utilsOutput');output.replaceChildren();
 let add=0,remove=0,same=0;
 const container=make('div',null,'utils-diff-output'),report=[];
 for(const row of rows){
  const prefix=row.kind==='added'?'+ ':row.kind==='removed'?'- ':'  ';
  const line=make('div',prefix+row.text,'utils-diff-line utils-diff-'+row.kind);
  container.append(line);report.push(prefix+row.text);
  if(row.kind==='added')add++;else if(row.kind==='removed')remove++;else same++;
 }
 output.append(container);currentOutput=report.join('\n');
 $('utilsResultSummary').textContent='新增 '+add+' 行 · 删除 '+remove+' 行 · 相同 '+same+' 行';
 $('utilsDownload').disabled=false;
}
async function run(){
 if(running)return;
 const source=$('utilsInputA').value,other=$('utilsInputB').value,mode=$('utilsMode').value;
 clearOutput();running=true;$('utilsRun').disabled=true;
 setStatus('正在本地处理…');
 try{
  let result;
  switch(selected){
   case 'json':result=jsonTransform(source,{compact:mode==='compact'});break;
   case 'csv':{const rows=csvToObjects(source);result=JSON.stringify(rows,null,2);break;}
   case 'diff':drawDiff(textDiff(source,other));break;
   case 'base64':result=mode==='decode'?base64Decode(source):base64Encode(source);break;
   case 'url':result=urlTransform(source,{decode:mode==='decode'});break;
   case 'sha256':result=await sha256Text(source);break;
   case 'stats':result=JSON.stringify(textStats(source),null,2);break;
   default:throw Error('未知操作类型');
  }
  if(selected!=='diff')drawText(result,selected==='stats'?'stats':'text');
  setStatus('已在浏览器本地处理完成；结果未被发送到外部服务器。');
 }catch(error){clearOutput();setStatus(error.message||'本地处理失败',true);}
 finally{running=false;$('utilsRun').disabled=false;}
}
function downloadResult(){
 if(!currentOutput)return;
 const mime='text/plain;charset=utf-8';
 const ext=selected==='csv'||selected==='json'||selected==='stats'?'json':selected==='diff'?'diff':'txt';
 const blob=new Blob([currentOutput],{type:mime}),url=URL.createObjectURL(blob);
 const a=make('a');a.href=url;a.download='atlas-'+selected+'-'+new Date().toISOString().slice(0,10)+'.'+ext;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export function initDeveloperUtils(){
 const tabs=$('utilsTabs');
 for(const item of TOOLS){
  const button=make('button',item.label,'utils-tab');button.type='button';button.dataset.tool=item.id;
  button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>switchTool(item.id));tabs.append(button);
 }
 $('utilsRun').onclick=()=>{void run()};
 $('utilsClear').onclick=()=>{$('utilsInputA').value='';$('utilsInputB').value='';clearOutput();setStatus('输入和输出已清空。');};
 $('utilsDownload').onclick=downloadResult;
 $('utilsInputA').addEventListener('input',()=>{clearOutput();setStatus('文本已修改，点击执行生成新结果。')});
 $('utilsInputB').addEventListener('input',()=>{clearOutput();setStatus('第二份文本已修改，点击执行生成新结果。')});
 switchTool('json');
}
