import {normalize,filtered,sorted,summary,ago} from './core.js';
import {summarizeHealth,repoHealthLabel,isoAge,workflowState,latestWorkflow} from './status.js';
import {trackedWorkstreams,readiness} from './roadmap.js';
import {DISCOVERY,GENRES,searchDiscovery,discoverySummary} from './discovery.js';
import {GAMES,GAME_GENRES,filterGames,sortGames,playableGame,arcadeStats,statusText} from './arcade.js';
import {initUniverse} from './universe.js';
import {initStudioExperience} from './studio-motion.js';
import {initIncubator} from './incubator.js';
import {initMission} from './mission.js';
import {initCommandPalette} from './command.js';
import {initTrace} from './trace.js';
const OWNER='AincFh', API='https://api.github.com';
const CATALOG={
 'dev-control-center':{label:'ATLAS · 开发中心',symbol:'◈',category:'web',featured:true,description:'多项目状态、开发任务与交付管理'},
 'cozy-bistro-sim':{label:'COZY BISTRO · 日落餐馆',symbol:'✦',category:'game',featured:true,maturity:'可玩基础版',description:'单机餐馆经营：订单、食材、厨房升级与多日收益'},
 'azure-coast':{label:'AZURE COAST · 海滨都市',symbol:'⌘',category:'game',featured:true,maturity:'开发中 · 未发布',description:'海滨开放世界原型，正式发布门禁尚未满足'},
 'spacefortress':{label:'SPACEFORTRESS · 太空基地',symbol:'✧',category:'game',maturity:'Fork · 上游作品',upstream:'Jaredcastorena/spacefortress',description:'MIT Fork · 宇宙殖民地、氧气、能源与船员物流'},
 'City-of-Small-Chances':{label:'CITY OF SMALL CHANCES · 城市人生',symbol:'◇',category:'game',maturity:'Fork · 上游作品',upstream:'Mon-ius/City-of-Small-Chances',description:'MIT Fork · 3D 城市生活、打工、社交与经济抉择'},
 'squiffy':{label:'SQUIFFY · 剧情创作引擎',symbol:'✎',category:'tool',maturity:'Fork · 上游工具',upstream:'textadventures/squiffy',description:'MIT Fork · 多结局互动小说与文本剧情编辑器'},
 'hollowmere.tretu.de':{label:'HOLLOWMERE · 精灵农庄',symbol:'❀',category:'game',maturity:'Fork · 尚未独立部署',upstream:'robintrepte/hollowmere.tretu.de',description:'MIT Fork · Godot 4 农场、精灵伙伴、采集、战斗与联机；需单独验证 Web 导出和服务端'},
 'harvest-hollow':{label:'HARNESS HOLLOW · 双人农场',symbol:'✿',category:'game',maturity:'Fork · 需要后端',upstream:'KrasimirKralev/harvest-hollow',description:'MIT Fork · 3D 双人合作农场、建造、动物、制作链；在线联机依赖 Node 服务'},
 'paradise-isle':{label:'PARADISE ISLE · 天堂小岛',symbol:'❀',category:'game',maturity:'Fork · 上游作品',upstream:'appleweiping/paradise-isle',description:'MIT Fork · 岛屿种田、养殖、钓鱼、宠物和小镇生活'},
 'cimulity':{label:'CIMULITY · 城市模拟',symbol:'▦',category:'game',maturity:'Fork · 上游作品',upstream:'zeikar/cimulity',description:'MIT Fork · 等距城市规划、分区、交通和人口经济'},
 'qubecraft':{label:'QUBECRAFT · 方块生存',symbol:'◫',category:'game',maturity:'Fork · 上游作品',upstream:'krabduke/qubecraft',description:'MIT Fork · 3D 体素冒险、建造、合成与生存'},
 'Tamagochi---Open-Source-Game':{label:'MORI · 虚拟宠物',symbol:'♡',category:'game',maturity:'Fork · 上游作品',upstream:'Tech-aficionado/Tamagochi---Open-Source-Game',description:'MIT Fork · 宠物照顾、小游戏、性格成长和存档'},
 'Midnight-Factory':{label:'MIDNIGHT FACTORY · 自动工厂',symbol:'⚙',category:'game',maturity:'Fork · 上游作品',upstream:'Gakuseei/Midnight-Factory',description:'MIT Fork · 产线布置、资源加工与工厂物流'},
 'fishing-world-3d':{label:'FISHING WORLD · 湖光物语',symbol:'♒',category:'game',featured:true,maturity:'可玩原型',description:'轻休闲 3D 钓鱼原型；非完整游戏，地图与玩法深度仍有限'},
 'wildlands-anglerfishing-world-3d':{label:'WILDLANDS · 山野钓行',symbol:'♒',category:'game',featured:true,maturity:'可玩原型',description:'第一人称 3D 钓鱼开发中；非完整游戏，质量与内容尚未全面验收'},
 'Saintlaurent':{label:'圣罗兰平台',symbol:'✦',category:'web'},
 'shengluolan-app':{label:'圣罗兰应用',symbol:'⬡',category:'tool'},
 'my-anime-blog':{label:'动漫内容空间',symbol:'✳',category:'web'},
 'AincFh':{label:'GitHub 主页',symbol:'◆',category:'web'},
 'QingJi':{label:'QingJi 工具',symbol:'⌘',category:'tool'}
};
let projects=[],selection={type:'all',query:'',sort:'latest'},snapshot={generatedAt:null,errors:[],publicOnly:true},syncing=false;
const $=id=>document.getElementById(id);
const n=(tag,text='',cls='')=>{const node=document.createElement(tag);if(cls)node.className=cls;node.textContent=String(text??'');return node;};
const link=(url,label,cls='')=>{const e=n('a',label,cls);e.href=url;e.target='_blank';e.rel='noopener noreferrer';return e;};
const ghUrl=(name,suffix='')=>'https://github.com/'+OWNER+'/'+encodeURIComponent(name)+suffix;
function fromRepo(repo,st){
 const p=normalize(repo,CATALOG[repo.name]||{});
 p.ci=st?.ci||{state:'unknown'};p.openIssues=Number.isInteger(st?.openIssues)?st.openIssues:null;
 p.openPRs=Number.isInteger(st?.openPRs)?st.openPRs:null;p.countsTruncated=!!st?.countsTruncated;
 p.issuePreview=Array.isArray(st?.issuePreview)?st.issuePreview:null;p.prPreview=Array.isArray(st?.prPreview)?st.prPreview:null;
 p.trace=st?.trace&&st.trace.repo===repo.name?st.trace:null;
 p.site=st?.site||{state:'unknown',url:null};p.preview=p.site.state==='published'?p.site.url:null;p.maturity=CATALOG[repo.name]?.maturity||null;
 p.branch=st?.defaultBranch||'main';p.upstream=CATALOG[repo.name]?.upstream||null;p.isFork=!!(repo.fork||st?.fork||p.upstream);return p;
}
function siteLabel(site){
 if(site?.state==='published')return site.source==='github_deployment'?'GitHub Pages · SHA 部署已证实':'GitHub Pages · API 已证实';
 if(site?.state==='building')return 'GitHub Pages · 构建中';
 if(site?.state==='error')return 'GitHub Pages · 构建失败';
 return 'GitHub Pages · 暂无可核验证据';
}
function statPill(p){
 const val=p.ci?.state||'unknown';return n('span',repoHealthLabel(val),'ci ci-'+val);
}
function card(p){
 const root=n('article','','project'+(p.featured?' featured':'')),top=n('div','','cardtop');
 top.append(n('span',(p.label.match(/[A-Za-z]/)?.[0]||p.label[0]||'A').toUpperCase(),'symbol'),statPill(p));root.append(top);
 root.append(n('h3',p.label),n('p',p.description||'独立开发仓库。'));
 const sub=n('div','','projectmeta');
 sub.append(n('span','Issues '+(p.openIssues??'—')),n('span','PR '+(p.openPRs??'—')));if(p.maturity)sub.append(n('span',p.maturity,'prototype'));if(p.isFork)sub.append(n('span','上游署名保留','fork-label'));
 if(p.site.state==='published')sub.append(n('span',p.site.source==='github_deployment'?'● 部署证实':'● Pages 已发布','published'));
 root.append(sub);
 const bottom=n('div','','cardbottom'),language=n('span',p.language,'language'),links=n('div','','cardlinks');
 links.append(link(p.url,'⌘'));if(p.preview)links.append(link(p.preview,'↗'));
 if(p.ci?.url)links.append(link(p.ci.url,'◷'));
 const detail=n('button','···');detail.title='查看构建和任务详情';detail.setAttribute('aria-label','查看 '+p.label);
 detail.addEventListener('click',()=>detailPanel(p.name));links.append(detail);bottom.append(language,links);root.append(bottom);
 return root;
}
function render(){
 const shown=sorted(filtered(projects,selection.query,selection.type),selection.sort);
 $('grid').replaceChildren(...shown.map(card));
 if(!shown.length)$('grid').append(n('div','没有匹配的仓库，试着清除筛选条件。','placeholder'));
 $('noresults').hidden=shown.length>0;
 const h=summarizeHealth(projects),s=summary(projects);
 $('total').textContent=s.total;$('live').textContent=h.success;$('active').textContent=h.failure+h.running;
 $('syncCaption').textContent=(h.failure?'失败 '+h.failure+' · ':'')+'运行中 '+h.running+' · 未知 '+h.unknown;
 const ready=GAMES.filter(playableGame).length;
 const warning=h.failure+h.running;
 const home=$('homeHealth');
 if(home)home.textContent=projects.length+' 个公开仓库持续跟踪，其中 '+h.success+' 个最近一次主分支 CI 通过；'+warning+' 个存在失败或正在运行。最新状态请到交付健康核验。';
 const tokens=$('homeStatusPills');
 if(tokens)tokens.replaceChildren(
   n('span','已开放 '+ready+' 款试玩','status-token'),
   n('span','开放任务 '+h.openIssues+' 项','status-token'),
   n('span','等待 PR '+h.openPRs+' 项','status-token')
 );
 renderWorkstreams();renderArcade();renderDelivery(h);renderQueue();renderDiscovery();updateMission(projects,snapshot);updateTrace(projects,snapshot);
}
function renderWorkstreams(){
 const holder=$('workstreamGrid');if(!holder)return;holder.replaceChildren();
 for(const t of trackedWorkstreams(projects)){
  const p=t.project,box=n('article','','workstream-card'+(t.priority===1?' prioritized':''));
  const head=n('div','','workstream-head'),id=n('div','','workstream-identity');
  id.append(n('span',t.short.slice(0,2).toUpperCase(),'workstream-mark'),n('b',t.short));head.append(id,n('span','P'+t.priority,'workstream-priority'));box.append(head);
  box.append(n('h3',t.title),n('p',t.goal,'workstream-goal'));
  const label=n('div','','workstream-state');label.append(n('span',readiness(t.maturity),'workstream-maturity '+t.maturity));
  label.append(n('span',repoHealthLabel(t.ci),'workstream-ci '+t.ci));box.append(label);
  const note=n('div','','workstream-next');note.append(n('small','NEXT MILESTONE'),n('strong',t.next));box.append(note);
  const actions=n('div','','workstream-links');
  const page='https://github.com/'+OWNER+'/'+encodeURIComponent(t.repo);
  actions.append(link(page,'源代码 ↗'),link(page+'/issues','任务 ↗'));
  if(p?.preview)actions.append(link(p.preview,'试玩 ↗'));
  if(!t.known)box.append(n('span','尚未在公开仓库索引中识别到此项目','workstream-unseen'));
  box.append(actions);holder.append(box);
 }
}

