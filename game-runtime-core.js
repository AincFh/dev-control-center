// ATLAS browser-level game QA evidence. Never equate an HTTP probe, CI or
// source-repository Playwright test with an observed public Pages gameplay run.
export const GAME_QA_CASES=Object.freeze([
 {id:'bistro',repo:'cozy-bistro-sim',label:'日落餐馆',title:'经营开店与订单刷新'},
 {id:'paradise',repo:'paradise-isle',label:'天堂小岛',title:'创建存档、进入岛屿与恢复'},
 {id:'wildlands',repo:'wildlands-anglerfishing-world-3d',label:'山野钓行 NEXT',title:'WebGL 场景与真实抛竿操作'},
 {id:'fishing',repo:'fishing-world-3d',label:'湖光物语',title:'WebGL 启动与钓鱼状态变化'},
 {id:'factory',repo:'Midnight-Factory',label:'午夜工厂',title:'工厂引导、矿机交互与 Canvas 启动'},
 {id:'citylife',repo:'City-of-Small-Chances',label:'小城人生',title:'WebGL 城市启动、行走与触控移动'},
 {id:'mori',repo:'Tamagochi---Open-Source-Game',label:'MORI 宠物日记',title:'照料行为、自动存档与恢复'},
 {id:'qube',repo:'qubecraft',label:'方块世界',title:'真正创建体素世界、进入游戏与保存'},
 {id:'cimulity',repo:'cimulity',label:'城市模拟',title:'城市 Canvas、时间控制、备份管理与移动端'},
 {id:'spacefortress',repo:'spacefortress',label:'星际前哨',title:'殖民地模拟、操作面板与真实浏览器存档'}
]);
const ISO=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?x:null;
const ID=/^[a-z][a-z0-9-]{0,39}$/;
const SAFE_URL=/^https:\/\/github\.com\/AincFh\/dev-control-center\/actions\/runs\/[1-9]\d{1,20}$/;
const RESULTS=new Set(['pass','fail','timeout','unknown']);
const normalizeCheck=x=>{
 if(!x||!ID.test(x.id)||!RESULTS.has(x.status))return null;
 return{id:x.id,label:String(x.label||x.id).slice(0,125),status:x.status,reason:String(x.reason||'').slice(0,220)};
};
export function normalizeGameReport(raw){
 const unavailable={valid:false,generatedAt:null,runUrl:null,results:[],tested:0,passed:0,failed:0,reason:'missing_report'};
 if(!raw||raw.schemaVersion!==1||raw.owner!=='AincFh'||!Array.isArray(raw.results)||!ISO(raw.generatedAt))return unavailable;
 const seen=new Set(),results=[];
 for(const rawItem of raw.results){
  const target=GAME_QA_CASES.find(x=>x.id===rawItem?.id);
  if(!target||seen.has(target.id)||rawItem?.repo!==target.repo||!RESULTS.has(rawItem.status))continue;
  seen.add(target.id);
  const checks=(Array.isArray(rawItem.checks)?rawItem.checks:[]).map(normalizeCheck).filter(Boolean).slice(0,14);
  const status=checks.some(x=>x.status==='fail')?'fail':checks.some(x=>x.status==='timeout')?'timeout':rawItem.status;
  const allowedShots=new Set([target.id+'-game.png',target.id+'-mobile.png',target.id+'-failure.png']);
  const screenshots=[...new Set(Array.isArray(rawItem.screenshots)?rawItem.screenshots.filter(x=>typeof x==='string'&&allowedShots.has(x)):[])];
  const finiteBound=(x,max)=>Number.isFinite(x)&&x>=0?Math.min(max,Math.round(x)):null;
  const navigation=rawItem.navigation&&typeof rawItem.navigation==='object'?{
   domContentLoadedMs:finiteBound(rawItem.navigation.domContentLoadedMs,600000),
   loadEventMs:finiteBound(rawItem.navigation.loadEventMs,600000),
   resourceCount:finiteBound(rawItem.navigation.resourceCount,10000)
  }:null;
  results.push({...target,status,checks,screenshots,navigation,
   elapsedMs:finiteBound(rawItem.elapsedMs,600000),
   message:String(rawItem.message||'').slice(0,350)});
 }
 const runUrl=SAFE_URL.test(raw.runUrl||'')?raw.runUrl:null;
 const tested=results.filter(x=>x.status!=='unknown').length;
 return{valid:true,generatedAt:raw.generatedAt,runUrl,results,tested,passed:results.filter(x=>x.status==='pass').length,
  failed:results.filter(x=>x.status==='fail'||x.status==='timeout').length,reason:null};
}
export function gameReportFreshness(report,now=Date.now(),ttlHours=36){
 if(!report?.valid||!report.generatedAt)return'missing';
 const age=now-Date.parse(report.generatedAt);
 if(!Number.isFinite(age)||age< -5*60*1000)return'invalid_clock';
 if(age>ttlHours*3600000)return'stale';
 return'fresh';
}
export function gameEvidenceFor(repo,report,now=Date.now()){
 const row=report?.results?.find(x=>x.repo===repo);
 if(!row)return{status:'unknown',reason:'not_tested',isCurrent:false,case:null};
 const freshness=gameReportFreshness(report,now);
 return{status:row.status,reason:freshness,case:row,isCurrent:freshness==='fresh'};
}
