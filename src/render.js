import { drawCampus } from './campus.js';
import { facilityStage } from './facilities.js';
import { CFG } from './config.js';
import { clamp, near } from './navigation.js';
import { currentMission, fieldFans, seatCapacity } from './simulation.js';
import { ART, interpolateRow, worldToArt, artToWorld, sceneLayout } from './scene.js';

/** Layered, pre-rendered 2.5D scene. Environment is the approved artwork;
 * manager, runner, visitors, counters, match feedback and inputs are live.
 * Painted crowd and painted footballers are decorative, not 3D agents.
 */
export class Renderer {
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
    if(!this.ctx)throw new Error('Canvas 2D indisponível.');
    this.lowQuality=false;this.particles=[];this.hitZones=[];this.initialized=false;
    this.camera={x:768,y:480};this.scale=1;this.assets={};this.lastPlayer={...CFG.player};
    this.resize();this.overview=!this.layout.compact;
    const files=['arena-cenario.png','arena-mapa.png','gerente.png','roupeiro.png','torcedor-verde.png','torcedor-roxo.png','torcedor-dourado.png','atleta-azul.png','atleta-laranja.png'];
    this.ready=Promise.all(files.map(name=>new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>{this.assets[name]=image;resolve();};
      image.onerror=()=>reject(new Error(`O arquivo visual assets/${name} não carregou. Publique a pasta assets junto do jogo.`));
      image.src=globalThis.ARENA_ASSETS?.[name] || `./assets/${name}`;
    }))).then(()=>{this.loaded=true;});
  }
  resize(){
    this.width=innerWidth;this.height=innerHeight;const priorCompact=this.layout?.compact;this.layout=sceneLayout(this.width,this.height);
    if(priorCompact!==undefined&&priorCompact!==this.layout.compact){this.overview=!this.layout.compact;const b=document.getElementById('view-button');if(b)b.textContent=this.overview?'SEGUIR GERENTE':'VISÃO GERAL';}
    this.dpr=Math.min(devicePixelRatio||1,this.lowQuality?1:2);
    this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);
    this.canvas.style.width=this.width+'px';this.canvas.style.height=this.height+'px';
    const hs=this.layout.hudScale,style=document.documentElement.style;
    style.setProperty('--hud-scale',String(hs));style.setProperty('--hud-x',((this.width-1536*hs)/2)+'px');
    style.setProperty('--hud-y',((this.height-960*hs)/2)+'px');
    this.initialized=false;
  }
  screen(x,y){return{x:this.ox+x*this.scale,y:this.oy+y*this.scale};}
  p(x,z,h=0){const p=worldToArt(x,z);return this.screen(p.x,p.y-h*36);}
  unproject(x,y){return artToWorld((x-this.ox)/this.scale,(y-this.oy)/this.scale);}
  screenAxisToWorld(dx,dy){
    const p=worldToArt(this.lastPlayer.x,this.lastPlayer.z),q=artToWorld(p.x+dx*30,p.y+dy*30);
    const x=q.x-this.lastPlayer.x,z=q.z-this.lastPlayer.z,n=Math.hypot(x,z)||1;
    const power=Math.min(1,Math.hypot(dx,dy));return{x:x/n*power,z:z/n*power};
  }
  clickPosition(x,y){
    for(const h of this.hitZones){if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h)return{...h.point,zone:h.id,facility:h.facility,plot:h.plot};}
    return this.unproject(x,y);
  }
  addEvents(events){
    for(const e of events)if(e.position&&['cash','delivery','goal','conceded','officialResult','match','purchase'].includes(e.type))this.particles.push({...e,age:0});
    if(this.particles.length>24)this.particles.splice(0,this.particles.length-24);
  }
  plate(x,y,w,h,text,accent='#f5f8da',size=12){
    const c=this.ctx;c.save();c.shadowColor='#001f1bb0';c.shadowBlur=7;c.shadowOffsetY=3;
    const g=c.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'#1d5448');g.addColorStop(1,'#0b302b');
    c.fillStyle=g;c.beginPath();c.roundRect(x,y,w,h,11);c.fill();c.shadowColor='transparent';
    c.lineWidth=1.3;c.strokeStyle='#ddedac80';c.stroke();
    c.fillStyle=accent;c.font=`850 ${size}px system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,x+w/2,y+h/2+1,w-12);c.restore();
  }
  ellipse(x,y,rx,ry,color){const c=this.ctx;c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
  person(actor,s,role='fan'){
    const c=this.ctx,p=worldToArt(actor.x,actor.z),unit=interpolateRow(actor.z)[3];
    const size=role==='player'?1.15:1;
    const h=unit*1.36*size,w=h*33/53;
    const bob=actor.walk>.1?Math.sin(s.t*11+actor.x)*1.7:0;
    this.ellipse(p.x-6,p.y+2,w*.65,5,'#1f2c2c42');
    if(role==='player'){
      const g=c.createRadialGradient(p.x,p.y,3,p.x,p.y,28);g.addColorStop(0,'#fff0a560');g.addColorStop(1,'#ffe7a500');
      this.ellipse(p.x,p.y,32,12,g);c.strokeStyle='#fff9ad';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,23,8,0,0,Math.PI*2);c.stroke();
    }
    const choices=['torcedor-verde.png','torcedor-roxo.png','torcedor-dourado.png','gerente.png'];
    const key=role==='player'?'gerente.png':role==='runner'?'roupeiro.png':choices[(actor.color||0)%choices.length];
    c.save();c.translate(p.x,p.y-bob);if(actor.walk>.1)c.rotate(Math.sin(s.t*9)*.027);
    c.drawImage(this.assets[key],-w/2,-h,w,h);c.restore();
    if(role==='player')this.plate(p.x-24,p.y-h-25,48,21,'VOCÊ','#ffeca5',10);
    if(role==='runner')this.plate(p.x-14,p.y-h-21,28,19,'R','#d9f6af',10);
    for(let i=0;i<Math.min(actor.carry||0,9);i++){
      const bx=p.x+w*.47+(i%2)*10,by=p.y-20-Math.floor(i/2)*12;
      this.ellipse(bx+2,by+3,7,6,'#123d3938');this.ellipse(bx,by,7,7,'#fffbed');
      c.fillStyle='#163b36';c.beginPath();for(let k=0;k<5;k++){const a=k*Math.PI*2/5-.3;const q=[bx+Math.cos(a)*3.5,by+Math.sin(a)*3.5];k?c.lineTo(...q):c.moveTo(...q);}c.fill();
    }
  }
  foreground(points){
    const c=this.ctx;c.save();c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();c.drawImage(this.frameArt||this.assets['arena-cenario.png'],0,0,1536,960);c.restore();
  }
  draw(s,dt){
    if(!this.loaded)return;
    if(this.district&&this.district!=='arena'){document.body.dataset.district='club';drawCampus(this,s,dt);return;}
    if(!this._offscreen)document.body.dataset.district='arena';
    const c=this.ctx,v=this.layout.viewport;this.lastPlayer=s.player;
    const mode=this.overview?'overview':'follow';if(!this._offscreen&&document.body.dataset.camera!==mode)document.body.dataset.camera=mode;
    const actor=worldToArt(s.player.x,s.player.z);
    let desiredScale,target;
    if(!this.layout.compact&&this.overview){desiredScale=Math.min(this.width/1536,this.height/960);target={x:768,y:480};}
    else if(this.overview){desiredScale=Math.min(v.w/1110,v.h/720);target={x:780,y:516};}
    else{desiredScale=this.layout.portrait?clamp(v.w/570,.56,.9):clamp(v.h/540,.55,1.12);target={x:clamp(actor.x+45,330,1170),y:clamp(actor.y-90,370,660)};}
    if(!this.initialized){this.camera={...target};this.scale=desiredScale;this.initialized=true;}
    const smooth=1-Math.exp(-dt*7);this.camera.x+=(target.x-this.camera.x)*smooth;this.camera.y+=(target.y-this.camera.y)*smooth;this.scale+=(desiredScale-this.scale)*smooth;
    this.frameArt=this.assets[this._offscreen?'arena-mapa.png':!this.layout.compact&&this.overview?'arena-cenario.png':'arena-mapa.png'];
    this.ox=v.x+v.w/2-this.camera.x*this.scale;this.oy=v.y+v.h/2-this.camera.y*this.scale;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#0b2c25';c.fillRect(0,0,this.width,this.height);
    c.save();c.beginPath();c.rect(v.x,v.y,v.w,v.h);c.clip();c.translate(this.ox,this.oy);c.scale(this.scale,this.scale);
    c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(this.frameArt||this.assets['arena-cenario.png'],0,0,1536,960);
    this.drawLivePitches(s);
    // Visible expansion state: a painted second pitch is not an unlocked operation.
    if(!s.fields[1].unlocked){
      c.fillStyle='#123e32de';c.beginPath();c.moveTo(888,207);c.lineTo(1204,207);c.lineTo(1244,426);c.lineTo(851,426);c.closePath();c.fill();
      c.setLineDash([8,7]);c.strokeStyle='#eed982';c.lineWidth=2;c.stroke();c.setLineDash([]);
      this.plate(932,275,225,48,'NOVA ARENA','#ffe795',20);this.plate(944,332,202,33,'DESBLOQUEAR · 600','#fff2c1',13);
    }
    const mission=currentMission(s);
    const zones=[['supply',CFG.supply,[258,649,111,36],'PEGAR KITS','#a7e6ee'],['field0',CFG.fields[0].intake,[408,533,104,35],'PREPARAR','#f0efa8'],['gate',CFG.gate,[539,677,106,36],'INGRESSOS','#d8c6fa'],['cash',CFG.cash,[819,668,94,36],'CAIXA','#ffe190'],['office',CFG.office,[1100,664,110,36],'EVOLUIR','#ffcea3']];
    if(s.fields[1].unlocked)zones.push(['field1',CFG.fields[1].intake,[861,532,107,37],'PREPARAR','#f0efa8']);
    this.hitZones=[];
    for(const [id,p,rect,label,color] of zones){
      const at=worldToArt(p.x,p.z),active=near(s.player,p),highlight=mission?.zone===id;
      if(active||highlight){c.save();c.globalAlpha=active?.4:.18;c.fillStyle=color;c.beginPath();c.ellipse(at.x,at.y-9,42+(highlight?Math.sin(s.t*3)*2:0),19,0,0,Math.PI*2);c.fill();c.globalAlpha=1;c.strokeStyle=color;c.lineWidth=2;c.stroke();c.restore();}
    }
    // Route hint is derived from the same path used by the simulation.
    if(s.player.route.length&&!this.lowQuality){c.save();c.setLineDash([2,9]);c.strokeStyle='#ffef9aaa';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(actor.x,actor.y);for(const p of s.player.route){const q=worldToArt(p.x,p.z);c.lineTo(q.x,q.y);}c.stroke();c.restore();}
    const drawable=[];
    if(!this.hidePlayer)drawable.push({y:actor.y,draw:()=>this.person(s.player,s,'player')});
    if(s.staff.runner){const p=worldToArt(s.runner.x,s.runner.z);drawable.push({y:p.y,draw:()=>this.person(s.runner,s,'runner')});}
    for(const fan of s.fans){if(fan.phase==='watching')continue;const p=worldToArt(fan.x,fan.z);drawable.push({y:p.y,draw:()=>this.person(fan,s)});}
    drawable.push({y:586,draw:()=>this.foreground([[248,491],[413,480],[411,583],[247,583]])});
    drawable.push({y:589,draw:()=>this.foreground([[1030,517],[1081,473],[1280,475],[1290,585],[1033,587]])});
    drawable.push({y:702,draw:()=>this.foreground([[631,614],[775,611],[778,700],[646,704]])});
    drawable.push({y:701,draw:()=>this.foreground([[818,623],[834,600],[904,614],[909,698],[817,701]])});
    for(const d of drawable.sort((a,b)=>a.y-b.y))d.draw();
    // Paint real counters OVER the flattened source counters, never beside them.
    for(const f of s.fields){
      const id=f.id,x=id?980:610,y=id?112:97,active=f.remaining>0;
      this.plate(id?941:568,id?74:61,242,25,`${s.club.sigla} (SEU TIME)  |  ADVERSÁRIO`,'#ffe8a5',11);
      this.plate(x,y,118,43,f.unlocked?`${f.score[0]}  :  ${f.score[1]}`:'FECHADO','#eaf98b',f.unlocked?23:14);
      const status=f.unlocked?(active?`${s.official&&id===0?'OFICIAL':'AMISTOSO'} · ${Math.ceil(f.remaining)}s`:f.stock?'AGUARDANDO TORCIDA':'PRECISA DE KITS'):'ABRA EM EVOLUIR';
      this.plate(id?962:582,id?151:138,id?168:177,36,status,'#f6fae9',11);
      const n=fieldFans(s,id).length;
      this.plate(id?919:481,398,217,35,f.unlocked?`${n}/${seatCapacity(s)} TORCEDORES · ${f.stock} KITS`:'EXPANSÃO DISPONÍVEL','#eaf6d6',12);
      if(active){
        const q=worldToArt(CFG.fields[id].x,-6),r=7,px=q.x+Math.sin(s.t*.9)*42,py=q.y+Math.sin(s.t*1.2)*35;
        this.ellipse(px+4,py+4,r+2,r*.55,'#0e3f3344');this.ellipse(px,py,r,r,'#fff9e1');this.ellipse(px,py,3,3,'#193d34');
      }
    }
    this.plate(253,449,158,37,`DEPÓSITO · ${s.kits}/${CFG.supply.capacity}`,'#e3f8ef',13);
    for(const [id,point,rect,label,color] of zones){
      this.plate(...rect,label,color,13);
      const p=this.screen(rect[0],rect[1]);const min=44;
      this.hitZones.push({id,point,x:p.x-Math.max(0,(min-rect[2]*this.scale)/2),y:p.y-Math.max(0,(min-rect[3]*this.scale)/2),w:Math.max(min,rect[2]*this.scale),h:Math.max(min,rect[3]*this.scale)});
    }
    if(!s.fields[1].unlocked){const p=this.screen(932,275);this.hitZones.push({id:'office',point:CFG.office,x:p.x,y:p.y,w:225*this.scale,h:90*this.scale});}
    // Result feedback is visual only. Economy changes in Simulation, not here.
    this.particles=this.particles.filter(p=>p.age<1.6);
    for(const e of this.particles){e.age+=dt;const p=worldToArt(e.position.x,e.position.z);c.globalAlpha=Math.max(0,1-e.age/1.6);this.plate(p.x-90,p.y-60-e.age*35,180,32,e.text,e.type==='conceded'?'#ffc8b3':'#ffe391',e.type==='goal'?19:12);c.globalAlpha=1;}
    c.restore();
    if(this.layout.compact){
      c.save();const g=c.createLinearGradient(0,v.y,0,v.y+32);g.addColorStop(0,'#0b2c25');g.addColorStop(1,'#0b2c2500');c.fillStyle=g;c.fillRect(0,v.y,this.width,32);c.restore();
    }
  }
  drawLivePitches(s){
    const c=this.ctx;
    for(const f of s.fields){
      if(!f.unlocked)continue;
      const id=f.id,st=facilityStage(s.facilities[id?'pitch2':'pitch1']);
      const left=id?887:493,right=id?1200:811,bottomL=id?856:433,bottomR=id?1238:766,top=218,bottom=395;
      c.save();c.beginPath();c.moveTo(left,top);c.lineTo(right,top);c.lineTo(bottomR,bottom);c.lineTo(bottomL,bottom);c.closePath();c.clip();
      for(let i=0;i<10;i++){c.fillStyle=i%2?(st.phase>=3?'#349242':'#448f42'):(st.phase>=3?'#61b64d':'#66a24b');c.fillRect(400,top+i*(bottom-top)/10,870,(bottom-top)/10+1);}
      c.fillStyle='#e9f3a316';for(let g=0;g<600;g++){const gx=left+(g*37%347),gy=top+(g*23%179);c.fillRect(gx,gy,1.5,1);}
      c.strokeStyle='#eff7d4';c.lineWidth=2;c.beginPath();c.moveTo(left+8,top+3);c.lineTo(right-8,top+3);c.lineTo(bottomR-8,bottom-3);c.lineTo(bottomL+8,bottom-3);c.closePath();c.stroke();c.beginPath();c.moveTo((left+bottomL)/2,306);c.lineTo((right+bottomR)/2,306);c.stroke();c.beginPath();c.ellipse((left+right+bottomL+bottomR)/4,307,29,17,0,0,Math.PI*2);c.stroke();
      c.strokeRect((left+right)/2-45,top,90,33);c.strokeRect((bottomL+bottomR)/2-52,bottom-33,104,33);
      for(let n=0;n<6;n++){const ours=n<3,px=(n%3)*(right-left-100)/2+(ours?left:bottomL)+45+Math.sin(s.t*.7+n)*7,py=(ours?263:352)+Math.cos(s.t+n)*5;const actor=this.assets[ours?'atleta-azul.png':'atleta-laranja.png'];c.drawImage(actor,px-10,py-30,20,32);}
      c.restore();
      const cap=seatCapacity(s),startX=id?865:407,endX=id?1236:752,y=444;
      c.fillStyle='#c7b484';c.beginPath();c.moveTo(startX,y-8);c.lineTo(endX,y-8);c.lineTo(endX-8,y+35);c.lineTo(startX-12,y+35);c.closePath();c.fill();
      const count=Math.min(cap,36),perRow=Math.min(12,count),rowCount=Math.ceil(count/perRow),fans=fieldFans(s,id).length;
      for(let n=0;n<count;n++){const row=Math.floor(n/perRow),px=startX+18+(n%perRow)*(endX-startX-36)/(perRow-1||1),py=y+row*11;c.fillStyle='#255b48';c.fillRect(px-8,py,16,10);c.fillStyle='#e5d8a0';c.fillRect(px-7,py-2,14,3);if(n<fans){const bounce=f.lastGoalOurs&&s.t-f.lastGoal<2.5?Math.abs(Math.sin(s.t*12+n))*6:0;c.drawImage(this.assets['torcedor-verde.png'],px-8,py-22-bounce,16,25);}}
      if(st.phase>=3){c.fillStyle='#1c5544';c.fillRect(startX-9,y-17,endX-startX+10,7);for(const px of[startX-5,endX-3]){c.fillStyle='#809384';c.fillRect(px,y-76,4,59);c.fillStyle='#ffe5a1';c.fillRect(px-12,y-83,28,7);}}
      this.plate(id?968:555,484,160,23,`FASE ${st.phase} · ${st.step}/3`,'#faf1af',10);
    }
  }

}
