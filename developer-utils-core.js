/** ATLAS local developer utilities. No network, eval, or persistence.
 * Never store processed user input or secrets in telemetry.
 */
export const MAX_TEXT=250_000;
export const TOOLS=Object.freeze([
 {id:'json',label:'JSON 校验 / 格式化',description:'格式化、压缩并定位 JSON 语法错误。',mode:'text'},
 {id:'csv',label:'CSV → JSON',description:'解析带引号、逗号和换行的 UTF-8 CSV 表格。',mode:'text'},
 {id:'diff',label:'文本差异比较',description:'逐行比较新增、删除与相同内容。',mode:'dual'},
 {id:'base64',label:'Base64 / UTF-8',description:'本地编码或还原 UTF-8 文本，不支持二进制文件。',mode:'text'},
 {id:'url',label:'URL 编解码',description:'使用 encodeURIComponent、decodeURIComponent 转换文本。',mode:'text'},
 {id:'sha256',label:'SHA-256 摘要',description:'使用浏览器 Web Crypto 生成十六进制摘要。',mode:'text'},
 {id:'stats',label:'文本统计',description:'字符、字节、字词、行数与空白统计。',mode:'text'}
]);
function inputText(value){if(typeof value!=='string')throw Error('输入必须是文本');if(value.length>MAX_TEXT)throw Error('文本超过 '+MAX_TEXT+' 字符的本地处理上限');return value;}
export function jsonTransform(value,{compact=false}={}){
 const text=inputText(value);
 let data;try{data=JSON.parse(text)}catch(error){throw Error('JSON 无法解析：'+error.message);}
 const result=JSON.stringify(data,null,compact?0:2);
 if(result===undefined)throw Error('无法序列化 JSON');
 return result;
}
export function csvToObjects(value,{maxRows=2000}={}){
 const text=inputText(value).replace(/^\uFEFF/,'');
 if(!text.trim())throw Error('CSV 内容为空');
 const rows=[],row=[];let cell='',quoted=false,closed=false;
 const pushCell=()=>{row.push(cell);cell='';closed=false;};
 const pushRow=()=>{rows.push([...row]);row.length=0;if(rows.length>maxRows+1)throw Error('CSV 超过 '+maxRows+' 行限制');};
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){
   if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}
   else cell+=ch;
  }else if(ch==='"'){
   if(cell!==''||closed)throw Error('CSV 引号位置不合法（字符 '+(i+1)+'）');
   quoted=true;
  }else if(ch===','){pushCell();}
  else if(ch==='\n'||ch==='\r'){
   pushCell();pushRow();if(ch==='\r'&&text[i+1]==='\n')i++;
  }else{
   if(closed&&ch!==' '&&ch!=='\t')throw Error('CSV 引号后包含非分隔符字符');
   if(!closed)cell+=ch;
  }
 }
 if(quoted)throw Error('CSV 存在未闭合的引号');
 if(row.length||cell||closed||!/[\r\n]$/.test(text)){pushCell();pushRow();}
 const headers=(rows.shift()||[]).map((h,i)=>i===0?h.replace(/^\uFEFF/,''):h);
 if(headers.length===0||headers.every(x=>!x.trim()))throw Error('CSV 缺少表头');
 if(headers.some(x=>!x.trim()))throw Error('CSV 表头不能留空');
 if(new Set(headers).size!==headers.length)throw Error('CSV 表头存在重复列');
 return rows.filter(r=>!(r.length===1&&r[0]===''&&headers.length>1)).map((record,i)=>{
  if(record.length!==headers.length)throw Error('CSV 第 '+(i+2)+' 行列数不匹配：应为 '+headers.length+' 列，实际 '+record.length+' 列');
  return Object.fromEntries(headers.map((h,j)=>[h,record[j]]));
 });
}
export function textDiff(a,b,{maxLines=250}={}){
 const before=inputText(a).replace(/\r\n/g,'\n').split('\n'),after=inputText(b).replace(/\r\n/g,'\n').split('\n');
 if(before.length>maxLines||after.length>maxLines)throw Error('逐行对比每份最多 '+maxLines+' 行');
 const n=before.length,m=after.length,dp=Array.from({length:n+1},()=>new Uint16Array(m+1));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=before[i]===after[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 const output=[];let i=0,j=0;
 while(i<n||j<m){
  if(i<n&&j<m&&before[i]===after[j]){output.push({kind:'same',text:before[i++]});j++;}
  else if(j<m&&(i===n||dp[i][j+1]>=dp[i+1][j]))output.push({kind:'added',text:after[j++]});
  else output.push({kind:'removed',text:before[i++]});
 }
 return output;
}
export function base64Encode(value){
 const bytes=new TextEncoder().encode(inputText(value));let encoded='';
 for(let i=0;i<bytes.length;i+=8192)encoded+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(encoded);
}
export function base64Decode(value){
 const data=inputText(value).replace(/\s/g,'');
 if(data&&!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data))throw Error('Base64 文本格式无效');
 try{const raw=atob(data);return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,c=>c.charCodeAt(0)));}
 catch{throw Error('Base64 不是有效的 UTF-8 文本');}
}
export function urlTransform(value,{decode=false}={}){
 const text=inputText(value);
 try{return decode?decodeURIComponent(text):encodeURIComponent(text)}
 catch{throw Error('URL 编码包含不完整的百分号序列或无效 UTF-8');}
}
export function textStats(value){
 const s=inputText(value),bytes=new TextEncoder().encode(s);
 const chars=[...s].length,lines=s===''?0:s.split(/\r\n|\r|\n/).length;
 const words=s.trim()?s.trim().split(/\s+/u).length:0;
 return {characters:chars,utf16Units:s.length,bytes:bytes.length,lines,words,spaces:(s.match(/[ \t]/g)||[]).length,nonSpace:[...s].filter(c=>!(/\s/u).test(c)).length};
}
export async function sha256Text(value,cryptoProvider=globalThis.crypto){
 const data=new TextEncoder().encode(inputText(value));
 if(!cryptoProvider?.subtle?.digest)throw Error('当前浏览器不支持安全上下文中的 Web Crypto 摘要');
 const digest=await cryptoProvider.subtle.digest('SHA-256',data);
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
