/** Módulo de Elenco, Mercado, Treinamento e Tática da Arena de Bairro */

export const POSITIONS = Object.freeze(['GOL', 'DEF', 'MEI', 'ATA']);

export const FORMATIONS = Object.freeze({
  '4-4-2': { GOL: 1, DEF: 4, MEI: 4, ATA: 2 },
  '4-3-3': { GOL: 1, DEF: 4, MEI: 3, ATA: 3 },
  '3-5-2': { GOL: 1, DEF: 3, MEI: 5, ATA: 2 },
  '5-3-2': { GOL: 1, DEF: 5, MEI: 3, ATA: 2 },
});

export const POSTURES = Object.freeze(['ofensiva', 'equilibrada', 'defensiva']);

const FIRST_NAMES = ['Bernardo', 'Lucas', 'Gabriel', 'Mateus', 'Felipe', 'Rafael', 'Diego', 'Thiago', 'Rodrigo', 'Bruno', 'Gustavo', 'Caio', 'Danilo', 'Vitor', 'Igor', 'Enzo', 'Luan'];
const LAST_NAMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Lima', 'Carvalho', 'Ferreira', 'Ribeiro', 'Costa', 'Gomes', 'Martins', 'Araújo', 'Barbosa', 'Rocha'];

function pick(arr, rngFn = Math.random) {
  return arr[Math.floor(rngFn() * arr.length)];
}

export function generateInitialRoster(baseStrength = 46, rngFn = Math.random) {
  const roster = [];
  const counts = { GOL: 2, DEF: 5, MEI: 5, ATA: 3 }; // 15 jogadores (11 titulares + 4 reservas)
  let idCounter = 1;

  for (const pos of POSITIONS) {
    const total = counts[pos];
    for (let i = 0; i < total; i++) {
      const isStarter = i < FORMATIONS['4-4-2'][pos];
      const variance = Math.floor(rngFn() * 5) - 2;
      const overall = Math.max(38, Math.min(65, baseStrength + variance));
      const potential = overall + Math.floor(rngFn() * 12) + 6;

      roster.push({
        id: `jog_${idCounter++}`,
        name: `${pick(FIRST_NAMES, rngFn)} ${pick(LAST_NAMES, rngFn)}`,
        pos,
        overall,
        potential,
        age: 18 + Math.floor(rngFn() * 10),
        starter: isStarter,
        trainings: 0,
      });
    }
  }

  return roster;
}

export function getStarters(roster) {
  return roster.filter(j => j.starter);
}

export function getReserves(roster) {
  return roster.filter(j => !j.starter);
}

export function calculateTeamStrength(roster, formation = '4-4-2', posture = 'equilibrada', captainId = null, coachingLevel = 0) {
  const starters = getStarters(roster);
  if (starters.length === 0) return 30;

  // Média de força dos titulares
  const baseAvg = starters.reduce((acc, j) => acc + j.overall, 0) / starters.length;

  // Bônus tático
  let tacticalMod = 0;
  if (posture === 'ofensiva') tacticalMod = 2;
  else if (posture === 'defensiva') tacticalMod = -1;
  else tacticalMod = 0;

  // Bônus do capitão
  let captainMod = 0;
  if (captainId) {
    const captain = starters.find(j => j.id === captainId);
    if (captain) captainMod = Math.min(5, Math.floor(captain.overall * 0.05));
  }

  // Multiplicador da comissão técnica (+4% por nível)
  const staffMultiplier = 1 + (coachingLevel * 0.04);

  return Math.max(10, Math.floor((baseAvg + tacticalMod + captainMod) * staffMultiplier));
}

export function calculateTrainingCost(player) {
  const count = player.trainings || 0;
  return Math.floor(40 * Math.pow(1.35, count));
}

export function trainPlayer(player, wallet) {
  if (!player) return { ok: false, reason: 'Jogador inválido.' };
  if (player.overall >= player.potential) {
    return { ok: false, reason: `${player.name} já atingiu o potencial máximo (${player.potential}).` };
  }

  const cost = calculateTrainingCost(player);
  if (wallet < cost) {
    return { ok: false, cost, reason: `Moedas insuficientes. Custo: ${cost}.` };
  }

  player.overall += 1;
  player.trainings = (player.trainings || 0) + 1;

  return { ok: true, cost, newOverall: player.overall };
}

export function generateMarket(divisionIndex = 0, rngFn = Math.random) {
  const baseTarget = 44 + divisionIndex * 15;
  const items = [];

  for (let i = 0; i < 3; i++) {
    const pos = pick(POSITIONS, rngFn);
    const overall = baseTarget + Math.floor(rngFn() * 7) - 2;
    const potential = overall + Math.floor(rngFn() * 10) + 5;
    const age = 19 + Math.floor(rngFn() * 9);
    const cost = Math.max(50, Math.floor(Math.pow(overall / 10, 2.7) * (15 + divisionIndex * 10)));

    items.push({
      id: `mkt_${Date.now()}_${i}`,
      name: `${pick(FIRST_NAMES, rngFn)} ${pick(LAST_NAMES, rngFn)}`,
      pos,
      overall,
      potential,
      age,
      cost,
    });
  }

  return items;
}

export function hirePlayer(roster, marketPlayer, wallet) {
  if (!marketPlayer || wallet < marketPlayer.cost) {
    return { ok: false, reason: 'Moedas insuficientes para contratar.' };
  }

  const newPlayer = {
    id: `jog_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: marketPlayer.name,
    pos: marketPlayer.pos,
    overall: marketPlayer.overall,
    potential: marketPlayer.potential,
    age: marketPlayer.age,
    starter: false, // Entra na reserva, preservando os titulares!
    trainings: 0,
  };

  roster.push(newPlayer);
  return { ok: true, cost: marketPlayer.cost, player: newPlayer };
}

export function swapRosterPlayers(roster, idA, idB) {
  const idxA = roster.findIndex(j => j.id === idA);
  const idxB = roster.findIndex(j => j.id === idB);
  if (idxA === -1 || idxB === -1) return false;

  const tempStarter = roster[idxA].starter;
  roster[idxA].starter = roster[idxB].starter;
  roster[idxB].starter = tempStarter;
  return true;
}
