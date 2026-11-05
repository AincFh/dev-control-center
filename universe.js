import{PAGE_SIZE,CATEGORY_COLORS,normalizeCatalog,filterCatalog,pageOf,statsOf,validRepoName}from'./universe-core.js';
const $=id=>document.getElementById(id),STORE='atlas-universe-following-v1';
const scene={items:[],categories:[],queries:0,updated:null,query:'',genre:'all',sort:'balanced',onlySaved:false,page:1,following:new Set(),ready:false};
function node(tag,content,cls){const e=document.createElement(tag);if(content!=null)e.textContent=content;if(cls)e.className=cls;return e;}
function markCount(n){return Number(n||0).toLocaleString('en-US')}
function notify(message){const el=$('universeNotice');if(!el)return;el.textContent=message;el.classList.add('active');clearTimeout(notify.last);notify.last=setTimeout(()=>el.classList.remove('active'),2800);}
function persist(){try{localStorage.setItem(STORE,JSON.stringify([...scene.following]))}catch{}}
function refreshMeta(){
 const x=statsOf(scene.items,scene.following);
 $('universeTotal').textContent=markCount(x.total);
 $('universeGenresCount').textContent=String(x.genreCount);
 $('universeSaved').textContent=markCount(x.saved);
 $('universeQueryCount').textContent=String(scene.queries);
 $('universeHomeCount').textContent=markCount(x.total);
 $('universeBannerCount').textContent=markCount(x.total);
 if($('universeIntroCount'))$('universeIntroCount').textContent=markCount(x.total);
}
function categoryMenu(){
 const holder=$('universeCategories'),s=statsOf(scene.items,scene.following);
 holder.replaceChildren();
 const opts=[{id:'all',name:'全部',count:scene.items.length},...scene.categories.map(c=>({...c,count:s.byGenre[c.id]||0}))];
 for(const genre of opts){
  const b=node('button',genre.name+' · '+markCount(genre.count),genre.id===scene.genre?'active':'');
  b.type='button';b.dataset.genre=genre.id;b.setAttribute('aria-pressed',String(genre.id===scene.genre));
  b.addEventListener('click',()=>{scene.genre=genre.id;scene.page=1;categoryMenu();render();notify('已切换到 '+genre.name+' 类目')});
  holder.append(b);
 }
}
function render(){
 const filtered=filterCatalog(scene.items,{query:scene.query,genre:scene.genre,sort:scene.sort,savedOnly:scene.onlySaved,bookmarks:scene.following});
 const pg=pageOf(filtered,scene.page);
 scene.page=pg.page;
 $('universeMatches').textContent=markCount(pg.total)+' 个符合条件的 GitHub 项目';
 $('universeRange').textContent=pg.total?'展示 '+markCount(pg.start)+'–'+markCount(pg.end)+' / '+markCount(pg.total):'没有符合条件的项目';
 $('universePage').textContent=pg.page+' / '+pg.pages;
 $('universePrev').disabled=pg.page<=1;$('universeNext').disabled=pg.page>=pg.pages;
 $('universeOnlySaved').setAttribute('aria-pressed',String(scene.onlySaved));
 $('universeOnlySaved').classList.toggle('selected',scene.onlySaved);
 const grid=$('universeGrid');grid.replaceChildren();
 if(!pg.items.length){const e=node('div','暂无匹配项目。可以更换类别、修改搜索词或取消收藏筛选。','universe-empty');grid.append(e);return}
 for(const [i,p]of pg.items.entries()){
  const card=node('article',null,'universe-project');card.style.setProperty('--order',String(i%8));
  const top=node('div',null,'universe-card-top'),tag=node('span',p.genreName,'universe-tag'),star=node('button',scene.following.has(p.name.toLowerCase())?'★':'☆','universe-save');
  star.type='button';star.setAttribute('aria-label',scene.following.has(p.name.toLowerCase())?'取消关注 '+p.name:'关注 '+p.name);
  star.setAttribute('aria-pressed',String(scene.following.has(p.name.toLowerCase())));star.title='本地关注列表';
  star.addEventListener('click',()=>toggleSave(p.name));top.append(tag,star);
  const ident=node('div',null,'universe-name');ident.append(node('span',p.owner+'/','universe-owner'),node('strong',p.repo));
  const description=node('p','GitHub 外部项目 · '+p.genreName+'；许可证、可玩性及项目质量尚未逐项核验。','universe-caption');
  const actions=node('div',null,'universe-card-actions'),more=node('button','查看资料 ↗','universe-details-button');
  more.type='button';more.onclick=()=>showDetail(p.name);
  const link=node('a','打开 GitHub ↗','universe-external');link.href='https://github.com/'+p.name;link.target='_blank';link.rel='noopener noreferrer';
  actions.append(more,link);card.append(top,ident,description,actions);grid.append(card);
 }
 refreshMeta();
}
function toggleSave(name){
 const key=name.toLowerCase();if(scene.following.has(key))scene.following.delete(key);else scene.following.add(key);
 persist();render();notify(scene.following.has(key)?'已加入本地关注 · '+name:'已取消关注 · '+name);
}
function goPage(delta){
 scene.page+=delta;render();$('universeGrid').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
}
async function showDetail(name){
 if(!validRepoName(name))return;
 const dialog=$('universeDetail'),content=$('universeDetailBody');content.replaceChildren(node('div','GITHUB / PUBLIC REPOSITORY','eyebrow'),node('h2',name),node('p','正在读取 GitHub 的公开仓库资料…'));
 dialog.showModal();
 try{
  const url='https://api.github.com/repos/'+name.split('/').map(encodeURIComponent).join('/');
  const response=await fetch(url,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(9500)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const d=await response.json();
  if(d.full_name?.toLowerCase()!==name.toLowerCase())throw Error('返回的仓库不匹配');
  const rows=[
   ['说明',d.description||'未填写'],
   ['主要语言',d.language||'未知'],
   ['Stars',typeof d.stargazers_count==='number'?markCount(d.stargazers_count):'未提供'],
   ['许可证',d.license?.spdx_id&&d.license.spdx_id!=='NOASSERTION'?d.license.spdx_id:'需要单独审查'],
   ['维护状态',d.archived?'已归档':d.disabled?'仓库停用':'公开仓库'],
   ['最近推送',d.pushed_at?new Date(d.pushed_at).toLocaleDateString('zh-CN'):'未知']
  ];
  content.replaceChildren(node('div','LIVE · GITHUB PUBLIC API','eyebrow'),node('h2',d.full_name));
  const list=node('div',null,'universe-detail-list');
  for(const [label,value]of rows){const item=node('div',null,'universe-detail-row');item.append(node('span',label),node('strong',String(value)));list.append(item)}
  const warning=node('p','以上元信息来自 GitHub；即使仓库标示许可证，也需要在复用代码或素材之前逐项审核。','universe-detail-note');
  const buttons=node('div',null,'universe-detail-actions'),git=node('a','前往 GitHub →');git.href=d.html_url||'https://github.com/'+name;git.target='_blank';git.rel='noopener noreferrer';
  const follow=node('button',scene.following.has(name.toLowerCase())?'取消关注':'加入关注');follow.onclick=()=>{toggleSave(name);follow.textContent=scene.following.has(name.toLowerCase())?'取消关注':'加入关注'};
  buttons.append(git,follow);content.append(list,warning,buttons);
 }catch(e){content.replaceChildren(node('h2',name),node('p','GitHub 元信息获取失败（可能达到公共接口限额）：'+e.message+'。此项目仍可直接打开源码页面查看。'));const a=node('a','打开 GitHub 仓库 →');a.href='https://github.com/'+name;a.target='_blank';a.rel='noopener noreferrer';content.append(a);}
}
function drawMap(){
 const canvas=$('universeCanvas');if(!canvas||!scene.ready)return;
 const wrap=canvas.parentElement,rect=wrap.getBoundingClientRect(),ratio=Math.min(2,window.devicePixelRatio||1);
 const width=Math.max(320,rect.width),height=Math.max(240,rect.height),ctx=canvas.getContext('2d');if(!ctx)return;
 if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);canvas.style.width=width+'px';canvas.style.height=height+'px';}
 ctx.setTransform(ratio,0,0,ratio,0,0);
 ctx.clearRect(0,0,width,height);
 const time=performance.now()*.00016,center=[width*.5,height*.51],radius=Math.min(width*.38,height*.37);
 const star=(seed)=>{const v=Math.sin(seed*127.1)*43758.5453123;return v-Math.floor(v)};
 for(let j=0;j<126;j++){
  const ang=star(j+19)*Math.PI*2+(scene.motion?time*.10:0),rr=Math.sqrt(star(j+381))*Math.min(width*.49,height*.7),x=center[0]+Math.cos(ang)*rr*1.6,y=center[1]+Math.sin(ang)*rr*.84;
  ctx.fillStyle='rgba(212,238,222,'+(0.05+star(j+831)*.20)+')';ctx.beginPath();ctx.arc(x,y,.45+star(j+180)*1.05,0,Math.PI*2);ctx.fill();
 }
 const by=statsOf(scene.items).byGenre;scene.points=[];
 const cats=scene.categories;
 cats.forEach((genre,i)=>{
  const angle=(i/cats.length)*Math.PI*2-Math.PI/2+ (scene.motion?Math.sin(time+i)*.014:0);
  const x=center[0]+Math.cos(angle)*radius*1.45,y=center[1]+Math.sin(angle)*radius*.85;
  const size=20+Math.sqrt(by[genre.id]||0)*1.05;
  const on=scene.genre===genre.id;
  ctx.beginPath();ctx.strokeStyle=on?'rgba(228,247,217,.74)':'rgba(177,220,196,.21)';ctx.lineWidth=1.1;
  ctx.moveTo(center[0],center[1]);ctx.lineTo(x,y);ctx.stroke();
  const halo=ctx.createRadialGradient(x,y,2,x,y,size*1.9);halo.addColorStop(0,on?'rgba(203,243,210,.48)':'rgba(159,200,178,.24)');halo.addColorStop(1,'rgba(59,93,81,0)');
  ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,size*1.9,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.fillStyle=CATEGORY_COLORS[genre.id]||'#cadad0';ctx.globalAlpha=on?1:.8;ctx.arc(x,y,size*.49,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle='#edf9f0';ctx.font='600 11px system-ui';ctx.textAlign='center';ctx.fillText(genre.name,x,y+size*.9+9);ctx.font='9px system-ui';ctx.fillStyle='#b7d5c6';ctx.fillText(markCount(by[genre.id]||0),x,y+size*.9+22);
  scene.points.push({x,y,r:size*.77,id:genre.id});
 });
 const core=ctx.createRadialGradient(center[0],center[1],4,center[0],center[1],48);core.addColorStop(0,'#bce1c6');core.addColorStop(.35,'#386e5d');core.addColorStop(1,'rgba(23,51,48,0)');
 ctx.fillStyle=core;ctx.beginPath();ctx.arc(...center,49,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#f3fcf6';ctx.textAlign='center';ctx.font='700 13px system-ui';ctx.fillText('ATLAS',center[0],center[1]-2);
 ctx.font='9px system-ui';ctx.fillStyle='#c1ddcd';ctx.fillText(markCount(scene.items.length)+' REPOS',center[0],center[1]+14);
}
let animationId=0;let lastDraw=0;
function animate(t){
 if(scene.motion&&location.hash==='#universe'&&document.visibilityState==='visible'&&t-lastDraw>65){drawMap();lastDraw=t}
 animationId=requestAnimationFrame(animate);
}
function initMap(){
 const can=$('universeCanvas'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 scene.motion=!reduced.matches;
 can.addEventListener('pointermove',e=>{if(!scene.ready)return;const rect=can.getBoundingClientRect(),p=scene.points.find(x=>Math.hypot((e.clientX-rect.left)-x.x,(e.clientY-rect.top)-x.y)<x.r);can.style.cursor=p?'pointer':'default';});
 can.addEventListener('click',e=>{const rect=can.getBoundingClientRect(),p=scene.points.find(x=>Math.hypot(e.clientX-rect.left-x.x,e.clientY-rect.top-x.y)<x.r);if(p){scene.genre=p.id;scene.page=1;categoryMenu();render();drawMap();$('universeGrid').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});}});
 window.addEventListener('resize',drawMap,{passive:true});
 if(reduced.addEventListener)reduced.addEventListener('change',()=>{scene.motion=!reduced.matches;drawMap()});
 animationId=requestAnimationFrame(animate);
}
export function initUniverse(){
 try{scene.following=new Set(JSON.parse(localStorage.getItem(STORE)||'[]').filter(x=>typeof x==='string'&&validRepoName(x)).map(x=>x.toLowerCase()))}catch{}
 $('universeSearch').addEventListener('input',e=>{scene.query=e.target.value;scene.page=1;render()});
 $('universeSort').addEventListener('change',e=>{scene.sort=e.target.value;scene.page=1;render()});
 $('universeOnlySaved').onclick=()=>{scene.onlySaved=!scene.onlySaved;scene.page=1;render()};
 $('universePrev').onclick=()=>goPage(-1);$('universeNext').onclick=()=>goPage(1);
 $('universeRandom').onclick=()=>{const list=filterCatalog(scene.items,{genre:scene.genre,sort:scene.sort,query:scene.query});if(list.length)showDetail(list[Math.floor(Math.random()*list.length)].name)};
 $('universeDetailClose').onclick=()=>$('universeDetail').close();
 $('universeDetail').addEventListener('click',e=>{if(e.target===$('universeDetail'))$('universeDetail').close()});
 initMap();
 fetch('./data/github-universe.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(json=>{
  const catalog=normalizeCatalog(json);scene.items=catalog.items;scene.categories=catalog.categories;scene.queries=catalog.queries;scene.updated=catalog.updated;scene.ready=true;
  $('universeUpdated').textContent=catalog.updated?('索引采集：'+catalog.updated+' · 仓库元数据按需查询'):'GitHub 搜索索引';
  categoryMenu();refreshMeta();render();drawMap();
 }).catch(e=>{$('universeMatches').textContent='外部项目索引加载失败：'+e.message;$('universeGrid').textContent='请刷新页面重试。现有自有仓库功能仍然可以使用。'});
}