const arcadeChoice={genre:'all',query:'',mode:'all'};
function favoriteGames(){
 try{
  const saved=JSON.parse(localStorage.getItem('atlas-game-favorites-v1')||'[]');
  return Array.isArray(saved)?saved.filter(x=>typeof x==='string'&&GAMES.some(g=>g.id===x)).slice(0,20):[];
 }catch{return []}
}
let arcadeFavorites=favoriteGames();
function toggleGameFavorite(id){
 if(arcadeFavorites.includes(id))arcadeFavorites=arcadeFavorites.filter(x=>x!==id);
 else arcadeFavorites=[...arcadeFavorites,id];
 try{localStorage.setItem('atlas-game-favorites-v1',JSON.stringify(arcadeFavorites))}catch{}
 renderArcade();
}
function renderArcade(){
 const grid=$('arcadeGrid');if(!grid)return;
 const entries=sortGames(filterGames(GAMES,arcadeChoice.query,arcadeChoice.genre,arcadeChoice.mode),arcadeFavorites);
 const stats=arcadeStats();
 $('arcadeCount').textContent=entries.length+' 款展示 / '+stats.playable+' 款已确认有独立试玩入口 / '+stats.blocked+' 款暂未通过发布门槛';
 grid.replaceChildren();
 if(!entries.length){grid.append(n('div','没有匹配的游戏，试着清除筛选。','placeholder'));return}
 for(const item of entries){
  const root=n('article','','arcade-card');
  root.dataset.game=item.id;
  const stage=n('div','','arcade-art arcade-art-'+item.art);
  stage.setAttribute('aria-label',item.title+'游戏封面');
  if(item.cover){
   const img=n('img','','arcade-cover');
   img.src=item.cover;img.alt=item.title+'的仓库截图';img.loading='lazy';
   img.onerror=()=>img.remove();
   stage.append(img);
  }
  const vignette=n('div','','arcade-art-vignette');
  vignette.append(n('span',item.english,'arcade-art-name'),n('span',item.tag,'arcade-art-sub'));
  stage.append(vignette);
  const fav=n('button',arcadeFavorites.includes(item.id)?'★':'☆','arcade-favorite');
  fav.type='button';fav.title=arcadeFavorites.includes(item.id)?'取消收藏':'收藏游戏';fav.setAttribute('aria-label',fav.title);
  fav.setAttribute('aria-pressed',String(arcadeFavorites.includes(item.id)));
  fav.addEventListener('click',()=>toggleGameFavorite(item.id));
  stage.append(fav);root.append(stage);
  const info=n('div','','arcade-info');
  const status=n('div','','arcade-status');
  status.append(n('span',statusText(item.status),'arcade-state '+item.status));
  status.append(n('span',item.source==='fork'?'独立 Fork · 保留原作者':'原创项目','arcade-origin'));
  info.append(status,n('h3',item.title),n('p',item.summary,'arcade-summary'));
  const foot=n('div','','arcade-actions');
  const repoURL=ghUrl(item.repo);
  if(playableGame(item))foot.append(link(item.play,'进入游戏 ↗','arcade-play'));
  else foot.append(n('span',item.status==='blocked'?'发布检查未通过':'试玩部署尚未核验','arcade-disabled'));
  foot.append(link(repoURL,'查看代码 ↗','arcade-source'));
  info.append(foot);root.append(info);
  grid.append(root);
 }
}
function initArcade(){
 const filters=$('arcadeGenres');if(!filters)return;
 for(const genre of GAME_GENRES){
  const button=n('button',genre.label,arcadeChoice.genre===genre.id?'selected':'');
  button.type='button';button.dataset.genre=genre.id;
  button.addEventListener('click',()=>{arcadeChoice.genre=genre.id;
   filters.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===button));renderArcade()});
  filters.append(button);
 }
 const search=$('arcadeSearch');
 const applySearch=e=>{arcadeChoice.query=e.target.value;renderArcade()};
 search.addEventListener('input',applySearch);
 search.addEventListener('search',applySearch);
 search.addEventListener('change',applySearch);
 $('arcadePlayable').addEventListener('change',e=>{arcadeChoice.mode=e.target.checked?'playable':'all';renderArcade()});
 renderArcade();
}

