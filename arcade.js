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
  genre:'management',tag:'经营 · 料理',summary:'备货、点餐、制作、上菜、餐厅升级和每日营业；新版增加兼职助理与排班。',
  status:'playable',source:'original',play:'https://aincfh.github.io/cozy-bistro-sim/',
  art:'bistro',cover:null,updated:'持续开发'},
 {id:'paradise',repo:'paradise-isle',title:'天堂小岛',english:'PARADISE ISLE',
  genre:'life',tag:'种田 · 宠物 · 岛屿',summary:'种植、捕鱼、饲养、建筑与邻里互动；每日集市行情正在加入。',
  status:'playable',source:'fork',play:'https://aincfh.github.io/paradise-isle/',
  art:'island',cover:'https://raw.githubusercontent.com/AincFh/paradise-isle/main/docs/screenshots/island-day.png',updated:'独立 Fork'},
 {id:'wildlands',repo:'wildlands-anglerfishing-world-3d',title:'山野钓行 · NEXT',english:'WILDLANDS NEXT',
  genre:'adventure',tag:'3D · 钓鱼 · 湖岸',summary:'第一人称湖岸、抛投、实体鱼类模型和动态环境。3D 美术仍需提升。',
  status:'prototype',source:'original',play:'https://aincfh.github.io/wildlands-anglerfishing-world-3d/next/',
  art:'lake',cover:null,updated:'独立渲染版'},
 {id:'fishing',repo:'fishing-world-3d',title:'湖光物语',english:'FISHING WORLD 3D',
  genre:'adventure',tag:'3D · 休闲钓鱼',summary:'钓鱼、图鉴、鱼饵装备、任务与等级成长的轻休闲原型。',
  status:'prototype',source:'original',play:'https://aincfh.github.io/fishing-world-3d/',
  art:'lake2',cover:null,updated:'可玩原型'},
 {id:'qube',repo:'qubecraft',title:'方块世界',english:'QUBECRAFT',
  genre:'builder',tag:'体素 · 生存 · 建筑',summary:'挖矿、合成、建造、生物与生存机制；当前浏览器验收仍有失败项，暂不宣称发布。',
  status:'blocked',source:'fork',play:null,art:'voxel',
  cover:'https://raw.githubusercontent.com/AincFh/qubecraft/main/docs/screenshots/blossom.png',updated:'测试未通过'},
 {id:'cimulity',repo:'cimulity',title:'城市模拟',english:'CIMULITY',
  genre:'builder',tag:'城市 · 道路 · 规划',summary:'等距城市分区、就业、交通和财政模拟；本仓库的在线部署尚未核验。',
  status:'unverified',source:'fork',play:null,art:'city',
  cover:'https://raw.githubusercontent.com/AincFh/cimulity/main/docs/screenshots/city-overview.png',updated:'部署待核验'},
 {id:'mori',repo:'Tamagochi---Open-Source-Game',title:'MORI 宠物日记',english:'MORI PET',
  genre:'life',tag:'陪伴 · 宠物 · 小游戏',summary:'完整宠物养成、六种照料行为、迷你游戏、成长与离线 PWA；未启用 WebGL 时提供安全降级画面。',
  status:'playable',source:'fork',play:'https://aincfh.github.io/Tamagochi---Open-Source-Game/',art:'pet',cover:'https://raw.githubusercontent.com/AincFh/Tamagochi---Open-Source-Game/main/docs/images/tamagochi-hero.jpg',updated:'Pages 已部署'},
 {id:'factory',repo:'Midnight-Factory',title:'午夜工厂',english:'MIDNIGHT FACTORY',
  genre:'management',tag:'自动化 · 工业',summary:'完整生产链、矿机、传送带、熔炉、合成器、研发与自动存档；桌面/手机的浏览器烟测通过。',
  status:'playable',source:'fork',play:'https://aincfh.github.io/Midnight-Factory/',art:'factory',cover:null,updated:'Pages 已部署'},
 {id:'citylife',repo:'City-of-Small-Chances',title:'小城人生',english:'CITY OF SMALL CHANCES',
  genre:'life',tag:'生活 · 职业 · 人生',summary:'城市打工、关系和人生选择的模拟世界；本仓库在线构建待核验。',
  status:'unverified',source:'fork',play:null,art:'citylife',cover:null,updated:'部署待核验'},
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
