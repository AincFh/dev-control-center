import {GAME_QA_CASES,normalizeGameReport,gameReportFreshness} from './game-runtime-core.js';
const $=id=>document.getElementById(id);
const n=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=String(text);if(cls)e.className=cls;return e};
const STATE={pass:'真实浏览器通过',fail:'运行检查失败',timeout:'超时',unknown:'尚未检查'};
function link(url,label){const a=n('a',label);a.href=url;a.rel='noopener noreferrer';a.target='_blank';return a}
export function initGameRuntime(){
 let report=normalizeGameReport(null);
 function render(){
  const stamp=report.generatedAt?new Date(report.generatedAt).toLocaleString('zh-CN'):'暂无';
  const freshness=gameReportFreshness(report);
  const all=GAME_QA_CASES.length;
  $('gameQAPassed').textContent=String(report.passed);
  $('gameQAFailed').textContent=String(report.failed);
  $('gameQAUnknown').textContent=String(all-report.tested);
  $('gameQAStamp').textContent='最近运行：'+stamp+' · '+({fresh:'36 小时内的浏览器实测',stale:'已超过 36 小时 · 结果过期',missing:'尚无实际验收记录',invalid_clock:'时间信息异常'}[freshness]||'待核对');
  $('gameQAStamp').dataset.freshness=freshness;
  const holder=$('gameQACards');holder.replaceChildren();
  for(const target of GAME_QA_CASES){
   const result=report.results.find(x=>x.id===target.id);
   const state=result?.status||'unknown';
   const tile=n('article',null,'game-qa-tile');
   tile.dataset.game=target.id;tile.dataset.qa=state;
   tile.append(n('span','BROWSER RUN / '+target.id.toUpperCase(),'game-qa-kicker'));
   const header=n('div',null,'game-qa-header');
   header.append(n('strong',target.label),n('span',STATE[state]||'待核验','game-qa-state '+state));
   tile.append(header,n('p',target.title,'game-qa-explainer'));
   if(result){
    const pieces=[];
    if(result.elapsedMs!=null)pieces.push('本次运行 '+(result.elapsedMs/1000).toFixed(1)+' 秒');
    if(result.navigation?.domContentLoadedMs!=null)
     pieces.push('最近导航 DOM 就绪 '+result.navigation.domContentLoadedMs+' ms');
    if(result.screenshots?.length)pieces.push('实机截图 '+result.screenshots.length+' 张');
    if(pieces.length)tile.append(n('p',pieces.join(' · '),'game-qa-telemetry'));
    if(result.screenshots?.length&&report.runUrl){
     const evidence=link(report.runUrl,'打开 Actions Artifacts 查看浏览器截图 ↗');
     evidence.className='game-qa-evidence-link';
     tile.append(evidence);
    }
   }
   if(result?.checks?.length){
    const details=n('details',null,'game-qa-details');
    const sum=n('summary',result.checks.filter(c=>c.status==='pass').length+' / '+result.checks.length+' 个检查项 · 展开证据');
    details.append(sum);
    for(const c of result.checks){
     const row=n('div',null,'game-qa-check');
     row.append(n('span',c.status==='pass'?'✓':'×','game-qa-check-status '+c.status),n('span',c.label));
     if(c.reason){const err=n('small',c.reason);err.title=c.reason;row.append(err)}
     details.append(row);
    }
    tile.append(details);
   }else tile.append(n('small','没有本场景的实际执行记录。','game-qa-no-data'));
   if(result?.message)tile.append(n('p',result.message,'game-qa-failure'));
   if(result&&freshness!=='fresh')tile.append(n('small','注意：这次结果已过期，仅供历史参考。','game-qa-old'));
   holder.append(tile);
  }
  const action=$('gameQARunLink');action.replaceChildren();
  if(report.runUrl)action.append(link(report.runUrl,'查看实际 Chromium 测试任务 ↗'));
  else action.append(link('https://github.com/AincFh/dev-control-center/actions/workflows/live-game-qa.yml','查看独立运行任务 ↗'));
 }
 render();
 return function updateGameRuntime(raw){report=normalizeGameReport(raw);render();return report};
}
