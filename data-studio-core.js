/** ATLAS Data Studio: deterministic, browser-local, bounded analysis.
 * No remote data, dynamic execution, chart CDN, database, persistence or telemetry.
 */
import {csvToObjects,MAX_TEXT} from './developer-utils-core.js';
export const DATA_LIMITS=Object.freeze({characters:MAX_TEXT,rows:2000,columns:48,pageSize:20});
const numeric=/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const isoDate=/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const primitive=v=>v==null?'':typeof v==='object'?JSON.stringify(v):String(v);
export function parseData(text,{format='auto'}={}){
 if(typeof text!=='string'||text.length>DATA_LIMITS.characters)throw Error('输入过大或格式无效：最多 '+DATA_LIMITS.characters+' 字符');
 if(!text.trim())throw Error('请输入 CSV 或 JSON 数据');
 const trimmed=text.trimStart();
 const chosen=format==='auto'?((trimmed.startsWith('[')||trimmed.startsWith('{'))?'json':'csv'):format;
 if(!['json','csv'].includes(chosen))throw Error('只支持 CSV 或 JSON 数组');
 let raw;
 if(chosen==='json'){
  try{raw=JSON.parse(text)}catch(e){throw Error('JSON 解析失败：'+e.message)}
  if(!Array.isArray(raw))throw Error('JSON 数据顶层必须是对象数组');
 }else raw=csvToObjects(text,{maxRows:DATA_LIMITS.rows});
 if(!raw.length)throw Error('数据没有记录');
 if(raw.length>DATA_LIMITS.rows)throw Error('最多支持 '+DATA_LIMITS.rows+' 行');
 const columns=[];
 const seen=new Set();
 for(const row of raw){
  if(!row||typeof row!=='object'||Array.isArray(row))throw Error('JSON 数组的每行必须是对象');
  for(const key of Object.keys(row)){
   if(!key.trim())throw Error('列名不能留空');
   if(key.length>100)throw Error('列名过长');
   if(!seen.has(key)){seen.add(key);columns.push(key);if(columns.length>DATA_LIMITS.columns)throw Error('最多支持 '+DATA_LIMITS.columns+' 列');}
  }
 }
 if(!columns.length)throw Error('找不到有效列');
 const rows=raw.map(record=>Object.fromEntries(columns.map(key=>[key,primitive(Object.hasOwn(record,key)?record[key]:null)])));
 const schema=columns.map(name=>{
  const values=rows.map(x=>x[name]).filter(x=>x.trim()!=='');
  const kind=values.length&&values.every(x=>numeric.test(x)&&Number.isFinite(Number(x)))?'number':
   values.length&&values.every(x=>isoDate.test(x)&&Number.isFinite(Date.parse(x)))?'date':
   values.length&&values.every(x=>/^(true|false)$/i.test(x))?'boolean':'text';
  const filled=values.length,unique=new Set(values).size;
  return{name,kind,filled,missing:rows.length-filled,unique};
 });
 return{format:chosen,columns,schema,rows,count:rows.length};
}
function numberOf(x){const s=String(x??'').trim();return s&&numeric.test(s)?Number(s):null;}
export function filterData(dataset,{query='',column='all',operator='contains'}={}){
 if(!dataset?.rows||!dataset.columns)throw Error('请先加载数据');
 if(column!=='all'&&!dataset.columns.includes(column))throw Error('筛选列不存在');
 if(!['contains','equals','gte','lte'].includes(operator))throw Error('不支持该筛选方式');
 const term=String(query).trim();
 if(!term)return [...dataset.rows];
 const low=term.toLocaleLowerCase();
 if(['gte','lte'].includes(operator)&&numberOf(term)===null)throw Error('比较筛选需要有效数值');
 if(['gte','lte'].includes(operator)&&column==='all')throw Error('数值比较需要选择一列');
 return dataset.rows.filter(row=>{
  const values=column==='all'?dataset.columns.map(k=>row[k]):[row[column]];
  if(operator==='contains')return values.some(v=>String(v).toLocaleLowerCase().includes(low));
  if(operator==='equals')return values.some(v=>String(v).toLocaleLowerCase()===low);
  return values.some(v=>{
   const num=numberOf(v);
   return num!==null&&(operator==='gte'?num>=Number(term):num<=Number(term));
  });
 });
}
export function sortData(rows,{column=null,direction='asc',schema=[]}={}){
 if(!column)return [...rows];
 const field=schema.find(x=>x.name===column);
 if(!field)throw Error('排序列不存在');
 if(!['asc','desc'].includes(direction))throw Error('无效排序方向');
 const reverse=direction==='asc'?1:-1;
 return rows.map((row,index)=>({row,index})).sort((a,b)=>{
  const va=a.row[column],vb=b.row[column],missingA=va==='',missingB=vb==='';
  if(missingA!==missingB)return missingA?1:-1;
  let cmp;
  if(field.kind==='number')cmp=(numberOf(va)??0)-(numberOf(vb)??0);
  else if(field.kind==='date')cmp=Date.parse(va||'1970-01-01')-Date.parse(vb||'1970-01-01');
  else cmp=String(va).localeCompare(String(vb),'zh-CN',{numeric:true,sensitivity:'base'});
  return cmp?Math.sign(cmp)*reverse:a.index-b.index;
 }).map(x=>x.row);
}
export function pageData(rows,page=1,size=DATA_LIMITS.pageSize){
 const pages=Math.max(1,Math.ceil(rows.length/size)),current=Math.min(pages,Math.max(1,Math.floor(Number(page)||1)));
 return{rows:rows.slice((current-1)*size,current*size),page:current,pages,total:rows.length};
}
export function aggregateData(dataset,rows,{groupBy,operation='count',metric=null,topN=10}={}){
 if(!dataset?.columns?.includes(groupBy))throw Error('请选择有效分组字段');
 if(!['count','sum','avg'].includes(operation))throw Error('未知聚合方法');
 if(operation!=='count'&&dataset.schema.find(x=>x.name===metric)?.kind!=='number')throw Error('求和与均值必须选择数值列');
 const buckets=new Map();
 for(const row of rows){
  const label=String(row[groupBy]??'').trim()||'（空值）';
  if(!buckets.has(label))buckets.set(label,{label,count:0,sum:0,valid:0});
  const obj=buckets.get(label);obj.count++;
  if(operation!=='count'){const num=numberOf(row[metric]);if(num!==null&&Number.isFinite(num)){obj.sum+=num;obj.valid++;}}
 }
 const result=[...buckets.values()].map(x=>({
  label:x.label,count:x.count,valid:x.valid,
  value:operation==='count'?x.count:operation==='sum'?x.sum:x.valid?x.sum/x.valid:null
 }));
 result.sort((a,b)=>(b.value??-Infinity)-(a.value??-Infinity)||a.label.localeCompare(b.label,'zh-CN'));
 const limit=Math.max(1,Math.min(30,Math.trunc(Number(topN)||10)));
 return{items:result.slice(0,limit),truncated:Math.max(0,result.length-limit),groups:result.length,operation,metric};
}
export function numericSummary(dataset,rows){
 if(!dataset?.schema)throw Error('请先加载数据');
 return dataset.schema.filter(x=>x.kind==='number').map(col=>{
  const nums=rows.map(r=>numberOf(r[col.name])).filter(v=>v!==null&&Number.isFinite(v));
  const sum=nums.reduce((a,b)=>a+b,0);
  return{column:col.name,count:nums.length,sum,min:nums.length?Math.min(...nums):null,max:nums.length?Math.max(...nums):null,mean:nums.length?sum/nums.length:null};
 });
}
function csvQuote(v,protectFormulas=true){
 let value=String(v??'');
 // Prefix potentially executable spreadsheet formulas, not legitimate negative numbers.
 if(protectFormulas&&(/^[=+@\t\r]/.test(value)||(/^-(?!\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$)/.test(value))))value="'"+value;
 return /[",\r\n]/.test(value)?'"'+value.replaceAll('"','""')+'"':value;
}
export function exportData(rows,columns,{format='csv'}={}){
 if(!Array.isArray(rows)||!Array.isArray(columns)||!columns.length)throw Error('没有可导出的数据');
 if(!['csv','json'].includes(format))throw Error('不支持该导出格式');
 const filtered=rows.map(row=>Object.fromEntries(columns.map(c=>[c,row[c]??''])));
 if(format==='json')return JSON.stringify(filtered,null,2);
 return [columns.map(c=>csvQuote(c)).join(','),...filtered.map(row=>columns.map(c=>csvQuote(row[c])).join(','))].join('\r\n');
}
export const SAMPLE_DATA=String.raw`project,category,phase,points,estimate
ATLAS,Platform,Released,89,30
QingJi,Mobile,Development,65,24
AincFh OS,System,Development,72,38
A.T. Field,Web,Review,81,27
Automation Kit,Automation,Planning,42,16
Audio Studio,Media,Planning,47,22
API Workshop,Tools,Development,75,18
Data Studio,Data,Review,84,20
Design Lab,Design,Planning,52,14
Network Monitor,Infra,Planning,38,12`;
