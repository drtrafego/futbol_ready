import { CFG, UPGRADE_DEFS, MISSIONS } from './config.js';
import { clamp, distance, near, moveActor, followRoute, findPath } from './navigation.js';
import { createSeason, simulateRound, evaluateSeasonEnd, getDivision, matchPerspective } from './competition.js';
import { generateInitialRoster, calculateTeamStrength, trainPlayer, generateMarket, hirePlayer, autoLineup, playerSaleValue } from './roster.js';
import { FACILITIES, LAND_PLOTS, canUpgradeFacility, scoutYouthProspect, promoteProspect, facilityStage } from './facilities.js';

/** @typedef {{x:number,z:number}} Point */

export function newGame(profile = null) {
  const actor = p => ({ x: p.x, z: p.z, carry: 0, heading: 0, walk: 0, route: [], actionClock: 0 });
  let seed=47013; const initialRandom=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const clubName=profile?.clubName||'Clube da Vila',sigla=profile?.sigla||'VIL';
  return {
    version: CFG.version, savedAt: 0, t: 0, wallet: 0, cashDesk: 0,
    kits: CFG.supply.initial, rng: 73429, nextFanId: 1,
    player: actor(CFG.player),
    runner: { ...actor(CFG.runner), task: 'supply', targetField: 0 },
    staff: { gate: false, runner: false, cashier: false },
    upgrades: { speed: 0, capacity: 0, ticket: 0, stands: 0 },
    fields: CFG.fields.map(f => ({ id: f.id, unlocked: f.id === 0, stock: 0, remaining: 0, score: [0, 0], goalClock: 0, lastGoal: -100, lastGoalOurs: true, opponent: 'Visitantes', played: 0 })),
    fans: [], timers: { supply: 0, spawn: 0, gate: 0, cashier: 0 },
    schemaRevision: 4, revision: 0, sequence: 1, preparation: 0,
    roster: generateInitialRoster(46, initialRandom), market: generateMarket(0, initialRandom), youthList: [],
    facilities: Object.fromEntries(Object.keys(FACILITIES).map(id=>[id,id==='pitch1'?1:0])),
    land: {home:true,academy:false,stadium:false,business:false},
    tactics: {formation:'4-4-2',posture:'equilibrada',captainId:null},
    club: {name:clubName,sigla,colorId:'azul',crest:'bola'},
    season: createSeason(0,clubName,sigla), official: null,
    career: {seasonsPlayed:0,trophies:0,totalMatches:0,totalWins:0,history:[]},
    departmentTimers: {scout:0,market:0,campaign:0},campaignUntil:0,achievements:[],
    stats: { walked: 0, picked: 0, delivered: 0, admitted: 0, collected: 0, matches: 0, upgrades: 0, departed: 0 },
  };
}

export const carryCapacity = s => CFG.player.capacity + s.upgrades.capacity * 2;
export const walkingSpeed = s => CFG.player.speed * (1 + s.upgrades.speed * 0.15);
export const ticketPrice = s => CFG.gate.price + s.upgrades.ticket * 4 + (s.facilities?.marketing||0)*2;
export const seatCapacity = s => Math.min(36, CFG.match.seats + s.upgrades.stands * 2 + (s.facilities?.stands||0)*2);
export const fieldFans = (s, id) => s.fans.filter(f => f.fieldId === id && (f.phase === 'going' || f.phase === 'watching'));
export const currentMission = s => MISSIONS.find(m => missionValue(s, m.key) < m.target) || null;
export function missionValue(s, key) {
  if(key.startsWith('land_'))return Number(s.land[key.slice(5)]);
  if(key.startsWith('facility_'))return s.facilities[key.slice(9)]||0;
  if(key==='league_games')return s.career.totalMatches;
  if (key === 'staff') return Number(s.staff.gate);
  if (key === 'field2') return Number(s.fields[1].unlocked);
  return s.stats[key] || 0;
}
export function upgradeLevel(s, id) {
  if (id in s.staff) return Number(s.staff[id]);
  if (id === 'field2') return Number(s.fields[1].unlocked);
  return s.upgrades[id] ?? 0;
}
export function upgradeCost(s, id) {
  const def = UPGRADE_DEFS.find(d => d.id === id);
  if (!def || upgradeLevel(s, id) >= def.max) return null;
  return Math.ceil(def.base * def.growth ** upgradeLevel(s, id));
}
export function seatPosition(fieldId, seat) {
  const field = CFG.fields[fieldId];
  return { x: field.x - 3.25 + (seat % 6) * 1.3, z: 0.6 - Math.floor(seat / 6) * 0.55 };
}
export function zonePosition(zone) {
  if (zone === 'field0') return CFG.fields[0].intake;
  if (zone === 'field1') return CFG.fields[1].intake;
  return CFG[zone] || null;
}

