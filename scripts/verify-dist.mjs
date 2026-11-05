import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
const entrypoints=['index.html','style.css','app.js','favicon.svg','arcade.js'];
for(const file of entrypoints){
 assert(existsSync(path.join(root,file)),'Published site is missing required asset: '+file);
}
const pending=['app.js'],seen=new Set();
while(pending.length){
 const file=pending.shift();
 if(seen.has(file))continue;
 const full=path.resolve(root,file);
 assert(full.startsWith(root+path.sep),'Runtime import escaped dist root: '+file);
 assert(existsSync(full),'Missing browser ES module: '+file);
 seen.add(file);
 const src=readFileSync(full,'utf8');
 for(const hit of src.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]((?:\.\/|\.\.\/)[^'"]+)['"]/g)){
  const target=path.posix.normalize(path.posix.join(path.posix.dirname(file),hit[1]));
  assert(!target.startsWith('../'),'Invalid import outside publishing root: '+hit[1]);
  pending.push(target);
 }
}
assert(seen.has('arcade.js'),'The game hall must be included in the Pages artifact');
console.log('Validated published ES dependency graph:',[...seen].join(', '));
