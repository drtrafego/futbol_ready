export interface DivisaoConfig {
  id: number;
  nome: string;
  sigla: string;
  multiplicadorReceita: number;
  forcaInimigaTarget: number;
  pontosParaPromocao: number; // For 10 matches total (e.g. 16 pts = 5 wins + 1 draw)
  pontosRebaixamento: number; // Below 7 pts = rebaixado
  desbloqueios: string[];
}

export const DIVISOES: DivisaoConfig[] = [
  {
    id: 0,
    nome: 'Série D Nacional',
    sigla: 'SÉRIE D',
    multiplicadorReceita: 1.0,
    forcaInimigaTarget: 650,
    pontosParaPromocao: 16,
    pontosRebaixamento: -1, // Não rebaixa abaixo da Série D
    desbloqueios: ['Arquibancada', 'Lanchonete', 'Torcida', 'CT', 'Base'],
  },
  {
    id: 1,
    nome: 'Série C Nacional',
    sigla: 'SÉRIE C',
    multiplicadorReceita: 2.5,
    forcaInimigaTarget: 1200,
    pontosParaPromocao: 17,
    pontosRebaixamento: 7,
    desbloqueios: ['Comissão Técnica'],
  },
  {
    id: 2,
    nome: 'Série B Nacional',
    sigla: 'SÉRIE B',
    multiplicadorReceita: 6.0,
    forcaInimigaTarget: 3000,
    pontosParaPromocao: 18,
    pontosRebaixamento: 8,
    desbloqueios: ['Bônus de Patrocínio Regional'],
  },
  {
    id: 3,
    nome: 'Série A Élite',
    sigla: 'SÉRIE A',
    multiplicadorReceita: 15.0,
    forcaInimigaTarget: 8000,
    pontosParaPromocao: 19,
    pontosRebaixamento: 9,
    desbloqueios: ['Direitos de TV de Ouro'],
  },
  {
    id: 4,
    nome: 'Copa Libertadores',
    sigla: 'LIBERTADORES',
    multiplicadorReceita: 45.0,
    forcaInimigaTarget: 25000,
    pontosParaPromocao: 20,
    pontosRebaixamento: 10,
    desbloqueios: ['Premiação Internacional'],
  },
  {
    id: 5,
    nome: 'Mundial de Clubes',
    sigla: 'MUNDIAL',
    multiplicadorReceita: 120.0,
    forcaInimigaTarget: 90000,
    pontosParaPromocao: 999, // Divisão Máxima!
    pontosRebaixamento: 12,
    desbloqueios: ['Glória Eterna de Campeão do Mundo'],
  },
];

export function getDivisao(index: number): DivisaoConfig {
  const safeIndex = Math.max(0, Math.min(DIVISOES.length - 1, index));
  return DIVISOES[safeIndex];
}
