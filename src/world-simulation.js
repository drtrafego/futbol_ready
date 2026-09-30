import { Simulation, newGame, walkingSpeed } from './simulation.js';
import { CFG } from './config.js';
import { FACILITIES, canUpgradeFacility, facilityStage } from './facilities.js';
import { calculateTrainingCost } from './roster.js';
import { worldToArt, artToWorld } from './scene.js';
import { walkable } from './navigation.js';
import { WORLD_PLOTS, WORLD_STRUCTURES, TRAINING_KIT_LIMIT, ensureWorld, mapPlacementCheck, mapWalkable, structureEntry, worldPath, advanceMapActor } from './world-model.js';

export function trainingQuote(s,kind='team',id=''){
 const list=kind==='youth'?s.youthList:s.roster;
 const players=kind==='team'?list.filter(p=>p.starter&&p.overall<p.potential):list.filter(p=>p.id===id&&p.overall<p.potential);
 const coins=kind==='team'?Math.max(1,Math.ceil(players.reduce((sum,p)=>sum+calculateTrainingCost(p,s.facilities.training),0)*.65)):players.reduce((sum,p)=>sum+calculateTrainingCost(p,s.facilities.training+(kind==='youth'?s.facilities.youth:0)),0);
 const kits=kind==='team'?Math.ceil(players.length/3):1,duration=Math.max(12,Math.round((kind==='team'?35:24)*(1-Math.min(.4,s.facilities.training*.025))));
 let reason='';
 if(!s.facilities.training)reason='Construa o centro de treinamento no terreno da formação.';
 else if(kind==='youth'&&!s.facilities.youth)reason='Construa primeiro o campo da base.';
 else if(s.map?.construction.some(j=>j.id==='training'))reason='O CT está em obras. Aguarde a conclusão.';
 else if(s.map?.training)reason='Já existe um treino em andamento.';
 else if(s.official)reason='A equipe está disputando uma partida oficial.';
 else if(!players.length)reason='Os atletas selecionados já atingiram seu potencial ou não estão disponíveis.';
 else if(s.wallet<coins)reason=`Faltam ${coins-s.wallet} moedas para o treino.`;
 else if((s.map?.ctKits||0)<kits)reason=`Faltam ${kits-(s.map?.ctKits||0)} kits no CT. Leve os kits do depósito ou contrate o auxiliar logístico.`;
 return{ok:!reason,reason,coins,kits,duration,ids:players.map(p=>p.id)};
}
/** Same economy, league, profiles and arena rules; a physical world layer is
 * added rather than replacing those systems with decorative pages. */
