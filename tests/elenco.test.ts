import { describe, expect, it } from 'vitest';
import {
  calcularCustoTreino,
  contratarJogadorMercado,
  dispensarPromessa,
  gerarElencoInicial,
  gerarJovemPromessa,
  gerarMercadoTransferencias,
  promoverPromessa,
  treinarTitular,
} from '../src/lib/elenco';
import { Jogador, JogadorMercado, JovemPromessa } from '../src/types/game';

describe('Gerenciamento de Elenco e Mercado', () => {
  it('gerarElencoInicial deve criar 11 titulares com a distribuição tática padrão', () => {
    const elenco = gerarElencoInicial();
    expect(elenco).toHaveLength(11);

    const contagemPosicoes = elenco.reduce((acc, j) => {
      acc[j.posicao] = (acc[j.posicao] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    expect(contagemPosicoes['GOL']).toBe(1);
    expect(contagemPosicoes['DEF']).toBe(4);
    expect(contagemPosicoes['MEI']).toBe(4);
    expect(contagemPosicoes['ATA']).toBe(2);

    elenco.forEach((j) => {
      expect(j.overall).toBeGreaterThanOrEqual(50);
      expect(j.overall).toBeLessThanOrEqual(56);
      expect(j.idade).toBeGreaterThanOrEqual(18);
      expect(j.treinosRealizados).toBe(0);
      expect(j.nome.length).toBeGreaterThan(3);
    });
  });

  it('gerarJovemPromessa deve gerar prospecto com potencial acima do overall', () => {
    const promessa = gerarJovemPromessa(1);
    expect(promessa.id).toBeDefined();
    expect(['GOL', 'DEF', 'MEI', 'ATA']).toContain(promessa.posicao);
    expect(promessa.overall).toBeGreaterThanOrEqual(45);
    expect(promessa.potencial).toBeGreaterThanOrEqual(promessa.overall);
    expect(promessa.valorVenda).toBeGreaterThan(0);
    expect(promessa.treinosRealizados).toBe(0);
  });

  it('promoverPromessa deve substituir o titular de menor overall da mesma posição', () => {
    const elencoMock: Jogador[] = [
      { id: 'j1', nome: 'Atacante Bom', posicao: 'ATA', overall: 65, idade: 22, treinosRealizados: 0 },
      { id: 'j2', nome: 'Atacante Fraco', posicao: 'ATA', overall: 52, idade: 25, treinosRealizados: 0 },
      { id: 'j3', nome: 'Goleiro', posicao: 'GOL', overall: 60, idade: 28, treinosRealizados: 0 },
    ];

    const promessa: JovemPromessa = {
      id: 'prom_1',
      nome: 'Jovem Prodígio',
      posicao: 'ATA',
      overall: 58,
      potencial: 85,
      idade: 17,
      valorVenda: 1000,
      treinosRealizados: 0,
    };

    const { novoElenco, novaPeneira } = promoverPromessa('prom_1', elencoMock, [promessa]);

    expect(novaPeneira).toHaveLength(0);
    expect(novoElenco).toHaveLength(3);

    // O Atacante Fraco (52) foi substituído pelo Jovem Prodígio (58)
    const atacanteSubstituido = novoElenco.find((j) => j.id === 'j2');
    expect(atacanteSubstituido).toBeUndefined();

    const novoPromovido = novoElenco.find((j) => j.id === 'jog_prom_1');
    expect(novoPromovido).toBeDefined();
    expect(novoPromovido?.overall).toBe(58);

    // O Atacante Bom (65) deve permanecer intacto
    const atacanteBom = novoElenco.find((j) => j.id === 'j1');
    expect(atacanteBom?.overall).toBe(65);
  });

  it('dispensarPromessa deve remover da peneira e retornar valor de venda', () => {
    const promessa: JovemPromessa = {
      id: 'prom_venda',
      nome: 'Promessa Dispensada',
      posicao: 'MEI',
      overall: 50,
      potencial: 70,
      idade: 18,
      valorVenda: 850,
      treinosRealizados: 0,
    };

    const { novaPeneira, valorVenda } = dispensarPromessa('prom_venda', [promessa]);
    expect(novaPeneira).toHaveLength(0);
    expect(valorVenda).toBe(850);
  });

  it('calcularCustoTreino deve escalar conforme número de treinos já realizados', () => {
    const jogadorBase: Jogador = {
      id: 'j1',
      nome: 'Craque',
      posicao: 'MEI',
      overall: 60,
      idade: 20,
      treinosRealizados: 0,
    };

    const custo0 = calcularCustoTreino(jogadorBase);
    const custo1 = calcularCustoTreino({ ...jogadorBase, treinosRealizados: 1 });
    const custo5 = calcularCustoTreino({ ...jogadorBase, treinosRealizados: 5 });

    expect(custo0).toBeGreaterThan(0);
    expect(custo1).toBeGreaterThan(custo0);
    expect(custo5).toBeGreaterThan(custo1);
  });

  it('treinarTitular deve incrementar overall em 1 e atualizar contador de treinos', () => {
    const elencoMock: Jogador[] = [
      { id: 'j1', nome: 'Promissor', posicao: 'MEI', overall: 60, idade: 20, treinosRealizados: 2 },
      { id: 'j2', nome: 'Outro', posicao: 'DEF', overall: 58, idade: 24, treinosRealizados: 0 },
    ];

    const elencoAtualizado = treinarTitular('j1', elencoMock);
    const treinado = elencoAtualizado.find((j) => j.id === 'j1');
    const intocado = elencoAtualizado.find((j) => j.id === 'j2');

    expect(treinado?.overall).toBe(61);
    expect(treinado?.treinosRealizados).toBe(3);
    expect(intocado?.overall).toBe(58);
    expect(intocado?.treinosRealizados).toBe(0);
  });

  it('treinarTitular não deve ultrapassar overall máximo 99', () => {
    const elencoMock: Jogador[] = [
      { id: 'j_max', nome: 'Lenda', posicao: 'ATA', overall: 99, idade: 28, treinosRealizados: 15 },
    ];

    const elencoAtualizado = treinarTitular('j_max', elencoMock);
    expect(elencoAtualizado[0].overall).toBe(99);
  });

  it('gerarMercadoTransferencias deve gerar 3 opções com custo condizente à divisão', () => {
    const mercadoDiv0 = gerarMercadoTransferencias(0);
    const mercadoDiv3 = gerarMercadoTransferencias(3);

    expect(mercadoDiv0).toHaveLength(3);
    expect(mercadoDiv3).toHaveLength(3);

    mercadoDiv0.forEach((j) => {
      expect(j.custoCompra).toBeGreaterThan(0);
      expect(j.overall).toBeGreaterThanOrEqual(48);
    });

    // Média de overall e custo da Divisão 3 deve ser superior à Divisão 0
    const mediaOver0 = mercadoDiv0.reduce((s, j) => s + j.overall, 0) / 3;
    const mediaOver3 = mercadoDiv3.reduce((s, j) => s + j.overall, 0) / 3;
    expect(mediaOver3).toBeGreaterThan(mediaOver0);
  });

  it('contratarJogadorMercado deve substituir o pior titular da posição e sair do mercado', () => {
    const elencoMock: Jogador[] = [
      { id: 'def_1', nome: 'Zagueiro Titular', posicao: 'DEF', overall: 62, idade: 24, treinosRealizados: 0 },
      { id: 'def_2', nome: 'Zagueiro Reserva', posicao: 'DEF', overall: 51, idade: 29, treinosRealizados: 0 },
    ];

    const jogadorM: JogadorMercado = {
      id: 'merc_zagueiro',
      nome: 'Xerife Comprado',
      posicao: 'DEF',
      overall: 70,
      idade: 25,
      custoCompra: 5000,
      treinosRealizados: 0,
    };

    const { novoElenco, novoMercado, contratado } = contratarJogadorMercado(
      'merc_zagueiro',
      [jogadorM],
      elencoMock
    );

    expect(contratado?.nome).toBe('Xerife Comprado');
    expect(novoMercado).toHaveLength(0);

    const substituido = novoElenco.find((j) => j.id === 'def_2');
    expect(substituido).toBeUndefined();

    const novoZagueiro = novoElenco.find((j) => j.nome === 'Xerife Comprado');
    expect(novoZagueiro?.overall).toBe(70);
  });
});
