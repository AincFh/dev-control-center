import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';

const root=path.resolve('dist');
const entrypoints=['index.html','atlas-v3.css','style.css','app.js','favicon.svg','arcade.js','data/status.json','data/build.json','data/github-universe.json','data/game-runtime.json','api-lab.css','universe.js','universe-core.js','studio-motion.js','mission.js','mission-core.js','command.js','command-core.js','trace.js','trace-core.js','site-probe-core.js'];
for(const file of entrypoints)assert(existsSync(path.join(root,file)),'Published site is missing: '+file);

const meta=JSON.parse(readFileSync(path.join(root,'data/build.json'),'utf8'));
const version=meta.fingerprint;
assert.match(version,/^[a-zA-Z0-9_-]{1,56}$/,'Missing valid release fingerprint');

const html=readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('href="./atlas-v3.css?v='+version+'"'),'CSS link missing release version');
assert(html.includes('src="./app.js?v='+version+'"'),'Entrypoint missing release version');

const pending=['app.js'],seen=new Set();
while(pending.length){
 const file=pending.shift();
 if(seen.has(file))continue;
 const full=path.resolve(root,file);
 assert(full.startsWith(root+path.sep),'Runtime import escaped dist root: '+file);
 assert(existsSync(full),'Missing runtime ES module in dist: '+file);
 seen.add(file);
 const source=readFileSync(full,'utf8');
 for(const hit of source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]((?:\.\/|\.\.\/)[^'"]+\.js)(?:\?v=([a-zA-Z0-9_-]+))?['"]/g)){
  const target=path.posix.normalize(path.posix.join(path.posix.dirname(file),hit[1]));
  assert(!target.startsWith('../')&&!target.startsWith('/'),'Invalid import outside publishing root: '+hit[1]);
  assert.equal(hit[2],version,'Stale or unversioned browser import in '+file+': '+hit[1]);
  pending.push(target);
 }
}
assert(seen.has('arcade.js'),'The game hall must be included in Pages artifact');
assert(seen.has('universe.js')&&seen.has('universe-core.js'),'The external universe must be bundled with the application');
assert(seen.has('mission.js')&&seen.has('mission-core.js'),'Mission Control and its domain module must be bundled');
assert(seen.has('command.js')&&seen.has('command-core.js'),'Global command-search modules must be bundled');
assert(seen.has('trace.js')&&seen.has('trace-core.js'),'Delivery trace modules must be bundled');
assert(seen.has('site-probe-core.js'),'Public static asset probe module must be bundled');
assert(seen.has('blueprint-execution-core.js'),'Research-to-execution bridge must be bundled');
assert(seen.has('api-lab.js')&&seen.has('api-lab-core.js'),'Public API inspector modules must be bundled');
assert(seen.has('game-runtime-core.js')&&seen.has('game-runtime-ui.js'),'Real Chromium gameplay evidence modules must be bundled');
const universe=JSON.parse(readFileSync(path.join(root,'data/github-universe.json'),'utf8'));
assert.equal(universe.kind,'external-discovery');assert(universe.rows.length>=1000,'External reference catalog must contain at least 1000 real repo names');
const qa=JSON.parse(readFileSync(path.join(root,'data/game-runtime.json'),'utf8'));
assert.equal(qa.schemaVersion,1,'Invalid real-game QA report schema');
assert.equal(qa.owner,'AincFh','Invalid real-game QA repository attribution');
console.log('Validated published ES graph with fingerprint '+version+':',[...seen].join(', '));
