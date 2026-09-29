import { getDivisao } from '../config/divisoes';
import {
  ClubeRival,
  ConfigTime,
  EstadoTemporada,
  LinhaClassificacao,
  PartidaResultado,
} from '../types/game';

interface DefinicaoClube {
  id: string;
  nome: string;
  sigla: string;
}

const RIVAIS_POR_DIVISAO: Record<number, DefinicaoClube[]> = {
  0: [
    { id: 'avv', nome: 'Atlético Vale Verde', sigla: 'AVV' },
    { id: 'use', nome: 'União Serrana', sigla: 'USE' },
    { id: 'rpi', nome: 'Real Pioneiro', sigla: 'RPI' },
    { id: 'ind', nome: 'Independente FC', sigla: 'IND' },
    { id: 'vns', nome: 'Vila Nova do Sul', sigla: 'VNS' },
    { id: 'opl', nome: 'Operário Leste', sigla: 'OPL' },
    { id: 'eno', nome: 'Estrela do Norte', sigla: 'ENO' },
  ],
  1: [
    { id: 'epc', nome: 'EC Paulista Central', sigla: 'EPC' },
    { id: 'frs', nome: 'Ferroviário da Serra', sigla: 'FRS' },
    { id: 'gdv', nome: 'Guarani do Vale', sigla: 'GDV' },
    { id: 'noa', nome: 'Noroeste Atlético', sigla: 'NOA' },
    { id: 'juv', nome: 'Juventus Litorâneo', sigla: 'JUV' },
    { id: 'cmc', nome: 'Comercial da Capital', sigla: 'CMC' },
    { id: 'bti', nome: 'Botafogo do Interior', sigla: 'BTI' },
  ],
  2: [
    { id: 'ppg', nome: 'Ponte Preta Gaúcha', sigla: 'PPG' },
    { id: 'lec', nome: 'Londrina EC', sigla: 'LEC' },
    { id: 'cdf', nome: 'Criciúma da Fronteira', sigla: 'CDF' },
    { id: 'amr', nome: 'América Real', sigla: 'AMR' },
    { id: 'vtb', nome: 'Vitória Baiano', sigla: 'VTB' },
    { id: 'srd', nome: 'Sport Dourado', sigla: 'SRD' },
    { id: 'crp', nome: 'Ceará Praiano', sigla: 'CRP' },
  ],
  3: [
    { id: 'fla', nome: 'Flamengo Carioca', sigla: 'FLA' },
    { id: 'pal', nome: 'Palmeiras Alviverde', sigla: 'PAL' },
    { id: 'sao', nome: 'São Paulo Tricolor', sigla: 'SAO' },
    { id: 'cor', nome: 'Corinthians Mosqueteiro', sigla: 'COR' },
    { id: 'cam', nome: 'Atlético Mineiro Galo', sigla: 'CAM' },
    { id: 'int', nome: 'Internacional Colorado', sigla: 'INT' },
    { id: 'gre', nome: 'Grêmio Imortal', sigla: 'GRE' },
  ],
  4: [
    { id: 'boc', nome: 'Boca Juniors de La Boca', sigla: 'BOC' },
    { id: 'riv', nome: 'River Plate Monumental', sigla: 'RIV' },
    { id: 'pen', nome: 'Peñarol Carbonero', sigla: 'PEN' },
    { id: 'nac', nome: 'Nacional do Uruguai', sigla: 'NAC' },
    { id: 'oli', nome: 'Olimpia de Asunción', sigla: 'OLI' },
    { id: 'atn', nome: 'Atlético Nacional Medellin', sigla: 'ATN' },
    { id: 'col', nome: 'Colo-Colo Eterno', sigla: 'COL' },
  ],
  5: [
    { id: 'rma', nome: 'Real Madrid Galáctico', sigla: 'RMA' },
    { id: 'mci', nome: 'Manchester City Imperial', sigla: 'MCI' },
    { id: 'bay', nome: 'Bayern de Munique', sigla: 'BAY' },
    { id: 'psg', nome: 'Paris Saint-Germain', sigla: 'PSG' },
    { id: 'liv', nome: 'Liverpool dos Campeões', sigla: 'LIV' },
    { id: 'inm', nome: 'Inter de Milão', sigla: 'INM' },
    { id: 'bar', nome: 'Barcelona Blaugrana', sigla: 'BAR' },
  ],
};

