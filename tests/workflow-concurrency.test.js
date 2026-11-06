import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('PR superseded checks may cancel while main Pages deployments are serialized',()=>{
 const deploy=readFileSync('.github/workflows/deploy.yml','utf8');
 assert.match(deploy,/group: atlas-pages-\$\{\{ github\.ref \}\}/);
 assert.match(deploy,/cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
 assert.doesNotMatch(deploy,/(?:^|\n)\s+cancel-in-progress: true/);
 assert.match(deploy,/on:\n\s+push:\n\s+branches: \[main\]/);
 assert.match(deploy,/schedule:/);
 assert.match(deploy,/needs: verify/);
 assert.match(deploy,/actions\/deploy-pages@v4/);
});
test('release deployment remains gated behind tests and is not attempted for PRs',()=>{
 const deploy=readFileSync('.github/workflows/deploy.yml','utf8');
 const start=deploy.indexOf('\n  deploy:');
 assert.ok(start>0,'deployment job is present');
 assert.match(deploy.slice(start),/if: github\.event_name != 'pull_request'/);
 assert.match(deploy,/run: npm test/);
 assert.match(deploy,/node scripts\/verify-dist\.mjs/);
});