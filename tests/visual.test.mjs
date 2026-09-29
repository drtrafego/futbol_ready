import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {ART,worldToArt,artToWorld,sceneLayout,SCENE_ROWS} from '../src/scene.js';
import {CFG} from '../src/config.js';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
test('projection is reversible across the original simulation bounds',()=>{
 for(let z=-12;z<=17;z+=.37)for(let x=-14;x<=14;x+=.8){const p=worldToArt(x,z),q=artToWorld(p.x,p.y);assert.ok(Math.abs(q.x-x)<1e-9);assert.ok(Math.abs(q.z-z)<1e-9);}
});
test('all service zones retain invertible art coordinates',()=>{
 for(const p of [CFG.supply,CFG.cash,CFG.gate,CFG.office,...CFG.fields.map(f=>f.intake)]){const a=worldToArt(p.x,p.z),b=artToWorld(a.x,a.y);assert.ok(Math.hypot(b.x-p.x,b.z-p.z)<1e-9);}
});
test('calibration rows never fold the image vertically',()=>{for(let i=1;i<SCENE_ROWS.length;i++){assert.ok(SCENE_ROWS[i][0]>SCENE_ROWS[i-1][0]);assert.ok(SCENE_ROWS[i][1]>SCENE_ROWS[i-1][1]);}});
test('portrait and landscape layouts reserve space for controls',()=>{for(const [w,h]of [[320,568],[390,844],[844,390],[768,1024],[1536,960]]){const l=sceneLayout(w,h),v=l.viewport;assert.ok(v.w>0&&v.h>0);assert.ok(v.x>=0&&v.y>=0);assert.ok(v.x+v.w<=w);assert.ok(v.y+v.h<=h);}});
test('master artwork assets have expected PNG signature and size',async()=>{
 for(const name of ['arena-cenario','arena-mapa','referencia-aprovada']){const b=await readFile(new URL('assets/'+name+'.png',root));assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(b.readUInt32BE(16),ART.width);assert.equal(b.readUInt32BE(20),ART.height);}
});
test('all moving character sprites are present with RGBA pixels',async()=>{
 for(const name of ['gerente','roupeiro','torcedor-verde','torcedor-roxo','torcedor-dourado']){const b=await readFile(new URL('assets/'+name+'.png',root));assert.equal(b.readUInt32BE(16),33);assert.equal(b.readUInt32BE(20),53);assert.equal(b[25],6);}
});
test('Vercel configuration builds the same static project without APIs',async()=>{const v=JSON.parse(await read('vercel.json'));assert.equal(v.outputDirectory,'dist');assert.equal(v.buildCommand,'npm run build');assert.equal(v.framework,null);assert.equal(v.functions,undefined);});
test('HTML references new visual stylesheet and live controls',async()=>{const h=await read('index.html');for(const s of ['visual.css','id="wallet"','wallet-upgrades','travel-dock','id="game"'])assert.ok(h.includes(s));assert.match(h,/<title>Arena de Bairro/);});