const libraryChoice={genre:'all',query:''};
function renderDiscovery(){
 const grid=$('discoveryGrid');if(!grid)return;
 const entries=searchDiscovery(DISCOVERY,libraryChoice.query,libraryChoice.genre);
 grid.replaceChildren();
 $('discoveryCount').textContent=entries.length+' 项 / 已引入 '+discoverySummary().forks+' 个 Fork';
 if(!entries.length){grid.append(n('p','没有找到匹配的游戏项目。','placeholder'));return;}
 const symbols={life:'LF',builder:'CT',survival:'SV',industry:'FA',stories:'ST'};
 for(const p of entries){
  const card=n('article','','discovery-card'),hd=n('div','','discovery-top');
  hd.append(n('span',symbols[p.genre]||'✦','discovery-symbol'),n('span',p.forkName?'已引入 Fork':'参考项目','discovery-kind'+(p.forkName?' imported':'')));
  card.append(hd,n('h3',p.title),n('p',p.description,'discovery-desc'));
  const tags=n('div','','discovery-tags');tags.append(n('span',p.stack),n('span',p.license==='MIT'?'MIT 许可':'许可待审查','license'+(p.license!=='MIT'?' caution':'')));
  card.append(tags);
  const foot=n('div','','discovery-links');
  foot.append(link('https://github.com/'+p.origin,'原项目 ↗'));
  if(p.forkName){
   const ours=projects.find(x=>x.name===p.forkName);
   foot.append(link('https://github.com/'+OWNER+'/'+encodeURIComponent(p.forkName),'我们的 Fork ↗'));
   if(ours?.site?.state==='published'&&ours?.preview)foot.append(link(ours.preview,'本地部署 ↗'));
  }
  if(p.play)foot.append(link(p.play,'上游试玩 ↗'));
  card.append(foot);grid.append(card);
 }
}
function initDiscovery(){
 const filter=$('discoveryGenres');if(!filter)return;
 filter.replaceChildren(...GENRES.map(g=>{
  const b=n('button',g.label,g.id===libraryChoice.genre?'selected':'');
  b.type='button';b.dataset.genre=g.id;
  b.addEventListener('click',()=>{libraryChoice.genre=g.id;filter.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));renderDiscovery()});
  return b;
 }));
 $('discoverySearch').addEventListener('input',e=>{libraryChoice.query=e.target.value;renderDiscovery()});
 renderDiscovery();
}

