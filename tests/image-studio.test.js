import test from'node:test';import assert from'node:assert/strict';
import{IMAGE_LIMITS,IMAGE_FORMATS,FIT_MODES,ROTATIONS,validateImageFile,planImageOutput,recommendedDimensions,proportionalDimension,imageReport}from'../image-studio-core.js';
test('image formats and privacy limits are explicit',()=>{
 assert.deepEqual(Object.keys(IMAGE_FORMATS),['png','jpeg','webp']);
 assert.deepEqual(FIT_MODES,['contain','cover','stretch']);
 assert.deepEqual(ROTATIONS,[0,90,180,270]);
 assert.equal(IMAGE_LIMITS.maxSide,4096);
});
test('file validation blocks GIF, unknown types and oversized input',()=>{
 assert.equal(validateImageFile({name:'portrait.png',size:100,type:'image/png'}).type,'image/png');
 for(const file of [{name:'a.gif',size:20,type:'image/gif'},{name:'evil.svg',size:30,type:'image/svg+xml'},{name:'huge.webp',size:IMAGE_LIMITS.maxBytes+1,type:'image/webp'}])
  assert.throws(()=>validateImageFile(file));
});
test('contain and cover perform geometrically correct aspect-fit math',()=>{
 const a=planImageOutput(800,400,{width:200,height:200,fit:'contain'});
 const b=planImageOutput(800,400,{width:200,height:200,fit:'cover'});
 const c=planImageOutput(800,400,{width:200,height:200,fit:'stretch'});
 assert.deepEqual([a.drawW,a.drawH],[200,100]);
 assert.deepEqual([b.drawW,b.drawH],[400,200]);
 assert.deepEqual([c.drawW,c.drawH],[200,200]);
 assert.deepEqual([a.drawX,a.drawY],[-100,-50]);
});
test('90-degree output correctly swaps the local image drawing area',()=>{
 const p=planImageOutput(800,400,{width:400,height:800,rotation:90});
 assert.equal(p.areaW,800);assert.equal(p.areaH,400);
 assert.equal(p.drawW,800);assert.equal(p.drawH,400);
 assert.equal(p.mime,'image/png');
});
test('resizing respects 4096px and 12-million-pixel browser bounds',()=>{
 const p=recommendedDimensions(12000,9000);
 assert.ok(p.width<=4096&&p.height<=4096);
 assert.ok(p.width*p.height<=12_000_000);
 assert.deepEqual(recommendedDimensions(300,120,{rotation:90}),{width:120,height:300});
 assert.equal(proportionalDimension(1600,900,800),450);
 assert.equal(proportionalDimension(1600,900,450,{basis:'height'}),800);
});
test('dimensions, rotation, unsupported formats and unsafe colors fail closed',()=>{
 for(const spec of [{width:5000,height:8},{width:4096,height:4096},{width:300,height:300,rotation:45},{width:100,height:100,format:'gif'},{width:100,height:100,background:'url(javascript:bad)'},{width:100,height:100,quality:0}]){
  assert.throws(()=>planImageOutput(100,100,spec));
 }
});
test('export size report reflects actual compressed file, including growth',()=>{
 const smaller=imageReport({originalBytes:1000,exportBytes:600,width:100,height:100,format:'webp'});
 assert.equal(smaller.changePercent,40);
 assert.match(smaller.description,/减少 40\.0%/);
 const larger=imageReport({originalBytes:1000,exportBytes:1500,width:100,height:100,format:'png'});
 assert.equal(larger.changePercent,-50);
 assert.match(larger.description,/增加 50\.0%/);
});
