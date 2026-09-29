import { Jogador, JogadorMercado, JovemPromessa, PosicaoJogador } from '../types/game';

const NOMES_PRIMEIROS = [
  'Bernardo', 'Gabriel', 'Lucas', 'Matheus', 'Pedro', 'Enzo', 'Guilherme', 'Felipe',
  'Rafael', 'Nicolas', 'Thiago', 'Bruno', 'Rodrigo', 'Diego', 'Leonardo', 'Vitor',
  'Kauã', 'Arthur', 'Heitor', 'Davi', 'Samuel', 'Luan', 'Murilo', 'Vinicius'
];

const SOBRENOMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade'
];

function gerarNomeAleatorio(): string {
  const p = NOMES_PRIMEIROS[Math.floor(Math.random() * NOMES_PRIMEIROS.length)];
  const s = SOBRENOMES[Math.floor(Math.random() * SOBRENOMES.length)];
  return `${p} ${s}`;
}

export function gerarElencoInicial(): Jogador[] {
  const posicoes: PosicaoJogador[] = [
    'GOL',
    'DEF', 'DEF', 'DEF', 'DEF',
    'MEI', 'MEI', 'MEI', 'MEI',
    'ATA', 'ATA',
  ];

  return posicoes.map((posicao, index) => {
    // Overall base inicial entre 48 e 55
    const overall = 50 + Math.floor(Math.random() * 6);
    const idade = 18 + Math.floor(Math.random() * 12);
    return {
      id: `jog_init_${index + 1}_${Date.now()}`,
      nome: gerarNomeAleatorio(),
      posicao,
      overall,
      idade,
      treinosRealizados: 0,
    };
  });
}

