import { WorldSimulation } from './world-simulation.js';
import { newGame, fieldFans } from './simulation.js';
import { CFG } from './config.js';
import { createSeason, simulateRound, matchPerspective, getDivision } from './competition.js';
import { generateInitialRoster, generateMarket, calculateTeamStrength } from './roster.js';
import { scoutYouthProspect, facilityStage } from './facilities.js';
import { worldToArt, artToWorld } from './scene.js';
import { worldPath, structureEntry, WORLD_STRUCTURES, advanceMapActor } from './world-model.js';
import { athleteBuyQuote, athleteSellQuote, academyIntakeQuote, restaurantCapacity, restaurantPrice, restaurantSupplyQuote } from './tycoon-economy.js';
import { ensureTycoon, CLUB_CONTRACTS, clubObjective, partnerProgress, rememberAthlete, pruneAthleteRecords, tycoonRecord } from './tycoon-model.js';

export function stadiumSeats(s) { const st=facilityStage(s.facilities.stadium);return Math.min(40,6+st.phase*4+st.step*2); }
export function tycoonVenue(s) { return s.facilities.stadium>0 && !!s.map.placements.stadium; }
export function stadiumDisplay(s) {
  const t=ensureTycoon(s),m=t.stadium.match||t.stadium.last;
  return m?{score:[...m.score],opponent:m.opponent,remaining:m.phase==='admission'?0:Math.max(0,m.duration-m.elapsed),lastGoal:m.lastGoal,lastGoalOurs:m.lastGoalOurs,venue:m.venue,phase:m.phase}:null;
}
export class TycoonSimulation extends WorldSimulation {
  constructor(state=newGame()) { super(state);ensureTycoon(state);this.gateBilling=false; }
  get isRosterLocked() { return !!(this.state.official||this.state.tycoon.stadium.match); }
  emit(type,text,position=null) {
    const s=this.state,t=s?.tycoon;
    if(t && type==='goal' && s.official){
      const scorer=t.arenaScorers?.[s.official.cursor-1];
      if(scorer && scorer.id && !scorer.counted){scorer.counted=true;this.recordScorer(scorer);text=`GOOOL DO ${s.club.sigla}! ${scorer.name}`;}
    }
    if(t && type==='officialResult' && s.official){
      const p=matchPerspective(s.official.roundResult.playerMatch);if(p.result==='win')t.counters.wins++;
      for(const id of t.arenaLineup||[])if(t.people[id])t.people[id].played++;
      t.arenaScorers=[];t.arenaLineup=[];tycoonRecord(s,text,'match');
    }
    super.emit(type,text,position);
  }
  addRevenue(amount) {
    // The inherited gate credits a decorative canteen multiplier. Remove ONLY
    // that amount during this gate transaction. Real canteen sales settle below.
    return super.addRevenue(Math.max(0,amount-(this.gateBilling?(this.state.facilities.canteen||0)*2:0)));
  }
  updateGate(dt) {
    const s=this.state,before=new Set(s.fans.filter(f=>f.phase==='going'||f.phase==='watching').map(f=>f.id));
    this.gateBilling=true;try{super.updateGate(dt);}finally{this.gateBilling=false;}
    for(const f of s.fans) if(f.phase==='going'&&!before.has(f.id))this.offerCanteen(f);
  }
  updateFans(dt) {
    const s=this.state,c=s.tycoon.canteen;
    // Preserve the original spectator and reserved seat. It visits the counter,
    // not a duplicate decorative sprite, before resuming its route to the pitch.
    const held=new Map();
    for(const g of c.guests){const f=s.fans.find(f=>f.id===g.fanId);if(f?.phase==='going')held.set(f.id,{x:f.x,z:f.z});}
    super.updateFans(dt);
    for(const [id,pos] of held){const f=s.fans.find(f=>f.id===id);if(f && f.phase!=='leaving'){Object.assign(f,pos);f.phase='going';f.route=[];}}
  }
  offerCanteen(fan) {
    const s=this.state,c=s.tycoon.canteen,level=s.facilities.canteen,p=s.map.placements.canteen;
    if(!level||!p||s.map.construction.some(j=>j.id==='canteen')||c.guests.length>=6||this.random()>.58)return;
    const at=worldToArt(fan.x,fan.z),entry=structureEntry('canteen',p),route=worldPath(s,at,entry);
    if(!route.length)return;
    c.guests.push({id:c.nextGuest++,fanId:fan.id,x:at.x,y:at.y,walk:0,route,phase:'approach',wait:0,service:0,resume:structuredClone(fan.route)});
    fan.route=[];
  }
  resumeDiner(g,missed=false) {
    const s=this.state,c=s.tycoon.canteen,f=s.fans.find(f=>f.id===g.fanId);
    if(f && f.phase!=='leaving'){f.phase='going';f.route=g.resume.length?g.resume:[{x:2.2,z:3.5}];}
    c.guests=c.guests.filter(x=>x!==g);if(missed)c.canceled=(c.canceled||0)+1;
    if(missed)s.tycoon.counters.missed++;
  }
  requestFood() {
    const s=this.state,q=restaurantSupplyQuote(s);if(!q.ok)return q;
    const p=s.map.placements.canteen;if(!p)return{ok:false,reason:'Posicione e conclua a lanchonete.'};
    const start=worldToArt(CFG.supply.x,CFG.supply.z),entry=structureEntry('canteen',p),route=worldPath(s,start,entry);
    if(!route.length)return{ok:false,reason:'Deixe um caminho livre até a lanchonete.'};
    s.wallet-=q.cost;s.tycoon.counters.foodCost+=q.cost;
    s.tycoon.canteen.shipment={amount:q.amount,cost:q.cost,x:start.x,y:start.y,walk:0,route};
    this.emit('foodOrder',`${q.amount} lanches comprados. O entregador está levando as caixas ao balcão.`);
    return{...q,started:true};
  }
  hireCook() {
    const s=this.state,c=s.tycoon.canteen;
    if(c.cook)return{ok:false,reason:'Atendente já contratado.'};
    if(s.facilities.canteen<4)return{ok:false,reason:'A fase 2 da lanchonete libera o atendente.'};
    if(s.wallet<180)return{ok:false,reason:'O atendente custa 180 moedas.'};
    s.wallet-=180;c.cook=true;this.emit('hire','Atendente contratado. O gerente não precisa permanecer no balcão.');return{ok:true,cost:180};
  }
  toggleFoodAutomation() {
    const s=this.state,c=s.tycoon.canteen;
    if(s.facilities.canteen<7||!c.cook)return{ok:false,reason:'Reposição automática exige fase 3 e atendente.'};
    c.autoRestock=!c.autoRestock;this.emit('foodOrder',`Reposição automática ${c.autoRestock?'ligada':'desligada'}. Cada lote continua custando moedas.`);return{ok:true};
  }
  updateCanteen(dt) {
    const s=this.state,c=s.tycoon.canteen,p=s.map.placements.canteen;if(!p||!s.facilities.canteen)return;
    if(c.shipment && advanceMapActor(c.shipment,dt,190)){
      c.stock+=c.shipment.amount;c.shipment=null;this.emit('foodDelivery','Lanches entregues à lanchonete. Estoque disponível para atendimento.');
    }
    if(c.autoRestock&&c.cook&&s.facilities.canteen>=7&&!c.shipment&&c.stock<=3 && !s.map.construction.some(j=>j.id==='canteen'))this.requestFood();
    const entry=structureEntry('canteen',p),working=c.cook||Math.hypot(s.map.actor.x-entry.x,s.map.actor.y-entry.y)<70;
    const queue=c.guests.filter(g=>g.phase==='queue');
    for(const g of [...c.guests]){
      const f=s.fans.find(f=>f.id===g.fanId);
      if(!f||f.phase==='leaving'){this.resumeDiner(g);continue;}
      if(g.phase==='approach'&&advanceMapActor(g,dt,130)){g.phase='queue';queue.push(g);}
      if(g.phase==='queue'){
        const index=queue.indexOf(g),target={x:entry.x+Math.min(index,5)*22,y:entry.y+Math.min(index,5)*9};
        const d=Math.hypot(g.x-target.x,g.y-target.y),step=Math.min(d,100*dt);
        if(d>.01){g.x+=(target.x-g.x)*step/d;g.y+=(target.y-g.y)*step/d;}
        g.wait+=dt;
        if(index===0 && working && c.stock>0 && d<4 && !s.map.construction.some(j=>j.id==='canteen')){
          g.service+=dt;
          if(g.service>=Math.max(.7,2.4/(1+s.facilities.canteen*.08))){
            const price=restaurantPrice(s);c.stock--;s.tycoon.counters.served++;s.tycoon.counters.foodRevenue+=price;
            super.addRevenue(price);this.emit('canteenSale',`Lanche servido: +${price} moedas no caixa.`);this.resumeDiner(g);continue;
          }
        }
        if(g.wait>20){this.resumeDiner(g,true);continue;}
      }
      const local=artToWorld(g.x,g.y);f.x=local.x;f.z=local.z;f.walk=g.phase==='approach'?2:0;f.route=[];f.phase='going';
    }
  }
  refreshMarket(){const r=super.refreshMarket();if(r.ok)for(const p of this.state.market)p.cost=athleteBuyQuote(p);return r;}
  hireMarket(id){const s=this.state,p=s.market.find(p=>p.id===id);if(p)p.cost=athleteBuyQuote(p);const r=super.hireMarket(id);if(r.ok){const t=ensureTycoon(s);const b=t.people[r.player.id];b.origin='market';rememberAthlete(s,r.player.id,'Chegou ao clube pelo mercado.');}return r;}
  sellPlayer(id){const s=this.state,p=s.roster.find(p=>p.id===id);if(!p)return{ok:false,reason:'Atleta não encontrado.'};if(p.starter)return{ok:false,reason:'Escale um reserva antes de vender o titular.'};if(s.map.training?.ids.includes(id))return{ok:false,reason:'Este atleta está treinando.'};const value=athleteSellQuote(p);s.roster=s.roster.filter(p=>p.id!==id);if(s.tactics.captainId===id)s.tactics.captainId=null;this.credit(value);pruneAthleteRecords(s);this.emit('sale',`${p.name} vendido por ${value} moedas.`);return{ok:true,value};}
  scoutYouth(){
    const s=this.state,level=s.facilities.youth;if(!level)return{ok:false,reason:'Construa o campo da base.'};
    if(s.map.construction.some(j=>j.id==='youth'))return{ok:false,reason:'O campo da base está em obras.'};
    if(s.youthList.length>=Math.min(12,4+Math.floor(level/3)))return{ok:false,reason:'Base cheia. Promova ou venda uma promessa.'};
    if(s.departmentTimers.scout>0)return{ok:false,reason:'A peneira anterior ainda está sendo organizada.'};
    const cost=academyIntakeQuote(s);if(s.wallet<cost)return{ok:false,cost,reason:`A peneira custa ${cost} moedas. Faltam ${cost-s.wallet}.`};
    const p=scoutYouthProspect(level,s.season.divisionIndex,()=>this.random(),s.sequence++);p.marketValue=athleteSellQuote(p);
    s.wallet-=cost;s.youthList.push(p);s.departmentTimers.scout=60;ensureTycoon(s).people[p.id].origin='base';
    rememberAthlete(s,p.id,`Chegou à base com força ${p.overall}.`);this.emit('scout',`${p.name} chegou à base. Desenvolva seu potencial antes de vender.`);return{ok:true,cost,prospect:p};
  }
  promoteYouth(id){
    const s=this.state,p=s.youthList.find(p=>p.id===id),old=p?structuredClone(s.tycoon.people[id]):null;
    const r=super.promoteYouth(id);if(r.ok){ensureTycoon(s);s.tycoon.people[r.player.id]={...old,origin:'base'};delete s.tycoon.people[id];s.tycoon.counters.promoted++;rememberAthlete(s,r.player.id,'Promovido ao profissional, sem apagar nenhum titular.');tycoonRecord(s,`${r.player.name} foi promovido ao profissional.`,'academy');}
    return r;
  }
  sellYouth(id){const s=this.state,p=s.youthList.find(p=>p.id===id);if(p)p.marketValue=athleteSellQuote(p);const r=super.sellYouth(id);if(r.ok)pruneAthleteRecords(s);return r;}
  startTraining(kind,id=''){if(this.state.tycoon.stadium.match)return{ok:false,reason:'Aguarde a partida oficial terminar.'};return super.startTraining(kind,id);}
  setTactic(key,value){if(this.isRosterLocked)return{ok:false,reason:'A escalação fica fixa durante a partida oficial.'};return super.setTactic(key,value);}
  upgradeFacility(id,position=null){if(id==='stadium'&&this.state.tycoon.stadium.match)return{ok:false,reason:'O estádio está recebendo uma partida. Espere o apito final para iniciar a obra.'};return super.upgradeFacility(id,position);}
  resetTeam(profile=null){
    if(this.isRosterLocked||this.state.map.training)return{ok:false,reason:'Aguarde a partida ou o treino terminar antes de reiniciar a carreira.'};
    // Resetting sporting history must not mint new free reserves for resale.
    const s=this.state;s.season=createSeason(0,s.club.name,s.club.sigla);s.official=null;s.preparation=0;
    s.career={seasonsPlayed:0,trophies:0,totalMatches:0,totalWins:0,history:[]};
    s.tycoon.arenaScorers=[];s.tycoon.arenaLineup=[];s.tycoon.stadium.last=null;
    this.emit('team','Carreira reiniciada. Elenco, jovens, recursos e instalações foram preservados.');
    return{ok:true,reason:'Carreira reiniciada sem gerar atletas ou moedas gratuitos.'};
  }
  claimObjective(){
    const s=this.state,g=clubObjective(s);if(!g.complete)return{ok:false,reason:'Complete o objetivo indicado antes de receber.'};
    if(s.tycoon.claimed.includes(g.id))return{ok:false,reason:'Recompensa já recebida.'};
    s.tycoon.claimed.push(g.id);if(s.tycoon.claimed.length>512)s.tycoon.claimed.splice(15,s.tycoon.claimed.length-512);this.credit(g.reward);tycoonRecord(s,`Conquista: ${g.title}.`,'milestone');this.emit('milestone',`${g.title}: +${g.reward} moedas!`);return{ok:true,reward:g.reward};
  }
  acceptPartner(id){
    const s=this.state,t=s.tycoon,d=CLUB_CONTRACTS.find(d=>d.id===id);
    if(!d)return{ok:false,reason:'Contrato inexistente.'};
    if(!s.facilities.marketing)return{ok:false,reason:'Construa Marketing para negociar parceiros fictícios.'};
    if(facilityStage(s.facilities.marketing).phase<d.phase)return{ok:false,reason:`Exige Marketing na fase ${d.phase}.`};
    if(t.partner)return{ok:false,reason:'Finalize o contrato ativo antes de escolher outro.'};
    const token=`${s.career.seasonsPlayed}:${d.id}`;if(t.completedContracts.includes(token))return{ok:false,reason:'Parceiro já atendido nesta temporada. Novas ofertas na próxima.'};
    t.partner={id,token,start:t.counters[d.metric]};this.emit('contract',`${d.name}: ${d.text} Parceria fictícia, sem anúncios.`);return{ok:true};
  }
  claimPartner(){const s=this.state,t=s.tycoon,p=partnerProgress(s);if(!p?.complete)return{ok:false,reason:'A meta do contrato ainda não foi cumprida.'};if(t.completedContracts.includes(p.token))return{ok:false,reason:'Contrato já pago.'};t.completedContracts.push(p.token);t.partner=null;t.counters.contracts++;this.credit(p.reward);tycoonRecord(s,`Parceria concluída: ${p.name}.`,'contract');this.emit('contract',`${p.name}: +${p.reward} moedas pelo contrato cumprido.`);return{ok:true,reward:p.reward};}
  createScorers(timeline){
    const s=this.state,pool=s.roster.filter(p=>p.starter),weighted=[];
    for(const p of pool)for(let i=0;i<({ATA:5,MEI:3,DEF:1,GOL:0})[p.pos];i++)weighted.push(p);
    const list=weighted.length?weighted:pool;
    return timeline.map(g=>{if(!g.ours)return null;const p=list[Math.min(list.length-1,Math.floor(this.random()*list.length))];return p?{id:p.id,name:p.name,counted:false}:null;});
  }
  recordScorer(p){const s=this.state,b=ensureTycoon(s).people[p.id];if(!b)return;b.goals++;rememberAthlete(s,p.id,`Marcou um gol oficial pelo ${s.club.sigla}.`);}
  playLeagueRound(){
    const s=this.state,t=s.tycoon;if(this.isRosterLocked)return{ok:false,reason:'Uma partida oficial já está em andamento.'};
    if(!tycoonVenue(s)){
      const r=super.playLeagueRound();if(r.ok){t.arenaScorers=this.createScorers(s.official.timeline);t.arenaLineup=s.roster.filter(p=>p.starter).map(p=>p.id);}return r;
    }
    if(s.map.training)return{ok:false,reason:'Espere o treino terminar.'};
    if(s.map.construction.some(j=>j.id==='stadium'))return{ok:false,reason:'O estádio está em obras.'};
    if(s.season.finished)return{ok:false,reason:'Conclua a temporada antes de jogar novamente.'};
    if(s.preparation<1)return{ok:false,reason:'Conclua uma partida local para gerar 1 preparo.'};
    if(s.roster.filter(p=>p.starter).length!==11)return{ok:false,reason:'Escale 11 titulares.'};
    const next=structuredClone(s.season),result=simulateRound(next,this.strength(),()=>this.random());if(!result)return{ok:false,reason:'Rodada indisponível.'};
    const p=matchPerspective(result.playerMatch),goals=[];for(let i=0;i<p.own;i++)goals.push(true);for(let i=0;i<p.against;i++)goals.push(false);
    for(let i=goals.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[goals[i],goals[j]]=[goals[j],goals[i]];}
    const duration=CFG.match.duration,timeline=goals.map((ours,i)=>({ours,at:3+(i+1)*(duration-6)/(goals.length+1)}));
    t.stadium.match={venue:p.isHome?'stadium':'away',phase:p.isHome?'admission':'playing',opponent:p.opponent,nextSeason:next,roundResult:result,elapsed:0,duration,admissionElapsed:0,cursor:0,timeline,score:[0,0],scorers:this.createScorers(timeline),lineup:s.roster.filter(p=>p.starter).map(p=>p.id),lastGoal:-100,lastGoalOurs:true,spawnClock:0,spawned:0,admitted:0,ticketRevenue:0};
    t.stadium.audience=[];s.preparation--;this.emit('stadiumStart',p.isHome?'Estádio recebendo a torcida. A arena continua funcionando.':`Jogo fora de casa contra ${p.opponent}. A arena continua funcionando.`);
    return{ok:true,playerMatch:result.playerMatch,roundResult:result,venue:t.stadium.match.venue};
  }
  updateStadium(dt){
    const s=this.state,t=s.tycoon,st=t.stadium,m=st.match;
    if(!m){for(const a of [...st.audience]){if(a.phase==='leaving'&&advanceMapActor(a,dt,180))st.audience=st.audience.filter(x=>x!==a);}return;}
    const pos=s.map.placements.stadium,entry=structureEntry('stadium',pos),audience=st.audience;
    for(const a of audience)if(a.phase==='approach'&&advanceMapActor(a,dt,180)){
      a.phase='seated';m.admitted++;const price=16+facilityStage(s.facilities.stadium).phase*3;
      m.ticketRevenue+=price;super.addRevenue(price);this.emit('stadiumTicket',`Ingresso do estádio: +${price} moedas no caixa.`);
    }
    if(m.phase==='admission'){
      m.admissionElapsed+=dt;m.spawnClock+=dt;
      const target=Math.min(stadiumSeats(s),8+Math.floor((s.facilities.marketing||0)*.6));
      if(m.spawnClock>=.75&&m.spawned<target){
        m.spawnClock=0;const start={x:852,y:80},route=worldPath(s,start,entry);
        if(route.length){audience.push({id:++m.spawned,x:start.x,y:start.y,walk:0,route,phase:'approach',seat:m.spawned-1});}
      }
      if((m.admitted>=4&&m.admissionElapsed>=6)||(m.admitted>0&&m.admissionElapsed>=20)){m.phase='playing';this.emit('start',`ESTÁDIO · ${s.club.sigla} (VOCÊ) × ${m.opponent}`);}
      else if(m.admissionElapsed>=35){s.preparation=Math.min(3,s.preparation+1);st.match=null;st.audience=[];this.emit('warning','Acesso ao estádio bloqueado. O preparo foi devolvido.');return;}
    } else {
      m.elapsed=Math.min(m.duration,m.elapsed+dt);
      while(m.cursor<m.timeline.length&&m.timeline[m.cursor].at<=m.elapsed){
        const index=m.cursor++,g=m.timeline[index];m.score[g.ours?0:1]++;m.lastGoal=s.t;m.lastGoalOurs=g.ours;
        if(g.ours){const p=m.scorers[index];if(p){p.counted=true;this.recordScorer(p);}this.emit('stadiumGoal',`GOOOL DO ${s.club.sigla}! ${p?.name||'Seu time'} · ${m.score[0]} × ${m.score[1]}`);}
        else this.emit('stadiumConceded',`GOL SOFRIDO · ${m.opponent} · ${s.club.sigla} ${m.score[0]} × ${m.score[1]}`);
      }
      if(m.elapsed>=m.duration){
        const p=matchPerspective(m.roundResult.playerMatch),div=s.season.divisionIndex;
        const reward=Math.floor((p.result==='win'?150+div*80:p.result==='draw'?60+div*30:20)*(1+s.facilities.stadium*.025));
        s.season=m.nextSeason;s.career.totalMatches++;s.stats.matches++;t.counters.stadiumGames++;
        if(p.result==='win'){s.career.totalWins++;t.counters.wins++;}
        for(const id of m.lineup)if(t.people[id])t.people[id].played++;
        this.credit(reward);st.last={venue:m.venue,phase:'finished',opponent:m.opponent,score:[...m.score],elapsed:m.duration,duration:m.duration,lastGoal:m.lastGoal,lastGoalOurs:m.lastGoalOurs,admitted:m.admitted,ticketRevenue:m.ticketRevenue};
        const text=`${p.result==='win'?'VITÓRIA':p.result==='draw'?'EMPATE':'DERROTA'} · ${s.club.sigla} ${p.own} × ${p.against} · +${reward} moedas`;
        st.match=null;for(const a of st.audience){a.phase='leaving';a.x=entry.x+(a.seat%4)*8;a.y=entry.y+Math.floor(a.seat/4)*6;a.route=worldPath(s,a,{x:852,y:90});}tycoonRecord(s,text,'match');this.emit('stadiumResult',text);
      }
    }
  }
  nextSeason(){
    if(this.state.tycoon.stadium.match)return{ok:false,reason:'A partida oficial ainda está em andamento.'};
    const r=super.nextSeason();if(r.ok){for(const p of this.state.market)p.cost=athleteBuyQuote(p);this.state.tycoon.completedContracts=this.state.tycoon.completedContracts.slice(-30);}return r;
  }
  tick(delta,input={x:0,z:0}){
    if(!Number.isFinite(delta)||delta<=0)return;
    const s=this.state,t=ensureTycoon(s),training=s.map.training?{...s.map.training,ids:[...s.map.training.ids]}:null;
    const ratings=training?new Map((training.kind==='youth'?s.youthList:s.roster).map(p=>[p.id,p.overall])):null;
    super.tick(delta,input);
    const dt=Math.min(.1,delta);
    if(training&&!s.map.training){
      for(const id of training.ids){const p=(training.kind==='youth'?s.youthList:s.roster).find(p=>p.id===id);if(p&&p.overall>(ratings.get(id)||p.overall)){t.counters.trained++;if(t.people[id])t.people[id].trainings++;rememberAthlete(s,id,`Concluiu treino e chegou à força ${p.overall}.`);if(training.kind==='youth')p.marketValue=athleteSellQuote(p);}}
    }
    this.updateCanteen(dt);this.updateStadium(dt);
  }
  tycoonCommand(name,id=''){
    const map={food:()=>this.requestFood(),cook:()=>this.hireCook(),autoFood:()=>this.toggleFoodAutomation(),claim:()=>this.claimObjective(),partner:()=>this.acceptPartner(id),claimPartner:()=>this.claimPartner()};
    return map[name]?map[name]():{ok:false,reason:'Ação de clube desconhecida.'};
  }
}
