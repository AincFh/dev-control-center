/** ATLAS Data Studio / browser-only dataset exploration, no server writes. */
import{DATA_LIMITS,parseData,filterData,sortData,pageData,aggregateData,numericSummary,exportData,SAMPLE_DATA}from'./data-studio-core.js';
const $=id=>document.getElementById(id),el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n};
const state={dataset:null,rows:[],view:[],page:1,sortBy:null,sortDirection:'asc',file:null};
const number=n=>Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2});
const feedback=(text,bad=false)=>{const n=$('dataFeedback');n.textContent=text;n.dataset.kind=bad?'error':'info'};
function download(text,ext){
 const blob=new Blob([text],{type:ext==='json'?'application/json;charset=utf-8':'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='atlas-data-'+new Date().toISOString().slice(0,10)+'.'+ext;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function options(node,choices,selected){
 node.replaceChildren();for(const [key,label]of choices){const option=el('option',label);option.value=key;node.append(option);}node.value=selected;
}
function renderStats(){
 const target=$('dataStats'),d=state.dataset;target.replaceChildren();
 if(!d)return;
 const records=[['已导入数据',d.count],['可见记录',state.view.length],['数据字段',d.columns.length],['数值字段',d.schema.filter(x=>x.kind==='number').length]];
 for(const [label,value]of records){const card=el('div',null,'data-stat');card.append(el('span',label),el('strong',number(value)));target.append(card);}
 const insight=$('dataNumericSummary');insight.replaceChildren();
 const metrics=numericSummary(d,state.view);
 if(!metrics.length){insight.append(el('span','未识别到全列数值型字段。'));return;}
 for(const metric of metrics.slice(0,5)){
  const card=el('div',null,'data-numeric-insight');
  card.append(el('strong',metric.column),el('span','合计 '+number(metric.sum)+' · 均值 '+(metric.mean===null?'—':number(metric.mean))+' · 有效 '+metric.count));
  insight.append(card);
 }
}
function renderTable(){
 const root=$('dataTable');root.replaceChildren();
 if(!state.dataset)return;
 const paged=pageData(state.view,state.page);state.page=paged.page;
 const table=el('table',null,'data-result-table'),head=el('thead'),tr=el('tr');
 for(const name of state.dataset.columns){
  const th=el('th'),b=el('button',name+(state.sortBy===name?(state.sortDirection==='asc'?' ↑':' ↓'):''));
  b.type='button';b.title='按照 '+name+' 排序';b.setAttribute('aria-label','按 '+name+' 排序');
  b.onclick=()=>{if(state.sortBy===name)state.sortDirection=state.sortDirection==='asc'?'desc':'asc';else{state.sortBy=name;state.sortDirection='asc';}state.page=1;refresh();};
  th.append(b);tr.append(th);
 }
 head.append(tr);table.append(head);
 const body=el('tbody');
 for(const row of paged.rows){
  const line=el('tr');for(const name of state.dataset.columns)line.append(el('td',row[name]));body.append(line);
 }
 if(!paged.rows.length){const tr=el('tr'),td=el('td','没有匹配的行','data-empty-row');td.colSpan=state.dataset.columns.length;tr.append(td);body.append(tr);}
 table.append(body);root.append(table);
 $('dataPage').textContent=paged.page+' / '+paged.pages+' 页 · '+paged.total+' 条';
 $('dataPrevious').disabled=paged.page<=1;$('dataNext').disabled=paged.page>=paged.pages;
}
function renderChart(){
 const chart=$('dataChart');chart.replaceChildren();
 if(!state.dataset)return;
 try{
  const groupBy=$('dataGroup').value,operation=$('dataOperation').value,metric=$('dataMetric').value;
  const result=aggregateData(state.dataset,state.view,{groupBy,operation,metric,topN:10});
  $('dataChartCaption').textContent='按 '+groupBy+' 分组 · '+({count:'记录数量',sum:metric+' 合计',avg:metric+' 均值'}[operation])+' · '+result.groups+' 组'+(result.truncated?'（已展示前 10 组）':'');
  if(!result.items.length){chart.append(el('p','当前筛选无数据可展示。','data-empty-chart'));return;}
  const max=Math.max(1,...result.items.map(x=>Math.abs(x.value||0)));
  for(const item of result.items){
   const line=el('div',null,'data-bar-row');line.append(el('span',item.label,'data-bar-label'));
   const track=el('div',null,'data-bar-track'),fill=el('div',null,'data-bar-fill');fill.style.width=(Math.abs(item.value||0)/max*100).toFixed(2)+'%';if((item.value||0)<0)fill.dataset.negative='true';track.append(fill);
   line.append(track,el('strong',item.value===null?'—':number(item.value),'data-bar-number'));chart.append(line);
  }
 }catch(error){chart.append(el('p',error.message,'data-empty-chart'));$('dataChartCaption').textContent='分析条件尚未满足';}
}
function refresh(){
 if(!state.dataset)return;
 try{
  state.rows=filterData(state.dataset,{query:$('dataFilterQuery').value,column:$('dataFilterColumn').value,operator:$('dataFilterOperator').value});
  state.view=sortData(state.rows,{column:state.sortBy,direction:state.sortDirection,schema:state.dataset.schema});
  state.page=Math.max(1,Math.min(state.page,Math.ceil(state.view.length/DATA_LIMITS.pageSize)||1));
  renderStats();renderTable();renderChart();
  $('dataExportCsv').disabled=$('dataExportJson').disabled=state.view.length===0;
  feedback('已在浏览器内完成筛选与统计 · '+state.view.length+' / '+state.dataset.count+' 条；未上传原始数据。');
 }catch(err){feedback(err.message,true);$('dataExportCsv').disabled=$('dataExportJson').disabled=true;}
}
function initializeDataset(raw,format='auto',name='输入数据'){
 try{
  const next=parseData(raw,{format});state.dataset=next;state.file=name;state.sortBy=null;state.sortDirection='asc';state.page=1;
  const columns=next.columns.map(col=>[col,col]);
  const numeric=next.schema.filter(x=>x.kind==='number').map(x=>[x.name,x.name]);
  const guessed=next.columns.find(x=>/^(category|group|domain|type|department|类别|分组|部门)$/i.test(x))||next.columns.find(x=>next.schema.find(s=>s.name===x)?.kind==='text')||next.columns[0];
  options($('dataFilterColumn'),[['all','所有字段'],...columns],'all');
  options($('dataGroup'),columns,guessed);
  options($('dataMetric'),numeric,numeric[0]?.[0]||'');
  options($('dataOperation'),[['count','计数'],['sum','求和'],['avg','平均值']],'count');
  $('dataMetric').disabled=true;$('dataFilterQuery').value='';$('dataFilterOperator').value='contains';
  $('dataDataSource').textContent=name+' · '+next.format.toUpperCase()+' · '+number(next.rows.length)+' 条记录';
  refresh();return true;
 }catch(e){feedback('导入失败：'+e.message,true);return false;}
}
async function importFile(file){
 if(!file)return;
 if(file.size>DATA_LIMITS.characters*4){feedback('文件超过本地处理上限，请先分批处理。',true);return;}
 try{const content=await file.text();if(content.length>DATA_LIMITS.characters)throw Error('文件文本超过 '+DATA_LIMITS.characters+' 字符');
  const format=file.name.toLowerCase().endsWith('.json')?'json':file.name.toLowerCase().endsWith('.csv')?'csv':'auto';
  $('dataInput').value=content;initializeDataset(content,format,file.name);
 }catch(e){feedback('读取文件失败：'+e.message,true);}
}
export function initDataStudio(){
 $('dataImport').onclick=()=>initializeDataset($('dataInput').value,'auto','粘贴数据');
 $('dataSample').onclick=()=>{$('dataInput').value=SAMPLE_DATA;initializeDataset(SAMPLE_DATA,'csv','演示样本（虚构示例，不是真实项目状态）');};
 $('dataFile').addEventListener('change',event=>{void importFile(event.target.files?.[0]);});
 $('dataFilterQuery').addEventListener('input',()=>{state.page=1;refresh()});
 for(const id of ['dataFilterColumn','dataFilterOperator','dataGroup','dataMetric'])$(id).onchange=()=>{state.page=1;refresh()};
 $('dataOperation').onchange=()=>{const active=$('dataOperation').value!=='count';$('dataMetric').disabled=!active;
  if(active&&!$('dataMetric').options.length){$('dataOperation').value='count';$('dataMetric').disabled=true;feedback('当前数据没有可用于求和或平均值的数值字段。',true);}
  refresh();
 };
 $('dataPrevious').onclick=()=>{state.page--;renderTable()};
 $('dataNext').onclick=()=>{state.page++;renderTable()};
 $('dataExportCsv').onclick=()=>download(exportData(state.view,state.dataset.columns,{format:'csv'}),'csv');
 $('dataExportJson').onclick=()=>download(exportData(state.view,state.dataset.columns,{format:'json'}),'json');
 $('dataClear').onclick=()=>{
  state.dataset=null;state.rows=[];state.view=[];state.page=1;state.file=null;
  $('dataInput').value='';$('dataFile').value='';$('dataStats').replaceChildren();$('dataNumericSummary').replaceChildren();$('dataChart').replaceChildren();$('dataTable').replaceChildren();
  $('dataDataSource').textContent='尚未导入数据';$('dataChartCaption').textContent='等待数据';$('dataPage').textContent='—';
  $('dataExportCsv').disabled=$('dataExportJson').disabled=$('dataNext').disabled=$('dataPrevious').disabled=true;
  feedback('数据已经从当前工作区清空，不会留下本地存储记录。');
 };
 $('dataMetric').disabled=true;feedback('选择示例、粘贴数据或选择文件，开始本地分析。');
}