export function gerarRivaisDivisao(divisaoIndex: number = 0): ClubeRival[] {
  const lista = RIVAIS_POR_DIVISAO[divisaoIndex] || RIVAIS_POR_DIVISAO[0];
  const divisao = getDivisao(divisaoIndex);

  return lista.map((clube, i) => {
    // Variação de força entre -12% e +12%
    const variacao = 0.88 + (i / (lista.length - 1 || 1)) * 0.24;
    const forca = Math.max(10, Math.floor(divisao.forcaInimigaTarget * variacao));

    return {
      id: clube.id,
      nome: clube.nome,
      sigla: clube.sigla,
      forca,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golsPro: 0,
      golsContra: 0,
      saldoGols: 0,
      pontos: 0,
    };
  });
}

export interface SimularPartidaOpcoes {
  forcaTime: number;
  divisaoIndex: number;
  rngFn?: () => number;
}

/**
 * Simula uma partida entre o time do jogador e um adversário da divisão atual.
 */
export function simularPartida({
  forcaTime,
  divisaoIndex,
  rngFn = Math.random,
}: SimularPartidaOpcoes): PartidaResultado {
  const divisao = getDivisao(divisaoIndex);

  const variacaoInimigo = 0.85 + rngFn() * 0.3;
  const forcaInimigo = Math.max(10, Math.floor(divisao.forcaInimigaTarget * variacaoInimigo));

  const ratioForca = forcaTime / (forcaTime + forcaInimigo);
  const roll = rngFn();

  let resultado: 'vitoria' | 'empate' | 'derrota';
  let placarTime = 0;
  let placarAdversario = 0;

  if (Math.abs(ratioForca - 0.5) < 0.12 && rngFn() < 0.3) {
    resultado = 'empate';
    const gols = Math.floor(rngFn() * 3);
    placarTime = gols;
    placarAdversario = gols;
  } else if (roll < ratioForca) {
    resultado = 'vitoria';
    placarTime = 1 + Math.floor(rngFn() * 3);
    placarAdversario = Math.floor(rngFn() * placarTime);
  } else {
    resultado = 'derrota';
    placarAdversario = 1 + Math.floor(rngFn() * 3);
    placarTime = Math.floor(rngFn() * placarAdversario);
  }

  const pontosGanhos = resultado === 'vitoria' ? 3 : resultado === 'empate' ? 1 : 0;
  const listaRivais = RIVAIS_POR_DIVISAO[divisaoIndex] || RIVAIS_POR_DIVISAO[0];
  const indexNome = Math.floor(rngFn() * listaRivais.length);
  const adversario = listaRivais[indexNome].nome;

  return {
    id: `partida_${Date.now()}_${Math.floor(rngFn() * 1000)}`,
    adversario,
    placarTime,
    placarAdversario,
    resultado,
    pontosGanhos,
    data: Date.now(),
  };
}

/**
 * Simula a rodada dos clubes rivais, gerando resultados e atualizando a pontuação.
 */
export function simularRodadaRivais(
  rivais: ClubeRival[],
  divisaoIndex: number,
  rngFn = Math.random
): ClubeRival[] {
  const divisao = getDivisao(divisaoIndex);

  return rivais.map((rival) => {
    const roll = rngFn();
    const ratio = rival.forca / (divisao.forcaInimigaTarget * 2);

    let vitorias = rival.vitorias;
    let empates = rival.empates;
    let derrotas = rival.derrotas;
    let pontosGanhos = 0;
    let golsMarcados = 0;
    let golsSofridos = 0;

    if (roll < 0.25) {
      // Empate
      empates += 1;
      pontosGanhos = 1;
      golsMarcados = Math.floor(rngFn() * 2);
      golsSofridos = golsMarcados;
    } else if (roll < 0.25 + Math.min(0.55, 0.4 + ratio * 0.15)) {
      // Vitória
      vitorias += 1;
      pontosGanhos = 3;
      golsMarcados = 1 + Math.floor(rngFn() * 3);
      golsSofridos = Math.floor(rngFn() * golsMarcados);
    } else {
      // Derrota
      derrotas += 1;
      pontosGanhos = 0;
      golsSofridos = 1 + Math.floor(rngFn() * 3);
      golsMarcados = Math.floor(rngFn() * golsSofridos);
    }

    const novosGolsPro = rival.golsPro + golsMarcados;
    const novosGolsContra = rival.golsContra + golsSofridos;

    return {
      ...rival,
      jogos: rival.jogos + 1,
      vitorias,
      empates,
      derrotas,
      golsPro: novosGolsPro,
      golsContra: novosGolsContra,
      saldoGols: novosGolsPro - novosGolsContra,
      pontos: rival.pontos + pontosGanhos,
    };
  });
}

