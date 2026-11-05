/**
 * ATLAS visual interaction layer and intentional read-only clipboard UX.
 * This is a client-side UI preference, not DRM or protection for public source.
 * Search inputs remain editable by typing; clipboard, text selection, drag, and
 * context menus are disabled within this application.
 */
function restrictedEvent(e){if(!e.defaultPrevented)e.preventDefault()}
function denyShortcut(e){
 if(!(e.ctrlKey||e.metaKey))return;
 const key=e.key.toLowerCase();
 // Ctrl/Cmd+K = project search, managed by app.js; keep it operational.
 if(['c','v','x','a','insert'].includes(key))e.preventDefault();
}
export function initStudioExperience(){
 const root=document.documentElement;
 root.classList.add('atlas-restricted-selection');
 for(const type of ['copy','cut','paste','selectstart','contextmenu','dragstart']){
  document.addEventListener(type,restrictedEvent,true);
 }
 document.addEventListener('keydown',denyShortcut,true);
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 if(reduce.matches)return;
 const hero=document.querySelector('.hero'),art=document.querySelector('.hero-art');
 if(hero&&art){
  let frame=0,deltaX=0,deltaY=0;
  hero.addEventListener('pointermove',e=>{
   if(e.pointerType==='touch')return;
   const r=hero.getBoundingClientRect();
   deltaX=(e.clientX-r.left-r.width/2)/r.width;
   deltaY=(e.clientY-r.top-r.height/2)/r.height;
   if(frame)return;
   frame=requestAnimationFrame(()=>{
    art.style.setProperty('--pointer-x',(deltaX*14).toFixed(2)+'px');
    art.style.setProperty('--pointer-y',(deltaY*12).toFixed(2)+'px');
    frame=0;
   });
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{
   art.style.setProperty('--pointer-x','0px');art.style.setProperty('--pointer-y','0px');
  });
 }
 // Subtle pointer spotlight is decorative; cards remain plain DOM links/buttons.
 document.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;
  const card=e.target.closest?.('.universe-project,.home-mini,.workstream-card,.arcade-card,.project');
  if(!card)return;
  const r=card.getBoundingClientRect();
  card.style.setProperty('--spot-x',Math.round(e.clientX-r.left)+'px');
  card.style.setProperty('--spot-y',Math.round(e.clientY-r.top)+'px');
 },{passive:true});
 // Tactile activation ripple for visible ATLAS controls.
 document.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  const el=e.target.closest?.('.toolbar-button,.nav,.universe-genres button,.universe-pagination button,.universe-save,.universe-random,.primary,.arcade-play');
  if(!el||reduce.matches)return;
  const r=el.getBoundingClientRect(),ink=document.createElement('span');
  ink.className='atlas-ripple';ink.style.left=(e.clientX-r.left)+'px';ink.style.top=(e.clientY-r.top)+'px';ink.setAttribute('aria-hidden','true');el.append(ink);
  ink.addEventListener('animationend',()=>ink.remove(),{once:true});
 },{passive:true});
 // Reduced-motion preference can change while the page is open.
 reduce.addEventListener?.('change',()=>{
  if(reduce.matches){art?.style.setProperty('--pointer-x','0px');art?.style.setProperty('--pointer-y','0px')}
 });
}
