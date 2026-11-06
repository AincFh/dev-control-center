import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {deploymentVersion,versionModuleImports,fingerprintDist} from '../scripts/asset-version.mjs';

test('fingerprint uses commit+workflow run and rejects unsafe URL characters',()=>{
 assert.equal(deploymentVersion({sha:'0123456789abcdef',runId:'123456'}),'0123456789ab-123456');
 assert.equal(deploymentVersion(), 'local');
 assert.throws(()=>deploymentVersion({sha:'bad?',runId:'123'}),/Invalid/);
});
test('all static ES module import forms receive the same URL version',()=>{
 const x=[
  "import {foo} from './core.js';",
  "export {bar} from '../lib/shared.js';",
  "import './init.js';",
  "const z = './literal.js';"
 ].join('\n');
 const result=versionModuleImports(x,'commit-42');
 assert.match(result,/from '\.\/core\.js\?v=commit-42'/);
 assert.match(result,/from '\.\.\/lib\/shared\.js\?v=commit-42'/);
 assert.match(result,/import '\.\/init\.js\?v=commit-42'/);
 assert.ok(result.includes("const z = './literal.js';"),'ordinary string literals must not be rewritten');
});
test('fingerprintDist stamps output without needing live GitHub access',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'atlas-static-'));
 try{
  await writeFile(path.join(root,'index.html'),'<link href="./atlas-v3.css" rel="stylesheet"><script type="module" src="./app.js"></script>');
  await writeFile(path.join(root,'app.js'),"import {foo} from './arcade.js';\nimport './core.js';");
  await writeFile(path.join(root,'arcade.js'),'export const foo = 12;');
  await writeFile(path.join(root,'core.js'),'export const core=1;');
  await writeFile(path.join(root,'atlas-v3.css'),'body{color:#333}');
  const version='abc123-221';
  await fingerprintDist(root,['index.html','atlas-v3.css','app.js','arcade.js','core.js'],version);
  const html=await readFile(path.join(root,'index.html'),'utf8');
  const app=await readFile(path.join(root,'app.js'),'utf8');
  const info=JSON.parse(await readFile(path.join(root,'data','build.json'),'utf8'));
  assert.ok(html.includes('src="./app.js?v='+version+'"'));
  assert.ok(html.includes('href="./atlas-v3.css?v='+version+'"'));
  assert.ok(app.includes("from './arcade.js?v="+version+"'"));
  assert.ok(app.includes("import './core.js?v="+version+"'"));
  assert.equal(info.fingerprint,version);
  assert.equal(await readFile(path.join(root,'arcade.js'),'utf8'),'export const foo = 12;');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('fingerprints additional linked stylesheets and refuses missing bundled CSS',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'atlas-styles-'));
 try{
  await writeFile(path.join(dir,'index.html'),'<link href="./atlas-v3.css" rel="stylesheet"><link href="./workboard.css" rel="stylesheet"><link href="./release-review.css" rel="stylesheet"><script type="module" src="./app.js"></script>');
  for(const name of ['app.js','arcade.js','atlas-v3.css','workboard.css','release-review.css'])
   await writeFile(path.join(dir,name),'export const ok=1;');
  const files=['index.html','app.js','arcade.js','atlas-v3.css','workboard.css','release-review.css'];
  await fingerprintDist(dir,files,'sha-456');
  const html=await readFile(path.join(dir,'index.html'),'utf8');
  assert.ok(html.includes('href="./release-review.css?v=sha-456"'));
  assert.ok(html.includes('href="./workboard.css?v=sha-456"'));
  await assert.rejects(()=>fingerprintDist(dir,files.filter(x=>x!=='release-review.css'),'next'),/Missing linked stylesheet/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('refuse builds without the actual complete game module',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'atlas-missing-'));
 try{
  await assert.rejects(()=>fingerprintDist(root,['app.js'], 'x'),/Missing/);
 }finally{await rm(root,{recursive:true,force:true});}
});
