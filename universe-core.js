// Source-backed GitHub cross-domain research catalog. Games are one family among software disciplines.
// All rows are external references, NOT ATLAS-owned products or verified playable games.
export const PAGE_SIZE=24;
export const CATEGORY_COLORS={
 life:'#bcce9a',builder:'#9cc9bd',survival:'#99b8af',management:'#d7b994',
 industry:'#a7b8dc',story:'#d0aeca',arcade:'#e7be99',web3d:'#9cb6d0',
 system:'#8bb9dc',ai:'#a8a5e9',desktop:'#82b7c6',mobile:'#d2abce',web:'#7dbea2',
 devtools:'#b4c3dc',automation:'#bbbc8a',data:'#8fb6d8',media:'#ddaba0',
 education:'#c7b6dd',infra:'#98c6bc',design:'#d2b69a',
 productivity:'#b8bbdf',communication:'#a0c4d5',security:'#e1b9a6',science:'#b7b8ce',business:'#b6c4a2',accessibility:'#d7b1d8'
};
export const GAME_GENRES=new Set(['life','builder','survival','management','industry','story','arcade','web3d']);
export const familyOf=genre=>GAME_GENRES.has(genre)?'game':'software';
const VALID=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export function validRepoName(x){return typeof x==='string'&&x.length<=240&&VALID.test(x)}
export function normalizeCatalog(data){
 if(!data||data.schemaVersion!==1||data.kind!=='external-discovery'||!Array.isArray(data.rows)||!Array.isArray(data.categories))throw Error('未识别的 GitHub 项目索引格式');
 const cats=new Map(data.categories.filter(x=>Array.isArray(x)&&x.length===2&&/^[a-z0-9]+$/.test(x[0])).map(([id,name])=>[id,String(name)]));
 const seen=new Set(),items=[];
 for(const row of data.rows){
  if(!Array.isArray(row)||!validRepoName(row[0])||!cats.has(row[1]))continue;
  const key=row[0].toLowerCase();if(seen.has(key))continue;seen.add(key);
  const [owner,...name]=row[0].split('/');
  items.push({name:row[0],owner,repo:name.join('/'),genre:row[1],genreName:cats.get(row[1]),family:familyOf(row[1]),external:true,license:'unreviewed'});
 }
 const present=new Set(items.map(x=>x.name.toLowerCase())),featured=[],featuredSeen=new Set();
 for(const row of Array.isArray(data.spotlights)?data.spotlights:[]){
  if(!row||!validRepoName(row.name)||!cats.has(row.genre)||familyOf(row.genre)!=='software'||!present.has(row.name.toLowerCase()))continue;
  const key=row.name.toLowerCase();if(featuredSeen.has(key))continue;featuredSeen.add(key);
  featured.push({name:row.name,genre:row.genre,genreName:cats.get(row.genre),family:'software',summary:String(row.summary||'').slice(0,210),language:String(row.language||'').slice(0,32),stars:Number.isSafeInteger(row.stars)&&row.stars>=0?row.stars:null,license:typeof row.license==='string'&&row.license!=='NOASSERTION'?row.license:null,snapshotOn:row.snapshotOn||null});
 }
 return {categories:[...cats].map(([id,name])=>({id,name,family:familyOf(id)})),items,featured,queries:Array.isArray(data.searches)?data.searches.filter(x=>x.ok).length:0,updated:data.compiledOn||null};
}
export function balanceGenres(items){
 const buckets=new Map();for(const item of items){if(!buckets.has(item.genre))buckets.set(item.genre,[]);buckets.get(item.genre).push(item)}
 const out=[];let reading=true;while(reading){reading=false;for(const b of buckets.values())if(b.length){out.push(b.shift());reading=true}}
 return out;
}
export function filterCatalog(items,{query='',genre='all',family='all',savedOnly=false,bookmarks=new Set(),sort='balanced'}={}){
 const words=String(query).toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
 const allowed=items.filter(x=>(family==='all'||(x.family||familyOf(x.genre))===family)&&(genre==='all'||x.genre===genre)&&(!savedOnly||bookmarks.has(x.name.toLowerCase()))&&words.every(w=>(x.name+' '+x.genreName).toLocaleLowerCase().includes(w)));
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
 return {total:items.length,genreCount:Object.keys(by).length,saved:items.filter(x=>bookmarks.has(x.name.toLowerCase())).length,byGenre:by,byFamily:{game:items.filter(x=>(x.family||familyOf(x.genre))==='game').length,software:items.filter(x=>(x.family||familyOf(x.genre))==='software').length}};
}

// One independent application/tool per category in the first row; no favorites are owned by ATLAS.
export function chooseHighlights(featured,{family='software',genre='all',query='',limit=6}={}){
 const q=String(query).toLocaleLowerCase().trim(),groups=new Map();
 for(const item of Array.isArray(featured)?featured:[]){
  if((family!=='all'&&item.family!==family)||(genre!=='all'&&item.genre!==genre))continue;
  if(q&&!(item.name+' '+item.summary+' '+item.genreName).toLocaleLowerCase().includes(q))continue;
  if(!groups.has(item.genre))groups.set(item.genre,[]);groups.get(item.genre).push(item);
 }
 const out=[],cap=Math.max(0,Math.min(60,Number(limit)||0));
 while(out.length<cap){let advanced=false;for(const bucket of groups.values()){
  if(bucket.length&&out.length<cap){out.push(bucket.shift());advanced=true;}
 }if(!advanced)break;}
 return out;
}