export class WorldSimulation extends Simulation{
 constructor(state=newGame()){super(state);ensureWorld(this.state);}
 purchase(id){const result=super.purchase(id);if(result.ok&&id==='field2'){const p=WORLD_STRUCTURES.pitch2;this.state.map.placements.pitch2={x:p.x,y:p.y};}return result;}
 updateGate(dt){const a=this.state.map.actor,g=worldToArt(CFG.gate.x,CFG.gate.z);if(!this.state.staff.gate&&Math.hypot(a.x-g.x,a.y-g.y)>58){this.state.timers.gate=0;return;}super.updateGate(dt);}
 goTo(point){if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z))return false;return this.goMap(worldToArt(point.x,point.z));}
 goMap(point){const m=ensureWorld(this.state),route=worldPath(this.state,m.actor,point);if(!route.length)return false;m.actor.route=route;this.state.player.route=[];return true;}
 moveToStructure(id){const s=this.state,p=s.map.placements[id];return p?this.goMap(structureEntry(id,p)):false;}
 buyLand(id){
  const s=this.state,p=WORLD_PLOTS.find(p=>p.id===id);if(!p||id==='home'||s.land[id])return{ok:false,reason:'Terreno já adquirido ou inexistente.'};
  if(!s.fields[1].unlocked)return{ok:false,reason:'Abra o segundo campo para liberar a expansão do clube.'};
  if(s.wallet<p.cost)return{ok:false,reason:`Faltam ${p.cost-s.wallet} moedas para este terreno.`};
  // All three expansion parcels touch the original owned arena. No teleport.
  s.wallet-=p.cost;s.land[id]=true;this.emit('purchase',`${p.name} adquirido. A cerca foi aberta; escolha onde construir.`);return{ok:true,cost:p.cost};
 }
 upgradeFacility(id,position=null){
  const s=this.state,m=ensureWorld(s),spec=WORLD_STRUCTURES[id],f=FACILITIES[id];
  if(!f||!spec)return{ok:false,reason:'Instalação inválida.'};
  if(m.construction.some(j=>j.id===id))return{ok:false,reason:'Esta instalação já está em obras.'};
  if(m.construction.length>=2)return{ok:false,reason:'As duas equipes de obra estão ocupadas.'};
  if(id==='training'&&m.training)return{ok:false,reason:'Espere o treino terminar antes de reformar o CT.'};
  const from=s.facilities[id]||0,check=canUpgradeFacility(id,from,s.season.divisionIndex,s.wallet,s);if(!check.ok)return check;
  const p=m.placements[id]||position||(spec.fixed?{x:spec.x,y:spec.y}:null);
  if(!p)return{ok:false,placement:true,reason:'Escolha a posição da construção no próprio terreno.'};
  const valid=mapPlacementCheck(s,id,p,true);if(!valid.ok)return valid;
  const isNew=!m.placements[id];
  if(isNew&&!spec.fixed&&Math.abs(m.actor.x-p.x)<spec.w/2+15&&Math.abs(m.actor.y-p.y)<spec.h/2+15)return{ok:false,reason:'Mova o gerente antes de construir nesta posição.'};
  m.placements[id]={x:p.x,y:p.y};
  const entry=structureEntry(id,p),workerStart={x:820,y:910},route=worldPath(s,workerStart,entry);
  if(!route.length){if(isNew)delete m.placements[id];return{ok:false,reason:'Não há acesso até a obra. Deixe espaço ao redor da entrada.'};}
  s.wallet-=check.cost;
  const duration=12+Math.ceil((from+1)/3)*5;
  m.construction.push({id,from,to:from+1,elapsed:0,duration,worker:{...workerStart,route,walk:0}});
  // New foundations may intersect an old route. Recalculate paths instead of
  // letting actors cross the new building or teleporting them.
  for(const actor of [m.actor,m.courier,...m.construction.map(j=>j.worker)])if(actor.route.length&&actor.route.some(q=>!mapWalkable(s,q.x,q.y))){const goal=actor.route.at(-1);actor.route=worldPath(s,actor,goal);}
  this.emit('construction',`Obra iniciada: ${f.name}. Benefício liberado só ao concluir.`);
  return{ok:true,cost:check.cost,duration,construction:true};
 }
 hireCourier(){const s=this.state,m=ensureWorld(s);if(m.courierHired)return{ok:false,reason:'Auxiliar já contratado.'};if(!s.facilities.training)return{ok:false,reason:'Construa o CT antes de contratar o auxiliar.'};if(s.wallet<240)return{ok:false,reason:'O auxiliar custa 240 moedas.'};s.wallet-=240;m.courierHired=true;this.emit('hire','Auxiliar logístico contratado. Ele leva kits reais do depósito ao CT.');return{ok:true,cost:240};}
 trainPlayer(id){return this.startTraining('player',id);}
 trainYouth(id){return this.startTraining('youth',id);}
 trainTeam(){return this.startTraining('team');}
 startTraining(kind,id=''){
  const s=this.state;ensureWorld(s);const q=trainingQuote(s,kind,id);if(!q.ok)return q;
  s.wallet-=q.coins;s.map.ctKits-=q.kits;s.map.training={kind,ids:q.ids,elapsed:0,duration:q.duration};
  this.emit('trainingStart',`Treino iniciado: ${q.coins} moedas + ${q.kits} kits. Duração ${q.duration}s de jogo.`);
  return{...q,started:true};
 }
 sellPlayer(id){if(this.state.map.training?.ids.includes(id))return{ok:false,reason:'Espere este atleta terminar o treino.'};return super.sellPlayer(id);}
 sellYouth(id){if(this.state.map.training?.ids.includes(id))return{ok:false,reason:'Espere o jovem terminar o treino.'};return super.sellYouth(id);}
 promoteYouth(id){if(this.state.map.training?.ids.includes(id))return{ok:false,reason:'Espere o jovem terminar o treino.'};return super.promoteYouth(id);}
 playLeagueRound(){if(this.state.map.training)return{ok:false,reason:'O treino está em andamento. Aguarde para disputar a rodada.'};return super.playLeagueRound();}
 updatePlayer(dt,input){
  const s=this.state,m=ensureWorld(s),a=m.actor,p=s.player,before={x:a.x,y:a.y};
  let dx=Number.isFinite(input.x)?input.x:0,dy=Number.isFinite(input.z)?input.z:0;
  if(Math.hypot(dx,dy)>.05){a.route=[];const len=Math.max(1,Math.hypot(dx,dy)),speed=walkingSpeed(s)*38,step=speed*dt;dx=dx/len*step;dy=dy/len*step;
   if(mapWalkable(s,a.x+dx,a.y+dy)){a.x+=dx;a.y+=dy;}else{if(mapWalkable(s,a.x+dx,a.y))a.x+=dx;if(mapWalkable(s,a.x,a.y+dy))a.y+=dy;}
  }else advanceMapActor(a,dt,walkingSpeed(s)*38);
  a.walk=Math.hypot(a.x-before.x,a.y-before.y)/dt;s.stats.walked+=Math.hypot(a.x-before.x,a.y-before.y)/38;
  const local=artToWorld(a.x,a.y);p.route=[];
  // The original interaction logic still owns pickup, field supply and cashier.
  if(a.x>=0&&a.x<=1536&&a.y>=0&&a.y<=960&&walkable(local.x,local.z)){
   p.x=local.x;p.z=local.z;super.updatePlayer(dt,{x:0,z:0});
  }
  p.walk=a.walk/38;
  const ct=m.placements.training;
  if(ct&&s.facilities.training>0&&Math.hypot(a.x-structureEntry('training',ct).x,a.y-structureEntry('training',ct).y)<58&&p.carry>0&&m.ctKits<TRAINING_KIT_LIMIT){
   // Delivery has a separate clock, so closing panels never manufactures kits.
   this.deliveryClock=(this.deliveryClock||0)+dt;
   if(this.deliveryClock>=CFG.transferInterval){this.deliveryClock=0;p.carry--;m.ctKits++;m.delivered++;this.emit('ctDelivery','+1 kit entregue ao CT.');}
  }else this.deliveryClock=0;
 }
 tick(delta,input={x:0,z:0}){
  ensureWorld(this.state);super.tick(delta,input);if(!Number.isFinite(delta)||delta<=0)return;
  const s=this.state,m=s.map,dt=Math.min(.1,delta);
  for(const j of [...m.construction]){
   const arrived=advanceMapActor(j.worker,dt,190);
   if(!arrived)continue;
   j.elapsed=Math.min(j.duration,j.elapsed+dt);
   if(j.elapsed>=j.duration){s.facilities[j.id]=j.to;m.completedJobs++;s.stats.upgrades++;m.construction=m.construction.filter(x=>x!==j);
    const stage=facilityStage(j.to);this.emit('facility',`${FACILITIES[j.id].name}: fase ${stage.phase}, melhoria ${stage.step}/3 concluída!`);}
  }
  const training=m.training;
  if(training){training.elapsed=Math.min(training.duration,training.elapsed+dt);if(training.elapsed>=training.duration){const list=training.kind==='youth'?s.youthList:s.roster;let count=0;for(const id of training.ids){const p=list.find(p=>p.id===id);if(p&&p.overall<p.potential){p.overall++;p.trainings++;if(training.kind==='youth')p.marketValue+=5;count++;}}m.training=null;this.emit('training',`Treino concluído: ${count} atleta${count===1?'':'s'} evoluiu${count===1?'':'ram'} +1 de força.`);}}
  this.updateCourier(dt);
 }
 updateCourier(dt){
  const s=this.state,m=s.map,a=m.courier,ct=m.placements.training;if(!m.courierHired||!ct||!s.facilities.training)return;
  const target=a.carry?'training':'supply',goal=target==='training'?structureEntry('training',ct):worldToArt(CFG.supply.x,CFG.supply.z);
  if(a.target!==target){a.target=target;a.route=[];}
  if(Math.hypot(a.x-goal.x,a.y-goal.y)>32){if(!a.route.length)a.route=worldPath(s,a,goal);advanceMapActor(a,dt,180);return;}
  a.route=[];a.walk=0;
  if(a.carry){const amount=Math.min(a.carry,TRAINING_KIT_LIMIT-m.ctKits);if(amount>0){a.carry-=amount;m.ctKits+=amount;m.delivered+=amount;this.emit('ctDelivery',`Auxiliar entregou ${amount} kits ao CT.`);}}
  else if(m.ctKits<TRAINING_KIT_LIMIT-2&&s.kits>=3&&s.fields.every(f=>!f.unlocked||f.stock>0)){
   const amount=Math.min(3,s.kits-1,TRAINING_KIT_LIMIT-m.ctKits);a.carry=amount;s.kits-=amount;
  }
 }
}
