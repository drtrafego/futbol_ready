import { CONSTRUCOES } from '../config/construcoes';
import { getDivisao } from '../config/divisoes';
import { BuildingId, Jogador } from '../types/game';

export const MARCOS_NIVEL = [10, 25, 50, 100, 200, 300, 500];

/**
 * Custo individual para subir do nívelAtual para o nível (nívelAtual + 1)
 */
export function calcularCustoConstrucao(
  custoBase: number,
  fator: number,
  nivelAtual: number
): number {
  return Math.floor(custoBase * Math.pow(fator, nivelAtual));
}

/**
 * Custo total para comprar 'k' níveis a partir de nivelAtual.
 * Usa a fórmula fechada de soma de Progressão Geométrica (PG):
 * S_k = custoBase * (fator ^ nivel) * ((fator ^ k) - 1) / (fator - 1)
 */
export function calcularCustoLote(
  custoBase: number,
  fator: number,
  nivelAtual: number,
  k: number
): number {
  if (k <= 0) return 0;
  if (k === 1) return calcularCustoConstrucao(custoBase, fator, nivelAtual);

  const primeiroTermo = custoBase * Math.pow(fator, nivelAtual);
  const soma = primeiroTermo * ((Math.pow(fator, k) - 1) / (fator - 1));
  return Math.floor(soma);
}

/**
 * Calcula a quantidade máxima 'k' de níveis compráveis com o dinheiro atual,
 * usando a inversa da fórmula da PG com ajuste de limite discreto.
 */
export function calcularMaxCompravel(
  custoBase: number,
  fator: number,
  nivelAtual: number,
  dinheiroAtual: number
): { quantidade: number; custoTotal: number } {
  if (dinheiroAtual <= 0) return { quantidade: 0, custoTotal: 0 };

  const custoPrimeiro = calcularCustoConstrucao(custoBase, fator, nivelAtual);
  if (dinheiroAtual < custoPrimeiro) {
    return { quantidade: 0, custoTotal: 0 };
  }

  // k = floor( log( 1 + (dinheiro * (fator - 1)) / (custoBase * fator^nivel) ) / log(fator) )
  const termo = (dinheiroAtual * (fator - 1)) / (custoBase * Math.pow(fator, nivelAtual));
  const kEstimado = Math.floor(Math.log(1 + termo) / Math.log(fator));
  let quantidade = Math.max(1, kEstimado);

  // Verificação discreta se é possível comprar +1 nível devido ao arredondamento
  const custoMaisUm = calcularCustoLote(custoBase, fator, nivelAtual, quantidade + 1);
  if (dinheiroAtual >= custoMaisUm) {
    quantidade += 1;
  }

  let custoTotal = calcularCustoLote(custoBase, fator, nivelAtual, quantidade);

  // Garantia contra imprecisão se exceder
  while (quantidade > 0 && custoTotal > dinheiroAtual) {
    quantidade -= 1;
    custoTotal = calcularCustoLote(custoBase, fator, nivelAtual, quantidade);
  }

  return { quantidade, custoTotal };
}

/**
 * Multiplicador de marco de produção (cada marco atingido DOBRA o rendimento).
 */
export function calcularMultiplicadorMarco(nivel: number): number {
  let marcosAtingidos = 0;
  for (const marco of MARCOS_NIVEL) {
    if (nivel >= marco) {
      marcosAtingidos++;
    } else {
      break;
    }
  }
  return Math.pow(2, marcosAtingidos);
}

/**
 * Retorna o próximo marco a ser atingido e a porcentagem até ele.
 */
export function calcularProximoMarco(nivel: number): {
  proximoMarco: number | null;
  progressoPorcentagem: number;
} {
  for (let i = 0; i < MARCOS_NIVEL.length; i++) {
    const marco = MARCOS_NIVEL[i];
    if (nivel < marco) {
      const marcoAnterior = i > 0 ? MARCOS_NIVEL[i - 1] : 0;
      const progresso = ((nivel - marcoAnterior) / (marco - marcoAnterior)) * 100;
      return { proximoMarco: marco, progressoPorcentagem: Math.min(100, Math.max(0, progresso)) };
    }
  }
  return { proximoMarco: null, progressoPorcentagem: 100 };
}

