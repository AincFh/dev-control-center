// ATLAS · cross-domain release evidence. Public observations, never a ship approval.
import {nativeArtifactProof} from './native-release-core.js';
const PROBE_FAILURE=new Set(['resource_error','http_error','network_error','content_error']);
const WEB_KINDS=new Set(['web','platform','game']);
export const RELEASE_STATES=Object.freeze([
 {id:'all',label:'全部阶段'},
 {id:'attention',label:'明确风险'},
 {id:'human',label:'待人工验收'},
 {id:'evidence',label:'证据待补'}
]);
export const RELEASE_DOMAINS=Object.freeze([
 {id:'all',label:'全部领域'},
 {id:'software',label:'软件 / 系统 / 工具'},
 {id:'game',label:'游戏'},
 {id:'web',label:'Web / 平台'},
 {id:'mobile',label:'移动应用'}
]);
const STEP=(key,label,status,detail)=>({key,label,status,detail});
export function isSnapshotFresh(generatedAt,now=Date.now()){
 const time=Date.parse(generatedAt||'');
 if(!Number.isFinite(time))return false;
 const age=now-time;
 return age>=-5*60000&&age<=30*3600000;
}
export function reviewRepository(project,{generatedAt=null,now=Date.now()}={}){
 const p=project||{},fresh=isSnapshotFresh(generatedAt,now);
 const name=String(p.name||''),category=String(p.category||'tool');
 const web=WEB_KINDS.has(category),game=category==='game';
 const ci=String(p.ci?.state||'unknown'),site=String(p.site?.state||'unknown');
 const probe=String(p.probe?.state||'unknown');
 const qa=p.runtimeQa||{};
 const qaCurrent=qa.isCurrent===true;
 const qaResult=qaCurrent?qa.status:'unknown';
 const proof=nativeArtifactProof(p.release,category);
 const releaseTag=typeof p.release?.tag==='string'&&/^[A-Za-z0-9._/@+-]{1,120}$/.test(p.release.tag)?p.release.tag:null;
 const releaseUrl=releaseTag&&/^[A-Za-z0-9_.-]{1,100}$/.test(name)
  ?'https://github.com/AincFh/'+encodeURIComponent(name)+'/releases/tag/'+encodeURIComponent(releaseTag):null;
 const knownBlock=p.maturity==='blocked';
 const ciStatus=fresh&&ci==='success'?'pass':fresh&&ci==='failure'?'fail':fresh&&ci==='running'?'running':'unknown';
 const deployment=web?(fresh&&site==='published'?'pass':fresh&&site==='error'?'fail':fresh&&site==='building'?'running':'unknown'):(fresh&&proof.verified?'pass':'unknown');
 const runtime=game
  ?(qaResult==='pass'?'pass':['fail','timeout'].includes(qaResult)?'fail':'unknown')
  :web?(fresh&&probe==='reachable'?'pass':fresh&&PROBE_FAILURE.has(probe)?'fail':'unknown'):'unknown';
 // A separate game report carries its own 36h freshness proof, independent of the GitHub status snapshot.
 const steps=[
  STEP('source','公开源码',name?'pass':'unknown',name?'仓库身份已建立；不代表功能或产权已验证':'缺少仓库身份'),
  STEP('ci','主分支 CI',ciStatus,ciStatus==='pass'?'最新公开快照显示构建通过':ciStatus==='fail'?'最新公开快照显示构建失败':ciStatus==='running'?'构建正在执行':'无新鲜的成功或失败证据'),
  STEP('ship',web?'网站部署':'发行产物',deployment,
   web?(deployment==='pass'?'GitHub Pages 发布记录已核验':deployment==='fail'?'GitHub Pages 构建报错':deployment==='running'?'GitHub Pages 仍在部署':'尚无可核实的公开发布记录'):deployment==='pass'?'GitHub Release 已登记 '+proof.kinds.map(x=>x.toUpperCase()).join(' / ')+' 文件；签名与安装尚未验证':'无新鲜、适合该平台的 GitHub Release 发行物证据'),
  STEP('run',game?'浏览器实际操作':web?'网站资源探针':'设备 / 应用运行',runtime,
   game?(runtime==='pass'?'36 小时内有具名 Chromium 关键流程通过记录':runtime==='fail'?'36 小时内存在 Chromium 关键流程失败':'无当前具名浏览器操作证据')
   :web?(runtime==='pass'?'HTML 与部分同源资源可达；并非端到端验收':runtime==='fail'?'HTML 或静态资源探针检测到异常':'尚无新鲜的站点可达证据'):'未收集 APK 安装、桌面启动、真机或设备端操作证据'),
  STEP('manual','完整质量验收','unknown','性能、安全、可访问性、核心业务、许可与真实设备仍需人工或专项证据')
 ];
 const automatic=ciStatus==='pass'&&deployment==='pass'&&runtime==='pass';
 // No automatic result can satisfy the final human release gate.
 const risk=knownBlock||steps.some(s=>s.status==='fail');
 const state=risk?'attention':automatic?'human':'evidence';
 let next;
 if(knownBlock)next='已设定发布限制：先解决产品本身的发布门禁与权利核验。';
 else if(ciStatus==='fail')next='检查最新主分支 Actions，修复构建并重新运行。';
 else if(runtime==='fail')next=game?'打开原始 Chromium 运行记录，复现实际操作失败。':'检查 Pages HTML 与静态资源响应，修复线上异常。';
 else if(deployment==='fail')next='定位 GitHub Pages 部署失败原因并重新验收。';
 else if(!fresh)next='当前交付状态快照缺失或已过期，先刷新 Actions 证据。';
 else if(ciStatus!=='pass')next='补齐主分支 CI 的可核验通过记录。';
 else if(!web)next=deployment==='pass'?'已找到发行文件；继续核验哈希、签名、真实设备安装及核心使用流程。':'查验 GitHub Releases 是否有匹配平台的发行文件，再验证签名与真实设备安装。';
 else if(deployment!=='pass')next='补齐与本仓库绑定的公开部署证据；不能把 CI 当上线。';
 else if(runtime!=='pass')next=game?'补齐最新真实浏览器关键流程操作验收。':'补齐站点资源及关键业务实际运行验证。';
 else next='自动证据覆盖仅限部分流程；继续完整产品、安全、性能与许可人工验收。';
 return{name,label:String(p.label||name),category,web,game,isFork:!!p.isFork,state,knownBlock,
   fresh,passed:steps.filter(s=>s.status==='pass').length,steps,next,releaseTag,releaseUrl,releaseKinds:proof.kinds,
   sourceUrl:/^[a-zA-Z0-9_.-]+$/.test(name)?'https://github.com/AincFh/'+encodeURIComponent(name):null};
}
export function reviewPortfolio(projects=[],snapshot={},now=Date.now()){
 const records=(Array.isArray(projects)?projects:[]).map(p=>reviewRepository(p,{generatedAt:snapshot?.generatedAt,now}));
 const totals={all:records.length,attention:0,human:0,evidence:0,software:0,game:0,web:0,mobile:0};
 for(const r of records){
  totals[r.state]++;
  totals[r.game?'game':r.category==='mobile'?'mobile':r.category==='web'||r.category==='platform'?'web':'software']++;
 }
 return{records,totals,fresh:isSnapshotFresh(snapshot?.generatedAt,now),generatedAt:snapshot?.generatedAt||null};
}
export function filterReviews(records=[],{query='',domain='all',state='all'}={}){
 const term=String(query).trim().toLocaleLowerCase();
 const domainMatch=r=>domain==='all'||(domain==='software'&&!r.game&&!r.web&&r.category!=='mobile')||
   (domain==='web'&&(r.category==='web'||r.category==='platform'))||
   (domain==='game'&&r.game)||(domain==='mobile'&&r.category==='mobile');
 const weight={attention:0,evidence:1,human:2};
 return records.filter(r=>(state==='all'||r.state===state)&&domainMatch(r)&&
  (!term||[r.name,r.label,r.category,r.next].some(x=>String(x).toLocaleLowerCase().includes(term))))
  .sort((a,b)=>(weight[a.state]-weight[b.state])||(a.passed-b.passed)||a.label.localeCompare(b.label,'zh-CN'));
}
export function releaseReviewMarkdown(portfolio,records=portfolio?.records||[]){
 const lines=['# ATLAS · 跨领域交付证据审查','',
  '- 快照时间：'+(portfolio?.generatedAt||'未知'),
  '- 快照新鲜度：'+(portfolio?.fresh?'30 小时以内':'未知或超过 30 小时'),
  '- 范围：'+records.length+' 个仓库','',
  '> 仅整理公开 GitHub 与独立浏览器 QA 的有限观测，不是自动发布审批。绿色 CI 不等于软件发布；缺失证据不等于功能失败。',''];
 for(const r of records){
  lines.push('## '+r.label+' ('+r.name+')',
   '- 领域：'+r.category+'；审查阶段：'+({attention:'明确风险',human:'进入人工验收',evidence:'证据待补'}[r.state]||'未知'),
   '- 快照：'+(r.fresh?'新鲜':'缺失 / 过期')+(r.isFork?'；Fork，需独立核对上游许可':''),
   '- 下一步：'+r.next);
  for(const step of r.steps)lines.push('  - '+step.label+'：'+({pass:'有当前证据',fail:'明确失败',running:'执行中',unknown:'待核验'}[step.status]||'待核验')+' — '+step.detail);
  if(r.releaseUrl)lines.push('- GitHub Release：'+r.releaseTag+'；匹配的发行文件类型：'+(r.releaseKinds.length?r.releaseKinds.join(', '):'无当前核验证据')+'；签名及安装未核验。','- 发行记录：'+r.releaseUrl);
  if(r.sourceUrl)lines.push('- 来源：'+r.sourceUrl);
  lines.push('');
 }
 lines.push('## 证据边界','','- 站点 HTTP 200 不代表业务或可访问性通过。','- GitHub Pages 证据无法替代 APK、Windows 安装包或真机验证。','- 手动验收项永远不能由 CI 自动置为通过。','- CI 与 Pages 来自状态快照，具名游戏实测记录另按其 36 小时有效期判断。');
 return lines.join('\n');
}