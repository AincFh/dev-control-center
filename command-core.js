// ATLAS global commands. Pure search/data layer with no privileged GitHub actions.
export const COMMAND_ROUTES=[
 {id:'home',title:'总览',description:'回到 ATLAS 创造者工作空间',keywords:'主页 开始 home dashboard'},
 {id:'arcade',title:'游戏大厅',description:'进入已经确认的游戏入口',keywords:'游戏 玩 耕种 钓鱼 play'},
 {id:'mission',title:'研发总控',description:'跨仓库 CI、PR、Issue 与质量验收',keywords:'任务 风险 状态 运营 mission'},
 {id:'trace',title:'开发链路',description:'真实 Issue、PR、CI 与发布证据追踪',keywords:'trace lifecycle delivery pipeline 链路 关联'},
 {id:'workstreams',title:'项目路线',description:'查看独立项目的下一开发目标',keywords:'roadmap 产品 计划'},
 {id:'projects',title:'全部仓库',description:'搜索本账户所有公开 GitHub 仓库',keywords:'repo repositories Github 项目 仓库'},
 {id:'workboard',title:'执行工作台',description:'多仓库任务依赖、计划排期与交付管理',keywords:'工作包 项目管理 多项目 workboard capacity'},
 {id:'incubator',title:'项目孵化',description:'外部项目候选、研发评估和 Issue 草稿',keywords:'候选 想法 立项 孵化'},
 {id:'discovery',title:'发现实验室',description:'人工筛选的参考游戏源代码',keywords:'开源 研究 inspiration'},
 {id:'utilities',title:'开发工具工坊',description:'JSON CSV Diff Base64 URL SHA-256 纯本地工具',keywords:'utils developer tools formatter csv json diff base64 hash SHA256 工具 格式化 数据'},
 {id:'universe',title:'GitHub 星图',description:'跨领域 GitHub 开源项目研究与孵化',keywords:'星图 大型 索引 源码 software ai 系统 自动化 工具 游戏 thousand'},
 {id:'delivery',title:'交付健康',description:'仓库构建状态、开放 Issues 与 PR',keywords:'actions 发布 CI'},
 {id:'pipeline',title:'构建流程',description:'从 Issue 到测试与发布的开发规范',keywords:'workflow 自动化'},
 {id:'activity',title:'开发动态',description:'查看近期 GitHub 活动',keywords:'动态 活动 近期 commits'}
];
const NAME=/^[A-Za-z0-9_.-]+$/;
const BOTH=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const norm=x=>String(x||'').toLocaleLowerCase();
const item=(id,kind,title,description,keywords,url,group)=>({id,kind,title,description,keywords,url,group});
export function commandCollection({projects=[],games=[],external=[]}={}){
 const output=COMMAND_ROUTES.map(x=>item('route:'+x.id,'route',x.title,x.description,x.keywords,'#'+x.id,'页面'));
 const seen=new Set();
 for(const g of games){
  if(!g||typeof g.id!=='string'||!NAME.test(g.id)||!NAME.test(g.repo))continue;
  const playable=!!g.play&&['playable','prototype'].includes(g.status)&&/^https:\/\/aincfh\.github\.io\//.test(g.play);
  output.push(item('game:'+g.id,'game',String(g.title||g.id),String(g.english||'')+' · '+String(g.tag||'')+' · '+(playable?'在线试玩':'开发中，仅查看源码'),[g.english,g.summary,g.tag,g.repo,'游戏'].join(' '),playable?g.play:'https://github.com/AincFh/'+g.repo,'游戏'));
 }
 for(const p of projects){
  if(!p||!NAME.test(p.name)||seen.has(norm(p.name)))continue;
  seen.add(norm(p.name));
  output.push(item('repo:'+p.name,'repo',String(p.label||p.name),String(p.description||'公开 GitHub 仓库').slice(0,180),[p.name,p.language,p.category,p.ci?.state,'源代码 仓库'].join(' '),'https://github.com/AincFh/'+p.name,'我的仓库'));
 }
 const externalSeen=new Set();
 for(const p of external){
  if(!p||!BOTH.test(p.name)||externalSeen.has(norm(p.name)))continue;
  externalSeen.add(norm(p.name));
  output.push(item('external:'+p.name,'external',p.name,'外部开源参考 · '+String(p.genreName||'未分类'),[p.owner,p.repo,p.genreName,'GitHub 源码 来源'].join(' '),'https://github.com/'+p.name,'外部参考'));
 }
 return output;
}
function score(option,words){
 if(!words.length)return {score:0,match:true};
 const title=norm(option.title),description=norm(option.description),keywords=norm(option.keywords);
 let value=0;
 for(const w of words){
  let points=0;
  if(title===w)points=100;
  else if(title.startsWith(w))points=72;
  else if(title.includes(w))points=46;
  else if(keywords.includes(w))points=26;
  else if(description.includes(w))points=14;
  if(!points)return {score:0,match:false};
  value+=points;
 }
 return{score:value,match:true};
}
const KIND_ORDER={route:0,game:1,repo:2,external:3};
export function searchCommands(commands,query='',{recent=[],limit=12}={}){
 const words=norm(query).trim().split(/\s+/).filter(Boolean),recents=new Map((Array.isArray(recent)?recent:[]).slice(0,10).map((id,index)=>[id,10-index]));
 const found=[];
 for(const cmd of commands){
  const s=score(cmd,words);if(!s.match)continue;
  if(!words.length&&!recents.has(cmd.id)&&!['route','game'].includes(cmd.kind))continue;
  const base=words.length?s.score+(cmd.kind==='route'?13:cmd.kind==='game'?9:cmd.kind==='repo'?4:0):0;
  const recentBoost=recents.has(cmd.id)?(words.length?9:150+recents.get(cmd.id)):0;
  found.push({...cmd,rank:base+recentBoost});
 }
 found.sort((a,b)=>b.rank-a.rank||(KIND_ORDER[a.kind]??9)-(KIND_ORDER[b.kind]??9)||a.title.localeCompare(b.title,'zh'));
 return found.slice(0,Math.max(1,Math.min(Number(limit)||12,30)));
}
export function rememberCommand(ids,id){
 const clean=[id,...(Array.isArray(ids)?ids:[])].filter(x=>typeof x==='string'&&/^(?:route|game|repo|external):[A-Za-z0-9_./-]+$/.test(x));
 return [...new Set(clean)].slice(0,8);
}
