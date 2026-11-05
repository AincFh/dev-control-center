import{GAMES}from'./arcade.js';
import{normalizeCatalog}from'./universe-core.js';
import{commandCollection,searchCommands,rememberCommand}from'./command-core.js';
const STORE='atlas-command-recents-v1',$=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=String(text);if(cls)e.className=cls;return e;};
const GLYPH={route:'⌘',game:'✦',repo:'◆',external:'◇'};
export function initCommandPalette(getProjects=()=>[]){
 const dialog=$('commandDialog'),input=$('commandInput'),box=$('commandResults');
 let external=[],catalogLoaded=false,catalogLoading=false,items=[],selection=0,recents=[];
 try{recents=JSON.parse(localStorage.getItem(STORE)||'[]');if(!Array.isArray(recents))recents=[]}catch{recents=[]}
 const persist=()=>{try{localStorage.setItem(STORE,JSON.stringify(recents))}catch{}};
 function current(){return commandCollection({projects:getProjects(),games:GAMES,external});}
 function choose(index){
  selection=Math.max(0,Math.min(items.length-1,index));
  for(const [i,el]of box.querySelectorAll('[data-command-index]').entries()){
   const active=i===selection;
   el.classList.toggle('is-selected',active);
   el.setAttribute('aria-selected',String(active));
   if(active){input.setAttribute('aria-activedescendant',el.id);el.scrollIntoView({block:'nearest'})}
  }
  if(!items.length)input.removeAttribute('aria-activedescendant');
 }
 function render(){
  const commands=current(),query=input.value;
  items=searchCommands(commands,query,{recent:recents,limit:12});
  selection=0;box.replaceChildren();
  $('commandResultCount').textContent=query.trim()?(items.length+' 条匹配建议 · '+commands.length+' 项已检索'):('快速入口 · '+commands.length+' 项可搜索');
  if(!items.length){
   box.append(node('p',catalogLoading?'正在读取 GitHub 星图参考索引…':'没有匹配项。试试项目名称、玩法类型或英文关键字。','command-empty'));
   return;
  }
  for(const [i,entry]of items.entries()){
   const button=node('button',null,'command-entry');
   button.type='button';button.dataset.commandIndex=String(i);button.id='command-entry-'+i;button.setAttribute('role','option');
   const glyph=node('span',GLYPH[entry.kind]||'◇','command-glyph '+entry.kind);
   const copy=node('span',null,'command-copy');copy.append(node('strong',entry.title),node('small',entry.description));
   const meta=node('span',entry.group,'command-group');
   button.append(glyph,copy,meta);
   button.onclick=()=>activate(entry);
   button.addEventListener('pointermove',()=>{if(selection!==i)choose(i)},{passive:true});
   box.append(button);
  }
  choose(0);
 }
 function activate(item){
  if(!item)return;
  recents=rememberCommand(recents,item.id);persist();
  dialog.close();
  if(item.kind==='route'){location.hash=item.url;return}
  // Only URL destinations derived from validated GitHub names or explicit game records.
  window.open(item.url,'_blank','noopener,noreferrer');
 }
 async function loadExternal(){
  if(catalogLoaded||catalogLoading)return;
  catalogLoading=true;
  try{
   const response=await fetch('./data/github-universe.json',{cache:'force-cache',signal:AbortSignal.timeout(13000)});
   if(!response.ok)throw Error('GitHub 外部索引暂不可用');
   const data=normalizeCatalog(await response.json());external=data.items;catalogLoaded=true;
  }catch{
   $('commandResultCount').textContent='外部星图暂不可用；内部项目与游戏仍可搜索';
  }finally{
   catalogLoading=false;
   if(dialog.open)render();
  }
 }
 function open(){
  if(dialog.open){dialog.close();return}
  input.value='';selection=0;dialog.showModal();
  render();input.focus({preventScroll:true});
  loadExternal();
 }
 input.addEventListener('input',render);
 input.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){e.preventDefault();choose(selection+1)}
  if(e.key==='ArrowUp'){e.preventDefault();choose(selection-1)}
  if(e.key==='Enter'){e.preventDefault();activate(items[selection])}
  if(e.key==='Escape'){e.preventDefault();dialog.close()}
 });
 $('commandClose').onclick=()=>dialog.close();
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 dialog.addEventListener('close',()=>{input.value='';input.removeAttribute('aria-activedescendant')});
 return open;
}
