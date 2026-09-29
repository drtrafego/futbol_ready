import { z } from 'zod';
import { EstadoJogo } from '../types/game';

export const CHAVE_SAVE_LOCAL = 'jogo_bernardo_save_v1';
export const CHAVE_SAVE_BACKUP = 'jogo_bernardo_backup_corrompido';

export const ConfigEscudoSchema = z.object({
  formato: z.enum(['classico', 'redondo', 'losango', 'frances', 'moderno']),
  padrao: z.enum(['liso', 'faixa', 'listras', 'bipartido', 'xadrez']),
  simbolo: z.enum(['bola', 'estrela', 'raio', 'coroa', 'chama', 'montanha', 'ancora', 'trofeu']),
});

export const ConfigTimeSchema = z.object({
  nome: z.string().min(3).max(24),
  sigla: z.string().min(1).max(4),
  corId: z.string(),
  escudo: ConfigEscudoSchema,
});

export const JogadorSchema = z.object({
  id: z.string(),
  nome: z.string(),
  posicao: z.enum(['GOL', 'DEF', 'MEI', 'ATA']),
  overall: z.number(),
  idade: z.number(),
  treinosRealizados: z.number().optional().default(0),
});

export const JovemPromessaSchema = JogadorSchema.extend({
  potencial: z.number(),
  valorVenda: z.number(),
});

export const JogadorMercadoSchema = JogadorSchema.extend({
  custoCompra: z.number(),
});

export const PartidaResultadoSchema = z.object({
  id: z.string(),
  adversario: z.string(),
  placarTime: z.number(),
  placarAdversario: z.number(),
  resultado: z.enum(['vitoria', 'empate', 'derrota']),
  pontosGanhos: z.number(),
  data: z.number(),
});

export const EstadoTemporadaSchema = z.object({
  partidasJogadas: z.number(),
  vitorias: z.number(),
  empates: z.number(),
  derrotas: z.number(),
  pontos: z.number(),
  historico: z.array(PartidaResultadoSchema),
  segundosParaProximaPartida: z.number(),
});

export const ClubeRivalSchema = z.object({
  id: z.string(),
  nome: z.string(),
  sigla: z.string(),
  forca: z.number(),
  jogos: z.number(),
  vitorias: z.number(),
  empates: z.number(),
  derrotas: z.number(),
  golsPro: z.number(),
  golsContra: z.number(),
  saldoGols: z.number(),
  pontos: z.number(),
});

export const EstadoJogoSchema = z.object({
  time: ConfigTimeSchema.nullable(),
  dinheiro: z.number(),
  construcoes: z.record(
    z.enum(['bilheteria', 'lanchonete', 'torcida', 'treinamento', 'base', 'comissao', 'marketing']),
    z.number()
  ),
  divisaoIndex: z.number(),
  temporada: EstadoTemporadaSchema,
  tabelaRivais: z.array(ClubeRivalSchema).optional().default([]),
  elenco: z.array(JogadorSchema),
  peneira: z.array(JovemPromessaSchema),
  mercadoTransferencias: z.array(JogadorMercadoSchema).optional().default([]),
  toquesTreinoAtivo: z.number().optional().default(0),
  formacao: z.enum(['4-3-3', '4-4-2', '3-5-2', '5-3-2']).optional().default('4-4-2'),
  posturaTatica: z.enum(['ofensiva', 'equilibrada', 'defensiva']).optional().default('equilibrada'),
  capitaoId: z.string().nullable().optional().default(null),
  salvoEm: z.number(),
  versao: z.number().optional().default(3),
  modoCompra: z.enum(['x1', 'x10', 'max']),
  gandulaContratado: z.boolean().optional().default(false),
  estatisticas: z.object({
    totalGanho: z.number(),
    totalPartidas: z.number(),
    totalVitorias: z.number(),
    totalCliques: z.number(),
    criadoEm: z.number(),
  }),
});

