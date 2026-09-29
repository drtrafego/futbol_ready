import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHAVE_SAVE_BACKUP,
  CHAVE_SAVE_LOCAL,
  EstadoJogoSchema,
  carregarJogo,
  limparJogo,
  migrarVersaoSave,
  salvarJogo,
} from '../src/lib/save';
import { EstadoJogo } from '../src/types/game';

describe('Sistema de Save e Migração de Versão', () => {
  const estadoValido: EstadoJogo = {
    time: {
      nome: 'Bernardo FC',
      sigla: 'BFC',
      corId: 'azul',
      escudo: { formato: 'classico', padrao: 'liso', simbolo: 'bola' },
    },
    dinheiro: 1500,
    construcoes: {
      bilheteria: 2,
      lanchonete: 1,
      torcida: 0,
      treinamento: 0,
      base: 1,
      comissao: 0,
      marketing: 0,
    },
    divisaoIndex: 0,
    temporada: {
      partidasJogadas: 2,
      vitorias: 1,
      empates: 1,
      derrotas: 0,
      pontos: 4,
      historico: [],
      segundosParaProximaPartida: 45,
    },
    tabelaRivais: [],
    elenco: [
      { id: 'j1', nome: 'Goleiro', posicao: 'GOL', overall: 52, idade: 20, treinosRealizados: 1 },
    ],
    peneira: [],
    mercadoTransferencias: [],
    toquesTreinoAtivo: 3,
    salvoEm: Date.now(),
    versao: 3,
    modoCompra: 'x1',
    estatisticas: {
      totalGanho: 3000,
      totalPartidas: 2,
      totalVitorias: 1,
      totalCliques: 15,
      criadoEm: Date.now() - 60000,
    },
  };

  let storageMock: Record<string, string> = {};

  beforeEach(() => {
    storageMock = {};
    const mockStorage = {
      getItem: (key: string) => storageMock[key] ?? null,
      setItem: (key: string, val: string) => {
        storageMock[key] = String(val);
      },
      removeItem: (key: string) => {
        delete storageMock[key];
      },
      clear: () => {
        storageMock = {};
      },
    };
    vi.stubGlobal('localStorage', mockStorage);
    vi.stubGlobal('window', { localStorage: mockStorage });
  });

  it('EstadoJogoSchema deve aceitar um estado válido', () => {
    const parseRes = EstadoJogoSchema.safeParse(estadoValido);
    expect(parseRes.success).toBe(true);
  });

  it('EstadoJogoSchema deve rejeitar dados ausentes ou corrompidos', () => {
    const corrompido = { ...estadoValido, dinheiro: 'nao-e-numero' };
    const parseRes = EstadoJogoSchema.safeParse(corrompido);
    expect(parseRes.success).toBe(false);
  });

  it('migrarVersaoSave deve converter save v1 para a estrutura v3 com segurança', () => {
    const saveV1 = {
      time: estadoValido.time,
      dinheiro: 500,
      construcoes: estadoValido.construcoes,
      divisaoIndex: 0,
      temporada: estadoValido.temporada,
      elenco: [
        { id: 'j_antigo', nome: 'Jogador Antigo', posicao: 'ATA', overall: 55, idade: 22 },
      ],
      peneira: [],
      salvoEm: 1700000000000,
      versao: 1,
      modoCompra: 'x1',
      estatisticas: estadoValido.estatisticas,
    };

    const migrado = migrarVersaoSave(saveV1);
    expect(migrado.versao).toBe(3);
    expect(Array.isArray(migrado.mercadoTransferencias)).toBe(true);
    expect(Array.isArray(migrado.tabelaRivais)).toBe(true);
    expect(migrado.toquesTreinoAtivo).toBe(0);

    const elencoMigrado = migrado.elenco as any[];
    expect(elencoMigrado[0].treinosRealizados).toBe(0);

    // O objeto migrado agora deve ser 100% compatível com o schema Zod
    const validacao = EstadoJogoSchema.safeParse(migrado);
    expect(validacao.success).toBe(true);
  });

  it('migrarVersaoSave deve converter save v2 para v3 garantindo tabelaRivais', () => {
    const saveV2 = {
      ...estadoValido,
      versao: 2,
      tabelaRivais: undefined,
    };

    const migrado = migrarVersaoSave(saveV2);
    expect(migrado.versao).toBe(3);
    expect(Array.isArray(migrado.tabelaRivais)).toBe(true);
  });

  it('salvarJogo e carregarJogo devem persistir e restaurar o estado', () => {
    const salvou = salvarJogo(estadoValido);
    expect(salvou).toBe(true);
    expect(storageMock[CHAVE_SAVE_LOCAL]).toBeDefined();

    const carregado = carregarJogo();
    expect(carregado).not.toBeNull();
    expect(carregado?.dinheiro).toBe(1500);
    expect(carregado?.time?.nome).toBe('Bernardo FC');
    expect(carregado?.versao).toBe(3);
  });

  it('carregarJogo deve salvar backup e retornar null quando o save estiver corrompido', () => {
    storageMock[CHAVE_SAVE_LOCAL] = '{"dinheiro": "invalido", "construcoes": null}';

    const resultado = carregarJogo();
    expect(resultado).toBeNull();
    expect(storageMock[CHAVE_SAVE_BACKUP]).toBeDefined();
  });

  it('limparJogo deve remover a chave do localStorage', () => {
    salvarJogo(estadoValido);
    expect(storageMock[CHAVE_SAVE_LOCAL]).toBeDefined();

    limparJogo();
    expect(storageMock[CHAVE_SAVE_LOCAL]).toBeUndefined();
  });
});
