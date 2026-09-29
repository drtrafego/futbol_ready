/** Módulo de Competições, Divisões e Tabela da Arena de Bairro */

export const DIVISIONS = Object.freeze([
  { index: 0, name: 'Série D', minStrength: 40, targetStrength: 45, reward: 250, badge: '🥉' },
  { index: 1, name: 'Série C', minStrength: 55, targetStrength: 60, reward: 600, badge: '🥈' },
  { index: 2, name: 'Série B', minStrength: 70, targetStrength: 75, reward: 1500, badge: '🥇' },
  { index: 3, name: 'Série A', minStrength: 85, targetStrength: 90, reward: 4000, badge: '🏆' },
  { index: 4, name: 'Continental', minStrength: 98, targetStrength: 105, reward: 10000, badge: '🌎' },
  { index: 5, name: 'Mundial', minStrength: 112, targetStrength: 120, reward: 30000, badge: '👑' },
]);

export const RIVALS = Object.freeze({
  0: [
    { id: 'avv', name: 'Atlético Vale Verde', sigla: 'AVV' },
    { id: 'use', name: 'União Serrana', sigla: 'USE' },
    { id: 'rpi', name: 'Real Pioneiro', sigla: 'RPI' },
    { id: 'ind', name: 'Independente FC', sigla: 'IND' },
    { id: 'vns', name: 'Vila Nova do Sul', sigla: 'VNS' },
    { id: 'opl', name: 'Operário Leste', sigla: 'OPL' },
    { id: 'eno', name: 'Estrela do Norte', sigla: 'ENO' },
  ],
  1: [
    { id: 'epc', name: 'EC Paulista Central', sigla: 'EPC' },
    { id: 'frs', name: 'Ferroviário da Serra', sigla: 'FRS' },
    { id: 'gdv', name: 'Guarani do Vale', sigla: 'GDV' },
    { id: 'noa', name: 'Noroeste Atlético', sigla: 'NOA' },
    { id: 'juv', name: 'Juventus Litorâneo', sigla: 'JUV' },
    { id: 'cmc', name: 'Comercial da Capital', sigla: 'CMC' },
    { id: 'bti', name: 'Botafogo do Interior', sigla: 'BTI' },
  ],
  2: [
    { id: 'ppg', name: 'Ponte Preta Gaúcha', sigla: 'PPG' },
    { id: 'lec', name: 'Londrina EC', sigla: 'LEC' },
    { id: 'cdf', name: 'Criciúma da Fronteira', sigla: 'CDF' },
    { id: 'amr', name: 'América Real', sigla: 'AMR' },
    { id: 'vtb', name: 'Vitória Baiano', sigla: 'VTB' },
    { id: 'srd', name: 'Sport Dourado', sigla: 'SRD' },
    { id: 'crp', name: 'Ceará Praiano', sigla: 'CRP' },
  ],
  3: [
    { id: 'fla', name: 'Flamengo Carioca', sigla: 'FLA' },
    { id: 'pal', name: 'Palmeiras Alviverde', sigla: 'PAL' },
    { id: 'sao', name: 'São Paulo Tricolor', sigla: 'SAO' },
    { id: 'cor', name: 'Corinthians Mosqueteiro', sigla: 'COR' },
    { id: 'cam', name: 'Atlético Mineiro Galo', sigla: 'CAM' },
    { id: 'int', name: 'Internacional Colorado', sigla: 'INT' },
    { id: 'gre', name: 'Grêmio Imortal', sigla: 'GRE' },
  ],
  4: [
    { id: 'boc', name: 'Boca Juniors de La Boca', sigla: 'BOC' },
    { id: 'riv', name: 'River Plate Monumental', sigla: 'RIV' },
    { id: 'pen', name: 'Peñarol Carbonero', sigla: 'PEN' },
    { id: 'nac', name: 'Nacional do Uruguai', sigla: 'NAC' },
    { id: 'oli', name: 'Olimpia de Asunción', sigla: 'OLI' },
    { id: 'atn', name: 'Atlético Nacional Medellin', sigla: 'ATN' },
    { id: 'col', name: 'Colo-Colo Eterno', sigla: 'COL' },
  ],
  5: [
    { id: 'rma', name: 'Real Madrid Galáctico', sigla: 'RMA' },
    { id: 'mci', name: 'Manchester City Imperial', sigla: 'MCI' },
    { id: 'bay', name: 'Bayern de Munique', sigla: 'BAY' },
    { id: 'psg', name: 'Paris Saint-Germain', sigla: 'PSG' },
    { id: 'liv', name: 'Liverpool dos Campeões', sigla: 'LIV' },
    { id: 'inm', name: 'Inter de Milão', sigla: 'INM' },
    { id: 'bar', name: 'Barcelona Blaugrana', sigla: 'BAR' },
  ],
});

export function getDivision(index) {
  const safe = Math.max(0, Math.min(DIVISIONS.length - 1, Math.floor(index || 0)));
  return DIVISIONS[safe];
}