/**
 * Calcula a receita passiva total por segundo (com multiplicadores de marco e de divisão).
 */
export function calcularReceitaPassiva(
  construcoes: Record<BuildingId, number>,
  divisaoIndex: number
): number {
  const divisao = getDivisao(divisaoIndex);
  let receitaBase = 0;

  for (const item of CONSTRUCOES) {
    if (item.tipoRendimento === 'passivo') {
      const nivel = construcoes[item.id] || 0;
      if (nivel > 0) {
        const multMarco = calcularMultiplicadorMarco(nivel);
        receitaBase += item.rendimentoBase * nivel * multMarco;
      }
    }
  }

  return receitaBase * divisao.multiplicadorReceita;
}

/**
 * Calcula o valor por clique no "Grito da Torcida".
 */
export function calcularValorClique(
  construcoes: Record<BuildingId, number>,
  divisaoIndex: number
): number {
  const divisao = getDivisao(divisaoIndex);
  const nivelTorcida = construcoes.torcida || 0;

  const itemTorcida = CONSTRUCOES.find((c) => c.id === 'torcida');
  const rendimentoTorcida = itemTorcida ? itemTorcida.rendimentoBase : 5;

  const multMarco = calcularMultiplicadorMarco(nivelTorcida);
  const ganhoClique = 1 + nivelTorcida * rendimentoTorcida * multMarco;

  return Math.floor(ganhoClique * divisao.multiplicadorReceita);
}

/**
 * Calcula a Força Total do Time (Elenco + Instalações + Tática + Capitão).
 */
export function calcularForcaTime(
  construcoes: Record<BuildingId, number>,
  elenco: Jogador[],
  formacao?: string,
  posturaTatica?: string,
  capitaoId?: string | null
): number {
  // Overall base dos titulares
  let forcaElenco = elenco.reduce((acc, player) => acc + player.overall, 0);

  // Bônus de Liderança do Capitão (+15% do overall do capitão adicionado diretamente à equipe)
  if (capitaoId) {
    const capitao = elenco.find((j) => j.id === capitaoId);
    if (capitao) {
      forcaElenco += Math.max(5, Math.floor(capitao.overall * 0.15));
    }
  }

  const nivelTreino = construcoes.treinamento || 0;
  const itemTreino = CONSTRUCOES.find((c) => c.id === 'treinamento');
  const forcaTreino =
    nivelTreino * (itemTreino?.rendimentoBase || 12) * calcularMultiplicadorMarco(nivelTreino);

  const nivelBase = construcoes.base || 0;
  const itemBase = CONSTRUCOES.find((c) => c.id === 'base');
  const forcaBase =
    nivelBase * (itemBase?.rendimentoBase || 35) * calcularMultiplicadorMarco(nivelBase);

  const nivelComissao = construcoes.comissao || 0;
  const itemComissao = CONSTRUCOES.find((c) => c.id === 'comissao');
  const multComissao = 1 + nivelComissao * (itemComissao?.rendimentoBase || 0.15);

  const forcaInstalacoes = (forcaTreino + forcaBase) * multComissao;

  // Bônus Tático de Postura e Formação
  let multTatico = 1.0;
  if (posturaTatica === 'ofensiva' || posturaTatica === 'defensiva') {
    multTatico += 0.05; // +5% de bônus por ter estratégia definida
  }
  if (formacao && formacao !== '4-4-2') {
    multTatico += 0.03; // +3% de sinergia tática especializada
  }

  return Math.floor((forcaElenco + forcaInstalacoes) * multTatico);
}

/**
 * Calcula o ganho passivo offline sem teto máximo.
 */
export function calcularGanhoOffline(
  salvoEm: number,
  agora: number,
  receitaPorSegundo: number
): { segundosDecorridos: number; ganhoTotal: number } {
  if (!salvoEm || agora <= salvoEm) {
    return { segundosDecorridos: 0, ganhoTotal: 0 };
  }

  const segundosDecorridos = Math.floor((agora - salvoEm) / 1000);
  const ganhoTotal = Math.floor(segundosDecorridos * receitaPorSegundo);

  return { segundosDecorridos, ganhoTotal };
}
