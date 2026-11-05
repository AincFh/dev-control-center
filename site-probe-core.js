// ATLAS Live Site Probe: HTTP reachability and first-party static asset checks.
// This is NOT JavaScript runtime execution, a playtest or an uptime guarantee.
const REPO=/^[A-Za-z0-9_.-]{1,120}$/;
const BASE='https://aincfh.github.io';
const at=()=>new Date().toISOString();
export function allowedSiteUrl(input,repo){
 if(!REPO.test(repo)||typeof input!=='string')return null;
 try{
  const u=new URL(input);
  const prefix='/'+encodeURIComponent(repo)+'/';
  if(u.origin!==BASE||u.username||u.password||u.search||u.hash||!(u.pathname===prefix||u.pathname===prefix+'index.html'))return null;
  return u.href;
 }catch{return null}
}
export function assetCandidates(html,page,repo,limit=6){
 const out=[],seen=new Set(),source=String(html||'').slice(0,256000);
 const tags=source.match(/<(?:script|link)\b[^>]*>/gi)||[];
 for(const tag of tags){
  const isJs=/^<script\b/i.test(tag),isCss=/^<link\b/i.test(tag)&&/\brel\s*=\s*(?:"[^"]*\bstylesheet\b[^"]*"|'[^']*\bstylesheet\b[^']*'|stylesheet\b)/i.test(tag);
  if(!isJs&&!isCss)continue;
  const key=isJs?'src':'href';
  const hit=tag.match(isJs?/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)')/i:/\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
  const value=hit?.[1]||hit?.[2];
  if(!value||value.includes('&amp;'))continue;
  try{
   const u=new URL(value,page),prefix='/'+encodeURIComponent(repo)+'/';
   if(u.origin!==BASE||!u.pathname.startsWith(prefix)||u.username||u.password||seen.has(u.href))continue;
   seen.add(u.href);out.push({url:u.href,type:isJs?'script':'stylesheet'});
   if(out.length>=Math.max(1,Math.min(limit,8)))break;
  }catch{}
 }
 return out;
}
async function readTextLimited(response,cap=256000){
 if(!response.body?.getReader)return(await response.text()).slice(0,cap);
 const reader=response.body.getReader(),decoder=new TextDecoder();
 let result='',bytes=0;
 try{
  while(bytes<cap){
   const {done,value}=await reader.read();if(done)break;
   bytes+=value.byteLength;
   result+=decoder.decode(value.slice(0,Math.max(0,cap-(bytes-value.byteLength))),{stream:true});
  }
 }finally{await reader.cancel().catch(()=>{})}
 return result;
}
async function getResponse(fetcher,url,timeoutMs){
 const signal=AbortSignal.timeout(Math.min(12000,Math.max(500,timeoutMs)));
 return fetcher(url,{redirect:'manual',cache:'no-store',signal,headers:{Accept:'text/html,application/xhtml+xml,*/*;q=0.8'}});
}
export async function probeSite({repo,url,fetcher=fetch,timeoutMs=7000,now=at}={}){
 const checkedAt=now(),start=Date.now(),safe=allowedSiteUrl(url,repo);
 const result={state:'unknown',checkedAt,httpStatus:null,assetCount:0,assetFailures:0,contentType:null,durationMs:null,reason:null};
 if(!safe)return{...result,reason:'unsupported_url'};
 try{
  let page=safe,response=null;
  for(let redirect=0;redirect<3;redirect++){
   response=await getResponse(fetcher,page,timeoutMs);
   if([301,302,303,307,308].includes(response.status)){
    const location=response.headers?.get('location');
    if(!location)break;
    const next=new URL(location,page);
    if(next.origin!==BASE||!next.pathname.startsWith('/'+encodeURIComponent(repo)+'/'))return{...result,state:'unknown',reason:'external_redirect'};
    await response.body?.cancel?.().catch(()=>{});
    page=next.href;continue;
   }
   break;
  }
  result.httpStatus=Number(response.status)||null;
  result.contentType=String(response.headers?.get('content-type')||'').split(';')[0].slice(0,60);
  if(!response.ok){
   result.state='http_error';result.reason='http_status_'+response.status;
   await response.body?.cancel?.().catch(()=>{});
   return result;
  }
  if(!result.contentType.includes('html')){
   result.state='content_error';result.reason='non_html_response';
   await response.body?.cancel?.().catch(()=>{});
   return result;
  }
  const html=await readTextLimited(response);
  if(!/<(?:!doctype\s+html|html|body)\b/i.test(html)){
   result.state='content_error';result.reason='missing_html_structure';return result;
  }
  const assets=assetCandidates(html,page,repo);
  result.assetCount=assets.length;
  const attempts=await Promise.all(assets.map(async asset=>{
   try{
    const r=await getResponse(fetcher,asset.url,Math.min(5000,timeoutMs));
    const ok=r.ok;
    await r.body?.cancel?.().catch(()=>{});
    return ok;
   }catch{return false}
  }));
  result.assetFailures=attempts.filter(x=>!x).length;
  result.state=result.assetFailures?'resource_error':'reachable';
  result.reason=result.assetFailures?'static_asset_failed':assets.length?'html_and_assets_ok':'html_ok_no_same_origin_assets';
 }catch(e){
  result.state='network_error';
  result.reason=e?.name==='TimeoutError'||e?.name==='AbortError'?'timeout':'request_failed';
 }finally{
  result.durationMs=Math.max(0,Date.now()-start);
 }
 return result;
}
export function probeOverview(projects=[]){
 const values=projects.map(p=>p.probe?.state||'not_checked');
 return{checked:values.filter(x=>x!=='not_checked'&&x!=='unknown').length,
  reachable:values.filter(x=>x==='reachable').length,
  broken:values.filter(x=>['http_error','resource_error','network_error','content_error'].includes(x)).length,
  missing:values.filter(x=>x==='not_checked'||x==='unknown').length};
}