export function createSeason(divisionIndex = 0, clubName = 'Bernardo FC', clubAcronym = 'BFC') {
  const div = getDivision(divisionIndex);
  const rivalsDef = RIVALS[div.index] || RIVALS[0];

  const clubs = [
    {
      id: 'player',
      name: clubName,
      sigla: clubAcronym,
      isPlayer: true,
      strength: div.minStrength,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    },
    ...rivalsDef.map((r, i) => {
      const variation = 0.88 + (i / Math.max(1, rivalsDef.length - 1)) * 0.24;
      const strength = Math.max(10, Math.floor(div.targetStrength * variation));
      return {
        id: r.id,
        name: r.name,
        sigla: r.sigla,
        isPlayer: false,
        strength,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      };
    }),
  ];

  // Gera 10 rodadas de confrontos reais entre os 8 clubes
  const rounds = [];
  const rivalIds = rivalsDef.map(r => r.id);

  for (let r = 0; r < 10; r++) {
    const oppIndex = r % rivalIds.length;
    const playerOppId = rivalIds[oppIndex];

    const freeRivals = rivalIds.filter(id => id !== playerOppId);
    const matches = [
      { homeId: r % 2 === 0 ? 'player' : playerOppId, awayId: r % 2 === 0 ? playerOppId : 'player', played: false, homeScore: 0, awayScore: 0 },
    ];

    // Pareia os outros 6 rivais em 3 jogos
    for (let p = 0; p < freeRivals.length; p += 2) {
      if (freeRivals[p] && freeRivals[p + 1]) {
        matches.push({
          homeId: freeRivals[p],
          awayId: freeRivals[p + 1],
          played: false,
          homeScore: 0,
          awayScore: 0,
        });
      }
    }

    rounds.push({
      roundNumber: r + 1,
      played: false,
      matches,
    });
  }

  return {
    divisionIndex: div.index,
    currentRound: 1,
    totalRounds: 10,
    finished: false,
    clubs,
    rounds,
    history: [],
  };
}

export function sortTable(clubs) {
  return [...clubs].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  });
}

export function simulateRound(season, playerStrength, rngFn = Math.random) {
  if (!season || season.finished) return null;
  const roundIdx = season.currentRound - 1;
  const round = season.rounds[roundIdx];
  if (!round || round.played) return null;

  const clubMap = new Map(season.clubs.map(c => [c.id, c]));
  const roundResults = [];

  for (const match of round.matches) {
    const home = clubMap.get(match.homeId);
    const away = clubMap.get(match.awayId);
    if (!home || !away) continue;

    const homeStrength = home.isPlayer ? playerStrength : home.strength;
    const awayStrength = away.isPlayer ? playerStrength : away.strength;

    const ratio = homeStrength / Math.max(1, homeStrength + awayStrength);
    const roll = rngFn();

    let homeScore = 0;
    let awayScore = 0;

    if (Math.abs(ratio - 0.5) < 0.1 && roll < 0.35) {
      const g = Math.floor(rngFn() * 3);
      homeScore = g;
      awayScore = g;
    } else if (roll < ratio) {
      homeScore = 1 + Math.floor(rngFn() * 3);
      awayScore = Math.floor(rngFn() * homeScore);
    } else {
      awayScore = 1 + Math.floor(rngFn() * 3);
      homeScore = Math.floor(rngFn() * awayScore);
    }

    match.homeScore = homeScore;
    match.awayScore = awayScore;
    match.played = true;

    // Atualiza estatísticas do mandante
    home.played += 1;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    home.goalDiff = home.goalsFor - home.goalsAgainst;

    // Atualiza estatísticas do visitante
    away.played += 1;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;
    away.goalDiff = away.goalsFor - away.goalsAgainst;

    if (homeScore > awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (homeScore < awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      home.points += 1;
      away.drawn += 1;
      away.points += 1;
    }

    roundResults.push({
      roundNumber: round.roundNumber,
      homeName: home.name,
      awayName: away.name,
      homeSigla: home.sigla,
      awaySigla: away.sigla,
      homeScore,
      awayScore,
      isPlayerMatch: home.isPlayer || away.isPlayer,
    });
  }

  round.played = true;
  season.history.unshift(...roundResults.filter(r => r.isPlayerMatch));

  if (season.currentRound >= season.totalRounds) {
    season.finished = true;
  } else {
    season.currentRound += 1;
  }

  return {
    roundNumber: round.roundNumber,
    results: roundResults,
    playerMatch: roundResults.find(r => r.isPlayerMatch),
    finished: season.finished,
  };
}

export function evaluateSeasonEnd(season) {
  if (!season || !season.finished) return null;
  const sorted = sortTable(season.clubs);
  const playerPos = sorted.findIndex(c => c.isPlayer) + 1;
  const currentDiv = getDivision(season.divisionIndex);

  let status = 'stay';
  let nextDivisionIndex = season.divisionIndex;
  let reward = 100;

  if (playerPos <= 2) {
    // Acesso
    if (season.divisionIndex < DIVISIONS.length - 1) {
      status = 'promoted';
      nextDivisionIndex += 1;
      reward = currentDiv.reward;
    } else {
      status = 'champion';
      reward = currentDiv.reward * 1.5;
    }
  } else if (playerPos >= 7) {
    // Rebaixamento
    if (season.divisionIndex > 0) {
      status = 'relegated';
      nextDivisionIndex -= 1;
      reward = Math.floor(currentDiv.reward * 0.25);
    } else {
      status = 'stay';
      reward = Math.floor(currentDiv.reward * 0.4);
    }
  } else {
    // Permanência
    status = 'stay';
    reward = Math.floor(currentDiv.reward * 0.6);
  }

  return {
    playerPos,
    status,
    nextDivisionIndex,
    reward,
    champion: sorted[0].name,
    table: sorted,
  };
}