/**
 * Monta e ordena a tabela de classificação oficial incluindo o time do jogador e os rivais.
 */
export function obterTabelaCompleta(
  timeJogador: ConfigTime,
  temporada: EstadoTemporada,
  rivais: ClubeRival[]
): LinhaClassificacao[] {
  // Calcula saldo e gols do jogador através do histórico da temporada
  let golsProJogador = 0;
  let golsContraJogador = 0;

  for (const partida of temporada.historico) {
    golsProJogador += partida.placarTime;
    golsContraJogador += partida.placarAdversario;
  }

  const linhaJogador: LinhaClassificacao = {
    posicao: 1,
    id: 'time_jogador',
    nome: timeJogador.nome,
    sigla: timeJogador.sigla,
    jogos: temporada.partidasJogadas,
    vitorias: temporada.vitorias,
    empates: temporada.empates,
    derrotas: temporada.derrotas,
    golsPro: golsProJogador,
    golsContra: golsContraJogador,
    saldoGols: golsProJogador - golsContraJogador,
    pontos: temporada.pontos,
    isJogador: true,
  };

  const todasLinhas: LinhaClassificacao[] = [
    linhaJogador,
    ...rivais.map((r) => ({
      posicao: 1,
      id: r.id,
      nome: r.nome,
      sigla: r.sigla,
      jogos: r.jogos,
      vitorias: r.vitorias,
      empates: r.empates,
      derrotas: r.derrotas,
      golsPro: r.golsPro,
      golsContra: r.golsContra,
      saldoGols: r.saldoGols,
      pontos: r.pontos,
      isJogador: false,
    })),
  ];

  // Ordenação de futebol oficial: 1º Pontos, 2º Vitórias, 3º Saldo de Gols, 4º Gols Pró
  todasLinhas.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
    if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols;
    return b.golsPro - a.golsPro;
  });

  return todasLinhas.map((item, idx) => ({
    ...item,
    posicao: idx + 1,
  }));
}

/**
 * Processa o término de uma temporada de 10 jogos.
 * Considera a posição na tabela de classificação (G-2 promove, Z-2 rebaixa).
 */
export function avaliarFimDeTemporada(
  temporada: EstadoTemporada,
  divisaoIndex: number,
  posicaoTabela?: number,
  totalTimes: number = 8
): {
  novaDivisaoIndex: number;
  status: 'promovido' | 'rebaixado' | 'mantido';
} {
  const divisao = getDivisao(divisaoIndex);

  // Se posição na tabela for informada (critério oficial do campeonato)
  if (typeof posicaoTabela === 'number') {
    // 1º e 2º colocados sobem de divisão (G-2)
    if (posicaoTabela <= 2 && divisaoIndex < 5) {
      return {
        novaDivisaoIndex: divisaoIndex + 1,
        status: 'promovido',
      };
    }

    // Últimos 2 colocados são rebaixados (Z-2), exceto na Série D
    if (posicaoTabela >= totalTimes - 1 && divisaoIndex > 0) {
      return {
        novaDivisaoIndex: divisaoIndex - 1,
        status: 'rebaixado',
      };
    }

    return {
      novaDivisaoIndex: divisaoIndex,
      status: 'mantido',
    };
  }

  // Fallback baseado nos pontos isolados da temporada
  if (temporada.pontos >= divisao.pontosParaPromocao && divisaoIndex < 5) {
    return {
      novaDivisaoIndex: divisaoIndex + 1,
      status: 'promovido',
    };
  } else if (
    divisao.pontosRebaixamento >= 0 &&
    temporada.pontos < divisao.pontosRebaixamento &&
    divisaoIndex > 0
  ) {
    return {
      novaDivisaoIndex: divisaoIndex - 1,
      status: 'rebaixado',
    };
  }

  return {
    novaDivisaoIndex: divisaoIndex,
    status: 'mantido',
  };
}
