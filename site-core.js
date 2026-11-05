// Public Pages status must not contradict a successful SHA-bound Deployment.
// This is publication evidence, not end-user browser reachability certification.
const DAY=86400000;
const validUrl=x=>{
 try{
  const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;
 }catch{return null}
};
export function siteEvidence({pages=null,trace=null,now=Date.now()}={}){
 const pageUrl=validUrl(pages?.html_url);
 if(pageUrl&&['built','active','published'].includes(pages?.status)){
  return{state:'published',url:pageUrl,source:'pages_api',deploymentSha:null,verifiedAt:null};
 }
 const proofs=(trace?.prs||[]).filter(p=>p?.state==='merged'&&p.mergeSha&&
  p.deployment?.verified===true&&p.deployment.state==='success'&&p.deployment.sha===p.mergeSha&&
  validUrl(p.deployment.url)&&Number.isFinite(Date.parse(p.deployment.updatedAt||'')))
  .sort((a,b)=>Date.parse(b.deployment.updatedAt)-Date.parse(a.deployment.updatedAt));
 for(const p of proofs){
  const age=now-Date.parse(p.deployment.updatedAt);
  if(age<0||age>30*DAY)continue;
  const u=validUrl(p.deployment.url);
  if(pageUrl){
   const expected=new URL(pageUrl),actual=new URL(u);
   if(expected.origin!==actual.origin||!actual.pathname.startsWith(expected.pathname))continue;
  }
  return{state:'published',url:u,source:'github_deployment',
   deploymentSha:p.mergeSha,verifiedAt:p.deployment.updatedAt};
 }
 if(pages?.status==='building')return{state:'building',url:null,source:'pages_api',deploymentSha:null,verifiedAt:null};
 if(pages?.status==='errored')return{state:'error',url:null,source:'pages_api',deploymentSha:null,verifiedAt:null};
 // API 404, unknown status or incomplete metadata are not proof of absence.
 return{state:'unknown',url:null,source:'insufficient_evidence',deploymentSha:null,verifiedAt:null};
}
