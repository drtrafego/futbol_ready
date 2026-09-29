import { CFG, UPGRADE_DEFS, MISSIONS } from './config.js';
import { clamp, distance, near, moveActor, followRoute, findPath } from './navigation.js';
import { createSeason, simulateRound, evaluateSeasonEnd, getDivision } from './competition.js';
import { generateInitialRoster, calculateTeamStrength, trainPlayer, generateMarket, hirePlayer } from './roster.js';
import { FACILITIES, canUpgradeFacility, scoutYouthProspect, promoteProspect } from './facilities.js';

/** @typedef {{x:number,z:number}} Point */

export function newGame() {
  const actor = p => ({ x: p.x, z: p.z, carry: 0, heading: 0, walk: 0, route: [], actionClock: 0 });
  return {
    version: CFG.version, savedAt: 0, t: 0, wallet: 0, cashDesk: 0,
    kits: CFG.supply.initial, rng: 73429, nextFanId: 1,
    player: actor(CFG.player),
    runner: { ...actor(CFG.runner), task: 'supply', targetField: 0 },
    staff: { gate: false, runner: false, cashier: false },
    upgrades: { speed: 0, capacity: 0, ticket: 0, stands: 0 },
    fields: CFG.fields.map(f => ({ id: f.id, unlocked: f.id === 0, stock: 0, remaining: 0, score: [0, 0], goalClock: 0, lastGoal: -100, played: 0 })),
    fans: [], timers: { supply: 0, spawn: 0, gate: 0, cashier: 0 },
    stats: { walked: 0, picked: 0, delivered: 0, admitted: 0, collected: 0, matches: 0, upgrades: 0, departed: 0 },
    roster: generateInitialRoster(46),
    season: createSeason(0, 'Bernardo FC', 'BFC'),
    facilities: { stands: 0, gate: 0, youth: 0, training: 0, marketing: 0, coaching: 0, board: 0 },
    youthList: [],
    market: generateMarket(0),
    tactics: { formation: '4-4-2', posture: 'equilibrada', captainId: null },
    club: { name: 'Bernardo FC', sigla: 'BFC', colorId: 'azul', crest: 'bola' },
    career: { seasonsPlayed: 0, trophies: 0, totalMatches: 0, totalWins: 0 },
  };
}

