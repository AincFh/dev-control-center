// ATLAS Game Arcade — curated own playable game entry points.
// A green CI does not guarantee the game is complete. Unverified / blocked games
// deliberately have no play URL: visitors can open the development repository.
export const GAME_GENRES = Object.freeze([
 {id:'all',label:'全部游戏'},
 {id:'management',label:'经营模拟'},
 {id:'life',label:'生活养成'},
 {id:'builder',label:'建造沙盒'},
 {id:'adventure',label:'冒险探索'}
]);
export const GAMES = Object.freeze([
 {id:'bistro',repo:'cozy-bistro-sim',title:'日落餐馆',english:'COZY BISTRO',
  genre:'management',tag:'经营 · 料理',summary:'餐厅真实营业循环：最优采购、接单烹饪、兼职助理、社区订餐与每日主推菜营销；改变顾客实际点单和定价。',
  status:'playable',source:'original',play:'https://aincfh.github.io/cozy-bistro-sim/',
  art:'bistro',cover:null,updated:'持续开发'},
 {id:'paradise',repo:'paradise-isle',title:'天堂小岛',english:'PARADISE ISLE',
  genre:'life',tag:'种田 · 宠物 · 岛屿',summary:'种田、捕鱼、养殖、工坊加工和邻里互动；每日行情及港口货运订单，真实库存分批交付、期限和收益。',
  status:'playable',source:'fork',play:'https://aincfh.github.io/paradise-isle/',
  art:'island',cover:'https://raw.githubusercontent.com/AincFh/paradise-isle/main/docs/screenshots/island-day.png',updated:'独立 Fork'},
 {id:'wildlands',repo:'wildlands-anglerfishing-world-3d',title:'山野钓行 · NEXT',english:'WILDLANDS NEXT',
  genre:'adventure',tag:'3D · 钓鱼 · 湖岸',summary:'3D 湖泊、实体鱼群与水下观鱼；购船、WASD 操控、燃油、抛锚船钓、真实鱼获与委托。仍在提升美术品质。',
  status:'prototype',source:'original',play:'https://aincfh.github.io/wildlands-anglerfishing-world-3d/next/',
  art:'lake',cover:null,updated:'NEXT 0.5 · 载具船钓'},
 {id:'fishing',repo:'fishing-world-3d',title:'湖光物语',english:'FISHING WORLD 3D',
  genre:'adventure',tag:'3D · 休闲钓鱼',summary:'钓鱼、图鉴、鱼饵装备、任务与等级成长的轻休闲原型。',
  status:'prototype',source:'original',play:'https://aincfh.github.io/fishing-world-3d/',
  art:'lake2',cover:null,updated:'可玩原型'},
 {id:'qube',repo:'qubecraft',title:'方块世界',english:'QUBECRAFT',
  genre:'builder',tag:'体素 · 生存 · 建筑',summary:'完整体素沙盒：生存采集、合成、生态与传送门；新增创造模式建筑库，四款可旋转的原创方块建筑、冲突检查及整组撤销。',
  status:'playable',source:'fork',play:'https://aincfh.github.io/qubecraft/',art:'voxel',
  cover:'https://raw.githubusercontent.com/AincFh/qubecraft/main/docs/screenshots/blossom.png',updated:'4 栋原创建筑 · 已验收'},
 {id:'cimulity',repo:'cimulity',title:'城市模拟',english:'CIMULITY',
  genre:'builder',tag:'城市 · 道路 · 规划',summary:'等距城市建设与真实道路、就业、税收、水电、交通模拟；City Hall 六阶段市长生涯挑战，真实财政及居民指标决定成败。',
  status:'playable',source:'fork',play:'https://aincfh.github.io/cimulity/',art:'city',
  cover:'https://raw.githubusercontent.com/AincFh/cimulity/main/docs/screenshots/city-overview.png',updated:'六阶段市长生涯'},
 {id:'mori',repo:'Tamagochi---Open-Source-Game',title:'MORI 宠物日记',english:'MORI PET',
  genre:'life',tag:'陪伴 · 宠物 · 小游戏',summary:'3D 虚拟宠物养成、六种照料行为、性格成长与离线 PWA；新增 Orbit Beats 节奏游戏，三款街机共用真实奖励存档。',
  status:'playable',source:'fork',play:'https://aincfh.github.io/Tamagochi---Open-Source-Game/',art:'pet',cover:'https://raw.githubusercontent.com/AincFh/Tamagochi---Open-Source-Game/main/docs/images/tamagochi-hero.jpg',updated:'Orbit Beats · 已发布'},
 {id:'factory',repo:'Midnight-Factory',title:'午夜工厂',english:'MIDNIGHT FACTORY',
  genre:'management',tag:'自动化 · 工业',summary:'完整生产链、矿机、传送带、熔炉、合成器、研发与自动存档；桌面/手机的浏览器烟测通过。',
  status:'playable',source:'fork',play:'https://aincfh.github.io/Midnight-Factory/',art:'factory',cover:null,updated:'Pages 已部署'},
 {id:'citylife',repo:'City-of-Small-Chances',title:'小城人生',english:'CITY OF SMALL CHANCES',
  genre:'life',tag:'3D · 打工 · 人生',summary:'真实可走动的海港街区、工作公告板、时间与天气、体力及工资；已通过 WebGL 启动、角色移动及手机端浏览器验收。',
  status:'playable',source:'fork',play:'https://aincfh.github.io/City-of-Small-Chances/',art:'citylife',cover:null,updated:'独立 Pages 已验收'},
 {id:'spacefortress',repo:'spacefortress',title:'星际前哨',english:'SPACEFORTRESS',
  genre:'management',tag:'太空 · 基地 · 资源',summary:'等距太空殖民地：7 名船员、氧气与电力、水气管网、基地建造、资源物流和轨道远征；已验证独立部署及模拟推进。',
  status:'playable',source:'fork',play:'https://aincfh.github.io/spacefortress/',art:'space',cover:'https://raw.githubusercontent.com/AincFh/spacefortress/main/docs/images/spacefortress-hex.png',updated:'Pages · 4 组 CI 已通过'},
 {id:'coast',repo:'azure-coast',title:'蔚蓝海岸',english:'AZURE COAST',
  genre:'adventure',tag:'城市 · 驾驶 · 探索',summary:'海滨城市驾驶与步行探索，当前发布门槛未满足；暂不对外标记为可玩正式版。',
  status:'blocked',source:'original',play:null,art:'coast',cover:null,updated:'发布阻断'}
]);
export const statusText=s=>({
 playable:'可玩 · 开发中',prototype:'原型 · 可试玩',
 blocked:'发布受阻',unverified:'部署待核验'
})[s]||'未知';
export function playableGame(game){return !!game.play&&(game.status==='playable'||game.status==='prototype')}
export function filterGames(items,query='',genre='all',mode='all'){
 const q=String(query||'').trim().toLocaleLowerCase();
 return items.filter(item=>(genre==='all'||item.genre===genre)&&
 (mode==='all'||(mode==='playable'?playableGame(item):mode==='fork'?item.source==='fork':item.id===mode))&&
 (!q||[item.title,item.english,item.summary,item.tag,item.repo].some(x=>x.toLocaleLowerCase().includes(q))));
}
export function sortGames(items,favorites=[]){
 const fav=new Set(favorites);
 return [...items].sort((a,b)=>Number(fav.has(b.id))-Number(fav.has(a.id))
   ||Number(playableGame(b))-Number(playableGame(a))
   ||a.title.localeCompare(b.title,'zh'));
}
export function arcadeStats(items=GAMES){
 return {total:items.length,playable:items.filter(playableGame).length,
  forks:items.filter(x=>x.source==='fork').length,
  blocked:items.filter(x=>x.status==='blocked').length};
}