function renderDelivery(health){
 const holder=$('deliveryList');holder.replaceChildren();
 const ordered=[...projects].sort((a,b)=>({failure:0,running:1,unknown:2,neutral:3,success:4}[a.ci.state]??5)-({failure:0,running:1,unknown:2,neutral:3,success:4}[b.ci.state]??5));
 for(const p of ordered){
  const line=n('div','','healthrow');
  const title=n('div','','healthname');title.append(n('strong',p.label),n('small',p.ci?.sha?('Commit '+p.ci.sha+' · '+isoAge(p.ci.updatedAt)):'暂无最近一次主分支工作流'));
  const action=p.ci?.url?link(p.ci.url,'查看运行 ↗','healthlink'):link(ghUrl(p.name,'/actions'),'查看 Actions ↗','healthlink');
  line.append(n('span','●','healthdot '+(p.ci?.state||'unknown')),title,statPill(p),action);holder.append(line);
 }
 $('healthNote').textContent=snapshot.generatedAt?'数据快照：'+new Date(snapshot.generatedAt).toLocaleString('zh-CN')+' · 每小时更新，可在项目详情实时核验':'状态快照不可用；暂无成功/失败证据。';
 $('healthSummary').textContent=health.success+' 通过 / '+health.failure+' 失败 / '+health.running+' 运行中 / '+health.unknown+' 未知';
}
function renderQueue(){
 const holder=$('queueList');holder.replaceChildren();
 const tasks=projects.filter(p=>(p.openIssues??0)>0||(p.openPRs??0)>0).sort((a,b)=>((b.openIssues??0)+(b.openPRs??0))-((a.openIssues??0)+(a.openPRs??0)));
 if(!tasks.length)holder.append(n('div','当前公开仓库没有可见的开放 Issue/PR，或对应 API 数据尚不可用。','mutedtext'));
 for(const p of tasks){
  const item=n('div','','queuerow'),info=n('div');
  info.append(n('strong',p.label),n('small',(p.openIssues??'未知')+' Issues · '+(p.openPRs??'未知')+' PRs'+(p.countsTruncated?' · 至少 100 项':'') ));
  const actions=n('div','','queuelinks');actions.append(link(ghUrl(p.name,'/issues'),'Issue ↗'),link(ghUrl(p.name,'/pulls'),'PR ↗'));item.append(info,actions);holder.append(item);
 }
}
function dataLine(label,value){const e=n('div','','detailrow');e.append(n('span',label),n('strong',value));return e;}
function detailPanel(name){
 const p=projects.find(x=>x.name===name);if(!p)return;
 const body=$('detailBody');body.replaceChildren(n('div','PROJECT HEALTH / GITHUB','eyebrow'),n('h2',p.label),n('p',p.description||'GitHub 项目'));
 const list=n('div','','detailsstats');
 list.append(dataLine('主分支',p.branch),dataLine('构建状态',repoHealthLabel(p.ci?.state)),dataLine('最近更新',isoAge(p.ci?.updatedAt)),dataLine('打开 Issues',p.openIssues??'未知'),dataLine('打开 PR',p.openPRs??'未知'),dataLine('Pages',siteLabel(p.site)));
 if(p.maturity)list.append(dataLine('产品成熟度',p.maturity+'（仍需开发）'));if(p.isFork)list.append(dataLine('项目来源','Fork · '+(p.upstream||'GitHub 上游项目')));
 body.append(list);
 const links=n('div','','detailactions');links.append(link(p.url,'源代码 ↗'),link(p.ci?.url||ghUrl(p.name,'/actions'),'Actions ↗'),link(ghUrl(p.name,'/issues'),'Issues ↗'),link(ghUrl(p.name,'/pulls'),'PR ↗'));
 if(p.preview)links.append(link(p.preview,'在线访问 ↗'));
 if(p.upstream)links.append(link('https://github.com/'+p.upstream,'原作者源码 ↗'));

 body.append(links);
 const fresh=n('button','实时核验此仓库','liveRefresh');
 const outcome=n('p','状态快照不是实时推送；点击可直接查询 GitHub 公共 API。','mutedtext');
 fresh.addEventListener('click',async()=>{
  if(fresh.disabled)return;fresh.disabled=true;fresh.textContent='正在连接 GitHub…';
  try{
   const apiPath='/repos/'+OWNER+'/'+encodeURIComponent(p.name);
   const fetchApi=async(url)=>{const r=await fetch(API+url,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});if(!r.ok)throw Error('GitHub HTTP '+r.status);return r.json();};
   const [runs,issues,prs]=await Promise.allSettled([fetchApi(apiPath+'/actions/runs?per_page=12&branch='+encodeURIComponent(p.branch)),fetchApi(apiPath+'/issues?state=open&per_page=100'),fetchApi(apiPath+'/pulls?state=open&per_page=100')]);
   let changed=false;
   if(runs.status==='fulfilled'){const w=latestWorkflow(runs.value.workflow_runs,p.branch);p.ci={state:workflowState(w),url:w?.html_url||null,name:w?.name||null,updatedAt:w?.updated_at||null,sha:w?.head_sha?.slice(0,8)||null};changed=true;}
   if(issues.status==='fulfilled'){p.openIssues=issues.value.filter(v=>!v.pull_request).length;changed=true;}
   if(prs.status==='fulfilled'){p.openPRs=prs.value.length;changed=true;}
   if(!changed)throw Error('公共 API 请求失败或被限流');
   outcome.textContent='已核验 '+new Date().toLocaleTimeString('zh-CN')+'；构建 '+repoHealthLabel(p.ci?.state)+' · Issue '+(p.openIssues??'未知')+' · PR '+(p.openPRs??'未知');
   render();list.replaceChildren(dataLine('主分支',p.branch),dataLine('构建状态',repoHealthLabel(p.ci?.state)),dataLine('最近更新',isoAge(p.ci?.updatedAt)),dataLine('打开 Issues',p.openIssues??'未知'),dataLine('打开 PR',p.openPRs??'未知'),dataLine('Pages',siteLabel(p.site)));
  }catch(e){outcome.textContent='无法核验：'+e.message+'。保留此前快照，不将未知结果视为成功。';}
  finally{fresh.disabled=false;fresh.textContent='再次核验实时状态';}
 });
 body.append(fresh,outcome);$('details').showModal();
}
$('close').onclick=()=>$('details').close();
$('details').addEventListener('click',e=>{if(e.target===$('details'))$('details').close()});
function clock(){$('clock').textContent=new Date().toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}clock();setInterval(clock,60_000);
// Focused product navigation: only one workspace view at a time.
// Keep existing DOM nodes and data; switching views never discards game favorites or status.
const VIEWS={
 home:['总览','你的创造者工作空间'],
 arcade:['游戏大厅','独立游戏与在线试玩'],
 workstreams:['项目路线','持续开发与下一目标'],
 projects:['全部仓库','公开 GitHub 项目索引'],
 discovery:['发现实验室','值得深入研究的开源游戏'],
 incubator:['项目孵化','外部项目研究、人工核验与立项计划'],
 mission:['研发总控','跨项目 CI、问题、审查和产品人工核验'],
 trace:['开发链路','真实 Issue、PR、CI 和部署证据追踪'],
 universe:['GitHub 星图','数千条外部游戏与模拟项目索引'],
 delivery:['交付健康','CI、PR 和发布状态'],
 pipeline:['构建流程','从开发到验收发布'],
 activity:['开发动态','来自 GitHub 的公开活动']
};
function route(){
 const raw=decodeURIComponent(location.hash.replace(/^#/,'')),key=VIEWS[raw]?raw:'home';
 document.querySelectorAll('.view').forEach(el=>{
  const active=el.id===key;el.classList.toggle('is-active',active);
  el.setAttribute('aria-hidden',String(!active));
 });
 document.querySelectorAll('[data-view-link]').forEach(el=>{
  const active=el.dataset.viewLink===key;el.classList.toggle('active',active);
  if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
 });
 $('pageTitle').textContent=VIEWS[key][0];
 $('pageSubtitle').textContent=VIEWS[key][1];
 document.title='ATLAS · '+VIEWS[key][0];
 $('content').scrollTop=0;
}
window.addEventListener('hashchange',route);
route();
function setTheme(mode){
 const next=mode==='dark'?'dark':'light';
 document.documentElement.dataset.theme=next;
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',next==='dark'?'#121b1c':'#f5f6f4');
 $('themeBtn').setAttribute('aria-pressed',String(next==='dark'));
 $('themeBtn').title=next==='dark'?'切换浅色主题':'切换深色主题';
 try{localStorage.setItem('atlas-v3-theme',next)}catch{}
}
let initialTheme='light';try{initialTheme=localStorage.getItem('atlas-v3-theme')||'light'}catch{}
setTheme(initialTheme);
$('themeBtn').onclick=()=>setTheme(document.documentElement.dataset.theme==='light'?'dark':'light');
const openCommandPalette=initCommandPalette(()=>projects);
$('quickFind').onclick=openCommandPalette;
document.addEventListener('keydown',e=>{
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){
  e.preventDefault();openCommandPalette();
 }
});

async function load(){
 if(syncing)return;syncing=true;$('refresh').disabled=true;$('connection').textContent='正在更新项目状态…';
 const fetchJson=async(url)=>{const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);return res.json();};
 const [status,live]=await Promise.allSettled([fetchJson('./data/status.json'),fetchJson(API+'/users/'+OWNER+'/repos?per_page=100&sort=updated&type=public')]);
 try{
  const data=status.status==='fulfilled'&&status.value?.schemaVersion===2&&status.value?.publicOnly===true?status.value:null;
  const dataMap=new Map((data?.projects||[]).map(p=>[p.name,p]));
  const fallbacks=(data?.projects||[]).map(x=>({name:x.name,html_url:x.repositoryUrl,description:x.description,language:x.language,pushed_at:x.updatedAt,stargazers_count:x.stars,fork:!!x.fork}));
  const liveRepos=live.status==='fulfilled'&&Array.isArray(live.value)?live.value.filter(x=>!x.private):[];
  const merged=new Map(fallbacks.map(x=>[x.name.toLowerCase(),x]));
  for(const repo of liveRepos)merged.set(repo.name.toLowerCase(),repo);
  const repos=[...merged.values()];
  if(!repos.length)throw Error('无有效仓库数据');
  snapshot=data||{generatedAt:null,errors:[],publicOnly:true};
  projects=repos.map(p=>fromRepo(p,dataMap.get(p.name)));
  $('connection').textContent=data?'已连接 · '+projects.length+' 个公开仓库':'在线索引 · 状态快照不可用';
  $('synced').textContent=data?.generatedAt?new Date(data.generatedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'待生成';
  render();loadEvents();
 }catch(e){
  projects=[];snapshot={generatedAt:null,errors:[],publicOnly:true};render();
  $('connection').textContent='API 连接失败，点击刷新重试';$('healthNote').textContent=e.message;
 }finally{syncing=false;$('refresh').disabled=false;}
}
async function loadEvents(){
 try{
  const r=await fetch(API+'/users/'+OWNER+'/events/public?per_page=16');
  if(!r.ok)throw Error('HTTP '+r.status);
  const feed=(await r.json()).filter(e=>['PushEvent','CreateEvent','PullRequestEvent','IssuesEvent','ReleaseEvent'].includes(e.type)).slice(0,5);
  const box=$('events');box.replaceChildren();
  for(const e of feed){
   const line=n('div','','event'),ic=n('span',e.type==='PushEvent'?'↥':'◇'),info=n('div');
   info.append(n('b',e.repo?.name||'GitHub'),n('small',e.type.replace('Event','')+' · '+ago(e.created_at)));
   line.append(ic,info);box.append(line);
  }
  if(!feed.length)box.append(n('p','暂无公开活动。'));
 }catch{$('events').textContent='GitHub 动态暂时不可用；不影响仓库构建状态快照。';}
}
$('query').addEventListener('input',e=>{selection.query=e.target.value;render()});
$('sort').addEventListener('change',e=>{selection.sort=e.target.value;render()});
$('tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-type]');if(!b)return;selection.type=b.dataset.type;document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('selected',x===b));render();});
$('reset').onclick=()=>{selection.query='';selection.type='all';$('query').value='';document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('selected',x.dataset.type==='all'));render();};
$('refresh').onclick=load;initDiscovery();initArcade();initIncubator();initUniverse();const updateMission=initMission();const updateTrace=initTrace();initStudioExperience();load();