export const carryCapacity = s => CFG.player.capacity + s.upgrades.capacity * 2;
export const walkingSpeed = s => CFG.player.speed * (1 + s.upgrades.speed * 0.15);
export const ticketPrice = s => CFG.gate.price + s.upgrades.ticket * 4;
export const seatCapacity = s => CFG.match.seats + s.upgrades.stands * 2;
export const fieldFans = (s, id) => s.fans.filter(f => f.fieldId === id && (f.phase === 'going' || f.phase === 'watching'));
export const currentMission = s => MISSIONS.find(m => missionValue(s, m.key) < m.target) || null;
export function missionValue(s, key) {
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
    else if (id === 'field2') s.fields[1].unlocked = true;
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
  trainPlayer(playerId) {
    const s = this.state;
    const player = s.roster.find(j => j.id === playerId);
    if (!player) return { ok: false, reason: 'Jogador não encontrado.' };
    const res = trainPlayer(player, s.wallet);
    if (!res.ok) return res;
    s.wallet -= res.cost;
    this.emit('training', `Treino concluído: ${player.name} (Força ${player.overall})!`, CFG.office);
    return res;
  }
  hireMarket(marketId) {
    const s = this.state;
    const item = s.market.find(m => m.id === marketId);
    if (!item) return { ok: false, reason: 'Oferta expirada.' };
    const res = hirePlayer(s.roster, item, s.wallet);
    if (!res.ok) return res;
    s.wallet -= res.cost;
    s.market = s.market.filter(m => m.id !== marketId);
    this.emit('hire', `Contratado: ${item.name}!`, CFG.office);
    return res;
  }
  refreshMarket() {
    const s = this.state;
    s.market = generateMarket(s.season?.divisionIndex || 0, () => this.random());
    return s.market;
  }
  scoutYouth() {
    const s = this.state;
    if (s.youthList.length >= 6) return { ok: false, reason: 'Base lotada (máx 6 promessas). Promova ou venda uma promessa.' };
    const cost = 80 + (s.facilities.youth || 0) * 40;
    if (s.wallet < cost) return { ok: false, cost, reason: `Moedas insuficientes. Custo: ${cost}.` };
    s.wallet -= cost;
    const prospect = scoutYouthProspect(s.facilities.youth || 1, s.season?.divisionIndex || 0, () => this.random());
    s.youthList.push(prospect);
    this.emit('scout', `Talento revelado: ${prospect.name} (${prospect.pos}, Pot ${prospect.potential})!`, CFG.office);
    return { ok: true, cost, prospect };
  }
  promoteYouth(prospectId) {
    const s = this.state;
    const prospect = s.youthList.find(p => p.id === prospectId);
    if (!prospect) return { ok: false, reason: 'Promessa não encontrada.' };
    const res = promoteProspect(s.roster, prospect);
    if (!res.ok) return res;
    s.youthList = s.youthList.filter(p => p.id !== prospectId);
    this.emit('promotion', `${prospect.name} promovido aos profissionais!`, CFG.office);
    return res;
  }
  sellYouth(prospectId) {
    const s = this.state;
    const prospect = s.youthList.find(p => p.id === prospectId);
    if (!prospect) return { ok: false, reason: 'Promessa não encontrada.' };
    const value = prospect.marketValue || 100;
    s.wallet += value;
    s.youthList = s.youthList.filter(p => p.id !== prospectId);
    this.emit('sale', `Venda da base: +${value} moedas por ${prospect.name}!`, CFG.cash);
    return { ok: true, value };
  }
  upgradeFacility(facId) {
    const s = this.state;
    const current = s.facilities[facId] || 0;
    const check = canUpgradeFacility(facId, current, s.season?.divisionIndex || 0, s.wallet);
    if (!check.ok) return check;
    s.wallet -= check.cost;
    s.facilities[facId] = current + 1;
    this.emit('facility', `${FACILITIES[facId]?.name || facId}: Nível ${current + 1}!`, CFG.office);
    return { ok: true, cost: check.cost, newLevel: current + 1 };
  }
  playLeagueRound() {
    const s = this.state;
    if (!s.season || s.season.finished) return { ok: false, reason: 'Temporada já finalizada. Inicie a próxima.' };
    const teamStrength = calculateTeamStrength(s.roster, s.tactics.formation, s.tactics.posture, s.tactics.captainId, s.facilities.coaching || 0);
    const roundRes = simulateRound(s.season, teamStrength, () => this.random());
    if (!roundRes) return { ok: false, reason: 'Não foi possível simular a rodada.' };

    const pMatch = roundRes.playerMatch;
    if (pMatch) {
      const won = pMatch.homeScore > pMatch.awayScore;
      const drawn = pMatch.homeScore === pMatch.awayScore;
      const reward = won ? 150 + s.season.divisionIndex * 80 : drawn ? 60 + s.season.divisionIndex * 30 : 20;
      s.wallet += reward;
      s.stats.matches += 1;
      this.emit('match', `Rodada ${roundRes.roundNumber}: ${pMatch.homeName} ${pMatch.homeScore}x${pMatch.awayScore} ${pMatch.awayName} (+${reward} moedas)`, CFG.fields[0]);
    }
    return { ok: true, roundResult: roundRes };
  }
  nextSeason() {
    const s = this.state;
    if (!s.season || !s.season.finished) return { ok: false, reason: 'A temporada ainda está em andamento.' };
    const evaluation = evaluateSeasonEnd(s.season);
    s.career.seasonsPlayed += 1;
    if (evaluation.status === 'champion' || evaluation.status === 'promoted') {
      s.career.trophies += 1;
    }
    s.wallet += evaluation.reward;
    s.season = createSeason(evaluation.nextDivisionIndex, s.club.name, s.club.sigla);
    this.emit('season', `Nova temporada iniciada na ${getDivision(evaluation.nextDivisionIndex).name}! (+${evaluation.reward} moedas)`, CFG.office);
    return { ok: true, evaluation };
  }
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
    if (s.timers.spawn >= CFG.fan.spawnInterval) {
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
    const candidates = s.fields.filter(f => f.unlocked && (f.stock > 0 || f.remaining > 4) && (f.remaining === 0 || f.remaining > 4) && fieldFans(s, f.id).length < seatCapacity(s));
    if (!candidates.length) { s.timers.gate = 0; return; }
    s.timers.gate += dt;
    if (s.timers.gate < CFG.gate.interval) return;
    s.timers.gate = 0;
    const field = candidates.sort((a, b) => fieldFans(s, a.id).length - fieldFans(s, b.id).length || a.id - b.id)[0];
    const occupied = new Set(fieldFans(s, field.id).map(f => f.seat));
    let seat = 0; while (occupied.has(seat)) seat++;
    const destination = seatPosition(field.id, seat);
    fan.phase = 'going'; fan.fieldId = field.id; fan.seat = seat;
    // A passagem dos torcedores contorna o balcão pela direita, antes do corredor.
    fan.route = [{ x: 2.2, z: 9.7 }, { x: 2.2, z: 3.5 }, { x: destination.x, z: 3.5 }, destination];
    this.addRevenue(ticketPrice(s)); s.stats.admitted++;
    this.emit('ticket', `+${ticketPrice(s)}`, CFG.gate);
  }
  updateMatches(dt) {
    const s = this.state;
    for (const field of s.fields) {
      if (!field.unlocked) continue;
      if (field.remaining > 0) {
        field.remaining = Math.max(0, field.remaining - dt);
        field.goalClock -= dt;
        if (field.goalClock <= 0 && field.remaining > 0) {
          field.score[this.random() > 0.5 ? 1 : 0]++;
          field.goalClock = 6 + this.random() * 3; field.lastGoal = s.t;
          this.emit('goal', 'GOOOL!', CFG.fields[field.id]);
        }
        if (field.remaining === 0) {
          field.played++; s.stats.matches++;
          this.addRevenue(CFG.match.reward);
          this.emit('match', `Partida concluída! +${CFG.match.reward}`, CFG.fields[field.id]);
          for (const fan of fieldFans(s, field.id)) {
            fan.phase = 'leaving';
            fan.route = [{ x: fan.x, z: 3.6 }, { x: 12.7, z: 3.6 }, { x: 12.7, z: 16.5 }];
          }
        }
      } else if (field.stock > 0 && s.fans.filter(f => f.fieldId === field.id && f.phase === 'watching').length >= CFG.match.minFans) {
        field.stock--; field.remaining = CFG.match.duration; field.goalClock = 7; field.score = [0, 0];
        this.emit('start', 'Bola rolando!', CFG.fields[field.id]);
      }
    }
  }
}