export class Simulation {
  constructor(state = newGame()) { this.state = state; this.events = []; }
  emit(type, text, position = null) {
    this.events.push({ type, text, position, t: this.state.t });
    this.state.revision=(this.state.revision||0)+1;
    if (this.events.length > 80) this.events.shift();
  }
  drainEvents() { const result = this.events; this.events = []; return result; }
  random() {
    this.state.rng = (Math.imul(this.state.rng, 1664525) + 1013904223) >>> 0;
    return this.state.rng / 4294967296;
  }
  goTo(point) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.z)) return false;
    this.state.player.route = findPath(this.state.player, point);
    return this.state.player.route.length > 0;
  }
  purchase(id) {
    const s = this.state, cost = upgradeCost(s, id);
    if (cost === null) return { ok: false, reason: 'Melhoria indisponível ou já concluída.' };
    if (s.wallet < cost) return { ok: false, reason: `Faltam ${cost - s.wallet} moedas na carteira. Recolha o caixa.` };
    s.wallet -= cost;
    if (id in s.staff) s.staff[id] = true;
    else if (id === 'field2') {s.fields[1].unlocked = true; s.facilities.pitch2=Math.max(1,s.facilities.pitch2||0);}
    else s.upgrades[id] += 1;
    s.stats.upgrades += 1;
    this.emit('purchase', `${UPGRADE_DEFS.find(d => d.id === id).name}: adquirido!`, CFG.office);
    return { ok: true, cost };
  }
  collect() {
    const s = this.state;
    const amount = Math.min(s.cashDesk, CFG.maxMoney - s.wallet);
    if (amount <= 0) return 0;
    s.cashDesk -= amount; s.wallet += amount; s.stats.collected += amount;
    this.emit('cash', `+${amount}`, CFG.cash);
    return amount;
  }
  addRevenue(amount) { this.state.cashDesk = Math.min(CFG.maxMoney, this.state.cashDesk + amount); }
  strength(){const s=this.state;return calculateTeamStrength(s.roster,s.tactics.formation,s.tactics.posture,s.tactics.captainId,s.facilities.coaching);}
  credit(amount){this.state.wallet=Math.min(CFG.maxMoney,this.state.wallet+Math.max(0,Math.floor(amount)));}
  buyLand(id){
    const s=this.state,p=LAND_PLOTS.find(p=>p.id===id);
    if(!p||id==='home'||s.land[id])return{ok:false,reason:'Terreno já adquirido ou inexistente.'};
    if(!s.fields[1].unlocked)return{ok:false,reason:'Abra o segundo campo antes de expandir o clube.'};
    if(p.requires&&!s.land[p.requires])return{ok:false,reason:'Compre primeiro o terreno vizinho.'};
    if(s.wallet<p.cost)return{ok:false,reason:`Faltam ${p.cost-s.wallet} moedas para o terreno.`};
    s.wallet-=p.cost;s.land[id]=true;this.emit('purchase',`${p.name} adquirido!`);return{ok:true,cost:p.cost};
  }
  upgradeFacility(id){
    const s=this.state,level=s.facilities[id]||0,check=canUpgradeFacility(id,level,s.season.divisionIndex,s.wallet,s);
    if(!check.ok)return check;s.wallet-=check.cost;s.facilities[id]=level+1;
    const stage=facilityStage(level+1);this.emit('facility',`${FACILITIES[id].name}: fase ${stage.phase}, melhoria ${stage.step}/3.`);
    return{ok:true,cost:check.cost,newLevel:level+1};
  }
  trainPlayer(id){const s=this.state,p=s.roster.find(p=>p.id===id),r=trainPlayer(p,s.wallet,s.facilities.training);if(!r.ok)return r;s.wallet-=r.cost;this.emit('training',`${p.name}: força ${p.overall}.`);return r;}
  trainYouth(id){const s=this.state,p=s.youthList.find(p=>p.id===id),r=trainPlayer(p,s.wallet,s.facilities.training+s.facilities.youth);if(!r.ok)return r;s.wallet-=r.cost;p.marketValue+=12;this.emit('training',`${p.name} evoluiu na base.`);return r;}
  hireMarket(id){const s=this.state,p=s.market.find(p=>p.id===id);if(!p)return{ok:false,reason:'Oferta já utilizada.'};const r=hirePlayer(s.roster,p,s.wallet);if(!r.ok)return r;s.wallet-=r.cost;s.market=s.market.filter(p=>p.id!==id);this.emit('hire',`${p.name} contratado para a reserva.`);return r;}
  refreshMarket(){const s=this.state;if(s.departmentTimers.market>0)return{ok:false,reason:`Mercado disponível em ${Math.ceil(s.departmentTimers.market)}s de jogo.`};const cost=60;if(s.wallet<cost)return{ok:false,reason:'A renovação custa 60 moedas.'};s.wallet-=cost;s.market=generateMarket(s.season.divisionIndex,()=>this.random(),s.sequence++);s.departmentTimers.market=45;this.emit('market','Novas ofertas chegaram.');return{ok:true,cost};}
  sellPlayer(id){const s=this.state,p=s.roster.find(p=>p.id===id);if(!p)return{ok:false,reason:'Jogador não encontrado.'};if(p.starter)return{ok:false,reason:'Coloque um reserva no lugar antes de vender o titular.'};const value=playerSaleValue(p);s.roster=s.roster.filter(p=>p.id!==id);if(s.tactics.captainId===id)s.tactics.captainId=null;this.credit(value);this.emit('sale',`${p.name} vendido por ${value} moedas.`);return{ok:true,value};}
  scoutYouth(){
    const s=this.state;if(!s.facilities.youth)return{ok:false,reason:'Construa o campo da base no terreno da formação.'};
    const capacity=Math.min(12,4+Math.floor(s.facilities.youth/3));if(s.youthList.length>=capacity)return{ok:false,reason:'Base lotada. Promova ou venda uma promessa.'};
    if(s.departmentTimers.scout>0)return{ok:false,reason:`Próxima peneira em ${Math.ceil(s.departmentTimers.scout)}s de jogo.`};
    const cost=Math.floor((80+s.facilities.youth*40)*(1-Math.min(.15,s.facilities.board*.01)));
    if(s.wallet<cost)return{ok:false,reason:`A peneira custa ${cost} moedas.`};
    s.wallet-=cost;const prospect=scoutYouthProspect(s.facilities.youth,s.season.divisionIndex,()=>this.random(),s.sequence++);s.youthList.push(prospect);s.departmentTimers.scout=60;
    this.emit('scout',`Novo talento: ${prospect.name}.`);return{ok:true,cost,prospect};
  }
  promoteYouth(id){const s=this.state,p=s.youthList.find(p=>p.id===id),r=promoteProspect(s.roster,p);if(!r.ok)return r;s.youthList=s.youthList.filter(p=>p.id!==id);this.emit('promotion',`${p.name} promovido ao profissional.`);return r;}
  sellYouth(id){const s=this.state,p=s.youthList.find(p=>p.id===id);if(!p)return{ok:false,reason:'Promessa não encontrada.'};const value=p.marketValue;s.youthList=s.youthList.filter(p=>p.id!==id);this.credit(value);this.emit('sale',`Venda da base: +${value} moedas.`);return{ok:true,value};}
  setTactic(key,value){const s=this.state;
    if(key==='formation'){if(!['4-4-2','4-3-3','3-5-2','5-3-2'].includes(value))return{ok:false,reason:'Formação inválida.'};s.tactics.formation=value;autoLineup(s.roster,value);}
    else if(key==='posture'){if(!['ofensiva','equilibrada','defensiva'].includes(value))return{ok:false,reason:'Postura inválida.'};s.tactics.posture=value;}
    else if(key==='captain'){if(!s.roster.some(p=>p.id===value&&p.starter))return{ok:false,reason:'O capitão deve ser titular.'};s.tactics.captainId=value;}
    else return{ok:false,reason:'Opção inválida.'};
    if(!s.roster.some(p=>p.id===s.tactics.captainId&&p.starter))s.tactics.captainId=null;this.emit('tactic','Estratégia atualizada.');return{ok:true};
  }
  startCampaign(){const s=this.state;if(!s.facilities.marketing)return{ok:false,reason:'Construa o departamento de marketing.'};if(s.departmentTimers.campaign>0)return{ok:false,reason:'A campanha atual ainda está em andamento.'};const cost=100;if(s.wallet<cost)return{ok:false,reason:'A campanha custa 100 moedas.'};s.wallet-=cost;s.campaignUntil=s.t+120;s.departmentTimers.campaign=120;this.emit('campaign','Campanha ativa: mais torcida por 2 minutos de jogo.');return{ok:true,cost};}
  editClub(name,sigla){name=String(name).trim().slice(0,30);sigla=String(sigla).trim().slice(0,4).toUpperCase();if(name.length<2||sigla.length<2)return{ok:false,reason:'Use pelo menos 2 letras no nome e na sigla.'};const s=this.state;s.club.name=name;s.club.sigla=sigla;const p=s.season.clubs.find(c=>c.isPlayer);p.name=name;p.sigla=sigla;this.emit('club','Identidade do clube atualizada.');return{ok:true};}
  playLeagueRound(){
    const s=this.state;if(s.official)return{ok:false,reason:'Uma partida oficial já está em andamento.'};
    if(s.season.finished)return{ok:false,reason:'Finalize a temporada antes de jogar novamente.'};
    if(s.preparation<1)return{ok:false,reason:'Conclua uma partida na arena para ganhar 1 preparo.'};
    if(s.fields[0].remaining>0)return{ok:false,reason:'Espere a partida atual do Campo 1 terminar.'};
    if(s.roster.filter(p=>p.starter).length!==11)return{ok:false,reason:'Escale 11 titulares.'};
    const next=structuredClone(s.season),roundResult=simulateRound(next,this.strength(),()=>this.random());if(!roundResult)return{ok:false,reason:'Rodada indisponível.'};
    const pm=roundResult.playerMatch,p=matchPerspective(pm),goals=[];for(let i=0;i<p.own;i++)goals.push(true);for(let i=0;i<p.against;i++)goals.push(false);
    for(let i=goals.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[goals[i],goals[j]]=[goals[j],goals[i]];}
    s.official={nextSeason:next,roundResult,elapsed:0,duration:CFG.match.duration,cursor:0,timeline:goals.map((ours,i)=>({at:3+(i+1)*(CFG.match.duration-6)/(goals.length+1),ours}))};s.preparation--;
    const f=s.fields[0];f.score=[0,0];f.opponent=p.opponent;f.remaining=CFG.match.duration;f.lastGoal=-100;
    this.emit('start',`OFICIAL: ${s.club.name} x ${p.opponent}`,CFG.fields[0]);return{ok:true,playerMatch:pm,roundResult};
  }
  updateOfficial(dt){
    const s=this.state,o=s.official;if(!o)return;const f=s.fields[0];o.elapsed=Math.min(o.duration,o.elapsed+dt);f.remaining=Math.max(0,o.duration-o.elapsed);
    while(o.cursor<o.timeline.length&&o.timeline[o.cursor].at<=o.elapsed){const g=o.timeline[o.cursor++];f.score[g.ours?0:1]++;f.lastGoal=s.t;f.lastGoalOurs=g.ours;this.emit(g.ours?'goal':'conceded',g.ours?`GOOOL DO ${s.club.sigla}!`:`GOL SOFRIDO · ${f.opponent}`,CFG.fields[0]);}
    if(o.elapsed>=o.duration){
      const pm=o.roundResult.playerMatch,p=matchPerspective(pm),div=s.season.divisionIndex;
      s.season=o.nextSeason;s.career.totalMatches++;if(p.result==='win')s.career.totalWins++;
      const reward=Math.floor((p.result==='win'?150+div*80:p.result==='draw'?60+div*30:20)*(1+s.facilities.stadium*.025));
      this.credit(reward);s.fields[0].remaining=0;s.fields[0].played++;s.stats.matches++;
      this.emit('officialResult',`${p.result==='win'?'VITÓRIA':p.result==='draw'?'EMPATE':'DERROTA'} · ${s.club.sigla} ${p.own} x ${p.against} · +${reward} moedas`,CFG.fields[0]);s.official=null;
      this.releaseFans(0);
    }
  }
  nextSeason(){const s=this.state;if(s.official||!s.season.finished)return{ok:false,reason:'A temporada ainda não terminou.'};const evaluation=evaluateSeasonEnd(s.season);s.career.history.unshift({number:s.career.seasonsPlayed+1,division:s.season.divisionIndex,...evaluation,results:structuredClone(s.season.history)});s.career.history=s.career.history.slice(0,10);s.career.seasonsPlayed++;if(evaluation.playerPos===1)s.career.trophies++;this.credit(evaluation.reward);s.season=createSeason(evaluation.nextDivisionIndex,s.club.name,s.club.sigla);s.market=generateMarket(s.season.divisionIndex,()=>this.random(),s.sequence++);this.emit('season',`${evaluation.status==='promoted'?'ACESSO! ':evaluation.status==='relegated'?'Rebaixamento. ':''}Nova temporada: ${getDivision(s.season.divisionIndex).name}.`);return{ok:true,evaluation,reason:'Nova temporada iniciada.'};}
  resetTeam(profile = null) {
    const s = this.state;
    const clubName = profile?.clubName || s.club?.name || 'Clube da Vila';
    const sigla = profile?.sigla || s.club?.sigla || 'VIL';
    let seed = (Date.now() ^ (Math.random() * 0x7fffffff)) & 0xffffffff;
    const initialRandom = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    s.season = createSeason(0, clubName, sigla);
    s.official = null;
    s.career = { seasonsPlayed: 0, trophies: 0, totalMatches: 0, totalWins: 0, history: [] };
    s.preparation = 0;
    s.roster = generateInitialRoster(46, initialRandom);
    s.market = generateMarket(0, initialRandom);
    s.youthList = [];
    s.tactics = { formation: '4-4-2', posture: 'equilibrada', captainId: null };
    s.club.name = clubName;
    s.club.sigla = sigla;
    s.departmentTimers = { scout: 0, market: 0, campaign: 0 };
    s.campaignUntil = 0;
    s.stats.matches = 0;
    for (const f of s.fields) {
      f.score = [0, 0];
      f.played = 0;
      f.remaining = 0;
      f.opponent = 'Visitantes';
    }
    if (s.map) {
      s.map.training = null;
    }
    s.revision = (s.revision || 0) + 1;
    this.emit('team', 'Novo time iniciado! Elenco renovado e histórico esportivo zerado.');
    return { ok: true, reason: 'Time, elenco e histórico esportivo reiniciados com sucesso.' };
  }
  releaseFans(id){for(const fan of fieldFans(this.state,id)){fan.phase='leaving';fan.route=[{x:fan.x,z:3.6},{x:12.7,z:3.6},{x:12.7,z:16.5}];}}
  tick(delta, input = { x: 0, z: 0 }) {
    if (!Number.isFinite(delta) || delta <= 0) return;
    // Cortar deltas enormes impede um salto da economia após suspensão do navegador.
    const dt = Math.min(delta, 0.1), s = this.state;
    s.t += dt;
    this.updatePlayer(dt, input);
    this.updateSupply(dt);
    if (s.staff.runner) this.updateRunner(dt);
    this.updateFans(dt);
    this.updateGate(dt);
    this.updateMatches(dt);
    this.updateOfficial(dt);
    for(const key of Object.keys(s.departmentTimers))s.departmentTimers[key]=Math.max(0,s.departmentTimers[key]-dt);
    if (s.staff.cashier) {
      s.timers.cashier += dt;
      if (s.timers.cashier >= CFG.cash.interval) { s.timers.cashier = 0; this.collect(); }
    }
  }
  updatePlayer(dt, input) {
    const s = this.state, p = s.player;
    const before = { x: p.x, z: p.z };
    const dx = Number.isFinite(input.x) ? input.x : 0;
    const dz = Number.isFinite(input.z) ? input.z : 0;
    if (Math.hypot(dx, dz) > 0.05) {
      p.route = [];
      moveActor(p, dx, dz, dt, walkingSpeed(s));
    } else followRoute(p, dt, walkingSpeed(s));
    s.stats.walked += distance(before, p);
    p.actionClock += dt;
    if (p.actionClock >= CFG.transferInterval) {
      p.actionClock = 0;
      if (near(p, CFG.supply) && p.carry < carryCapacity(s) && s.kits > 0) {
        p.carry++; s.kits--; s.stats.picked++;
        this.emit('pickup', '+1 kit', CFG.supply);
      }
      for (const f of s.fields) {
        if (f.unlocked && near(p, CFG.fields[f.id].intake) && p.carry > 0 && f.stock < CFG.match.stockLimit) {
          p.carry--; f.stock++; s.stats.delivered++;
          this.emit('delivery', '+1 kit', CFG.fields[f.id].intake);
        }
      }
    }
    if (near(p, CFG.cash)) this.collect();
  }
  updateSupply(dt) {
    const s = this.state;
    if (s.kits >= CFG.supply.capacity) { s.timers.supply = 0; return; }
    s.timers.supply += dt;
    if (s.timers.supply >= CFG.supply.interval) {
      s.timers.supply -= CFG.supply.interval; s.kits++;
    }
  }
  updateRunner(dt) {
    const s = this.state, r = s.runner;
    const candidates = s.fields.filter(f => f.unlocked && f.stock < CFG.match.stockLimit);
    if (!candidates.length) { r.route = []; r.walk = 0; return; }
    const desired = r.carry > 0 ? 'field' : 'supply';
    if (r.task !== desired) { r.task = desired; r.route = []; }
    if (desired === 'field') {
      if (!s.fields[r.targetField].unlocked || s.fields[r.targetField].stock >= CFG.match.stockLimit || !r.route.length) {
        r.targetField = [...candidates].sort((a, b) => a.stock - b.stock || a.id - b.id)[0].id;
      }
    }
    const point = desired === 'supply' ? CFG.supply : CFG.fields[r.targetField].intake;
    if (!near(r, point, 0.7)) {
      if (!r.route.length) r.route = findPath(r, point);
      followRoute(r, dt, CFG.runner.speed);
      return;
    }
    r.route = []; r.walk = 0; r.actionClock += dt;
    if (r.actionClock < CFG.transferInterval) return;
    r.actionClock = 0;
    if (desired === 'supply') {
      const amount = Math.min(CFG.runner.capacity, s.kits);
      r.carry += amount; s.kits -= amount;
    } else {
      const f = s.fields[r.targetField];
      if (r.carry && f.stock < CFG.match.stockLimit) { f.stock++; r.carry--; }
    }
  }
  updateFans(dt) {
    const s = this.state;
    const queue = s.fans.filter(f => f.phase === 'queue');
    s.timers.spawn += dt;
    if (s.timers.spawn >= CFG.fan.spawnInterval / (1+(s.facilities.marketing||0)*.04+(s.campaignUntil>s.t?.5:0))) {
      s.timers.spawn = 0;
      if (queue.length < CFG.fan.queueLimit && s.fans.length < CFG.fan.totalLimit) {
        const f = { id: s.nextFanId++, x: 0, z: 16.5, heading: 0, walk: 0, phase: 'queue', fieldId: -1, seat: -1, color: Math.floor(this.random() * 5), route: [] };
        s.fans.push(f); queue.push(f);
      }
    }
    queue.forEach((f, index) => {
      const target = { x: 0, z: 9.75 + index * 0.82 };
      const d = distance(f, target);
      if (d > 0.04) moveActor(f, (target.x - f.x) / d, (target.z - f.z) / d, Math.min(dt, d / CFG.fan.speed), CFG.fan.speed, false);
      else f.walk = 0;
    });
    for (const f of s.fans) {
      if (f.phase === 'going' && followRoute(f, dt, CFG.fan.speed, false)) f.phase = 'watching';
      else if (f.phase === 'leaving') followRoute(f, dt, CFG.fan.speed, false);
    }
    const oldCount = s.fans.length;
    s.fans = s.fans.filter(f => f.phase !== 'leaving' || f.route.length > 0);
    s.stats.departed += oldCount - s.fans.length;
  }
  updateGate(dt) {
    const s = this.state;
    if (!s.staff.gate && !near(s.player, CFG.gate)) { s.timers.gate = 0; return; }
    const fan = s.fans.find(f => f.phase === 'queue');
    if (!fan || distance(fan, { x: 0, z: 9.75 }) > 0.3) { s.timers.gate = 0; return; }
    const candidates = s.fields.filter(f => f.unlocked && (f.stock > 0 || f.remaining > 4) && (f.remaining === 0 || f.remaining > 4) && fieldFans(s, f.id).length < seatCapacity(s) && !(f.id===0&&s.official));
    if (!candidates.length) { s.timers.gate = 0; return; }
    s.timers.gate += dt;
    if (s.timers.gate < CFG.gate.interval / (1+(s.facilities.gate||0)*.08)) return;
    s.timers.gate = 0;
    const field = candidates.sort((a, b) => fieldFans(s, a.id).length - fieldFans(s, b.id).length || a.id - b.id)[0];
    const occupied = new Set(fieldFans(s, field.id).map(f => f.seat));
    let seat = 0; while (occupied.has(seat)) seat++;
    const destination = seatPosition(field.id, seat);
    fan.phase = 'going'; fan.fieldId = field.id; fan.seat = seat;
    // A passagem dos torcedores contorna o balcão pela direita, antes do corredor.
    fan.route = [{ x: 2.2, z: 9.7 }, { x: 2.2, z: 3.5 }, { x: destination.x, z: 3.5 }, destination];
    this.addRevenue(ticketPrice(s)+(s.facilities.canteen||0)*2); s.stats.admitted++;
    this.emit('ticket', `+${ticketPrice(s)}`, CFG.gate);
  }
  updateMatches(dt) {
    const s = this.state;
    for (const field of s.fields) {
      if (!field.unlocked || (field.id===0&&s.official)) continue;
      if (field.remaining > 0) {
        field.remaining = Math.max(0, field.remaining - dt);
        field.goalClock -= dt;
        if (field.goalClock <= 0 && field.remaining > 0) {
          const ours=this.random()<this.strength()/(this.strength()+getDivision(s.season.divisionIndex).targetStrength);
          field.score[ours?0:1]++;field.lastGoalOurs=ours;
          field.goalClock = 6 + this.random() * 3; field.lastGoal = s.t;
          this.emit(ours?'goal':'conceded',ours?`GOOOL DO ${s.club.sigla}!`:`GOL SOFRIDO · ${field.opponent}`,CFG.fields[field.id]);
        }
        if (field.remaining === 0) {
          field.played++; s.stats.matches++;
          const reward=CFG.match.reward+Math.max(0,s.facilities[field.id?'pitch2':'pitch1']-1)*3+s.facilities.marketing*4;
          this.addRevenue(reward);s.preparation=Math.min(3,s.preparation+1);
          this.emit('match', `Arena: ${field.score[0]>field.score[1]?'vitória':field.score[0]===field.score[1]?'empate':'derrota'} ${field.score[0]} x ${field.score[1]} · +1 preparo`, CFG.fields[field.id]);
          for (const fan of fieldFans(s, field.id)) {
            fan.phase = 'leaving';
            fan.route = [{ x: fan.x, z: 3.6 }, { x: 12.7, z: 3.6 }, { x: 12.7, z: 16.5 }];
          }
        }
      } else if (field.stock > 0 && s.fans.filter(f => f.fieldId === field.id && f.phase === 'watching').length >= CFG.match.minFans) {
        field.stock--; field.remaining = CFG.match.duration; field.goalClock = 7; field.score = [0, 0]; field.opponent='Visitantes';
        this.emit('start', 'Bola rolando!', CFG.fields[field.id]);
      }
    }
  }
}