export function gerarJovemPromessa(nivelBase: number = 1): JovemPromessa {
  const posicoes: PosicaoJogador[] = ['GOL', 'DEF', 'MEI', 'ATA'];
  const posicao = posicoes[Math.floor(Math.random() * posicoes.length)];
  const overallInicial = Math.min(75, 45 + nivelBase * 2 + Math.floor(Math.random() * 6));
  const potencial = Math.min(95, overallInicial + 10 + Math.floor(Math.random() * 12));
  const idade = 16 + Math.floor(Math.random() * 3);
  const valorVenda = Math.floor((overallInicial * 20 + potencial * 15) * Math.pow(1.2, nivelBase));

  return {
    id: `promessa_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    nome: gerarNomeAleatorio(),
    posicao,
    overall: overallInicial,
    potencial,
    idade,
    valorVenda,
    treinosRealizados: 0,
  };
}

export function promoverPromessa(
  promessaId: string,
  elenco: Jogador[],
  peneira: JovemPromessa[]
): { novoElenco: Jogador[]; novaPeneira: JovemPromessa[] } {
  const promessa = peneira.find((p) => p.id === promessaId);
  if (!promessa) return { novoElenco: elenco, novaPeneira: peneira };

  const novaPeneira = peneira.filter((p) => p.id !== promessaId);

  // Encontra titulares da mesma posição
  const titularesMesmaPosicao = elenco.filter((j) => j.posicao === promessa.posicao);

  const novoJogador: Jogador = {
    id: `jog_${promessa.id}`,
    nome: promessa.nome,
    posicao: promessa.posicao,
    overall: promessa.overall,
    idade: promessa.idade,
    treinosRealizados: 0,
  };

  let novoElenco: Jogador[];

  if (titularesMesmaPosicao.length > 0) {
    // Ordena por overall ascendente e substitui o de menor overall
    const menorTitular = [...titularesMesmaPosicao].sort((a, b) => a.overall - b.overall)[0];
    novoElenco = elenco.map((j) => (j.id === menorTitular.id ? novoJogador : j));
  } else {
    novoElenco = [...elenco, novoJogador];
  }

  return { novoElenco, novaPeneira };
}

export function dispensarPromessa(
  promessaId: string,
  peneira: JovemPromessa[]
): { novaPeneira: JovemPromessa[]; valorVenda: number } {
  const promessa = peneira.find((p) => p.id === promessaId);
  if (!promessa) return { novaPeneira: peneira, valorVenda: 0 };

  return {
    novaPeneira: peneira.filter((p) => p.id !== promessaId),
    valorVenda: promessa.valorVenda,
  };
}

// Custo exponencial para treino do titular: custoBase * 1.4^n
export function calcularCustoTreino(jogador: Jogador): number {
  const treinos = jogador.treinosRealizados || 0;
  const custoBase = Math.floor(120 * (jogador.overall / 40));
  return Math.floor(custoBase * Math.pow(1.35, treinos));
}

export function treinarTitular(jogadorId: string, elenco: Jogador[]): Jogador[] {
  return elenco.map((j) => {
    if (j.id !== jogadorId) return j;
    if (j.overall >= 99) return j;
    return {
      ...j,
      overall: j.overall + 1,
      treinosRealizados: (j.treinosRealizados || 0) + 1,
    };
  });
}

/**
 * Troca de posição e vaga entre dois jogadores do elenco (ex: Titular A <-> Titular B ou Reserva <-> Titular)
 */
export function trocarJogadores(idA: string, idB: string, elenco: Jogador[]): Jogador[] {
  const indexA = elenco.findIndex((j) => j.id === idA);
  const indexB = elenco.findIndex((j) => j.id === idB);
  if (indexA === -1 || indexB === -1 || indexA === indexB) return elenco;

  const novoElenco = [...elenco];

  // Troca os dois jogadores no array mantendo suas posições ou permutando-as
  const temp = novoElenco[indexA];
  novoElenco[indexA] = novoElenco[indexB];
  novoElenco[indexB] = temp;

  return novoElenco;
}

/**
 * Altera diretamente a posição tática de um jogador (GOL, DEF, MEI, ATA)
 */
export function alterarPosicaoJogador(id: string, novaPosicao: PosicaoJogador, elenco: Jogador[]): Jogador[] {
  return elenco.map((j) => (j.id === id ? { ...j, posicao: novaPosicao } : j));
}

// Mercado de Transferências
export function gerarMercadoTransferencias(divisaoIndex: number = 0): JogadorMercado[] {
  const posicoes: PosicaoJogador[] = ['GOL', 'DEF', 'MEI', 'ATA'];
  const quantidade = 3;
  const mercado: JogadorMercado[] = [];

  const overallBaseDivisao = 52 + divisaoIndex * 8;

  for (let i = 0; i < quantidade; i++) {
    const posicao = posicoes[Math.floor(Math.random() * posicoes.length)];
    const overall = Math.min(98, Math.max(50, overallBaseDivisao + Math.floor(Math.random() * 9) - 2));
    const idade = 19 + Math.floor(Math.random() * 11);

    // Custo de compra no mercado proporcional ao overall e à divisão
    const custoCompra = Math.floor(350 * Math.pow(1.18, overall - 48) * (1 + divisaoIndex * 0.5));

    mercado.push({
      id: `mercado_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
      nome: gerarNomeAleatorio(),
      posicao,
      overall,
      idade,
      custoCompra,
      treinosRealizados: 0,
    });
  }

  return mercado;
}

export function contratarJogadorMercado(
  mercadoId: string,
  mercado: JogadorMercado[],
  elenco: Jogador[]
): { novoElenco: Jogador[]; novoMercado: JogadorMercado[]; contratado: JogadorMercado | null } {
  const contratado = mercado.find((m) => m.id === mercadoId);
  if (!contratado) return { novoElenco: elenco, novoMercado: mercado, contratado: null };

  const novoMercado = mercado.filter((m) => m.id !== mercadoId);
  const titularesMesmaPosicao = elenco.filter((j) => j.posicao === contratado.posicao);

  const novoJogador: Jogador = {
    id: `jog_mercado_${contratado.id}`,
    nome: contratado.nome,
    posicao: contratado.posicao,
    overall: contratado.overall,
    idade: contratado.idade,
    treinosRealizados: 0,
  };

  let novoElenco: Jogador[];

  if (titularesMesmaPosicao.length > 0) {
    const menorTitular = [...titularesMesmaPosicao].sort((a, b) => a.overall - b.overall)[0];
    novoElenco = elenco.map((j) => (j.id === menorTitular.id ? novoJogador : j));
  } else {
    novoElenco = [...elenco, novoJogador];
  }

  return { novoElenco, novoMercado, contratado };
}
