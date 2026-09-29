import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateInitialRoster,
  getStarters,
  getReserves,
  calculateTeamStrength,
  calculateTrainingCost,
  trainPlayer,
  generateMarket,
  hirePlayer,
  swapRosterPlayers,
  POSITIONS,
  FORMATIONS,
} from '../src/roster.js';
import {
  DIVISIONS,
  getDivision,
  createSeason,
  sortTable,
  simulateRound,
  evaluateSeasonEnd,
} from '../src/competition.js';
import {
  FACILITIES,
  getFacilityCost,
  canUpgradeFacility,
  scoutYouthProspect,
  promoteProspect,
} from '../src/facilities.js';
import {
  PROFILES,
  getActiveProfileId,
  getProfileConfig,
} from '../src/profile.js';

test('Elenco Inicial: gera 15 atletas com 11 titulares e posições válidas', () => {
  const roster = generateInitialRoster(46);
  assert.equal(roster.length, 15);
  const starters = getStarters(roster);
  const reserves = getReserves(roster);
  assert.equal(starters.length, 11);
  assert.equal(reserves.length, 4);

  // Confere posições
  for (const j of roster) {
    assert.ok(POSITIONS.includes(j.pos));
    assert.ok(j.overall >= 35 && j.overall <= 80);
    assert.ok(j.potential >= j.overall);
  }
});

test('Força do Time: considera apenas titulares, postura, capitão e comissão', () => {
  const roster = generateInitialRoster(50);
  const strengthBase = calculateTeamStrength(roster, '4-4-2', 'equilibrada', null, 0);
  assert.ok(strengthBase >= 40 && strengthBase <= 70);

  // Bônus tático ofensivo
  const strengthOfensiva = calculateTeamStrength(roster, '4-4-2', 'ofensiva', null, 0);
  assert.ok(strengthOfensiva > strengthBase);

  // Bônus do capitão
  const starters = getStarters(roster);
  const strengthComCapitao = calculateTeamStrength(roster, '4-4-2', 'equilibrada', starters[0].id, 0);
  assert.ok(strengthComCapitao >= strengthBase);

  // Multiplicador da comissão técnica
  const strengthComissao = calculateTeamStrength(roster, '4-4-2', 'equilibrada', null, 2);
  assert.ok(strengthComissao > strengthBase);
});

test('Treinamento: incrementa overall, respeita potencial e escala custo', () => {
  const player = { id: 'p1', name: 'Atleta Teste', overall: 50, potential: 52, trainings: 0 };
  const cost1 = calculateTrainingCost(player);
  assert.equal(cost1, 40);

  // Treina uma vez
  const res1 = trainPlayer(player, 100);
  assert.ok(res1.ok);
  assert.equal(player.overall, 51);
  assert.equal(player.trainings, 1);

  // Custo sobe exponencialmente
  const cost2 = calculateTrainingCost(player);
  assert.ok(cost2 > cost1);

  // Treina segunda vez até o potencial máximo
  const res2 = trainPlayer(player, 100);
  assert.ok(res2.ok);
  assert.equal(player.overall, 52);

  // Tentativa além do potencial deve ser rejeitada
  const res3 = trainPlayer(player, 1000);
  assert.equal(res3.ok, false);
  assert.match(res3.reason, /máximo/);
});

test('Mercado: gera opções da divisão e contratação não apaga jogadores existentes', () => {
  const market = generateMarket(0);
  assert.equal(market.length, 3);
  for (const m of market) {
    assert.ok(m.cost > 0);
    assert.ok(m.overall > 30);
  }

  const roster = generateInitialRoster(46);
  const initialCount = roster.length;
  const hired = hirePlayer(roster, market[0], market[0].cost + 50);
  assert.ok(hired.ok);
  assert.equal(roster.length, initialCount + 1); // Preservou todos os atletas no banco!
  assert.equal(hired.player.starter, false);
});

test('Troca de jogadores: alterna titularidade sem corromper o elenco', () => {
  const roster = generateInitialRoster(46);
  const starter = roster.find(j => j.starter);
  const reserve = roster.find(j => !j.starter);
  assert.ok(starter && reserve);

  const ok = swapRosterPlayers(roster, starter.id, reserve.id);
  assert.ok(ok);
  assert.equal(starter.starter, false);
  assert.equal(reserve.starter, true);
});

test('Competição: calendário de 10 rodadas e simulação simétrica com invariantes', () => {
  const season = createSeason(0, 'Bernardo FC', 'BFC');
  assert.equal(season.clubs.length, 8);
  assert.equal(season.totalRounds, 10);
  assert.equal(season.rounds.length, 10);

  // Simula todas as 10 rodadas
  for (let r = 1; r <= 10; r++) {
    const res = simulateRound(season, 52);
    assert.ok(res);
    assert.equal(res.roundNumber, r);
  }

  assert.equal(season.finished, true);

  // Invariantes por clube: J = V + E + D, PTS = 3*V + E, SG = GP - GC
  for (const club of season.clubs) {
    assert.equal(club.played, 10);
    assert.equal(club.played, club.won + club.drawn + club.lost);
    assert.equal(club.points, club.won * 3 + club.drawn);
    assert.equal(club.goalDiff, club.goalsFor - club.goalsAgainst);
  }

  // Invariantes globais: total de gols marcados = total de gols sofridos
  const totalGP = season.clubs.reduce((acc, c) => acc + c.goalsFor, 0);
  const totalGC = season.clubs.reduce((acc, c) => acc + c.goalsAgainst, 0);
  assert.equal(totalGP, totalGC);

  // Tabela e premiação de fim de temporada
  const evaluation = evaluateSeasonEnd(season);
  assert.ok(evaluation);
  assert.ok(evaluation.playerPos >= 1 && evaluation.playerPos <= 8);
  assert.ok(evaluation.reward > 0);
});

test('Base e Peneira: revela talentos e promove à reserva sem apagar atletas', () => {
  const prospect = scoutYouthProspect(2, 0);
  assert.ok(prospect.overall > 35);
  assert.ok(prospect.potential >= prospect.overall);
  assert.ok(prospect.marketValue > 0);

  const roster = generateInitialRoster(46);
  const countBefore = roster.length;
  const promo = promoteProspect(roster, prospect);
  assert.ok(promo.ok);
  assert.equal(roster.length, countBefore + 1);
  assert.equal(promo.player.starter, false);
});

test('Instalações: calcula custos de ampliação e respeita limites', () => {
  const cost0 = getFacilityCost('stands', 0);
  const cost1 = getFacilityCost('stands', 1);
  assert.ok(cost1 > cost0);

  const checkAllowed = canUpgradeFacility('stands', 0, 0, 500);
  assert.ok(checkAllowed.ok);

  const checkSemSaldo = canUpgradeFacility('stands', 0, 0, 10);
  assert.equal(checkSemSaldo.ok, false);

  const checkMax = canUpgradeFacility('stands', 5, 0, 999999);
  assert.equal(checkMax.ok, false);
});

test('Perfis: disponibiliza Bernardo e Convidado com chaves isoladas', () => {
  assert.equal(PROFILES.length, 2);
  assert.equal(PROFILES[0].id, 'bernardo');
  assert.equal(PROFILES[1].id, 'convidado');
  assert.notEqual(PROFILES[0].saveKey, PROFILES[1].saveKey);
});
