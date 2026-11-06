// Curated ATLAS development tracks. A green CI status never implies product completion.
export const TRACKS=[
 {repo:'dev-control-center',short:'ATLAS',category:'platform',title:'多项目开发控制中心',stage:'持续运营',maturity:'platform',priority:1,goal:'聊天需求、Issue、PR、发布和交接统一管理',next:'跨项目任务与验收闭环',symbol:'◈'},
 {repo:'AincFh',short:'AincFh OS',category:'system',title:'融合式 Web OS 与交互作品集',stage:'公开开发 · 迭代中',maturity:'active-development',priority:1,goal:'多语言桌面、文件管理器、应用窗口和跨平台交互体验',next:'按真实用户流程验收桌面管理、导航、文件系统与主题',symbol:'⌘'},
 {repo:'my-anime-blog',short:'A.T. FIELD',category:'web',title:'全栈内容与社区平台',stage:'已有公开部署记录 · 持续维护',maturity:'product-existing',priority:1,goal:'Cloudflare Workers、D1、R2 驱动内容、社区及安全的完整产品',next:'复核最新生产门禁、关键业务回归和可观测性',symbol:'◆'},
 {repo:'QingJi',short:'QINGJI',category:'mobile',title:'轻记 · 原生 Android 记账',stage:'本地应用原型 · 待验收',maturity:'prototype',priority:1,goal:'Kotlin / Jetpack Compose 原生记账、离线数据、分类统计与主题',next:'对照 README 与验收记录验证 APK、真机、数据完整性和交互',symbol:'▣'},
 {repo:'squiffy',short:'SQUIFFY',category:'tool',title:'互动剧情与文本创作工具',stage:'开源 Fork · 待验收',maturity:'fork-reference',priority:2,goal:'可编辑分支剧情与多结局叙事工具链',next:'核对上游许可和本仓库功能/部署差异，避免将 Fork 当作原创',symbol:'✎'},
 {repo:'wildlands-anglerfishing-world-3d',short:'WILDLANDS',category:'game',title:'第一人称 3D 钓鱼探索',stage:'深度开发',maturity:'prototype',priority:1,goal:'鱼类生态与探索玩法深度',next:'性能基线、鱼群生态与连续试玩',symbol:'♒'},
 {repo:'cozy-bistro-sim',short:'COZY BISTRO',category:'game',title:'餐馆经营模拟',stage:'可玩基础版',maturity:'playable-foundation',priority:1,goal:'多日营业、订单、食材、升级、账本与存档',next:'经济平衡与移动端连续游玩验证',symbol:'✦'},
 {repo:'paradise-isle',short:'PARADISE ISLE',category:'game',title:'岛屿生活与农场模拟',stage:'Fork · 可游玩',maturity:'fork-playable',priority:1,goal:'种田、养殖、邻里互动、每日集市与岛屿扩建',next:'日常任务、经济长期平衡和移动端连续游玩',symbol:'✿'},
 {repo:'qubecraft',short:'QUBECRAFT',category:'game',title:'方块建造生存',stage:'Fork · 可游玩',maturity:'fork-playable',priority:1,goal:'挖掘、建造、合成、生态与生存模拟',next:'继续提高生存操作、手机建造和长期世界稳定性',symbol:'▧'},
 {repo:'cimulity',short:'CIMULITY',category:'game',title:'城市建设与交通仿真',stage:'Fork · 可游玩',maturity:'fork-playable',priority:2,goal:'等距城市、道路、分区、水电、财政、人口及公共服务模拟',next:'复杂城市长期模拟压力测试和触屏建造交互',symbol:'▦'},
 {repo:'Midnight-Factory',short:'MIDNIGHT FACTORY',category:'game',title:'生产线与工业经营',stage:'Fork · 可游玩',maturity:'fork-playable',priority:2,goal:'采矿、输送、熔炼、装配、研究与升级的完整生产链',next:'长时连续经营与触屏交互体验优化',symbol:'⚙'},
 {repo:'Tamagochi---Open-Source-Game',short:'MORI',category:'game',title:'虚拟宠物与陪伴模拟',stage:'Fork · 可游玩',maturity:'fork-playable',priority:3,goal:'照料、成长、故事、小游戏和 PWA 离线养宠',next:'独立 GPU 3D 验收与移动端性能/电量基线',symbol:'♡'},
 {repo:'spacefortress',short:'SPACEFORTRESS',category:'game',title:'太空殖民地与船员生存',stage:'Fork · 可游玩',maturity:'fork-playable',priority:2,goal:'七名船员、生命支持、能源水气管网、建筑物流与远征',next:'长时压力测试、触屏交互与轨道任务平衡',symbol:'⬡'},
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
  nonGames:x.filter(p=>p.category!=='game').length,
  prototypes:x.filter(p=>p.known&&p.maturity==='prototype').length,blocked:x.filter(p=>p.known&&p.maturity==='blocked').length};
}
export function readiness(stage){
 return ({platform:'运营平台','active-development':'公开开发中','product-existing':'已有产品 · 持续维护','fork-reference':'Fork · 验收待核对',prototype:'原型期','playable-foundation':'可玩基础版','fork-playable':'Fork · 可游玩',unverified:'部署待核验',blocked:'发布门禁未满足'})[stage]||'状态未确认';
}