/** Módulo de Instalações, Expansão do Clube, Base e Marketing da Arena de Bairro */

export const FACILITIES = Object.freeze({
  stands: {
    id: 'stands',
    name: 'Arquibancada',
    desc: 'Amplia a capacidade de torcedores e a receita dos jogos.',
    icon: '📣',
    baseCost: 120,
    growth: 1.6,
    maxLevel: 5,
    minDivision: 0,
    zone: { x: -6, z: -10, name: 'Setor Norte' },
  },
  gate: {
    id: 'gate',
    name: 'Bilheteria & Catracas',
    desc: 'Aumenta a velocidade de atendimento e o fluxo de torcida.',
    icon: '🎟️',
    baseCost: 90,
    growth: 1.5,
    maxLevel: 4,
    minDivision: 0,
    zone: { x: -3.1, z: 7, name: 'Entrada Sul' },
  },
  youth: {
    id: 'youth',
    name: 'Categoria de Base',
    desc: 'Revela jovens talentos para promover ao elenco ou vender.',
    icon: '🌟',
    baseCost: 350,
    growth: 1.7,
    maxLevel: 5,
    minDivision: 0,
    zone: { x: 10, z: -7, name: 'Campo da Base' },
  },
  training: {
    id: 'training',
    name: 'Centro de Treinamento',
    desc: 'Campo e academia para evoluir os atributos dos atletas.',
    icon: '⚡',
    baseCost: 500,
    growth: 1.75,
    maxLevel: 5,
    minDivision: 0,
    zone: { x: -11, z: -1, name: 'Espaço CT' },
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing & Patrocínios',
    desc: 'Placas de publicidade e parceiros do bairro aumentam o caixa.',
    icon: '📢',
    baseCost: 300,
    growth: 1.65,
    maxLevel: 4,
    minDivision: 0,
    zone: { x: 10, z: 2, name: 'Mural de Patrocínio' },
  },
  coaching: {
    id: 'coaching',
    name: 'Comissão Técnica',
    desc: 'Treinador e preparadores multiplicam a força do time.',
    icon: '📋',
    baseCost: 800,
    growth: 1.8,
    maxLevel: 4,
    minDivision: 1, // Desbloqueia na Série C
    zone: { x: -10, z: 6.5, name: 'Sala Técnica' },
  },
  board: {
    id: 'board',
    name: 'Diretoria & Sede',
    desc: 'Sede administrativa para gestão, identidade e contratos.',
    icon: '🏛️',
    baseCost: 200,
    growth: 1.5,
    maxLevel: 3,
    minDivision: 0,
    zone: { x: 10, z: 6.5, name: 'Sede Administrativa' },
  },
});

export function getFacilityCost(facilityId, currentLevel) {
  const fac = FACILITIES[facilityId];
  if (!fac) return 999999;
  return Math.floor(fac.baseCost * Math.pow(fac.growth, currentLevel));
}

export function canUpgradeFacility(facilityId, currentLevel, divisionIndex, wallet) {
  const fac = FACILITIES[facilityId];
  if (!fac) return { ok: false, reason: 'Instalação inexistente.' };
  if (currentLevel >= fac.maxLevel) return { ok: false, reason: 'Nível máximo atingido.' };
  if (divisionIndex < fac.minDivision) return { ok: false, reason: `Exige Série ${String.fromCharCode(68 - fac.minDivision)}.` };

  const cost = getFacilityCost(facilityId, currentLevel);
  if (wallet < cost) return { ok: false, cost, reason: `Moedas insuficientes. Custo: ${cost}.` };

  return { ok: true, cost };
}

const YOUTH_NAMES = ['Pedrinho', 'Juninho', 'Kaká', 'Zico', 'Nelsinho', 'Paulinho', 'Carlinhos', 'Renatinho', 'Marcelinho', 'Leo', 'Binho'];
const YOUTH_POSITIONS = ['GOL', 'DEF', 'MEI', 'ATA'];

export function scoutYouthProspect(youthLevel = 1, divisionIndex = 0, rngFn = Math.random) {
  const baseRating = 36 + youthLevel * 4 + divisionIndex * 5;
  const overall = baseRating + Math.floor(rngFn() * 6);
  const potential = overall + 10 + Math.floor(rngFn() * 15);
  const pos = YOUTH_POSITIONS[Math.floor(rngFn() * YOUTH_POSITIONS.length)];
  const name = YOUTH_NAMES[Math.floor(rngFn() * YOUTH_NAMES.length)];
  const age = 15 + Math.floor(rngFn() * 4); // 15 a 18 anos
  const marketValue = Math.floor(overall * 12 + potential * 10);

  return {
    id: `base_${Date.now()}_${Math.floor(rngFn() * 1000)}`,
    name: `${name} da Vila`,
    pos,
    overall,
    potential,
    age,
    marketValue,
    trainings: 0,
  };
}

export function promoteProspect(roster, prospect) {
  if (!prospect) return { ok: false, reason: 'Atleta inválido.' };

  const promoted = {
    id: `jog_prom_${Date.now()}`,
    name: prospect.name,
    pos: prospect.pos,
    overall: prospect.overall,
    potential: prospect.potential,
    age: prospect.age,
    starter: false, // Entra na reserva, sem apagar nenhum jogador!
    trainings: prospect.trainings || 0,
  };

  roster.push(promoted);
  return { ok: true, player: promoted };
}