export function salvarJogo(estado: EstadoJogo): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const estadoComTimestamp: EstadoJogo = {
      ...estado,
      salvoEm: Date.now(),
      versao: 3,
    };
    const jsonStr = JSON.stringify(estadoComTimestamp);
    localStorage.setItem(CHAVE_SAVE_LOCAL, jsonStr);
    return true;
  } catch (err) {
    console.error('Erro ao salvar o jogo:', err);
    return false;
  }
}

export function migrarVersaoSave(dados: Record<string, unknown>): Record<string, unknown> {
  const versaoAtual = typeof dados.versao === 'number' ? dados.versao : 1;
  const dadosMigrados = { ...dados };

  // Migração v1 -> v2 (adição de treinosRealizados, toquesTreinoAtivo, mercadoTransferencias)
  if (versaoAtual < 2) {
    if (Array.isArray(dadosMigrados.elenco)) {
      dadosMigrados.elenco = dadosMigrados.elenco.map((j: unknown) => {
        if (j && typeof j === 'object') {
          const jog = j as Record<string, unknown>;
          return {
            ...jog,
            treinosRealizados: typeof jog.treinosRealizados === 'number' ? jog.treinosRealizados : 0,
          };
        }
        return j;
      });
    }
    if (typeof dadosMigrados.toquesTreinoAtivo !== 'number') {
      dadosMigrados.toquesTreinoAtivo = 0;
    }
    if (!Array.isArray(dadosMigrados.mercadoTransferencias)) {
      dadosMigrados.mercadoTransferencias = [];
    }
  }

  // Migração v2 -> v3 (adição de tabelaRivais e compatibilidade com promessas)
  if (versaoAtual < 3) {
    if (!Array.isArray(dadosMigrados.tabelaRivais)) {
      dadosMigrados.tabelaRivais = [];
    }
    if (Array.isArray(dadosMigrados.peneira)) {
      dadosMigrados.peneira = dadosMigrados.peneira.map((p: unknown) => {
        if (p && typeof p === 'object') {
          const prom = p as Record<string, unknown>;
          return {
            ...prom,
            treinosRealizados: typeof prom.treinosRealizados === 'number' ? prom.treinosRealizados : 0,
          };
        }
        return p;
      });
    }
  }

  // Garantia de novos campos de construções e tática
  if (dadosMigrados.construcoes && typeof dadosMigrados.construcoes === 'object') {
    const c = dadosMigrados.construcoes as Record<string, unknown>;
    if (typeof c.marketing !== 'number') {
      c.marketing = 0;
    }
  }
  if (!dadosMigrados.formacao) {
    dadosMigrados.formacao = '4-4-2';
  }
  if (!dadosMigrados.posturaTatica) {
    dadosMigrados.posturaTatica = 'equilibrada';
  }
  if (dadosMigrados.capitaoId === undefined) {
    dadosMigrados.capitaoId = null;
  }
  if (typeof dadosMigrados.gandulaContratado !== 'boolean') {
    dadosMigrados.gandulaContratado = false;
  }

  dadosMigrados.versao = 3;
  return dadosMigrados;
}

export function carregarJogo(): EstadoJogo | null {
  if (typeof window === 'undefined') return null;

  try {
    const jsonStr = localStorage.getItem(CHAVE_SAVE_LOCAL);
    if (!jsonStr) return null;

    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return null;

    const migrado = migrarVersaoSave(parsed as Record<string, unknown>);
    const validado = EstadoJogoSchema.safeParse(migrado);

    if (validado.success) {
      return validado.data as EstadoJogo;
    } else {
      console.warn('Save corrompido ou inválido detectado. Criando backup...', validado.error);
      localStorage.setItem(CHAVE_SAVE_BACKUP, jsonStr);
      return null;
    }
  } catch (err) {
    console.error('Erro ao carregar o save:', err);
    return null;
  }
}

export function limparJogo(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CHAVE_SAVE_LOCAL);
  } catch (err) {
    console.error('Erro ao limpar o save:', err);
  }
}
