import { Renderer } from './render.js';
import { CFG } from './config.js';
import { FACILITIES, facilityStage } from './facilities.js';
import { WORLD_PLOTS, WORLD_STRUCTURES, TRAINING_KIT_LIMIT, ensureWorld, structureRect, structureEntry, mapPlacementCheck, worldPath } from './world-model.js';
import { worldToArt } from './scene.js';
import { fieldFans, seatCapacity } from './simulation.js';

const worldRand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const worldPoly=(c,points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
function worldText(c,x,y,text,size=15,color='#f8f2d7',align='center'){c.fillStyle=color;c.font=`750 ${size}px system-ui`;c.textAlign=align;c.textBaseline='middle';c.fillText(text,x,y);}
function worldRound(c,x,y,w,h,color,r=8){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function worldLine(c,points,width,color){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
function drawCrate(c,x,y,s=14,col='#c89a46',topCol='#deb868',sideCol='#a87a2a'){
 worldPoly(c,[[x,y],[x+s*.7,y-s*.35],[x+s*.7,y+s*.4],[x,y+s*.75]],sideCol);
 worldPoly(c,[[x,y],[x-s*.7,y-s*.35],[x-s*.7,y+s*.4],[x,y+s*.75]],col);
 worldPoly(c,[[x,y],[x-s*.7,y-s*.35],[x,y-s*.7],[x+s*.7,y-s*.35]],topCol);
 c.strokeStyle='#583e16';c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x,y+s*.75);c.moveTo(x,y);c.lineTo(x-s*.7,y-s*.35);c.moveTo(x,y);c.lineTo(x+s*.7,y-s*.35);c.stroke();
}
function drawTrophy(c,x,y,scale=1){
 c.save();c.translate(x,y);c.scale(scale,scale);
 worldRound(c,-10,0,20,8,'#363126',2);worldRound(c,-6,-6,12,6,'#c69f37',1);
 c.fillStyle='#f5d14e';c.beginPath();c.moveTo(-11,-24);c.quadraticCurveTo(-11,-10,0,-8);c.quadraticCurveTo(11,-10,11,-24);c.closePath();c.fill();
 c.strokeStyle='#c69f37';c.lineWidth=2;c.beginPath();c.arc(-13,-18,5,Math.PI*.5,Math.PI*1.5);c.stroke();c.beginPath();c.arc(13,-18,5,Math.PI*1.5,Math.PI*.5);c.stroke();
 worldRound(c,-12,-26,24,4,'#ffe36c',2);c.restore();
}
function drawLamppost(c,x,y){
 c.fillStyle='#1c2b24';c.fillRect(x-2,y-40,4,40);
 c.beginPath();c.arc(x,y-40,4,0,Math.PI*2);c.fill();
 c.beginPath();c.arc(x+6,y-44,3,0,Math.PI*2);c.fill();
 c.fillStyle='#ffee99';c.beginPath();c.arc(x+6,y-42,2.5,0,Math.PI*2);c.fill();
 const g=c.createRadialGradient(x+6,y,0,x+6,y,22);
 g.addColorStop(0,'#fff2a828');g.addColorStop(1,'#fff2a800');
 c.fillStyle=g;c.beginPath();c.ellipse(x+6,y,22,11,0,0,Math.PI*2);c.fill();
}


/** A single moving camera renders the inherited arena AND neighbouring plots.
 * There is no campus page. Buildings/works are individually rendered entities. */
export class WorldRenderer extends Renderer{
 constructor(canvas){
  super(canvas);this.mapCamera={x:780,y:480,zoom:.8,follow:false};this.selection=null;this.placement=null;this.hover=null;this.district='world';this.mapInitialized=false;this.simCityMode=true;
 }
 resize(){super.resize();this.mapInitialized=false;}
 screenAxisToWorld(x,y){const n=Math.max(1,Math.hypot(x,y));return{x:x/n,z:y/n};}
 unproject(x,y){return{x:(x-this.ox)/this.scale,y:(y-this.oy)/this.scale};}
 pan(dx,dy){this.mapCamera.follow=false;this.mapCamera.x-=dx/this.scale;this.mapCamera.y-=dy/this.scale;this.clampCamera();}
 clampCamera(){this.mapCamera.x=Math.max(-1120,Math.min(2640,this.mapCamera.x));this.mapCamera.y=Math.max(-1080,Math.min(1120,this.mapCamera.y));}
 zoomAt(factor,sx=this.width/2,sy=this.height/2){const before=this.unproject(sx,sy),old=this.mapCamera.zoom;this.mapCamera.zoom=Math.max(.22,Math.min(1.6,old*factor));this.mapCamera.follow=false;this.mapCamera.x=before.x-(sx-this.width/2)/this.mapCamera.zoom;this.mapCamera.y=before.y-(sy-this.height/2)/this.mapCamera.zoom;this.clampCamera();}
 focus(area,s,select=true){
  ensureWorld(s);let p;
  if(area==='club'||area==='all'){p={x:768,y:200};this.mapCamera.zoom=Math.max(.32,Math.min(1.0,(this.width-60)/2600));}
  else if(area==='arena'){p={x:780,y:460};this.mapCamera.zoom=Math.min(1.0,Math.max(.45,(this.width-40)/1900));}
  else{const plot=WORLD_PLOTS.find(p=>p.id===area),spec=WORLD_STRUCTURES[area];p=s.map.placements[area]||spec||(plot?{x:plot.x+plot.w/2,y:plot.y+plot.h/2}:null);if(!p)return;
   this.mapCamera.zoom=Math.min(1.1,Math.max(.45,(this.width-(this.width>800?380:0))/(area==='stadium'?1120:850)));if(select)this.selection=plot&&!s.land[plot.id]?{kind:'plot',id:area}:spec?{kind:'building',id:area}:{kind:'plot',id:area};}
  this.mapCamera.x=p.x+(this.width>900&&select&&area!=='club'&&area!=='arena'?130:0);this.mapCamera.y=p.y+30;this.mapCamera.follow=false;this.mapInitialized=true;
 }
 follow(s){this.mapCamera.follow=!this.mapCamera.follow;if(this.mapCamera.follow){this.mapCamera.zoom=Math.max(.65,this.mapCamera.zoom);this.mapCamera.x=s.map.actor.x;this.mapCamera.y=s.map.actor.y;}return this.mapCamera.follow;}
 clickPosition(x,y){
  if(this.miniRect&&x>=this.miniRect.x&&x<this.miniRect.x+this.miniRect.w&&y>=this.miniRect.y&&y<this.miniRect.y+this.miniRect.h){const z=this.miniRect;this.mapCamera.x=-960+(x-z.x)/z.w*3456;this.mapCamera.y=-896+(y-z.y)/z.h*1856;this.mapCamera.follow=false;return{zone:'minimap'};}
  const p=this.unproject(x,y);if(this.placement)return{zone:'place',point:this.snapped(p)};
  for(const h of [...this.hitZones].reverse())if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h)return{zone:'world-select',kind:h.kind,id:h.key,point:p};
  return{zone:'walk',point:p};
 }
 snapped(p){return{x:Math.round(p.x/32)*32,y:Math.round(p.y/32)*32};}
 draw(s,dt){
  if(!this.loaded)return;ensureWorld(s);
  if(!this.mapInitialized){this.focus('arena',s,false);this.mapInitialized=true;}
  const c=this.ctx,cam=this.mapCamera;
  if(cam.follow){const k=1-Math.exp(-dt*6);cam.x+=(s.map.actor.x-cam.x)*k;cam.y+=(s.map.actor.y-50-cam.y)*k;}
  this.scale=cam.zoom;this.ox=this.width/2-cam.x*this.scale;this.oy=this.height/2-cam.y*this.scale;this.hitZones=[];
  document.body.dataset.district='world';document.body.dataset.camera='world';
  c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#244c3a';c.fillRect(0,0,this.width,this.height);
  c.save();c.translate(this.ox,this.oy);c.scale(this.scale,this.scale);
  this.drawTerrain(s);
  this.drawRoads(s);
  this.drawHome(s,dt);
  this.drawPortals(s);
  const sorted=Object.entries(s.map.placements).filter(([id])=>!WORLD_STRUCTURES[id].fixed).sort((a,b)=>a[1].y-b[1].y);
  for(const[id,p]of sorted)this.drawStructure(s,id,p);
  // A canteen is a new independent object even though the main arena is painted.
  if(s.map.placements.canteen)this.drawStructure(s,'canteen',s.map.placements.canteen);
  for(const job of s.map.construction)this.drawWork(s,job);
  this.drawActors(s);
  for(const plot of WORLD_PLOTS){if(plot.id!=='home'&&!s.land[plot.id])this.drawBoundary(s,plot);}
  if(this.selection?.kind==='building'){
   const id=this.selection.id,p=s.map.placements[id]||WORLD_STRUCTURES[id];if(p){const rect=structureRect(id,p);c.strokeStyle='#fff3a1';c.lineWidth=3/this.scale;c.setLineDash([8/this.scale,5/this.scale]);c.strokeRect(rect.x-15,rect.y-35,rect.w+30,rect.h+70);c.setLineDash([]);}
  }
  if(this.placement){const p=this.hover||WORLD_STRUCTURES[this.placement],rect=structureRect(this.placement,p),valid=mapPlacementCheck(s,this.placement,p,true).ok;c.fillStyle=valid?'#58d58c66':'#f0787866';c.fillRect(rect.x,rect.y,rect.w,rect.h);c.strokeStyle=valid?'#aaf5c4':'#ffc3b7';c.lineWidth=3;c.strokeRect(rect.x,rect.y,rect.w,rect.h);this.plate(rect.x,rect.y-43,rect.w,34,valid?'CLIQUE PARA CONFIRMAR A OBRA':'LOCAL BLOQUEADO',valid?'#eeffe8':'#ffcabf',14);}
  c.restore();this.drawMinimap(s);
 }
 drawHome(s,dt){
  if(!this.simCityMode){
   if(!this.homeLayer){const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=960;
    this.homeLayer=Object.assign(Object.create(Renderer.prototype),{canvas,ctx:canvas.getContext('2d'),width:1536,height:960,dpr:1,layout:{compact:false,portrait:false,viewport:{x:0,y:0,w:1536,h:960}},camera:{x:768,y:480},scale:1,initialized:false,overview:true,assets:this.assets,particles:[],hitZones:[],loaded:true,district:'arena',lowQuality:false,_offscreen:true,hidePlayer:true});
   }
   const h=this.homeLayer;h.particles=this.particles;h.lowQuality=this.lowQuality;h.draw(s,dt);this.particles=h.particles;
   this.ctx.drawImage(h.canvas,0,0,1536,960);
   for(const zone of h.hitZones){if(zone.id==='office')this.hot('operation','staff',zone.x,zone.y,zone.w,zone.h);else this.hot('travel',zone.id,zone.x,zone.y,zone.w,zone.h);}
   for(const id of ['pitch1','pitch2','stands']){const p=WORLD_STRUCTURES[id];if(id==='pitch2'&&!s.fields[1].unlocked)continue;this.hot('building',id,p.x-p.w/2,p.y-p.h/2,p.w,p.h);}
   return;
  }
  this.drawHomeSimCity(s,dt);
 }
 drawTeamBus(s,x,y){
  const c=this.ctx;c.save();c.translate(x,y);
  this.ellipse(2,8,44,16,'#12241d66');
  worldRound(c,-36,-12,72,24,'#194d38',5);
  worldRound(c,-32,-26,64,16,'#f5f8f6',4);
  worldRound(c,15,-24,13,11,'#5ca494',2);
  for(let w=0;w<3;w++){worldRound(c,-26+w*13,-24,9,11,'#478b7d',2);}
  for(const tx of[-20,18]){this.ellipse(tx,10,7,7,'#222222');this.ellipse(tx,10,3.5,3.5,'#999999');}
  c.fillStyle='#fff9b0';c.fillRect(33,-6,3,5);c.fillStyle='#ff4444';c.fillRect(-36,-6,2,5);
  worldRound(c,-8,-10,16,9,'#113626',2);worldText(c,0,-5,s.club.sigla||'AFC',6.5,'#ffe878');
  c.restore();
 }
 drawHomeSimCity(s,dt){
  const c=this.ctx;
  c.fillStyle='#4c7a38';c.fillRect(0,0,1536,960);
  for(let gx=0;gx<1536;gx+=128){c.strokeStyle='#426e2e25';c.lineWidth=1;c.beginPath();c.moveTo(gx,0);c.lineTo(gx,960);c.stroke();}
  for(let gy=0;gy<960;gy+=128){c.beginPath();c.moveTo(0,gy);c.lineTo(1536,gy);c.stroke();}

  worldRound(c,160,550,1140,170,'#d5cca8',10);
  worldRound(c,166,556,1128,158,'#e4dbc0',8);
  worldRound(c,620,680,180,280,'#d5cca8',8);
  worldRound(c,626,686,168,274,'#e4dbc0',6);
  worldRound(c,780,140,96,440,'#d5cca8',6);
  worldRound(c,786,146,84,428,'#e4dbc0',4);
  worldRound(c,420,188,376,236,'#cfc49f',8);
  worldRound(c,866,188,380,236,'#cfc49f',8);

  worldRound(c,50,670,126,120,'#333a38',8);
  c.strokeStyle='#ffffff66';c.lineWidth=2;
  for(let py=685;py<=770;py+=28){c.beginPath();c.moveTo(56,py);c.lineTo(105,py);c.stroke();}
  this.drawTeamBus(s,116,740);

  for(let x=190;x<1280;x+=80){
   if((x>410&&x<490)||(x>590&&x<810)||(x>840&&x<930))continue;
   worldRound(c,x,546,45,10,'#235432',4);
  }
  for(const [lx,ly] of [[200,560],[480,560],[610,700],[810,700],[1280,560],[776,340],[776,170]]){
   drawLamppost(c,lx,ly);
  }

  const f0=s.fields[0],p1=WORLD_STRUCTURES.pitch1,ox=p1.x-p1.w/2,oy=p1.y-p1.h/2;
  worldRound(c,ox-10,oy-10,p1.w+20,p1.h+20,'#224726',6);
  for(let i=0;i<10;i++){c.fillStyle=i%2===0?'#338c41':'#42a551';c.fillRect(ox+i*(p1.w/10),oy,(p1.w/10)+1,p1.h);}
  c.strokeStyle='#f8fbf0';c.lineWidth=2;
  c.strokeRect(ox+6,oy+6,p1.w-12,p1.h-12);
  c.beginPath();c.moveTo(p1.x,oy+6);c.lineTo(p1.x,oy+p1.h-6);c.stroke();
  c.beginPath();c.ellipse(p1.x,p1.y,28,20,0,0,Math.PI*2);c.stroke();
  this.ellipse(p1.x,p1.y,2.5,2.5,'#ffffff');
  c.strokeRect(ox+6,p1.y-38,48,76);c.strokeRect(ox+6,p1.y-18,18,36);
  c.strokeRect(ox+p1.w-54,p1.y-38,48,76);c.strokeRect(ox+p1.w-24,p1.y-18,18,36);
  for(const[cx,cy]of[[ox+6,oy+6],[ox+p1.w-6,oy+6],[ox+6,oy+p1.h-6],[ox+p1.w-6,oy+p1.h-6]]){
   c.fillStyle='#ffffff';c.fillRect(cx-1,cy-12,2,12);worldPoly(c,[[cx+1,cy-12],[cx+8,cy-8],[cx+1,cy-4]],'#ffd700');
  }
  worldRound(c,ox-6,p1.y-22,12,44,'#e6edf2',2);
  c.strokeStyle='#ffffff99';c.lineWidth=1;
  for(let n=1;n<5;n++){c.beginPath();c.moveTo(ox-6,p1.y-22+n*9);c.lineTo(ox+6,p1.y-22+n*9);c.stroke();}
  worldRound(c,ox+p1.w-6,p1.y-22,12,44,'#e6edf2',2);
  for(let n=1;n<5;n++){c.beginPath();c.moveTo(ox+p1.w-6,p1.y-22+n*9);c.lineTo(ox+p1.w+6,p1.y-22+n*9);c.stroke();}

  const sbX=p1.x-115,sbY=oy-42,sbW=230,sbH=32;
  c.fillStyle='#36473e';c.fillRect(p1.x-65,sbY+sbH,6,12);c.fillRect(p1.x+59,sbY+sbH,6,12);
  worldRound(c,sbX-3,sbY-3,sbW+6,sbH+6,'#0e261f',5);worldRound(c,sbX,sbY,sbW,sbH,'#153d32',4);
  c.strokeStyle='#398360';c.lineWidth=1.5;c.strokeRect(sbX,sbY,sbW,sbH);
  worldText(c,p1.x,sbY+11,`${s.club.sigla} (VOCÊ)  ${f0.score[0]} × ${f0.score[1]}  ADVERSÁRIO`,10,'#ffea88');
  const stText=f0.remaining>0?`${s.official?'OFICIAL':'AMISTOSO'} · ${Math.ceil(f0.remaining)}s`:f0.stock?'AGUARDANDO TORCIDA':'PRECISA DE KITS';
  worldText(c,p1.x,sbY+23,stText,8.5,'#e2f5cf');

  for(let n=0;n<6;n++){
   const ours=n<3,px=ox+45+(n%3)*((p1.w-90)/2)+Math.sin(s.t*1.2+n)*12,py=oy+42+Math.floor(n/3)*85+Math.cos(s.t+n)*9;
   this.actorSprite(px,py,ours?'atleta-azul.png':'atleta-laranja.png',30,s.t,f0.remaining>0);
  }
  if(f0.remaining>0){
   const bx=p1.x+Math.sin(s.t*2)*75,by=p1.y+Math.cos(s.t*2.4)*36;
   this.ellipse(bx+2,by+3,4.5,2.5,'#102e2144');this.ellipse(bx,by,4.5,4.5,'#ffffff');this.ellipse(bx,by,1.8,1.8,'#222222');
  }

  const in0={x:455,y:533},pulse0=Math.sin(s.t*3.2)*3;
  c.save();c.strokeStyle='#a8ffda';c.lineWidth=2.5;c.beginPath();c.ellipse(in0.x,in0.y,32+pulse0,16+pulse0*.5,0,0,Math.PI*2);c.stroke();c.fillStyle='#45d89833';c.fill();c.restore();
  this.plate(in0.x-55,in0.y-12,110,24,`PREPARAR · ${f0.stock} KITS`,'#e8fff5',10);
  this.hot('travel','field0',in0.x-55,in0.y-12,110,24);
  this.hot('building','pitch1',ox,oy,p1.w,p1.h);

  const stP=WORLD_STRUCTURES.stands,stX=stP.x-stP.w/2,stY=stP.y-22,stW=stP.w,stH=56;
  worldRound(c,stX-6,stY-6,stW+12,stH+12,'#928a70',6);
  for(let row=0;row<4;row++){
   const ry=stY+row*13;worldRound(c,stX,ry,stW,12,row%2===0?'#d2caa8':'#b9b194',2);
   const seats=18;
   for(let seat=0;seat<seats;seat++){
    const sx=stX+10+seat*((stW-20)/(seats-1));worldRound(c,sx-4,ry-2,8,8,(seat+row)%3===0?'#196752':'#f5d352',1);
   }
  }
  const cap=seatCapacity(s),seatedCount=Math.min(cap,fieldFans(s,0).length);
  for(let n=0;n<Math.min(18,seatedCount);n++){
   const row=Math.floor(n/6),sx=stX+16+(n%6)*((stW-32)/5),sy=stY+row*13+4;
   const bounce=(f0.lastGoalOurs&&s.t-f0.lastGoal<3)?Math.abs(Math.sin(s.t*12+n))*7:0;
   this.actorSprite(sx,sy-bounce,n%2===0?'torcedor-verde.png':'torcedor-dourado.png',22,s.t,bounce>0);
  }
  worldPoly(c,[[stX-8,stY-24],[stX+stW+8,stY-24],[stX+stW+14,stY-36],[stX-14,stY-36]],'#1f5440');
  worldPoly(c,[[stX-14,stY-36],[stX+stW+14,stY-36],[stX+stW+6,stY-42],[stX-22,stY-42]],'#143a2b');
  for(const px of[stX+15,stX+stW/2,stX+stW-15]){c.strokeStyle='#819688';c.lineWidth=2.5;c.beginPath();c.moveTo(px,stY+stH);c.lineTo(px,stY-28);c.stroke();}
  for(const lx of[stX-20,stX+stW+20]){
   c.fillStyle='#6c8075';c.fillRect(lx-2,stY-56,4,66);worldRound(c,lx-9,stY-64,18,9,'#ded8a2',2);
   for(let l=0;l<3;l++)this.ellipse(lx-5+l*5,stY-60,2,2,'#ffffff');
  }
  this.plate(stP.x-110,stY+stH+6,220,24,`${fieldFans(s,0).length}/${seatCapacity(s)} TORCEDORES · ARQUIBANCADA`,'#faf1af',10);
  this.hot('building','stands',stX,stY-30,stW,stH+60);

  const f1=s.fields[1],p2=WORLD_STRUCTURES.pitch2,o2x=p2.x-p2.w/2,o2y=p2.y-p2.h/2;
  if(!f1.unlocked){
   worldRound(c,o2x-10,o2y-10,p2.w+20,p2.h+20,'#725b41',6);worldRound(c,o2x-5,o2y-5,p2.w+10,p2.h+10,'#5b452f',4);
   c.strokeStyle='#957956';c.lineWidth=1;
   for(let x=o2x+15;x<o2x+p2.w;x+=30){c.beginPath();c.moveTo(x,o2y+6);c.lineTo(x,o2y+p2.h-6);c.stroke();}
   for(let y=o2y+15;y<o2y+p2.h;y+=30){c.beginPath();c.moveTo(o2x+6,y);c.lineTo(o2x+p2.w-6,y);c.stroke();}
   for(let x=o2x+10;x<o2x+p2.w-10;x+=44){worldRound(c,x,o2y-2,6,16,'#f0c946',1);worldRound(c,x,o2y+p2.h-14,6,16,'#f0c946',1);}
   drawCrate(c,o2x+40,o2y+38,15,'#b8523b','#cf654e','#8e3825');
   drawCrate(c,o2x+58,o2y+42,13,'#c0bcb2','#d8d4ca','#949086');
   drawCrate(c,o2x+p2.w-55,o2y+p2.h-46,14,'#c29447','#dcb265','#9e722b');

   const signW=270,signH=76,signX=p2.x-signW/2,signY=p2.y-signH/2;
   c.fillStyle='#463828';c.fillRect(signX+26,signY+signH,8,26);c.fillRect(signX+signW-34,signY+signH,8,26);
   worldRound(c,signX-4,signY-4,signW+8,signH+8,'#0b261d',7);worldRound(c,signX,signY,signW,signH,'#153d30',5);
   c.strokeStyle='#f0c946';c.lineWidth=2;c.strokeRect(signX,signY,signW,signH);
   worldText(c,p2.x,signY+17,'EXPANSÃO · 2º CAMPO OFICIAL',12,'#ffe484');
   worldText(c,p2.x,signY+34,'Duplica partidas e receitas da arena',9.5,'#c4ddc7');
   this.plate(p2.x-100,signY+46,200,24,'DESBLOQUEAR · 600 MOEDAS','#ffffff',11);
   this.hot('operation','staff',signX,signY,signW,signH+26);
  } else {
   worldRound(c,o2x-10,o2y-10,p2.w+20,p2.h+20,'#224726',6);
   for(let i=0;i<10;i++){c.fillStyle=i%2===0?'#338c41':'#42a551';c.fillRect(o2x+i*(p2.w/10),o2y,(p2.w/10)+1,p2.h);}
   c.strokeStyle='#f8fbf0';c.lineWidth=2;c.strokeRect(o2x+6,o2y+6,p2.w-12,p2.h-12);
   c.beginPath();c.moveTo(p2.x,o2y+6);c.lineTo(p2.x,o2y+p2.h-6);c.stroke();
   c.beginPath();c.ellipse(p2.x,p2.y,28,20,0,0,Math.PI*2);c.stroke();
   this.ellipse(p2.x,p2.y,2.5,2.5,'#ffffff');
   c.strokeRect(o2x+6,p2.y-38,48,76);c.strokeRect(o2x+p2.w-54,p2.y-38,48,76);
   worldRound(c,o2x-6,p2.y-22,12,44,'#e6edf2',2);worldRound(c,o2x+p2.w-6,p2.y-22,12,44,'#e6edf2',2);

   const sbX=p2.x-115,sbY=o2y-42,sbW=230,sbH=32;
   c.fillStyle='#36473e';c.fillRect(p2.x-65,sbY+sbH,6,12);c.fillRect(p2.x+59,sbY+sbH,6,12);
   worldRound(c,sbX-3,sbY-3,sbW+6,sbH+6,'#0e261f',5);worldRound(c,sbX,sbY,sbW,sbH,'#153d32',4);
   c.strokeStyle='#398360';c.lineWidth=1.5;c.strokeRect(sbX,sbY,sbW,sbH);
   worldText(c,p2.x,sbY+11,`CAMPO 2  ${f1.score[0]} × ${f1.score[1]}  ADVERSÁRIO`,10,'#ffea88');
   const stText=f1.remaining>0?`EM ANDAMENTO · ${Math.ceil(f1.remaining)}s`:f1.stock?'AGUARDANDO TORCIDA':'PRECISA DE KITS';
   worldText(c,p2.x,sbY+23,stText,8.5,'#e2f5cf');

   for(let n=0;n<6;n++){
    const ours=n<3,px=o2x+45+(n%3)*((p2.w-90)/2)+Math.sin(s.t*1.1+n)*12,py=o2y+42+Math.floor(n/3)*85+Math.cos(s.t*0.9+n)*9;
    this.actorSprite(px,py,ours?'atleta-azul.png':'atleta-laranja.png',30,s.t,f1.remaining>0);
   }
   const in1={x:861,y:532},pulse1=Math.sin(s.t*3.2)*3;
   c.save();c.strokeStyle='#a8ffda';c.lineWidth=2.5;c.beginPath();c.ellipse(in1.x,in1.y,32+pulse1,16+pulse1*.5,0,0,Math.PI*2);c.stroke();c.fillStyle='#45d89833';c.fill();c.restore();
   this.plate(in1.x-55,in1.y-12,110,24,`PREPARAR · ${f1.stock} KITS`,'#e8fff5',10);
   this.hot('travel','field1',in1.x-55,in1.y-12,110,24);
   this.hot('building','pitch2',o2x,o2y,p2.w,p2.h);
  }

  const supX=270,supY=590,supW=120,supH=64,supDepth=34;
  worldPoly(c,[[supX-supW/2,supY],[supX+supW/2,supY],[supX+supW/2,supY-supH],[supX-supW/2,supY-supH]],'#b35a3e');
  worldPoly(c,[[supX+supW/2,supY],[supX+supW/2+22,supY-supDepth],[supX+supW/2+22,supY-supDepth-supH],[supX+supW/2,supY-supH]],'#853f29');
  worldPoly(c,[[supX-supW/2-4,supY-supH],[supX+supW/2+4,supY-supH],[supX+supW/2+25,supY-supH-supDepth],[supX-supW/2+17,supY-supH-supDepth]],'#295f4e');
  worldRound(c,supX-20,supY-40,40,40,'#2c3734',2);
  for(let l=supY-36;l<supY;l+=5){c.strokeStyle='#566561';c.lineWidth=1;c.beginPath();c.moveTo(supX-18,l);c.lineTo(supX+18,l);c.stroke();}
  worldRound(c,supX-34,supY-52,68,10,'#112e25',2);worldText(c,supX,supY-47,'ALMOXARIFADO',7,'#e2f5cd');
  for(let i=0;i<Math.min(8,s.kits);i++){
   const kx=supX+36+(i%3)*13,ky=supY+8+Math.floor(i/3)*9;drawCrate(c,kx,ky,11,'#c29447','#dcb265','#9e722b');
  }
  const supIn={x:304,y:634},pSup=Math.sin(s.t*3.4)*3;
  c.save();c.strokeStyle='#a8e6ee';c.lineWidth=2.5;c.beginPath();c.ellipse(supIn.x,supIn.y,33+pSup,17+pSup*.5,0,0,Math.PI*2);c.stroke();c.fillStyle='#48cfde33';c.fill();c.restore();
  this.plate(supX-65,supY+26,130,25,`DEPÓSITO · ${s.kits}/${CFG.supply.capacity}`,'#e3f8ef',11);
  this.hot('travel','supply',supX-65,supY-35,130,90);

  const gateX=640,gateY=650,gateW=136,gateH=58,gateDepth=28;
  worldPoly(c,[[gateX-gateW/2,gateY],[gateX+gateW/2,gateY],[gateX+gateW/2,gateY-gateH],[gateX-gateW/2,gateY-gateH]],'#dedad0');
  worldPoly(c,[[gateX+gateW/2,gateY],[gateX+gateW/2+18,gateY-gateDepth],[gateX+gateW/2+18,gateY-gateDepth-gateH],[gateX+gateW/2,gateY-gateH]],'#b4b0a4');
  worldRound(c,gateX-48,gateY-42,38,22,'#224238',2);worldRound(c,gateX-46,gateY-40,34,18,'#79bcaa',2);
  for(let t=0;t<3;t++){
   const tx=gateX+8+t*15;worldRound(c,tx-3,gateY-24,6,24,'#a4b0ab',1);
   c.strokeStyle='#d8e4e0';c.lineWidth=1.5;c.beginPath();c.moveTo(tx,gateY-16);c.lineTo(tx+7,gateY-20);c.stroke();
  }
  worldPoly(c,[[gateX-gateW/2-5,gateY-gateH],[gateX+gateW/2+5,gateY-gateH],[gateX+gateW/2+22,gateY-gateH-gateDepth],[gateX-gateW/2+12,gateY-gateH-gateDepth]],'#184b3b');
  worldText(c,gateX,gateY-gateH+11,'PORTÃO PRINCIPAL · INGRESSOS',7.5,'#ffe992');
  const gateIn={x:609,y:681},pGate=Math.sin(s.t*3.2)*3;
  c.save();c.strokeStyle='#d8c6fa';c.lineWidth=2.5;c.beginPath();c.ellipse(gateIn.x,gateIn.y,33+pGate,17+pGate*.5,0,0,Math.PI*2);c.stroke();c.fillStyle='#b797f733';c.fill();c.restore();
  this.plate(gateX-58,gateY+26,116,25,'BILHETERIA · ENTRADA','#f1ebff',11);
  this.hot('travel','gate',gateX-58,gateY-35,116,90);

  const cashX=850,cashY=650,cashW=88,cashH=52,cashDepth=24;
  worldPoly(c,[[cashX-cashW/2,cashY],[cashX+cashW/2,cashY],[cashX+cashW/2,cashY-cashH],[cashX-cashW/2,cashY-cashH]],'#5a4630');
  worldPoly(c,[[cashX+cashW/2,cashY],[cashX+cashW/2+17,cashY-cashDepth],[cashX+cashW/2+17,cashY-cashDepth-cashH],[cashX+cashW/2,cashY-cashH]],'#423322');
  worldPoly(c,[[cashX-cashW/2-4,cashY-cashH],[cashX+cashW/2+4,cashY-cashH],[cashX+cashW/2+20,cashY-cashH-cashDepth],[cashX-cashW/2+13,cashY-cashH-cashDepth]],'#b07f32');
  worldRound(c,cashX-20,cashY-36,40,20,'#1f1811',2);worldRound(c,cashX-18,cashY-34,36,16,'#ffd70044',2);
  c.strokeStyle='#564225';c.lineWidth=1;c.beginPath();c.moveTo(cashX,cashY-34);c.lineTo(cashX,cashY-18);c.stroke();
  if(s.cash>0){
   const flyY=cashY-cashH-16+Math.sin(s.t*4)*4;
   this.ellipse(cashX,flyY,10,10,'#ffc72c');this.ellipse(cashX,flyY,7,7,'#ffe875');worldText(c,cashX,flyY,'🪙',9);
  }
  const cashIn={x:940,y:681},pCash=Math.sin(s.t*3.6)*3;
  c.save();c.strokeStyle='#ffe190';c.lineWidth=2.5;c.beginPath();c.ellipse(cashIn.x,cashIn.y,33+pCash,17+pCash*.5,0,0,Math.PI*2);c.stroke();c.fillStyle='#ffcf5233';c.fill();c.restore();
  this.plate(cashX-54,cashY+26,108,25,`CAIXA · ${s.cash} MOEDAS`,'#fff3cb',11);
  this.hot('travel','cash',cashX-54,cashY-35,108,90);

  const offX=1110,offY=640,offW=136,offH=72,offDepth=34;
  worldPoly(c,[[offX-offW/2,offY],[offX+offW/2,offY],[offX+offW/2,offY-offH],[offX-offW/2,offY-offH]],'#d0ddd4');
  worldPoly(c,[[offX+offW/2,offY],[offX+offW/2+24,offY-offDepth],[offX+offW/2+24,offY-offDepth-offH],[offX+offW/2,offY-offH]],'#9bb0a3');
  worldPoly(c,[[offX-offW/2-5,offY-offH],[offX+offW/2+5,offY-offH],[offX+offW/2+28,offY-offH-offDepth],[offX-offW/2+19,offY-offH-offDepth]],'#184b3b');
  worldRound(c,offX-offW*.36,offY-offH+10,offW*.72,20,'#17362c',2);worldRound(c,offX-offW*.34,offY-offH+12,offW*.68,16,'#68b09e',2);
  worldRound(c,offX-offW*.36,offY-36,offW*.72,20,'#17362c',2);worldRound(c,offX-offW*.34,offY-34,offW*.68,16,'#68b09e',2);
  worldRound(c,offX-15,offY-32,30,32,'#143329',2);worldRound(c,offX-13,offY-30,26,30,'#a0dcd0',1);
  c.fillStyle='#8a9a92';c.fillRect(offX+offW*.34,offY-offH-offDepth-22,3,24);
  worldPoly(c,[[offX+offW*.34+3,offY-offH-offDepth-22],[offX+offW*.34+22,offY-offH-offDepth-16],[offX+offW*.34+3,offY-offH-offDepth-11]],'#1b7053');
  const offIn={x:1162,y:657},pOff=Math.sin(s.t*3.3)*3;
  c.save();c.strokeStyle='#ffcea3';c.lineWidth=2.5;c.beginPath();c.ellipse(offIn.x,offIn.y,33+pOff,17+pOff*.5,0,0,Math.PI*2);c.stroke();c.fillStyle='#ff983833';c.fill();c.restore();
  this.plate(offX-64,offY+26,128,25,'ESCRITÓRIO · EVOLUIR','#ffe9d6',11);
  this.hot('operation','staff',offX-64,offY-45,128,100);

  if(s.facilities.canteen||s.map.placements.canteen){
   const cp=s.map.placements.canteen||WORLD_STRUCTURES.canteen;
   this.drawCanteen(s,cp,WORLD_STRUCTURES.canteen,facilityStage(s.facilities.canteen||1),cp.x,cp.y,120,60,68);
   this.hot('building','canteen',cp.x-70,cp.y-45,140,90);
  }

  for(const fan of s.fans){
   if(fan.phase==='watching')continue;
   const fp=worldToArt(fan.x,fan.z),choices=['torcedor-verde.png','torcedor-roxo.png','torcedor-dourado.png'];
   this.actorSprite(fp.x,fp.y,choices[(fan.color||0)%choices.length],36,s.t,true);
  }
  if(s.staff.runner){
   const rp=worldToArt(s.runner.x,s.runner.z);
   this.actorSprite(rp.x,rp.y,'roupeiro.png',40,s.t,true);
   for(let i=0;i<Math.min(s.runner.carry||0,9);i++){
    const bx=rp.x+13+(i%2)*7,by=rp.y-16-Math.floor(i/2)*8;this.ellipse(bx,by,3.5,3.5,'#fffbed');this.ellipse(bx,by,1.5,1.5,'#163b36');
   }
  }
  this.particles=this.particles.filter(p=>p.age<1.6);
  for(const e of this.particles){
   if(!e.position)continue;
   e.age+=dt;const p=worldToArt(e.position.x,e.position.z);
   c.save();c.globalAlpha=Math.max(0,1-e.age/1.6);
   this.plate(p.x-85,p.y-55-e.age*35,170,28,e.text,e.type==='conceded'?'#ffc8b3':'#ffe391',e.type==='goal'?16:11);
   c.restore();
  }
 }
 hot(kind,key,x,y,w,h){const p=this.screen(x,y);this.hitZones.push({kind,key,x:p.x,y:p.y,w:w*this.scale,h:h*this.scale});}
 drawTerrain(s){
  const c=this.ctx;
  if(!this.terrain){const tile=document.createElement('canvas');tile.width=256;tile.height=256;const t=tile.getContext('2d');t.fillStyle='#709151';t.fillRect(0,0,256,256);for(let i=0;i<2500;i++){t.fillStyle=i%3?'#456b3026':'#bdd77b30';t.fillRect(worldRand(i)*256,worldRand(i+5000)*256,1+worldRand(i+25)*4,1.5);}this.terrain=c.createPattern(tile,'repeat');}
  c.fillStyle=this.terrain;c.fillRect(-1250,-1100,4070,2340);
  for(const plot of WORLD_PLOTS){if(plot.id==='home')continue;
   const owned=s.land[plot.id];c.fillStyle=owned?'#b6c98d08':'#173d344a';c.fillRect(plot.x,plot.y,plot.w,plot.h);
   // Perimeter hedges and untouched vegetation disappear only under placed yards.
   for(let i=0;i<35;i++){const x=plot.x+36+worldRand(i+plot.cost)* (plot.w-72),y=plot.y+36+worldRand(i+plot.cost+400)*(plot.h-72);
    const occupied=Object.entries(s.map.placements).some(([id,p])=>{const r=structureRect(id,p);return x>r.x-70&&x<r.x+r.w+70&&y>r.y-90&&y<r.y+r.h+110;});
    if(!occupied&&(!owned||i<13))this.tree(x,y,.65+worldRand(i+2)*.75);
   }
  }
 }
 tree(x,y,size=1){
  const c=this.ctx;c.save();c.translate(x,y);c.scale(size,size);this.ellipse(17,4,35,10,'#15362744');worldPoly(c,[[-5,0],[5,0],[7,-49],[-3,-51]],'#786142');
  const spots=[[-15,-44,27], [12,-54,29],[-4,-72,31],[-20,-64,22],[21,-71,20],[-7,-90,20]];
  for(let i=0;i<spots.length;i++){const [x,y,r]=spots[i],g=c.createRadialGradient(x-7,y-12,2,x,y,r);g.addColorStop(0,'#a0bd54');g.addColorStop(.35,'#568f43');g.addColorStop(1,'#245638');this.ellipse(x,y,r,r,g);}
  for(let i=0;i<26;i++)this.ellipse(-28+worldRand(i+Math.floor(x))*55,-89+worldRand(i+8)*40,3,2,'#dae28435');c.restore();
 }
 drawRoads(s){
  const c=this.ctx,key=JSON.stringify([s.land,s.map.placements]);
  if(key!==this.roadKey){this.roadKey=key;this.roads=[];for(const[id,p]of Object.entries(s.map.placements)){if(WORLD_STRUCTURES[id].fixed)continue;const end=structureEntry(id,p),path=worldPath(s,{x:830,y:912},end);this.roads.push(path);}}
  for(const road of this.roads||[]){
   if(road.length<2)continue;
   worldLine(c,road,46,'#263d2e33');
   worldLine(c,road,38,'#c4b37d');
   worldLine(c,road,30,'#decda2');
   worldLine(c,road,2,'#fff8de99');
  }
  if(s.land.academy){worldLine(c,[{x:1340,y:850},{x:1580,y:850},{x:1770,y:850}],48,'#d7c394');}
  if(s.land.business){worldLine(c,[{x:210,y:892},{x:-150,y:892}],48,'#d7c394');}
  if(s.land.stadium){worldLine(c,[{x:855,y:80},{x:855,y:-155}],40,'#d7c394');}
  drawLamppost(c,780,880);drawLamppost(c,920,880);
  if(s.land.academy){drawLamppost(c,1480,830);drawLamppost(c,1680,830);}
  if(s.land.business){drawLamppost(c,50,870);drawLamppost(c,-80,870);}
  if(s.land.stadium){drawLamppost(c,830,20);drawLamppost(c,830,-80);}
 }
 drawPortals(s){
  const c=this.ctx;
  const connections={academy:[{x:1340,y:885},{x:1640,y:885}],business:[{x:150,y:892},{x:-90,y:892}],stadium:[{x:852,y:60},{x:852,y:-100}]};
  for(const [id,road] of Object.entries(connections))if(s.land[id]){worldLine(c,road,49,'#86976b');worldLine(c,road,38,'#d8c394');worldLine(c,road,29,'#e7d3a6');}
  for(const p of WORLD_PLOTS)if(p.id!=='home'&&s.land[p.id]){const x=p.x+p.w/2,y=p.y+40;this.plate(x-160,y-16,320,32,p.name.toUpperCase()+' +','#f2e5ae',13);this.hot('plot',p.id,x-160,y-16,320,32);}
 }
 drawBoundary(s,p){
  const c=this.ctx;c.fillStyle='#173e3133';c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle='#4a5541';c.lineWidth=5;c.strokeRect(p.x+5,p.y+5,p.w-10,p.h-10);
  const fence=(x,y)=>{worldRound(c,x-3,y-8,6,24,'#c0b27d',1);};for(let x=p.x+16;x<p.x+p.w;x+=64){fence(x,p.y+4);fence(x,p.y+p.h-10);}for(let y=p.y+20;y<p.y+p.h;y+=64){fence(p.x+4,y);fence(p.x+p.w-6,y);}
  const cx=p.x+p.w/2,cy=p.y+p.h/2;c.save();c.shadowColor='#18372977';c.shadowBlur=16;c.shadowOffsetY=10;worldRound(c,cx-160,cy-51,320,98,'#123f37ed',14);c.restore();
  worldText(c,cx,cy-24,p.name.toUpperCase(),17);worldText(c,cx,cy+9,`${p.cost.toLocaleString('pt-BR')} MOEDAS`,22,'#f7de82');worldText(c,cx,cy+34,'TOQUE NO TERRENO PARA COMPRAR',11,'#bdd9bb');
  if(this.selection?.kind==='plot'&&this.selection.id===p.id){c.setLineDash([16,10]);c.strokeStyle='#ffe89b';c.lineWidth=5;c.strokeRect(p.x+12,p.y+12,p.w-24,p.h-24);c.setLineDash([]);}
  this.hot('plot',p.id,p.x,p.y,p.w,p.h);
 }
 drawStructure(s,id,p){
  const c=this.ctx,level=s.facilities[id]||0,stage=facilityStage(level),spec=WORLD_STRUCTURES[id],rect=structureRect(id,p),job=s.map.construction.find(j=>j.id===id);
  if(!level){this.drawFoundation(p,spec,job?job.elapsed/job.duration:0);this.hot('building',id,rect.x-12,rect.y-25,rect.w+24,rect.h+65);return;}
  worldRound(c,rect.x-24,rect.y-25,rect.w+48,rect.h+72,stage.phase>=3?'#d7ccab':'#aaa272',15);
  if(stage.phase>=3){for(let x=rect.x-15;x<rect.x+rect.w+22;x+=30){c.strokeStyle='#b6b49b65';c.lineWidth=1;c.beginPath();c.moveTo(x,rect.y-20);c.lineTo(x,rect.y+rect.h+47);c.stroke();}for(let y=rect.y-15;y<rect.y+rect.h+48;y+=26){c.beginPath();c.moveTo(rect.x-20,y);c.lineTo(rect.x+rect.w+20,y);c.stroke();}}
  if(id==='stadium'||id==='youth')this.pitch(s,id,p,stage);
  else this.building(s,id,p,stage);
  const entry=structureEntry(id,p);
  this.plate(p.x-spec.w*.41,entry.y+14,spec.w*.82,29,FACILITIES[id].name.toUpperCase(),'#f3e9bb',12);
  worldText(c,p.x,entry.y+54,`FASE ${stage.phase} · MELHORIA ${stage.step}/3`,12,'#fbf2cf');
  this.hot('building',id,rect.x-15,rect.y-70,rect.w+30,rect.h+160);
  if(id==='training'){
   const m=s.map;this.plate(p.x-90,rect.y-95,180,28,`CT · ${m.ctKits}/${TRAINING_KIT_LIMIT} KITS`,'#bde4eb',13);
   for(let i=0;i<Math.min(12,m.ctKits);i++){worldRound(c,rect.x+15+(i%4)*21,entry.y-24-Math.floor(i/4)*17,17,15,'#c69542',2);worldText(c,rect.x+23+(i%4)*21,entry.y-17-Math.floor(i/4)*17,'+',10,'#ffe5a1');}
   if(m.training){const progress=m.training.elapsed/m.training.duration;worldRound(c,p.x-100,entry.y+71,200,8,'#244d37');worldRound(c,p.x-100,entry.y+71,Math.max(1,progress*200),8,'#9ce16d');}
  }
 }
 drawFoundation(p,spec,progress){
  const c=this.ctx,x=p.x-spec.w/2,y=p.y-spec.h/2;worldRound(c,x,y,spec.w,spec.h,'#b5a172',6);c.strokeStyle='#efe0b4';c.lineWidth=5;c.strokeRect(x+12,y+12,spec.w-24,spec.h-24);
  for(let i=0;i<4;i++){const xx=x+20+i*(spec.w-40)/3;worldRound(c,xx-3,y+20,6,spec.h-38,'#b99159',1);}
  for(const xx of[x+8,x+spec.w-8])for(const yy of[y+8,y+spec.h-8]){worldPoly(c,[[xx-4,yy],[xx+4,yy],[xx+4,yy-25-progress*32],[xx-4,yy-25-progress*32]],'#dbba79');}
 }
 building(s,id,p,st){
  const c=this.ctx,spec=WORLD_STRUCTURES[id],w=spec.w*.82,d=spec.h*.66,x=p.x,y=p.y+spec.h*.25;
  const h=st.phase===1?68:st.phase===2?104:st.phase===3?148:st.phase===4?180:215;
  c.save();c.shadowColor='#102c2166';c.shadowBlur=14;c.shadowOffsetX=16;c.shadowOffsetY=14;worldPoly(c,[[x-w/2,y],[x+w/2,y],[x+w/2+30,y-d],[x-w/2+30,y-d]],'#1e4433');c.restore();
  if(id==='training')this.drawTrainingComplex(s,p,spec,st,x,y,w,d,h);
  else if(id==='board')this.drawBoardHQ(s,p,spec,st,x,y,w,d,h);
  else if(id==='marketing')this.drawMarketingHub(s,p,spec,st,x,y,w,d,h);
  else if(id==='coaching')this.drawCoachingCenter(s,p,spec,st,x,y,w,d,h);
  else if(id==='canteen')this.drawCanteen(s,p,spec,st,x,y,w,d,h);
  else this.drawGenericBuilding(s,id,p,st,x,y,w,d,h);
 }
 drawTrainingComplex(s,p,spec,st,x,y,w,d,h){
  const c=this.ctx,wallFront=st.phase>=3?'#d9e6d7':'#bdae86',wallSide=st.phase>=3?'#9eb49b':'#8a7c5b';
  worldPoly(c,[[x-w/2,y],[x+w/2,y],[x+w/2,y-h*.78],[x-w/2,y-h*.78]],wallFront);
  worldPoly(c,[[x+w/2,y],[x+w/2+30,y-d],[x+w/2+30,y-d-h*.78],[x+w/2,y-h*.78]],wallSide);
  c.fillStyle=st.phase>=4?'#196758':st.phase>=2?'#2b5c46':'#4f4735';
  c.beginPath();c.moveTo(x-w/2-6,y-h*.78);c.quadraticCurveTo(x,y-h-24,x+w/2+6,y-h*.78);c.lineTo(x+w/2+36,y-h*.78-d);c.quadraticCurveTo(x+30,y-h-24-d,x-w/2+24,y-h*.78-d);c.closePath();c.fill();
  for(let i=0;i<7;i++){
   const t=i/6,rx=x-w/2+t*w,ry=y-h*.78-Math.sin(t*Math.PI)*34;
   c.strokeStyle='#f4ffd233';c.lineWidth=3;c.beginPath();c.moveTo(rx,ry);c.lineTo(rx+30,ry-d);c.stroke();
   if(i%2===1){c.strokeStyle='#6ec8b255';c.lineWidth=5;c.beginPath();c.moveTo(rx+2,ry-4);c.lineTo(rx+28,ry-d+4);c.stroke();}
  }
  worldRound(c,x-24,y-48,48,48,'#133829',4);worldRound(c,x-20,y-44,40,42,'#62a898',3);
  c.strokeStyle='#d5ede6';c.lineWidth=1.5;c.beginPath();c.moveTo(x,y-44);c.lineTo(x,y-2);c.stroke();
  worldRound(c,x-38,y-56,76,13,'#1a493a',3);worldText(c,x,y-50,st.phase>=3?'CT DE ALTA PERFORMANCE':'CENTRO DE TREINO',8,'#e8ffd6');
  for(const sgn of[-1,1]){
   const wx=x+sgn*w*.32;worldRound(c,wx-16,y-42,32,24,'#193d30',2);worldRound(c,wx-13,y-39,26,18,'#8ad0c0',2);
   c.strokeStyle='#193d30';c.lineWidth=1;c.beginPath();c.moveTo(wx,y-39);c.lineTo(wx,y-21);c.moveTo(wx-13,y-30);c.lineTo(wx+13,y-30);c.stroke();
  }
  if(st.phase>=3){
   worldRound(c,x+w/2+5,y-60,34,50,'#cfdacd',3);worldRound(c,x+w/2+11,y-50,22,22,'#ffffff',2);
   c.fillStyle='#2e8b57';c.fillRect(x+w/2+19,y-47,6,16);c.fillRect(x+w/2+14,y-42,16,6);
  }
  for(let i=0;i<4;i++){
   const cx=x-w*.4+i*22,cy=y+24+((i%2)*10);
   worldPoly(c,[[cx,cy],[cx+6,cy-14],[cx+12,cy]],'#f27926');c.fillStyle='#ffffff';c.fillRect(cx+3,cy-9,6,3);
  }
  const kits=s.map.ctKits;
  for(let i=0;i<Math.min(12,kits);i++){
   const col=i%3,row=Math.floor(i/3)%2,tier=Math.floor(i/6);
   const kx=x+w*.25+col*14-row*8,ky=y+14+row*10-tier*11;
   drawCrate(c,kx,ky,12,'#c29447','#dcb265','#9e722b');
  }
  if(s.map.training){
   for(let i=0;i<Math.min(6,s.map.training.ids.length);i++){
    const anim=(s.t*2.5+i)%4,ax=x-w*.38+((anim%2)*35)+Math.sin(s.t*2+i)*8,ay=y+28+(i*8);
    this.actorSprite(ax,ay,'atleta-azul.png',34,s.t,true);
   }
  }
 }
 drawBoardHQ(s,p,spec,st,x,y,w,d,h){
  const c=this.ctx,wall='#ede8d3',wallSide='#c2bba0';
  worldRound(c,x-w/2-10,y-14,w+20,24,'#c4bfa6',4);
  for(let i=0;i<3;i++)worldRound(c,x-35-i*5,y-6+i*6,70+i*10,6,'#ded9c5',1);
  worldPoly(c,[[x-w/2,y-14],[x+w/2,y-14],[x+w/2,y-h],[x-w/2,y-h]],wall);
  worldPoly(c,[[x+w/2,y-14],[x+w/2+30,y-d-14],[x+w/2+30,y-d-h],[x+w/2,y-h]],wallSide);
  const cols=4;
  for(let i=0;i<cols;i++){
   const colX=x-w*.34+i*(w*.68/(cols-1));
   c.fillStyle='#f8f4e6';c.fillRect(colX-4,y-h+18,8,h-32);
   worldRound(c,colX-6,y-18,12,6,'#d0c8ae',2);worldRound(c,colX-6,y-h+14,12,6,'#d0c8ae',2);
  }
  worldPoly(c,[[x-w/2-6,y-h],[x,y-h-32],[x+w/2+6,y-h]],'#d6ceb2');
  worldPoly(c,[[x,y-h-32],[x+30,y-h-32-d],[x+w/2+36,y-h-d],[x+w/2+6,y-h]],'#aba284');
  worldRound(c,x-18,y-h-16,36,14,'#194d3c',3);worldText(c,x,y-h-9,s.club.sigla||'AFC',9,'#fbe491');
  worldRound(c,x-18,y-54,36,40,'#4a2c17',3);worldRound(c,x-14,y-50,13,34,'#6e4222',2);worldRound(c,x+1,y-50,13,34,'#6e4222',2);
  this.ellipse(x-3,y-32,2,2,'#f4d35e');this.ellipse(x+3,y-32,2,2,'#f4d35e');
  for(let row=0;row<(st.phase>=3?2:1);row++){
   const wy=y-48-row*42;
   for(const sgn of[-1,1]){
    const wx=x+sgn*w*.38;worldRound(c,wx-11,wy-14,22,28,'#2a4238',4);worldRound(c,wx-9,wy-12,18,24,'#8cd1be',3);
    c.strokeStyle='#2a4238';c.lineWidth=1;c.beginPath();c.moveTo(wx,wy-12);c.lineTo(wx,wy+12);c.stroke();
   }
  }
  const flagX=x+w/2-10,flagY=y-h-d-8;
  c.fillStyle='#c8cbd1';c.fillRect(flagX-2,flagY-36,4,48);
  const wave=Math.sin(s.t*4)*5;
  worldPoly(c,[[flagX+2,flagY-34],[flagX+34,flagY-30+wave],[flagX+26,flagY-18+wave],[flagX+2,flagY-18]],'#196752');
  worldText(c,flagX+16,flagY-24+wave*.7,'★',10,'#ffd966');
  if(st.phase>=3)drawTrophy(c,x-w*.42,y+16,1.2);
  if(st.phase>=4){
   worldRound(c,x+w*.42,y+14,48,20,'#111a18',6);worldRound(c,x+w*.42+8,y+10,32,14,'#2d3f39',4);
   worldRound(c,x+w*.42+12,y+12,24,10,'#88b8aa',2);this.ellipse(x+w*.42+10,y+24,5,5,'#2b2b2b');this.ellipse(x+w*.42+38,y+24,5,5,'#2b2b2b');
  }
 }
 drawMarketingHub(s,p,spec,st,x,y,w,d,h){
  const c=this.ctx,wallFront='#d2dcd5',wallSide='#9eb3a7';
  worldPoly(c,[[x-w/2,y],[x+w/2,y],[x+w/2,y-h],[x-w/2,y-h]],wallFront);
  worldPoly(c,[[x+w/2,y],[x+w/2+30,y-d],[x+w/2+30,y-d-h],[x+w/2,y-h]],wallSide);
  worldPoly(c,[[x-w/2-6,y-h],[x-w/2+24,y-h-d],[x+w/2+36,y-h-d],[x+w/2+6,y-h]],'#214a3e');
  worldRound(c,x-w*.36,y-h*.72,w*.72,h*.58,'#153328',4);worldRound(c,x-w*.34,y-h*.7,w*.68,h*.54,'#488f7f',3);
  for(let i=1;i<5;i++){
   c.strokeStyle='#214a3e';c.lineWidth=1.5;const gx=x-w*.34+i*(w*.68/5);
   c.beginPath();c.moveTo(gx,y-h*.7);c.lineTo(gx,y-h*.16);c.stroke();
  }
  const bbx=x+w*.2,bby=y-h-35,bbw=108,bbh=54;
  c.fillStyle='#434c48';c.fillRect(bbx-4,bby,8,35);c.fillRect(bbx+bbw-12,bby,8,35);
  worldRound(c,bbx-8,bby-bbh,bbw+16,bbh+6,'#0e1b17',6);
  const ledGrad=c.createLinearGradient(bbx,bby-bbh,bbx,bby);ledGrad.addColorStop(0,'#0b2b22');ledGrad.addColorStop(1,'#144e3d');
  worldRound(c,bbx-4,bby-bbh+4,bbw+8,bbh-2,ledGrad,4);
  for(let l=bby-bbh+6;l<bby;l+=4){c.fillStyle='#ffffff0a';c.fillRect(bbx-4,l,bbw+8,1.5);}
  const msgs=['ARENA DE BAIRRO','PATROCÍNIO OURO','SÓCIOS +100%','TORCIDA VILA'];
  const msg=msgs[Math.floor((s.t*.4)%msgs.length)];
  worldText(c,bbx+bbw/2,bby-bbh+18,'● AO VIVO',8,'#ff5252');worldText(c,bbx+bbw/2,bby-bbh+34,msg,10,'#ffe787');
  const antX=x-w*.3,antY=y-h-d;
  c.strokeStyle='#8e9c94';c.lineWidth=2;c.beginPath();c.moveTo(antX,antY);c.lineTo(antX,antY-45);c.moveTo(antX-9,antY-15);c.lineTo(antX+9,antY-15);c.moveTo(antX-6,antY-30);c.lineTo(antX+6,antY-30);c.stroke();
  const blink=Math.sin(s.t*6)>0;this.ellipse(antX,antY-46,blink?5:3,blink?5:3,blink?'#ff3333':'#881111');
  if(blink){const g=c.createRadialGradient(antX,antY-46,0,antX,antY-46,12);g.addColorStop(0,'#ff333388');g.addColorStop(1,'#ff333300');this.ellipse(antX,antY-46,12,12,g);}
  const dishX=x+15,dishY=y-h-d+6;
  c.fillStyle='#d5deda';c.beginPath();c.arc(dishX,dishY,11,Math.PI*.8,Math.PI*1.8);c.fill();
  c.strokeStyle='#3e5248';c.lineWidth=2;c.beginPath();c.moveTo(dishX,dishY);c.lineTo(dishX+6,dishY-8);c.stroke();
  this.ellipse(dishX+6,dishY-8,2,2,'#ff4444');
 }
 drawCoachingCenter(s,p,spec,st,x,y,w,d,h){
  const c=this.ctx,wallFront='#d2d9c7',wallSide='#a2aa98';
  worldPoly(c,[[x-w/2,y],[x+w/2,y],[x+w/2,y-h],[x-w/2,y-h]],wallFront);
  worldPoly(c,[[x+w/2,y],[x+w/2+30,y-d],[x+w/2+30,y-d-h],[x+w/2,y-h]],wallSide);
  worldPoly(c,[[x-w/2-6,y-h],[x-w/2+24,y-h-d],[x+w/2+36,y-h-d],[x+w/2+6,y-h]],'#275945');
  worldRound(c,x-w*.44,y-h+10,w*.88,34,'#12372b',4);worldRound(c,x-w*.42,y-h+12,w*.84,30,'#78beaf',3);
  for(let i=1;i<6;i++){c.strokeStyle='#12372b';c.lineWidth=1.5;const gx=x-w*.42+i*(w*.84/6);c.beginPath();c.moveTo(gx,y-h+12);c.lineTo(gx,y-h+42);c.stroke();}
  worldRound(c,x-w*.45,y-42,w*.42,44,'#1a4335',4);worldRound(c,x-w*.43,y-40,w*.38,40,'#e4ece7',3);
  const tbx=x+w*.12,tby=y+16,tbw=44,tbh=32;
  c.fillStyle='#4a3f2b';c.fillRect(tbx+tbw/2-2,tby,4,22);
  worldRound(c,tbx-4,tby-tbh,tbw+8,tbh+4,'#2a2a2a',3);worldRound(c,tbx-2,tby-tbh+2,tbw+4,tbh,'#367c4d',2);
  c.strokeStyle='#ffffff99';c.lineWidth=1;c.strokeRect(tbx,tby-tbh+4,tbw,tbh-4);
  c.beginPath();c.moveTo(tbx+tbw/2,tby-tbh+4);c.lineTo(tbx+tbw/2,tby);c.arc(tbx+tbw/2,tby-tbh/2+2,5,0,Math.PI*2);c.stroke();
  const dots=[[4,14,'#42a5f5'],[12,6,'#42a5f5'],[12,14,'#42a5f5'],[12,22,'#42a5f5'],[24,10,'#42a5f5'],[24,18,'#42a5f5'],[36,7,'#ef5350'],[36,14,'#ef5350'],[36,21,'#ef5350']];
  for(const [dx,dy,col]of dots){this.ellipse(tbx+dx,tby-tbh+4+dy,1.8,1.8,col);}
  c.strokeStyle='#3e574b';c.lineWidth=2;c.beginPath();c.moveTo(x-w*.2,y-h-d);c.lineTo(x-w*.2,y-h-d-28);c.stroke();this.ellipse(x-w*.2,y-h-d-28,3,3,'#f5ce47');
 }
 drawCanteen(s,p,spec,st,x,y,w,d,h){
  const c=this.ctx,wallFront='#e2d3b3',wallSide='#b5a687';
  worldPoly(c,[[x-w/2,y],[x+w/2,y],[x+w/2,y-h*.8],[x-w/2,y-h*.8]],wallFront);
  worldPoly(c,[[x+w/2,y],[x+w/2+30,y-d],[x+w/2+30,y-d-h*.8],[x+w/2,y-h*.8]],wallSide);
  worldPoly(c,[[x-w/2-6,y-h*.8],[x-w/2+24,y-h*.8-d],[x+w/2+36,y-h*.8-d],[x+w/2+6,y-h*.8]],'#7f382a');
  const awnW=w*.7,awnX=x-awnW/2,awnY=y-42,stripes=8;
  for(let i=0;i<stripes;i++){
   c.fillStyle=i%2===0?'#d32f2f':'#ffffff';c.beginPath();
   c.moveTo(awnX+i*(awnW/stripes),awnY);c.lineTo(awnX+(i+1)*(awnW/stripes),awnY);
   c.lineTo(awnX+(i+1)*(awnW/stripes)+6,awnY+18);c.lineTo(awnX+i*(awnW/stripes)+6,awnY+18);
   c.closePath();c.fill();
  }
  worldRound(c,x-w*.3,y-24,w*.6,24,'#4e3524',3);worldRound(c,x-w*.28,y-22,w*.56,8,'#c79a5b',2);
  const px=x+w*.25,py=y+20;
  worldRound(c,px-20,py-8,40,16,'#9c7247',2);
  c.fillStyle='#1e88e5';c.beginPath();c.arc(px,py-22,18,Math.PI,Math.PI*2);c.fill();
  c.fillStyle='#fbc02d';c.beginPath();c.arc(px,py-22,12,Math.PI*1.2,Math.PI*1.8);c.fill();
  c.strokeStyle='#5d4037';c.lineWidth=2;c.beginPath();c.moveTo(px,py-22);c.lineTo(px,py);c.stroke();
  worldRound(c,x-w*.4,y+8,18,24,'#212121',2);c.strokeStyle='#8d6e63';c.lineWidth=2;c.strokeRect(x-w*.4,y+8,18,24);
  worldText(c,x-w*.4+9,y+16,'MENU',6,'#ffeb3b');
  const chX=x-w*.32,chY=y-h*.8-d+10;c.fillStyle='#5c3d2e';c.fillRect(chX-4,chY-16,8,18);
  const smoke=(s.t*1.5)%3;this.ellipse(chX+Math.sin(s.t*2)*3,chY-20-smoke*9,4+smoke*2,3+smoke,'#ffffff55');
 }
 drawGenericBuilding(s,id,p,st,x,y,w,d,h){
  const c=this.ctx,front=st.phase===1?'#c8aa75':st.phase===2?'#e1c692':'#e3d3b2',side=st.phase===1?'#938258':'#aaa68d';
  worldPoly(c,[[x-w/2,y],[x+w/2,y],[x+w/2,y-h],[x-w/2,y-h]],front);
  worldPoly(c,[[x+w/2,y],[x+w/2+28,y-d],[x+w/2+28,y-d-h],[x+w/2,y-h]],side);
  const roof=st.phase===1?'#887441':st.phase===2?'#527b65':'#176858';
  worldPoly(c,[[x-w/2-12,y-h],[x-w/2+20,y-h-d],[x+w/2+41,y-h-d],[x+w/2+10,y-h]],roof);
  worldRound(c,x-19,y-55,38,55,'#244f44',3);worldRound(c,x-14,y-49,27,38,'#7fbdad',2);
 }
 pitch(s,id,p,st){
  const c=this.ctx,sp=WORLD_STRUCTURES[id],x=p.x,y=p.y,w=sp.w*.84,h=sp.h*.71,ox=x-w/2,oy=y-h/2;
  for(let i=0;i<12;i++){c.fillStyle=i%2?(st.phase>=3?'#36943e':'#5d8246'):(st.phase>=3?'#47ab4e':'#6e924f');c.fillRect(ox+i*w/12,oy,w/12+1,h);}
  for(let i=0;i<200;i++){c.fillStyle='#e3ed8b1a';c.fillRect(ox+worldRand(i)*w,oy+worldRand(i+122)*h,1,2);}
  c.strokeStyle='#f8f9e2';c.lineWidth=2;c.strokeRect(ox+10,oy+10,w-20,h-20);
  c.beginPath();c.moveTo(x,oy+10);c.lineTo(x,oy+h-10);c.stroke();
  c.beginPath();c.arc(x,y,h*.22,0,Math.PI*2);c.stroke();this.ellipse(x,y,2.5,2.5,'#ffffff');
  for(const end of[-1,1]){
   const gx=x+end*(w/2-10);c.strokeRect(gx+(end<0?0:-w*.15),y-h*.24,w*.15,h*.48);c.strokeRect(gx+(end<0?0:-w*.07),y-h*.12,w*.07,h*.24);
   c.strokeStyle='#ffffffdd';c.lineWidth=2.5;const postX=gx+(end<0?-14:0);c.strokeRect(postX,y-24,14,48);
   c.strokeStyle='#ffffff44';c.lineWidth=1;for(let n=1;n<5;n++){c.beginPath();c.moveTo(postX,y-24+n*10);c.lineTo(postX+14,y-24+n*10);c.stroke();}
  }
  const count=id==='youth'?6:10;
  for(let i=0;i<count;i++){
   const ours=i<count/2,px=ox+40+(i%5)*(w-80)/4+Math.sin(s.t+i)*6,py=oy+(ours?.33:.78)*h+Math.cos(s.t*.9+i)*7;
   this.actorSprite(px,py,ours?'atleta-azul.png':'atleta-laranja.png',id==='stadium'?33:29,s.t,true);
  }
  this.ellipse(x+Math.sin(s.t*.75)*w*.32,y+Math.cos(s.t)*h*.25,5,5,'#fffdeb');this.ellipse(x+Math.sin(s.t*.75)*w*.32,y+Math.cos(s.t)*h*.25,2,2,'#163b2a');
  const standRows=st.phase>=4?4:st.phase>=3?3:st.phase===2?2:1;
  for(let side of(id==='stadium'&&st.phase>=2?[-1,1]:[1]))for(let row=0;row<standRows;row++){
   const yy=y+side*(h/2+16+row*14);worldRound(c,ox-10,yy-3,w+20,13,'#b2ac88',1);
   const seats=14+st.phase*4;
   for(let n=0;n<seats;n++){
    const px=ox-4+n*(w+8)/(seats-1);worldRound(c,px-4,yy-6,8,8,(n+row)%3===0?'#f5d352':'#196752',1);
    if(s.official&&id==='stadium'&&n%3===0)this.actorSprite(px,yy+3,'torcedor-verde.png',16,s.t,s.fields[0].lastGoalOurs&&s.t-s.fields[0].lastGoal<3);
   }
  }
  if(st.phase>=3&&id==='stadium'){
   for(const side of[-1,1]){
    const sx=x+side*(w/2+24);worldRound(c,sx-14,y-h/2-12,28,h+24,'#8e8a6e',3);
    for(let n=0;n<10;n++)worldRound(c,sx-11,y-h/2-4+n*(h+8)/10,22,6,n%2===0?'#196752':'#f5d352',1);
   }
   for(const a of[-1,1])for(const b of[-1,1]){
    const tx=x+a*(w/2+34),ty=y+b*(h/2+32);
    c.strokeStyle='#798f85';c.lineWidth=3;c.beginPath();c.moveTo(tx-5,ty);c.lineTo(tx-2,ty-90);c.moveTo(tx+5,ty);c.lineTo(tx+2,ty-90);c.stroke();
    c.lineWidth=1;for(let z=0;z<5;z++){c.beginPath();c.moveTo(tx-4,ty-z*18);c.lineTo(tx+4,ty-z*18-12);c.moveTo(tx+4,ty-z*18);c.lineTo(tx-4,ty-z*18-12);c.stroke();}
    worldRound(c,tx-18,ty-96,36,12,'#e8dfa7',2);for(let l=0;l<4;l++)this.ellipse(tx-12+l*8,ty-90,3,3,'#fffeb0');
    if(!this.lowQuality){const g=c.createRadialGradient(tx,ty-90,4,tx-a*30,ty-b*25,55);g.addColorStop(0,'#fff8c440');g.addColorStop(1,'#fff8c400');this.ellipse(tx-a*20,ty-b*15,55,40,g);}
   }
  }
  if(id==='stadium'){
   const f=s.fields[0],sbW=430,sbH=38,sbX=x-sbW/2,sbY=oy-112;
   c.fillStyle='#43554b';c.fillRect(x-sbW*.35,sbY+sbH,6,28);c.fillRect(x+sbW*.35,sbY+sbH,6,28);
   worldRound(c,sbX-4,sbY-4,sbW+8,sbH+8,'#0b231d',6);worldRound(c,sbX,sbY,sbW,sbH,'#143e33',4);
   c.strokeStyle='#428a68';c.lineWidth=1.5;c.strokeRect(sbX,sbY,sbW,sbH);
   worldText(c,x,sbY+sbH/2,`${s.club.sigla} (VOCÊ)  ${f.score[0]} × ${f.score[1]}  ADVERSÁRIO`,15,'#ffe887');
  }
 }
 drawWork(s,j){
  const p=s.map.placements[j.id],sp=WORLD_STRUCTURES[j.id],c=this.ctx,rect=structureRect(j.id,p),progress=j.elapsed/j.duration;
  const hx=rect.x-18,hy=rect.y-18,hw=rect.w+36,hh=rect.h+46;
  c.fillStyle='#173a2e38';c.fillRect(hx,hy,hw,hh);
  c.save();c.strokeStyle='#c4a04d';c.lineWidth=2.5;
  for(let x=hx+8;x<=hx+hw-8;x+=32){c.beginPath();c.moveTo(x,hy+hh);c.lineTo(x,hy-15);c.stroke();}
  for(let y=hy+hh;y>=hy-15;y-=24){
   c.beginPath();c.moveTo(hx+8,y);c.lineTo(hx+hw-8,y);c.stroke();
   for(let x=hx+8;x<hx+hw-40;x+=64){c.beginPath();c.moveTo(x,y);c.lineTo(x+32,y-24);c.stroke();}
  }
  c.fillStyle='#256b4644';c.fillRect(hx+12,hy,hw-24,hh-20);c.restore();
  drawCrate(c,hx+16,hy+hh+8,12,'#b8523b','#cf654e','#8e3825');
  drawCrate(c,hx+32,hy+hh+8,12,'#c0bcb2','#d8d4ca','#949086');
  c.fillStyle='#dec582';c.beginPath();c.ellipse(hx+hw-24,hy+hh+6,14,7,0,0,Math.PI*2);c.fill();
  const wx=j.worker.x,wy=j.worker.y+(j.worker.route.length?0:Math.sin(s.t*11)*2);
  this.actorSprite(wx,wy,'roupeiro.png',43,s.t,true);
  if(!j.worker.route.length){
   const sx=wx+12,sy=wy-24;c.strokeStyle='#ffeb3b';c.lineWidth=2;
   for(let i=0;i<4;i++){const ang=s.t*12+i*1.5;c.beginPath();c.moveTo(sx,sy);c.lineTo(sx+Math.cos(ang)*9,sy+Math.sin(ang)*9);c.stroke();}
   const d=(s.t*4)%2;this.ellipse(sx+Math.sin(s.t*3)*3,sy+6-d*6,3+d*2,2+d,'#ffffff66');
  }
  const plateW=270,plateH=36,plateX=p.x-plateW/2,plateY=rect.y-82;
  this.plate(plateX,plateY,plateW,plateH,j.worker.route.length?'EQUIPE A CAMINHO':`EM OBRAS · ${Math.round(progress*100)}% · ${Math.ceil(j.duration-j.elapsed)}s RESTANTES`,'#ffe694',13);
  worldRound(c,p.x-110,rect.y-38,220,9,'#16372b',4);worldRound(c,p.x-110,rect.y-38,Math.max(4,220*progress),9,'#e8c148',4);
 }
 actorSprite(x,y,key,height,t,moving=false){
  const c=this.ctx,img=this.assets[key];if(!img)return;const h=height,w=h*.64,bob=moving?Math.sin(t*9+x*.03)*1.5:0;this.ellipse(x+5,y+3,w*.55,4,'#12372d44');c.save();c.translate(x,y-bob);if(moving)c.rotate(Math.sin(t*8)*.02);c.drawImage(img,-w/2,-h,w,h);c.restore();
 }
 drawActors(s){
  const c=this.ctx,m=s.map,a=m.actor;
  if(a.route.length){c.setLineDash([3,10]);worldLine(c,[a,...a.route],3,'#fff0a6aa');c.setLineDash([]);}
  this.ellipse(a.x,a.y,22,8,'#f1e18866');this.actorSprite(a.x,a.y,'gerente.png',48,s.t,a.walk>1);this.plate(a.x-27,a.y-72,54,20,'VOCÊ','#fff1b1',10);
  if(a.walk>1&&Math.sin(s.t*12)>0.5){this.ellipse(a.x-Math.sin(s.t*6)*10,a.y+2,4,2,'#ffffff44');}
  for(let i=0;i<s.player.carry;i++){const xx=a.x+18+(i%2)*8,yy=a.y-20-Math.floor(i/2)*9;this.ellipse(xx,yy,5,5,'#fff7da');this.ellipse(xx,yy,2,2,'#214c3d');}
  if(m.courierHired){const a=m.courier;this.actorSprite(a.x,a.y,'roupeiro.png',42,s.t,a.walk>1);for(let i=0;i<a.carry;i++)drawCrate(c,a.x+12,a.y-12-i*10,10,'#c29447','#dcb265','#9e722b');}
 }
 drawMinimap(s){
  const c=this.ctx;if(this.width<680){this.miniRect=null;return;}
  const w=182,h=98,x=20,y=this.height-212;this.miniRect={x,y,w,h};c.save();worldRound(c,x-6,y-6,w+12,h+12,'#143d32e8',9);
  for(const p of WORLD_PLOTS){c.fillStyle=s.land[p.id]?'#779b60':'#3e6349';c.fillRect(x+(p.x+960)/3456*w,y+(p.y+896)/1856*h,p.w/3456*w-1,p.h/1856*h-1);}
  const a=s.map.actor;this.ellipse(x+(a.x+960)/3456*w,y+(a.y+896)/1856*h,3,3,'#ffe797');
  const cw=this.width/this.scale,ch=this.height/this.scale;c.strokeStyle='#fff3c2';c.lineWidth=1;c.strokeRect(x+(this.mapCamera.x-cw/2+960)/3456*w,y+(this.mapCamera.y-ch/2+896)/1856*h,cw/3456*w,ch/1856*h);c.restore();
 }
}
