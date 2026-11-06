// Source-backed, attribution-aware GitHub cross-domain reference catalog.
// All rows are external references, NOT ATLAS-owned products or verified playable games.
export const PAGE_SIZE=24;
export const GAME_CATEGORIES=Object.freeze(['life','builder','survival','management','industry','story','arcade','web3d']);
export const domainForCategory=id=>GAME_CATEGORIES.includes(id)?'game':'software';
export const CATEGORY_COLORS={
 life:'#bcce9a',builder:'#9cc9bd',survival:'#99b8af',management:'#d7b994',
 industry:'#a7b8dc',story:'#d0aeca',arcade:'#e7be99',web3d:'#9cb6d0',
 ai:'#84b8d9',agents:'#a49ade',devtools:'#85c8a8',desktop:'#a2b7e1',
 mobile:'#a9c8a5',webapp:'#c4acd9',automation:'#a1bcd0',data:'#c7bc95',
 creative:'#d9aaa4',education:'#8ec7b9',infra:'#9cb0c0',productivity:'#c1a8c8'
};
const VALID=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export function validRepoName(x){return typeof x==='string'&&x.length<=240&&VALID.test(x)}
export function normalizeCatalog(data){
 if(!data||data.schemaVersion!==1||data.kind!=='external-discovery'||!Array.isArray(data.rows)||!Array.isArray(data.categories))throw Error('未识别的 GitHub 项目索引格式');
 const cats=new Map(data.categories.filter(x=>Array.isArray(x)&&x.length===2&&/^[a-z0-9]+$/.test(x[0])).map(([id,name])=>[id,String(name)]));
 const domainDefs=data.domainCategories||{game:GAME_CATEGORIES,software:[]};
 const categoryDomain=new Map();
 for(const [domain,ids] of Object.entries(domainDefs)){
  if(!['game','software'].includes(domain)||!Array.isArray(ids))continue;
  for(const id of ids)if(cats.has(id)&&!categoryDomain.has(id))categoryDomain.set(id,domain);
 }
 const seen=new Set(),items=[];
 for(const row of data.rows){
  if(!Array.isArray(row)||!validRepoName(row[0])||!cats.has(row[1]))continue;
  const key=row[0].toLowerCase();if(seen.has(key))continue;seen.add(key);
  const [owner,...name]=row[0].split('/');
  items.push({name:row[0],owner,repo:name.join('/'),genre:row[1],genreName:cats.get(row[1]),domain:categoryDomain.get(row[1])||domainForCategory(row[1]),external:true,license:'unreviewed'});
 }
 return {categories:[...cats].map(([id,name])=>({id,name,domain:categoryDomain.get(id)||domainForCategory(id)})),items,queries:Array.isArray(data.searches)?data.searches.filter(x=>x.ok).length:0,updated:data.compiledOn||null};
}
export function balanceGenres(items){
 const buckets=new Map();for(const item of items){if(!buckets.has(item.genre))buckets.set(item.genre,[]);buckets.get(item.genre).push(item)}
 const out=[];let reading=true;while(reading){reading=false;for(const b of buckets.values())if(b.length){out.push(b.shift());reading=true}}
 return out;
}
export function filterCatalog(items,{query='',genre='all',domain='all',savedOnly=false,bookmarks=new Set(),sort='balanced'}={}){
 const words=String(query).toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
 const allowed=items.filter(x=>(genre==='all'||x.genre===genre)&&(domain==='all'||x.domain===domain)&&(!savedOnly||bookmarks.has(x.name.toLowerCase()))&&words.every(w=>(x.name+' '+x.genreName).toLocaleLowerCase().includes(w)));
 if(sort==='name')return allowed.sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'}));
 if(sort==='owner')return allowed.sort((a,b)=>a.owner.localeCompare(b.owner,'en',{sensitivity:'base'}));
 return balanceGenres(allowed);
}
export function pageOf(items,page=1,size=PAGE_SIZE){
 const pages=Math.max(1,Math.ceil(items.length/size)),current=Math.max(1,Math.min(pages,Number.isInteger(page)?page:1));
 return {items:items.slice((current-1)*size,current*size),page:current,pages,total:items.length,start:items.length?(current-1)*size+1:0,end:Math.min(current*size,items.length)};
}
export function statsOf(items,bookmarks=new Set()){
 const by={};for(const x of items)by[x.genre]=(by[x.genre]||0)+1;
 return {total:items.length,genreCount:Object.keys(by).length,saved:items.filter(x=>bookmarks.has(x.name.toLowerCase())).length,domains:{software:items.filter(x=>x.domain==='software').length,game:items.filter(x=>x.domain==='game').length},byGenre:by};
}
