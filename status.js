export function workflowState(run) {
  if (!run) return 'unknown';
  if (run.status !== 'completed') return 'running';
  if (run.conclusion === 'success') return 'success';
  if (['failure','timed_out','action_required','startup_failure'].includes(run.conclusion)) return 'failure';
  if (['cancelled','skipped','neutral','stale'].includes(run.conclusion)) return 'neutral';
  return 'unknown';
}
export function latestWorkflow(runs, branch='main', excludeId=null){
  if(!Array.isArray(runs))return null;
  return [...runs].filter(x=>x&&x.head_branch===branch&&x.event!=='pull_request'&&String(x.id)!==String(excludeId??'')).sort((a,b)=>Date.parse(b.created_at||0)-Date.parse(a.created_at||0))[0]??null;
}
export function summarizeHealth(projects=[]){
 const result={success:0,failure:0,running:0,neutral:0,unknown:0,openIssues:0,openPRs:0};
 for(const p of projects){
  const state=p?.ci?.state||'unknown';
  result[state in result?state:'unknown']++;
  result.openIssues+=Number.isInteger(p?.openIssues)?p.openIssues:0;
  result.openPRs+=Number.isInteger(p?.openPRs)?p.openPRs:0;
 }
 return result;
}
export function safeRepositoryPath(owner,name){
 if(!/^[a-zA-Z0-9_.-]+$/.test(owner)||!/^[a-zA-Z0-9_.-]+$/.test(name))throw Error('Invalid repository identifier');
 return '/repos/'+owner+'/'+name;
}
export function repoHealthLabel(state){return({success:'构建通过',failure:'构建失败',running:'运行中',neutral:'取消/跳过',unknown:'暂无数据'})[state]||'暂无数据';}
export function isoAge(iso,now=Date.now()){
 const ms=Date.parse(iso||'');if(!Number.isFinite(ms))return'未知';
 const m=Math.max(0,Math.floor((now-ms)/60000));if(m<1)return'刚刚';if(m<60)return m+' 分钟前';
 const h=Math.floor(m/60);if(h<24)return h+' 小时前';return Math.floor(h/24)+' 天前';
}