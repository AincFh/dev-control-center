import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseAssetKind,normalizeGitHubRelease,nativeArtifactProof} from '../native-release-core.js';
import {reviewRepository,releaseReviewMarkdown,reviewPortfolio} from '../release-review-core.js';
const NOW=Date.parse('2026-11-06T10:00:00Z'),stamp='2026-11-06T09:00:00Z';
const release=(assets,change={})=>({draft:false,prerelease:false,tag_name:'v1.3.0',
 published_at:stamp,assets:assets.map(([name,size=4096,state='uploaded'])=>({name,size,state})),...change});
const normal=(r,repo='QingJi')=>normalizeGitHubRelease(r,repo);
test('recognize real uploaded platform binaries, never source archives',()=>{
 assert.equal(releaseAssetKind('QingJi-v1.3.0.APK'),'apk');
 assert.equal(releaseAssetKind('setup.MSIXBUNDLE'),'msixbundle');
 assert.equal(releaseAssetKind('launcher.AppImage'),'appimage');
 assert.equal(releaseAssetKind('source.zip'),null);
 assert.equal(releaseAssetKind('.exe.bak'),null);
 const x=normal(release([['QingJi.apk'],['source.zip'],['debug.apk',0],['duplicate.apk',2048,'starter'],['release.AAB']]));
 assert.equal(x.state,'artifact');
 assert.deepEqual(x.assetTypes,['apk','aab']);
 assert.equal(x.assetCount,2);
 assert.equal(x.url,'https://github.com/AincFh/QingJi/releases/tag/v1.3.0');
});
test('draft/prerelease/tag-only and malformed metadata are not published release evidence',()=>{
 assert.equal(normal(release([['a.apk']],{draft:true})).state,'unknown');
 assert.equal(normal(release([['a.apk']],{prerelease:true})).state,'unknown');
 assert.equal(normal(release([],{})).state,'tag_only');
 assert.equal(normal(release([['source.zip']])).state,'tag_only');
 assert.equal(normal(release([['app.apk']],{tag_name:'evil?script'})).state,'unknown');
 assert.equal(normal(release([['app.apk']],{published_at:'bad date'})).state,'unknown');
 assert.equal(normal(release([['app.apk']]),'malicious/path').state,'unknown');
});
test('mobile/system/desktop native binary gates are platform aware',()=>{
 const apk=normal(release([['qingji.apk'],['qingji.exe']]));
 assert.deepEqual(nativeArtifactProof(apk,'mobile'),{verified:true,kinds:['apk']});
 const desktop=normal(release([['setup.exe'],['installer.msi']]),'toolbox');
 assert.deepEqual(nativeArtifactProof(desktop,'tool'),{verified:true,kinds:['exe','msi']});
 assert.equal(nativeArtifactProof(normal(release([['win.exe']])),'mobile').verified,false);
 assert.equal(nativeArtifactProof(normal(release([['phone.apk']])),'system').verified,false);
 assert.equal(nativeArtifactProof(normal(release([['system.iso']])),'system').verified,true);
 assert.equal(nativeArtifactProof({state:'artifact',assetCount:0,assetTypes:['apk']},'mobile').verified,false);
});
test('release artifact grants file-existence evidence, never runtime or human release approval',()=>{
 const snapshot={generatedAt:stamp};
 const p={name:'QingJi',label:'QingJi',category:'mobile',
  ci:{state:'success'},release:normal(release([['QingJi-v1.3.0.apk']]))};
 const a=reviewRepository(p,{generatedAt:stamp,now:NOW});
 assert.equal(a.steps.find(x=>x.key==='ship').status,'pass');
 assert.equal(a.steps.find(x=>x.key==='run').status,'unknown');
 assert.equal(a.steps.find(x=>x.key==='manual').status,'unknown');
 assert.equal(a.state,'evidence');
 assert.deepEqual(a.releaseKinds,['apk']);
 assert.match(a.next,/签名/);
 const report=releaseReviewMarkdown(reviewPortfolio([p],snapshot,NOW));
 assert.match(report,/GitHub Release：v1\.3\.0/);
 assert.match(report,/签名及安装未核验/);
 const stale=reviewRepository(p,{generatedAt:'2026-10-30T00:00:00Z',now:NOW});
 assert.equal(stale.steps.find(x=>x.key==='ship').status,'unknown');
});
