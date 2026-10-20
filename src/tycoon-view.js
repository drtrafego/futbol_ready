import { WorldRenderer } from './world-view.js';
import { WORLD_STRUCTURES, structureEntry, structureRect } from './world-model.js';
import { facilityStage } from './facilities.js';
import { fieldFans, seatCapacity } from './simulation.js';
import { ensureTycoon, clubObjective } from './tycoon-model.js';
import { restaurantCapacity } from './tycoon-economy.js';
import { stadiumDisplay } from './tycoon-simulation.js';

export class TycoonRenderer extends WorldRenderer {
  draw(s,dt){ensureTycoon(s);super.draw(s,dt);}
  drawHome(s,dt){
    // Compatibility with the current procedural renderer, which reads `cash`.
    // This is only a read view; all wallet/cash transactions stay in Simulation.
    super.drawHome({...s,cash:s.cashDesk},dt);
    if(this.simCityMode)this.drawProgressiveHomeStands(s);
  }
  drawProgressiveHomeStands(s){
    const c=this.ctx,p=WORLD_STRUCTURES.stands,cap=seatCapacity(s),level=s.facilities.stands||0,stage=facilityStage(level),rows=Math.max(1,Math.ceil(cap/12));
    c.save();c.fillStyle='#d5cca8';c.fillRect(p.x-p.w/2-28,p.y-57,p.w+56,124);
    for(let row=0;row<rows;row++){
      const y=p.y-10+row*14,count=Math.min(12,cap-row*12);c.fillStyle='#b7af8c';c.fillRect(p.x-p.w/2,y-5,p.w,12);
      for(let n=0;n<count;n++){const x=p.x-p.w/2+16+n*28;c.fillStyle=n%3?'#215e49':'#edd894';c.fillRect(x-4,y-6,9,10);if(fieldFans(s,0).length>row*12+n){const jump=s.fields[0].lastGoalOurs&&s.t-s.fields[0].lastGoal<2.3?Math.abs(Math.sin(s.t*10+n))*5:0;this.actorSprite(x,y-jump,'torcedor-verde.png',20,s.t,jump>0);}}
    }
    if(stage.phase>=3){c.fillStyle='#1d5844';c.beginPath();c.moveTo(p.x-p.w/2-12,p.y-40);c.lineTo(p.x+p.w/2+12,p.y-40);c.lineTo(p.x+p.w/2+25,p.y-57);c.lineTo(p.x-p.w/2-25,p.y-57);c.closePath();c.fill();}
    if(stage.phase>=4){c.fillStyle='#eff3cb';for(const x of[p.x-p.w/2-15,p.x+p.w/2+15]){c.fillRect(x-2,p.y-46,4,64);c.fillRect(x-10,p.y-50,20,7);}}
    this.plate(p.x-120,p.y+51,240,25,`${cap} LUGARES · ${level?`FASE ${stage.phase}`:'ARQUIBANCADA INICIAL'}`,'#fbe8a1',11);
    this.hot('building','stands',p.x-p.w/2-16,p.y-58,p.w+32,135);c.restore();
  }
  pitch(s,id,p,stage){
    if(id!=='stadium'){super.pitch(s,id,p,stage);return;}
    const display=stadiumDisplay(s),m=s.tycoon.stadium.match;
    const field=display?{...s.fields[0],...display}:{...s.fields[0],score:[0,0],remaining:0,lastGoal:-100,lastGoalOurs:true};
    super.pitch({...s,fields:[field,s.fields[1]],official:null},id,p,stage);
    const sp=WORLD_STRUCTURES[id],y=p.y-sp.h*.71/2;
    this.plate(p.x-215,y-111,430,32,`${s.club.sigla} (VOCÊ) ${field.score[0]} × ${field.score[1]} ${display?.opponent||'ADVERSÁRIO'}`,'#f8eba4',13);
    if(m?.venue==='stadium'){const width=sp.w*.84,height=sp.h*.71;for(const a of s.tycoon.stadium.audience.filter(a=>a.phase==='seated')){const row=Math.floor(a.seat/12),x=p.x-width/2+12+(a.seat%12)*(width-24)/11,yy=p.y+height/2+20+row*14;const jump=m.lastGoalOurs&&s.t-m.lastGoal<2.5?Math.abs(Math.sin(s.t*12+a.seat))*5:0;this.actorSprite(x,yy-jump,'torcedor-verde.png',19,s.t,jump>0);}}
    this.plate(p.x-240,y-146,480,29,m?(m.venue==='away'?'FORA DE CASA · ACOMPANHAMENTO DA RODADA':m.phase==='admission'?`ESTÁDIO · TORCIDA ENTRANDO ${m.admitted}`:`ESTÁDIO · ${Math.ceil(m.duration-m.elapsed)}s`):'ESTÁDIO PRÓPRIO · ARENA LIVRE PARA OPERAR','#cfebc5',12);
    if(m?.venue==='stadium')this.plate(p.x-200,p.y+sp.h/2+104,400,28,`${m.admitted} INGRESSOS PAGOS · ${m.ticketRevenue} MOEDAS`,'#efe4ae',12);
  }
  drawActors(s){
    super.drawActors(s);const t=ensureTycoon(s),c=t.canteen,pos=s.map.placements.canteen;
    if(c.shipment){const a=c.shipment;this.actorSprite(a.x,a.y,'roupeiro.png',42,s.t,a.walk>1);this.ctx.fillStyle='#dcb362';this.ctx.fillRect(a.x+12,a.y-20,15,14);this.plate(a.x-51,a.y-68,102,21,'LANCHES A CAMINHO','#fff0ad',9);}
    if(pos&&s.facilities.canteen){
      const p=structureEntry('canteen',pos);
      if(c.cook)this.actorSprite(p.x-25,p.y-25,'torcedor-dourado.png',37,s.t,c.guests.length>0);
      for(let i=0;i<Math.min(6,c.stock);i++){this.ctx.fillStyle='#efc07a';this.ctx.fillRect(p.x+12+i*9,p.y-29,7,6);}
      this.plate(pos.x-130,pos.y-95,260,27,`${c.stock}/${restaurantCapacity(s)} LANCHES · FILA ${c.guests.length}`,c.stock?'#dcf4bc':'#ffc6a4',11);
      for(const g of c.guests)if(g.phase==='queue')this.plate(g.x-18,g.y-52,36,19,c.stock?'…':'!',c.stock?'#ecf6ca':'#ffc4a3',11);
    }
    for(const a of t.stadium.audience||[])if(a.phase==='approach'||a.phase==='leaving')this.actorSprite(a.x,a.y,'torcedor-verde.png',34,s.t,a.walk>1);
    const g=clubObjective(s),target=WORLD_STRUCTURES[g.focus];
    if(target&&!this.selection&&!this.placement){const p=s.map.placements[g.focus]||target;this.ctx.save();this.ctx.strokeStyle='#ffe5a1';this.ctx.lineWidth=2;this.ctx.setLineDash([6,9]);this.ctx.beginPath();this.ctx.ellipse(p.x,structureEntry(g.focus,p).y,32+Math.sin(s.t*2)*3,13,0,0,Math.PI*2);this.ctx.stroke();this.ctx.restore();}
  }
}
