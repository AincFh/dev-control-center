// ATLAS Mission Control. Strictly observational public-data signals, not a release certification.
import {probeOverview} from './site-probe-core.js';
export const MAX_PREVIEW=5;
export const MISSION_FILTERS=[
 {id:'all',label:'全部项目'},
 {id:'action',label:'需要处理'},
 {id:'failure',label:'构建失败'},
 {id:'review',label:'待审 PR'},
 {id:'unverified',label:'待核验'},
 {id:'game',label:'游戏项目'},
 {id:'site_error',label:'线上资源异常'},
 {id:'game_qa_failed',label:'浏览器玩法验收失败'}
];
export const RELEASE_CHECKS=[
 {id:'playtest',label:'核心流程完成连续实际试玩'},
 {id:'mobile',label:'桌面与移动端交互已验收'},
 {id:'performance',label:'性能与资源加载达到目标'},
 {id:'recovery',label:'存档、恢复和异常处理已验证'},
 {id:'rights',label:'代码、素材与第三方许可已复核'},
 {id:'accessibility',label:'可访问性和键盘交互已核查'}
];
const STATES=new Set(['success','failure','running','neutral','unknown']);
const GITHUB_NAME=/^[A-Za-z0-9_.-]+$/;
const safeNumber=x=>Number.isInteger(x)&&x>=0?x:null;
const validDate=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
export function normalizePreview(raw,kind,repo,owner='AincFh'){
 if(!['issue','pull'].includes(kind)||!GITHUB_NAME.test(repo)||!GITHUB_NAME.test(owner)||!Array.isArray(raw))return [];
 const result=[],seen=new Set();
 for(const entry of raw){
  if(result.length>=MAX_PREVIEW)break;
  if(!entry||entry.pull_request&&kind==='issue')continue;
  if(kind==='pull'&&entry.pull_request&&entry.title===undefined)continue;
  if(!Number.isInteger(entry.number)||entry.number<1||seen.has(entry.number))continue;
  seen.add(entry.number);
  const number=entry.number;
  result.push({
   number,
   kind,
   title:String(entry.title||'(无标题)').slice(0,180),
   url:'https://github.com/'+owner+'/'+repo+'/'+(kind==='issue'?'issues':'pull')+'/'+number,
   updatedAt:validDate(entry.updated_at)?entry.updated_at:null,
   draft:kind==='pull'&&entry.draft===true,
   labels:kind==='issue'&&Array.isArray(entry.labels)?entry.labels.slice(0,3).map(x=>String(x?.name||'').slice(0,32)).filter(Boolean):[]
  });
 }
 return result;
}
export function releaseChecklist(raw){
 const checks={};for(const c of RELEASE_CHECKS)checks[c.id]=raw?.checks?.[c.id]===true;
 return{checks,note:String(raw?.note||'').slice(0,1200),updatedAt:validDate(raw?.updatedAt)?raw.updatedAt:null};
}
export function prepareReleaseEvidence(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return{};
 const out={};let count=0;
 for(const [name,evidence]of Object.entries(raw)){
  if(count>=200)break;
  if(!GITHUB_NAME.test(name)||name.length>120)continue;
  out[name]=releaseChecklist(evidence);count++;
 }
 return out;
}
export function releaseProgress(evidence){return RELEASE_CHECKS.filter(x=>evidence?.checks?.[x.id]===true).length}
export function assessProject(p,now=Date.now()){
 const state=STATES.has(p?.ci?.state)?p.ci.state:'unknown';
 const signals=[],name=String(p?.name||''),issues=safeNumber(p?.openIssues),prs=safeNumber(p?.openPRs);
 const add=(type,level,title,description,weight)=>{
  signals.push({id:name+':'+type,type,level,title,description,weight,repository:name});
 };
 if(state==='failure')add('failure','critical','构建失败','最近一次可见的主分支工作流失败，需查看 Actions 日志',100);
 if(state==='running')add('running','progress','构建正在运行','结论尚未确定，不应计为通过或失败',36);
 if(state==='neutral')add('neutral','verify','工作流已跳过或取消','无法用本次工作流证明项目完成',49);
 if(state==='unknown')add('unknown','verify','没有可核验的构建数据','可能未配置 Actions、没有记录或 API 不可用',47);
 if(prs>0)add('review','action',prs+(p.countsTruncated?'+':'')+' 个开放 PR','需要开发者审核、测试和处理',70);
 if(issues>0)add('issue','action',issues+(p.countsTruncated?'+':'')+' 个开放 Issue','待排期、分类或验证的公开问题',42);
 if(p.countsTruncated)add('truncated','verify','任务计数达到 API 截断阈值','数值是下限，不等于全部任务',52);
 if(p?.runtimeQa?.isCurrent&&['fail','timeout'].includes(p.runtimeQa.status)){
  add('game_browser','critical','游戏真实浏览器验收失败','独立 Chromium 实际游戏流程失败或超时；请核对 QA 原始运行和具体检查项',96);
 }
 if(['http_error','resource_error','network_error','content_error'].includes(p?.probe?.state)){
  add('site_probe','critical','线上静态资源探针异常','最近快照的 HTML/JS/CSS 网络检测未通过，需要打开站点进一步诊断',93);
 }
 const last=Date.parse(p?.updated||'');
 if(Number.isFinite(last)&&now-last>45*86400000)add('stale','note','近期缺少代码推送','超过 45 天无公开推送记录；不代表项目故障',14);
 signals.sort((a,b)=>b.weight-a.weight);
 return{
  name, state,issues,prs,signals,
  severity:signals[0]?.level||'clear',
  score:signals[0]?.weight||0,
  needsAttention:signals.some(x=>['critical','action','verify'].includes(x.level)),
  lastChanged:Number.isFinite(last)?last:0,
  page:p?.site?.state==='published'?'published':p?.site?.state||'unknown',
  fork:!!p?.isFork
 };
}
export function missionSnapshot(projects=[],snapshot={},now=Date.now()){
 const assessments=projects.map(p=>({project:p,...assessProject(p,now)}));
 const stateCounts={success:0,failure:0,running:0,neutral:0,unknown:0};
 for(const a of assessments)stateCounts[a.state]++;
 const age=Date.parse(snapshot?.generatedAt||'');
 const freshness=!Number.isFinite(age)?'missing':now-age>120*60000?'stale':'fresh';
 const issues=assessments.reduce((n,a)=>n+(a.issues??0),0),prs=assessments.reduce((n,a)=>n+(a.prs??0),0);
 const truncated=assessments.some(a=>a.project.countsTruncated);
 const tasks=[];
 for(const a of assessments){
  for(const [kind,collection]of [['issue',a.project.issuePreview],['pull',a.project.prPreview]]){
   for(const item of Array.isArray(collection)?collection.slice(0,MAX_PREVIEW):[]){
    if(!item||item.kind!==kind||!Number.isInteger(item.number)||item.number<1)continue;
    const expected='https://github.com/AincFh/'+a.name+'/'+(kind==='issue'?'issues':'pull')+'/'+item.number;
    tasks.push({...item,url:expected,kind,repository:a.name,repoLabel:a.project.label||a.name});
   }
  }
 }
 tasks.sort((a,b)=>(Date.parse(b.updatedAt||'')||0)-(Date.parse(a.updatedAt||'')||0)||a.repository.localeCompare(b.repository));
 return {assessments,states:stateCounts,
  openIssues:issues,openPRs:prs,countsTruncated:truncated,
  taskPreview:tasks,taskPreviewIsPartial:true,
  snapshotState:freshness,snapshotAgeMinutes:Number.isFinite(age)?Math.max(0,Math.floor((now-age)/60000)):null,
  errors:Array.isArray(snapshot?.errors)?snapshot.errors.length:0,
  gameQA:{
   passed:assessments.filter(a=>a.project.runtimeQa?.isCurrent&&a.project.runtimeQa.status==='pass').length,
   failed:assessments.filter(a=>a.project.runtimeQa?.isCurrent&&['fail','timeout'].includes(a.project.runtimeQa.status)).length,
   stale:assessments.filter(a=>a.project.runtimeQa?.case&&!a.project.runtimeQa.isCurrent).length
  },
  probes:probeOverview(projects),
  generatedAt:validDate(snapshot?.generatedAt)?snapshot.generatedAt:null
 };
}
export function filterMission(items,{query='',filter='all',sort='urgency',pinnedOnly=false,pinned=new Set()}={}){
 const terms=String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const predicate=a=>{
  if(pinnedOnly&&!pinned.has(a.name.toLowerCase()))return false;
  if(filter==='action'&&!a.needsAttention)return false;
  if(filter==='failure'&&a.state!=='failure')return false;
  if(filter==='review'&&!(a.prs>0))return false;
  if(filter==='unverified'&&!['unknown','neutral'].includes(a.state))return false;
  if(filter==='game'&&a.project.category!=='game')return false;
  if(filter==='site_error'&&!['http_error','resource_error','network_error','content_error'].includes(a.project.probe?.state))return false;
  if(filter==='game_qa_failed'&&!(a.project.runtimeQa?.isCurrent&&['fail','timeout'].includes(a.project.runtimeQa.status)))return false;
  return terms.every(t=>[a.name,a.project.label,a.project.description,a.project.language].some(x=>String(x||'').toLocaleLowerCase().includes(t)));
 };
 return items.filter(predicate).sort((a,b)=>{
  const pin=(pinned.has(b.name.toLowerCase())?1:0)-(pinned.has(a.name.toLowerCase())?1:0);
  if(pin)return pin;
  if(sort==='name')return a.name.localeCompare(b.name,'en');
  if(sort==='updated')return b.lastChanged-a.lastChanged||a.name.localeCompare(b.name,'en');
  return b.score-a.score||b.lastChanged-a.lastChanged||a.name.localeCompare(b.name,'en');
 });
}
export function reportMarkdown(result,{generatedAt=new Date().toISOString(),evidence={}}={}){
 const safe=x=>String(x??'').replace(/[\r\n|]/g,' ').slice(0,450);
 const stamp=result.generatedAt||'未获取';
 const lines=[
  '# ATLAS · 公开研发态势交接报告','',
  '- 导出时间：'+generatedAt,
  '- 公开数据快照：'+stamp,
  '- 快照可信度：'+({fresh:'两小时内',stale:'超过两小时，需刷新',missing:'未获取'}[result.snapshotState]||'待核验'),
  '- 项目：'+result.assessments.length+' 个（仅公开仓库）',
  '- CI：成功 '+result.states.success+' / 失败 '+result.states.failure+' / 运行中 '+result.states.running+' / 中立 '+result.states.neutral+' / 未知 '+result.states.unknown,
  '- 开放任务：Issue '+result.openIssues+(result.countsTruncated?'+':'')+' / PR '+result.openPRs+(result.countsTruncated?'+':''),
  '- 采集异常：'+result.errors+' 项',
  '- 在线静态资源探针：正常 '+(result.probes?.reachable??0)+' / 异常 '+(result.probes?.broken??0)+' / 未检测 '+(result.probes?.missing??0),
  '- 独立 Chromium 游戏验收（仅当前抽样）：通过 '+(result.gameQA?.passed??0)+' / 失败 '+(result.gameQA?.failed??0)+' / 过期 '+(result.gameQA?.stale??0),
  '',
  '> CI 成功不代表已发布或满足产品完整度；HTTP 探针只检查首页与少量静态资源，真实 Chromium 游戏场景与人工作品验收分别保留独立结果。公开 Issues/PR 可能不完整。',
  '',
  '## 项目关注队列','',
  '| 仓库 | 主分支 CI | 公开 Issue | 公开 PR | 关注提示 | 本地人工核验 |',
  '| --- | --- | ---: | ---: | --- | --- |'
 ];
 const ordered=[...result.assessments].sort((a,b)=>b.score-a.score);
 for(const a of ordered){
  const ev=releaseChecklist(evidence[a.name]);const flag=a.signals.slice(0,2).map(s=>s.title).join(' / ')||'无观察到的风险信号';
  lines.push('| '+safe(a.name)+' | '+safe(a.state)+' | '+safe(a.issues??'未知')+' | '+safe(a.prs??'未知')+' | '+safe(flag)+' | '+releaseProgress(ev)+'/6 |');
 }
 lines.push('','## 最新可见开放事项（样本）','');
 if(!result.taskPreview.length)lines.push('没有可用任务样本，不能据此断定仓库没有开放任务。');
 for(const task of result.taskPreview.slice(0,40))lines.push('- ['+safe(task.repository+' #'+task.number+' '+task.title)+']('+task.url+') · '+(task.kind==='pull'?'PR':'Issue'));
 lines.push('','## 建议流程','',
  '失败构建 → 阅读 Actions 日志 → 独立修复 PR → 单元与真实浏览器测试 → 核验发布。',
  '开放 PR → 审核更改和回归风险 → 手动确认合并；不要因 CI 通过就直接宣称完整交付。');
 return lines.join('\n');
}
