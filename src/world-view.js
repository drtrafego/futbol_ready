import { Renderer } from './render.js';
import { CFG } from './config.js';
import { FACILITIES, facilityStage } from './facilities.js';
import { WORLD_PLOTS, WORLD_STRUCTURES, TRAINING_KIT_LIMIT, ensureWorld, structureRect, structureEntry, mapPlacementCheck, worldPath } from './world-model.js';
import { worldToArt } from './scene.js';

const worldRand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const worldPoly=(c,points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
function worldText(c,x,y,text,size=15,color='#f8f2d7',align='center'){c.fillStyle=color;c.font=`750 ${size}px system-ui`;c.textAlign=align;c.textBaseline='middle';c.fillText(text,x,y);}
function worldRound(c,x,y,w,h,color,r=8){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function worldLine(c,points,width,color){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}

/** A single moving camera renders the inherited arena AND neighbouring plots.
 * There is no campus page. Buildings/works are individually rendered entities. */
export class WorldRenderer extends Renderer{
 constructor(canvas){
  super(canvas);this.mapCamera={x:780,y:480,zoom:.8,follow:false};this.selection=null;this.placement=null;this.hover=null;this.district='world';this.mapInitialized=false;
 }
 resize(){super.resize();this.mapInitialized=false;}
 screenAxisToWorld(x,y){const n=Math.max(1,Math.hypot(x,y));return{x:x/n,z:y/n};}
 unproject(x,y){return{x:(x-this.ox)/this.scale,y:(y-this.oy)/this.scale};}
 pan(dx,dy){this.mapCamera.follow=false;this.mapCamera.x-=dx/this.scale;this.mapCamera.y-=dy/this.scale;this.clampCamera();}
 clampCamera(){this.mapCamera.x=Math.max(-1120,Math.min(2640,this.mapCamera.x));this.mapCamera.y=Math.max(-1080,Math.min(1120,this.mapCamera.y));}
 zoomAt(factor,sx=this.width/2,sy=this.height/2){const before=this.unproject(sx,sy),old=this.mapCamera.zoom;this.mapCamera.zoom=Math.max(.22,Math.min(1.6,old*factor));this.mapCamera.follow=false;this.mapCamera.x=before.x-(sx-this.width/2)/this.mapCamera.zoom;this.mapCamera.y=before.y-(sy-this.height/2)/this.mapCamera.zoom;this.clampCamera();}
 focus(area,s,select=true){
  ensureWorld(s);let p;
  if(area==='club'||area==='all'){p={x:768,y:16};this.mapCamera.zoom=Math.max(.22,Math.min((this.width-60)/3456,(this.height-170)/1856));}
  else if(area==='arena'){p={x:780,y:490};this.mapCamera.zoom=Math.min(this.width/1580,(this.height-100)/1020);}
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
  if(!this.homeLayer){const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=960;
   this.homeLayer=Object.assign(Object.create(Renderer.prototype),{canvas,ctx:canvas.getContext('2d'),width:1536,height:960,dpr:1,layout:{compact:false,portrait:false,viewport:{x:0,y:0,w:1536,h:960}},camera:{x:768,y:480},scale:1,initialized:false,overview:true,assets:this.assets,particles:[],hitZones:[],loaded:true,district:'arena',lowQuality:false,_offscreen:true,hidePlayer:true});
  }
  const h=this.homeLayer;h.particles=this.particles;h.lowQuality=this.lowQuality;h.draw(s,dt);this.particles=h.particles;
  this.ctx.drawImage(h.canvas,0,0,1536,960);
  for(const zone of h.hitZones){if(zone.id==='office')this.hot('operation','staff',zone.x,zone.y,zone.w,zone.h);else this.hot('travel',zone.id,zone.x,zone.y,zone.w,zone.h);}
  // Select the actual playing surface to evolve it. Intake labels remain operational.
  for(const id of ['pitch1','pitch2','stands']){const p=WORLD_STRUCTURES[id];if(id==='pitch2'&&!s.fields[1].unlocked)continue;this.hot('building',id,p.x-p.w/2,p.y-p.h/2,p.w,p.h);}
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
  for(const road of this.roads||[]){if(road.length<2)continue;worldLine(c,road,43,'#324d3730');worldLine(c,road,33,'#cfbd88');worldLine(c,road,25,'#decda2');}
  // Entrances connect directly across parcel borders when a purchase is made.
  if(s.land.academy){worldLine(c,[{x:1340,y:850},{x:1580,y:850},{x:1770,y:850}],48,'#d7c394');}
  if(s.land.business){worldLine(c,[{x:210,y:892},{x:-150,y:892}],48,'#d7c394');}
  if(s.land.stadium){worldLine(c,[{x:855,y:80},{x:855,y:-155}],40,'#d7c394');}
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
  const c=this.ctx,spec=WORLD_STRUCTURES[id],w=spec.w*.78,d=spec.h*.64,x=p.x,y=p.y+spec.h*.25,h=st.phase===1?64:st.phase===2?94:st.phase===3?142:st.phase===4?172:204;
  c.save();c.shadowColor='#18332666';c.shadowBlur=10;c.shadowOffsetX=15;c.shadowOffsetY=13;worldPoly(c,[[x-w/2,y],[x+w/2,y],[x+w/2+28,y-d],[x-w/2+28,y-d]],'#335944');c.restore();
  const front=st.phase===1?'#c8aa75':st.phase===2?'#e1c692':'#e3d3b2',side=st.phase===1?'#938258':'#aaa68d';
  worldPoly(c,[[x-w/2,y],[x+w/2,y],[x+w/2,y-h],[x-w/2,y-h]],front);
  worldPoly(c,[[x+w/2,y],[x+w/2+28,y-d],[x+w/2+28,y-d-h],[x+w/2,y-h]],side);
  if(st.phase===1){c.strokeStyle='#977849';c.lineWidth=2;for(let yy=y-9;yy>y-h;yy-=12){c.beginPath();c.moveTo(x-w/2,yy);c.lineTo(x+w/2,yy);c.stroke();}}
  const roof=st.phase===1?'#887441':st.phase===2?'#527b65':'#176858';
  worldPoly(c,[[x-w/2-12,y-h],[x-w/2+20,y-h-d],[x+w/2+41,y-h-d],[x+w/2+10,y-h]],roof);
  c.strokeStyle='#ecf1b826';c.lineWidth=2;for(let i=0;i<10;i++){const xx=x-w/2+i*w/9;c.beginPath();c.moveTo(xx,y-h-3);c.lineTo(xx+32,y-h-d+3);c.stroke();}
  worldRound(c,x-19,y-55,38,55,'#244f44',3);worldRound(c,x-14,y-49,27,38,'#7fbdad',2);this.ellipse(x+8,y-22,2,2,'#e9c65e');
  const rows=st.phase>=3?2:1;for(let row=0;row<rows;row++)for(const sign of[-1,1]){const xx=x+sign*w*.31,yy=y-45-row*65;worldRound(c,xx-15,yy-19,30,28,'#466e61',2);worldRound(c,xx-12,yy-16,24,22,'#ffe9a3',1);c.strokeStyle='#799281';c.lineWidth=2;c.beginPath();c.moveTo(xx,yy-16);c.lineTo(xx,yy+6);c.stroke();}
  if(st.phase>=2){worldPoly(c,[[x-46,y-59],[x+46,y-59],[x+55,y-45],[x-55,y-45]],'#218565');}
  if(st.phase>=3){worldRound(c,x-w/2-4,y+1,w+8,7,'#335b4c',1);worldRound(c,x+w/2-17,y-h-d-40,3,45,'#d6d7ad',1);worldPoly(c,[[x+w/2-14,y-h-d-40],[x+w/2+30,y-h-d-35],[x+w/2-14,y-h-d-13]],'#e9ce64');this.tree(x-w/2-38,y+2,.48);}
  if(st.phase>=4){worldRound(c,x-w/2-22,y-20,36,25,'#315f4b',2);for(let i=0;i<4;i++)this.ellipse(x-w/2-18+i*8,y-25,8,10,'#589653');worldRound(c,x+w/2+40,y-30,10,35,'#627968',2);worldRound(c,x+w/2+29,y-38,32,8,'#fff1b7',2);}
  if(st.phase>=5){worldPoly(c,[[x-w/2+25,y-h-d+4],[x+w/2+22,y-h-d+4],[x+w/2+8,y-h-15],[x-w/2+11,y-h-15]],'#20576c');worldText(c,x,y-h+18,'CLUBE · EXCELÊNCIA',11,'#194739');}
  // Early internal improvements also have real visual effects before phase 3.
  for(let i=0;i<st.step;i++){worldRound(c,x-w*.39+i*22,y+17,17,9,'#e5d4a2',2);worldRound(c,x-w*.39+i*22,y+12,17,7,'#427f61',2);}
  if(id==='marketing'){const bx=x+w/2+45;worldRound(c,bx-5,y-110,7,106,'#697e5d',1);worldRound(c,bx-55,y-152,112,55,st.phase>=3?'#093c35':'#d8c69a',5);worldText(c,bx,y-132,'PARCEIROS',10,st.phase>=3?'#f9e5a0':'#385640');worldText(c,bx,y-116,`FASE ${st.phase}`,11,st.phase>=3?'#aadba8':'#385640');}
  if(id==='training'){
   for(let i=0;i<(st.phase>=3?6:3);i++){const xx=x-w*.32+i*22;worldPoly(c,[[xx,y+38],[xx+7,y+21],[xx+14,y+38]],'#e08a3c');c.fillStyle='#fcebbd';c.fillRect(xx+4,y+29,6,3);}
   if(s.map.training)for(let i=0;i<Math.min(6,s.map.training.ids.length);i++)this.actorSprite(x-w*.3+i*27+Math.sin(s.t*1.8+i)*8,y+67,'atleta-azul.png',34,s.t,true);
  }else if(s.facilities[id]>0){for(let i=0;i<Math.min(st.phase,3);i++)this.actorSprite(x-35+i*38+Math.sin(s.t*.4+i)*13,y+50,'torcedor-dourado.png',31,s.t,true);}
 }
 pitch(s,id,p,st){
  const c=this.ctx,sp=WORLD_STRUCTURES[id],x=p.x,y=p.y,w=sp.w*.84,h=sp.h*.71,ox=x-w/2,oy=y-h/2;
  for(let i=0;i<10;i++){c.fillStyle=i%2?(st.phase>=3?'#389a40':'#65894a'):(st.phase>=3?'#4dac4c':'#78994d');c.fillRect(ox+i*w/10,oy,w/10+1,h);}
  for(let i=0;i<300;i++){c.fillStyle='#e3ed8b20';c.fillRect(ox+worldRand(i)*w,oy+worldRand(i+122)*h,1,2);}
  c.strokeStyle='#f3f4cc';c.lineWidth=2;c.strokeRect(ox+9,oy+9,w-18,h-18);c.beginPath();c.moveTo(x,oy+9);c.lineTo(x,oy+h-9);c.stroke();c.beginPath();c.ellipse(x,y,h*.2,h*.2,0,0,Math.PI*2);c.stroke();
  for(const end of[-1,1]){const gx=x+end*(w/2-9);c.strokeRect(gx+(end<0?0:-w*.16),y-h*.25,w*.16,h*.5);c.strokeStyle='#ffffffbb';c.strokeRect(gx+(end<0?-12:0),y-25,12,50);for(let i=0;i<6;i++){c.beginPath();c.moveTo(gx+(end<0?-12:0),y-25+i*10);c.lineTo(gx+(end<0?0:12),y-25+i*10);c.stroke();}}
  const count=id==='youth'?6:10;for(let i=0;i<count;i++){const ours=i<count/2;const px=ox+40+(i%5)*(w-80)/4+Math.sin(s.t+i)*6,py=oy+(ours?.33:.78)*h+Math.cos(s.t*.9+i)*7;this.actorSprite(px,py,ours?'atleta-azul.png':'atleta-laranja.png',id==='stadium'?33:29,s.t,true);}
  this.ellipse(x+Math.sin(s.t*.75)*w*.32,y+Math.cos(s.t)*h*.25,5,5,'#fffdeb');this.ellipse(x+Math.sin(s.t*.75)*w*.32,y+Math.cos(s.t)*h*.25,2,2,'#163b2a');
  const rows=st.phase>=3?3:st.phase===2?2:1,chairs=st.phase===1?4+st.step*2:10+st.phase*4;
  for(let side of(id==='stadium'&&st.phase>=2?[-1,1]:[1]))for(let row=0;row<rows;row++){const yy=y+side*(h/2+18+row*14);worldRound(c,ox,yy-3,w,12,'#b5af8a',1);for(let n=0;n<chairs;n++){const px=ox+10+n*(w-20)/(chairs-1);worldRound(c,px-5,yy-6,10,9,n%4===0?'#f0d985':'#236f55',1);if(s.official&&id==='stadium')this.actorSprite(px,yy+3,'torcedor-verde.png',16,s.t,s.fields[0].lastGoalOurs&&s.t-s.fields[0].lastGoal<3);}}
  if(st.phase>=3){
   for(const a of[-1,1])for(const b of[-1,1]){const xx=x+a*(w/2+18),yy=y+b*(h/2+24);worldRound(c,xx-3,yy-80,6,84,'#829982',1);worldRound(c,xx-20,yy-88,40,13,'#f9e7a0',2);if(!this.lowQuality){const g=c.createRadialGradient(xx,yy-80,0,xx,yy-80,28);g.addColorStop(0,'#ffe59c55');g.addColorStop(1,'#ffe59c00');this.ellipse(xx,yy-80,28,22,g);}}
   worldPoly(c,[[ox-12,oy-70],[ox+w+12,oy-70],[ox+w+28,oy-40],[ox-28,oy-40]],'#236a55');
  }
  if(st.phase>=4){for(const side of[-1,1]){const xx=x+side*(w/2+37);worldRound(c,xx-15,y-h/2,30,h,'#557568',3);for(let i=0;i<9;i++)worldRound(c,xx-13,y-h/2+8+i*(h-15)/9,26,7,'#d6d9ab',1);}worldPoly(c,[[ox-20,oy+h+55],[ox+w+20,oy+h+55],[ox+w+32,oy+h+71],[ox-32,oy+h+71]],'#1b6053');}
  if(st.phase>=5){c.strokeStyle='#d6e1bf';c.lineWidth=8;c.beginPath();c.ellipse(x,y-h*.28,w*.61,h*.95,0,Math.PI,Math.PI*2);c.stroke();}
  if(id==='stadium'){const f=s.fields[0];this.plate(x-215,oy-111,430,32,`${s.club.sigla} (VOCÊ)  ${f.score[0]} × ${f.score[1]}  ADVERSÁRIO`,'#f8eba4',14);worldText(c,x,y+h/2+70,'SEU TIME · AZUL                         ADVERSÁRIO · LARANJA',11,'#fff2cc');}
 }
 drawWork(s,j){
  const p=s.map.placements[j.id],sp=WORLD_STRUCTURES[j.id],c=this.ctx,rect=structureRect(j.id,p),progress=j.elapsed/j.duration;
  c.save();c.strokeStyle='#cfab5f';c.lineWidth=4;for(let x=rect.x;x<=rect.x+rect.w;x+=48){c.beginPath();c.moveTo(x,rect.y+rect.h);c.lineTo(x,rect.y-32);c.stroke();}for(let y=rect.y-24;y<rect.y+rect.h;y+=35){c.beginPath();c.moveTo(rect.x,y);c.lineTo(rect.x+rect.w,y);c.stroke();}c.restore();
  for(const sign of[-1,1]){const x=p.x+sign*(sp.w/2+16),y=rect.y+rect.h+15;worldPoly(c,[[x-7,y],[x,y-19],[x+7,y]],'#df8642');}
  this.actorSprite(j.worker.x,j.worker.y+(j.worker.route.length?0:Math.sin(s.t*11)*2),'roupeiro.png',43,s.t,true);
  this.plate(p.x-130,rect.y-76,260,32,j.worker.route.length?'EQUIPE A CAMINHO':`EM OBRAS · ${Math.round(progress*100)}%`,'#ffe0a2',13);
  worldRound(c,p.x-105,rect.y-34,210,7,'#224b3c',3);worldRound(c,p.x-105,rect.y-34,Math.max(1,210*progress),7,'#f1cc65',3);
 }
 actorSprite(x,y,key,height,t,moving=false){
  const c=this.ctx,img=this.assets[key];if(!img)return;const h=height,w=h*.64,bob=moving?Math.sin(t*9+x*.03)*1.5:0;this.ellipse(x+5,y+3,w*.55,4,'#12372d44');c.save();c.translate(x,y-bob);if(moving)c.rotate(Math.sin(t*8)*.02);c.drawImage(img,-w/2,-h,w,h);c.restore();
 }
 drawActors(s){
  const c=this.ctx,m=s.map,a=m.actor;
  if(a.route.length){c.setLineDash([3,10]);worldLine(c,[a,...a.route],3,'#fff0a6aa');c.setLineDash([]);}
  this.ellipse(a.x,a.y,22,8,'#f1e18866');this.actorSprite(a.x,a.y,'gerente.png',48,s.t,a.walk>1);this.plate(a.x-27,a.y-72,54,20,'VOCÊ','#fff1b1',10);
  for(let i=0;i<s.player.carry;i++){const xx=a.x+18+(i%2)*8,yy=a.y-20-Math.floor(i/2)*9;this.ellipse(xx,yy,5,5,'#fff7da');this.ellipse(xx,yy,2,2,'#214c3d');}
  if(m.courierHired){const a=m.courier;this.actorSprite(a.x,a.y,'roupeiro.png',42,s.t,a.walk>1);for(let i=0;i<a.carry;i++)worldRound(c,a.x+12,a.y-12-i*10,13,10,'#d7ac5b',2);}
 }
 drawMinimap(s){
  const c=this.ctx;if(this.width<680){this.miniRect=null;return;}
  const w=182,h=98,x=20,y=this.height-212;this.miniRect={x,y,w,h};c.save();worldRound(c,x-6,y-6,w+12,h+12,'#143d32e8',9);
  for(const p of WORLD_PLOTS){c.fillStyle=s.land[p.id]?'#779b60':'#3e6349';c.fillRect(x+(p.x+960)/3456*w,y+(p.y+896)/1856*h,p.w/3456*w-1,p.h/1856*h-1);}
  const a=s.map.actor;this.ellipse(x+(a.x+960)/3456*w,y+(a.y+896)/1856*h,3,3,'#ffe797');
  const cw=this.width/this.scale,ch=this.height/this.scale;c.strokeStyle='#fff3c2';c.lineWidth=1;c.strokeRect(x+(this.mapCamera.x-cw/2+960)/3456*w,y+(this.mapCamera.y-ch/2+896)/1856*h,cw/3456*w,ch/1856*h);c.restore();
 }
}
