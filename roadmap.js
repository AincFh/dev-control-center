// Curated ATLAS development tracks. A green CI status never implies product completion.
export const TRACKS=[
 {repo:'dev-control-center',short:'ATLAS',category:'platform',title:'多项目开发控制中心',stage:'持续运营',maturity:'platform',priority:1,goal:'聊天需求、Issue、PR、发布和交接统一管理',next:'跨项目任务与验收闭环',symbol:'◈'},
 {repo:'wildlands-anglerfishing-world-3d',short:'WILDLANDS',category:'game',title:'第一人称 3D 钓鱼探索',stage:'深度开发',maturity:'prototype',priority:1,goal:'鱼类生态与探索玩法深度',next:'性能基线、鱼群生态与连续试玩',symbol:'♒'},
 {repo:'cozy-bistro-sim',short:'COZY BISTRO',category:'game',title:'餐馆经营模拟',stage:'可玩基础版',maturity:'playable-foundation',priority:1,goal:'多日营业、订单、食材、升级、账本与存档',next:'经济平衡与移动端连续游玩验证',symbol:'✦'},
 {repo:'azure-coast',short:'AZURE COAST',category:'game',title:'现代海滨都市探索',stage:'开发中 · 未发布',maturity:'blocked',priority:2,goal:'城市驾驶、探索、目标与生态',next:'遵守 release gate，补齐资产授权与端到端验收',symbol:'⌘'},
 {repo:'fishing-world-3d',short:'FISHING WORLD',category:'game',title:'轻量湖畔钓鱼',stage:'可玩原型',maturity:'prototype',priority:3,goal:'独立的轻休闲钓鱼路线',next:'优化交互与移动体验，不强行合并',symbol:'◌'}
];
export function trackedWorkstreams(projects=[]){
 const found=new Map(projects.map(p=>[p.name,p]));
 return TRACKS.map(t=>({...t,project:found.get(t.repo)||null,ci:found.get(t.repo)?.ci?.state||'unknown',known:found.has(t.repo)}));
}
export function trackMetrics(projects=[]){
 const x=trackedWorkstreams(projects);
 return{total:x.length,visible:x.filter(p=>p.known).length,games:x.filter(p=>p.category==='game').length,
  prototypes:x.filter(p=>p.known&&p.maturity==='prototype').length,blocked:x.filter(p=>p.known&&p.maturity==='blocked').length};
}
export function readiness(stage){
 return ({platform:'运营平台',prototype:'原型期','playable-foundation':'可玩基础版',blocked:'发布门禁未满足'})[stage]||'状态未确认';
}