// Public GitHub Releases metadata: a visible release asset does NOT prove
// signature validity, installability, safe downloads or successful device QA.
const TYPES=Object.freeze([
 ['.appimage','appimage'],['.msixbundle','msixbundle'],['.msix','msix'],
 ['.exe','exe'],['.msi','msi'],['.dmg','dmg'],['.pkg','pkg'],
 ['.apk','apk'],['.aab','aab'],['.ipa','ipa'],
 ['.deb','deb'],['.rpm','rpm'],['.flatpak','flatpak'],['.snap','snap'],['.iso','iso']
]);
const VALID_REPO=/^[A-Za-z0-9_.-]{1,100}$/;
const VALID_TAG=/^[A-Za-z0-9._/@+-]{1,120}$/;
export const ARTIFACT_KINDS=Object.freeze(TYPES.map(([,type])=>type));
export function releaseAssetKind(name){
 if(typeof name!=='string'||name.length>255)return null;
 const safe=name.toLowerCase();
 return TYPES.find(([ext])=>safe.endsWith(ext))?.[1]||null;
}
export function normalizeGitHubRelease(raw,repo){
 const empty={state:'unknown',tag:null,publishedAt:null,assetTypes:[],assetCount:0,url:null};
 if(!VALID_REPO.test(repo)||!raw||raw.draft!==false||raw.prerelease!==false)return empty;
 const tag=typeof raw.tag_name==='string'&&VALID_TAG.test(raw.tag_name)?raw.tag_name:null;
 const published=typeof raw.published_at==='string'&&Number.isFinite(Date.parse(raw.published_at))?raw.published_at:null;
 if(!tag||!published)return empty;
 const assetTypes=[],seen=new Set();
 let assetCount=0;
 for(const asset of Array.isArray(raw.assets)?raw.assets:[]){
  if(!asset||asset.state!=='uploaded'||!Number.isFinite(asset.size)||asset.size<=0)continue;
  const kind=releaseAssetKind(asset.name);
  if(!kind)continue;
  assetCount++;
  if(!seen.has(kind)){assetTypes.push(kind);seen.add(kind);}
 }
 return{state:assetCount?'artifact':'tag_only',tag,publishedAt:published,assetTypes,assetCount,
  url:'https://github.com/AincFh/'+encodeURIComponent(repo)+'/releases/tag/'+encodeURIComponent(tag)};
}
export function nativeArtifactProof(release,category){
 if(release?.state!=='artifact'||!Number.isInteger(release.assetCount)||release.assetCount<=0||!Array.isArray(release.assetTypes))
  return{verified:false,kinds:[]};
 const acceptable=category==='mobile'?new Set(['apk','aab','ipa'])
  :category==='system'?new Set(['iso','appimage','deb','rpm','exe','msi','msix'])
  :new Set(['appimage','msixbundle','msix','exe','msi','dmg','pkg','deb','rpm','flatpak','snap']);
 const kinds=[...new Set(release.assetTypes.filter(x=>typeof x==='string'&&acceptable.has(x)))];
 return{verified:kinds.length>0,kinds};
}