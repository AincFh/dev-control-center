import test from 'node:test';
import assert from 'node:assert/strict';
import {GAMES,GAME_GENRES,filterGames,sortGames,playableGame,statusText,arcadeStats} from '../arcade.js';
test('game hub holds distinct, independently named real repositories',()=>{
 assert.ok(GAMES.length>=8);
 assert.equal(new Set(GAMES.map(g=>g.id)).size,GAMES.length);
 assert.ok(new Set(GAMES.map(g=>g.repo)).size>=8);
});
test('only known deployed entries display working-owned Pages links',()=>{
 const allowed=['playable','prototype'];
 for(const game of GAMES){
  assert.ok(GAME_GENRES.some(g=>g.id===game.genre));
  assert.ok(game.source==='original'||game.source==='fork');
  assert.ok(game.summary.length>14);
  if(playableGame(game)){
   assert.ok(allowed.includes(game.status));
   assert.match(game.play,/^https:\/\/aincfh\.github\.io\/[\w-]+\/(?:next\/)?$/);
  }else{
   assert.equal(game.play,null,'blocked/unverified cannot accidentally render fake play link');
  }
 }
});
test('search, filter and status control work independently',()=>{
 assert.ok(filterGames(GAMES,'餐馆','management').some(g=>g.repo==='cozy-bistro-sim'));
 assert.ok(filterGames(GAMES,'种田','life').some(g=>g.repo==='paradise-isle'));
 assert.equal(filterGames(GAMES,'','builder','playable').length,2);
 assert.ok(filterGames(GAMES,'','all','playable').every(playableGame));
 assert.ok(filterGames(GAMES,'','all','fork').every(g=>g.source==='fork'));
});
test('favorites get priority without mutating source manifest',()=>{
 const snapshot=GAMES.map(x=>x.id);
 const sorted=sortGames(GAMES,['qube','bistro']);
 assert.ok(['qube','bistro'].includes(sorted[0].id));
 assert.ok(['qube','bistro'].includes(sorted[1].id));
 assert.deepEqual(GAMES.map(x=>x.id),snapshot);
});
test('blocked games cannot inherit success from unrelated CI',()=>{
 const x=GAMES.find(x=>x.repo==='qubecraft');
 assert.equal(x.status,'playable');
 assert.equal(playableGame(x),true);
 assert.equal(statusText(x.status),'可玩 · 开发中');
 const metrics=arcadeStats();
 assert.equal(metrics.total,GAMES.length);
 assert.equal(metrics.playable,9);
 assert.equal(metrics.total,11);
 assert.ok(metrics.blocked>=1);
 for(const repo of ['Midnight-Factory','Tamagochi---Open-Source-Game','cimulity','City-of-Small-Chances','qubecraft']) assert.ok(playableGame(GAMES.find(g=>g.repo===repo)));
 assert.equal(GAMES.find(g=>g.repo==='spacefortress').play,null,'space colony must stay unverified until deployment');
});
