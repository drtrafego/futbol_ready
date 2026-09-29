import { describe, expect, it } from 'vitest';
import {
  avaliarFimDeTemporada,
  gerarRivaisDivisao,
  obterTabelaCompleta,
  simularPartida,
  simularRodadaRivais,
} from '../src/lib/partidas';
import { ConfigTime, EstadoTemporada } from '../src/types/game';

describe('Simulador de Partidas e Temporada', () => {
  it('deve simular partida determinística com gerador de números aleatórios fornecido', () => {
    let index = 0;
    const numerosMock = [0.5, 0.2, 0.4, 0.1, 0.8];
    const rngFn = () => {
      const val = numerosMock[index % numerosMock.length];
      index++;
      return val;
    };

    const resultado = simularPartida({
      forcaTime: 500,
      divisaoIndex: 0,
      rngFn,
    });

    expect(resultado.id).toBeDefined();
    expect(resultado.adversario).toBeDefined();
    expect(['vitoria', 'empate', 'derrota']).includes(resultado.resultado);
    expect(resultado.pontosGanhos).toBeGreaterThanOrEqual(0);
  });

  it('deve promover time ao atingir a meta de pontos no fim da temporada', () => {
    const temporadaPromocao: EstadoTemporada = {
      partidasJogadas: 10,
      vitorias: 7,
      empates: 1,
      derrotas: 2,
      pontos: 22,
      historico: [],
      segundosParaProximaPartida: 60,
    };

    const res = avaliarFimDeTemporada(temporadaPromocao, 0);
    expect(res.status).toBe('promovido');
    expect(res.novaDivisaoIndex).toBe(1);
  });

  it('deve rebaixar time se a pontuação for abaixo do limite de segurança', () => {
    const temporadaRebaixamento: EstadoTemporada = {
      partidasJogadas: 10,
      vitorias: 1,
      empates: 1,
      derrotas: 8,
      pontos: 4,
      historico: [],
      segundosParaProximaPartida: 60,
    };

    const res = avaliarFimDeTemporada(temporadaRebaixamento, 1);
    expect(res.status).toBe('rebaixado');
    expect(res.novaDivisaoIndex).toBe(0);
  });

  it('não deve rebaixar abaixo da Série D (Index 0)', () => {
    const temporadaZeroPontos: EstadoTemporada = {
      partidasJogadas: 10,
      vitorias: 0,
      empates: 0,
      derrotas: 10,
      pontos: 0,
      historico: [],
      segundosParaProximaPartida: 60,
    };

    const res = avaliarFimDeTemporada(temporadaZeroPontos, 0);
    expect(res.status).toBe('mantido');
    expect(res.novaDivisaoIndex).toBe(0);
  });

  it('deve gerar lista fixa de 7 rivais para uma divisão', () => {
    const rivais = gerarRivaisDivisao(0);
    expect(rivais.length).toBe(7);
    expect(rivais[0].id).toBeDefined();
    expect(rivais[0].nome).toBeDefined();
    expect(rivais[0].jogos).toBe(0);
    expect(rivais[0].pontos).toBe(0);
  });

  it('deve simular rodada dos rivais acumulando pontos e estatísticas', () => {
    const rivais = gerarRivaisDivisao(0);
    const posRodada = simularRodadaRivais(rivais, 0, () => 0.5);

    expect(posRodada.every((r) => r.jogos === 1)).toBe(true);
    expect(posRodada.some((r) => r.pontos > 0)).toBe(true);
  });

  it('deve ordenar corretamente a tabela de classificação oficial (G-2 no topo)', () => {
    const timeJogador: ConfigTime = {
      nome: 'Bernardo FC',
      sigla: 'BFC',
      corId: 'azul_amarelo',
      escudo: { formato: 'classico', padrao: 'faixa', simbolo: 'bola' },
    };

    const temporada: EstadoTemporada = {
      partidasJogadas: 5,
      vitorias: 5,
      empates: 0,
      derrotas: 0,
      pontos: 15,
      historico: [],
      segundosParaProximaPartida: 60,
    };

    const rivais = gerarRivaisDivisao(0).map((r, i) => ({
      ...r,
      jogos: 5,
      pontos: 10 - i, // Menor que 15 pts do jogador
    }));

    const tabela = obterTabelaCompleta(timeJogador, temporada, rivais);
    expect(tabela.length).toBe(8); // 1 jogador + 7 rivais
    expect(tabela[0].isJogador).toBe(true);
    expect(tabela[0].posicao).toBe(1);
    expect(tabela[0].pontos).toBe(15);
  });

  it('deve promover quando jogador terminar no G-2 da tabela', () => {
    const temporada: EstadoTemporada = {
      partidasJogadas: 10,
      vitorias: 7,
      empates: 1,
      derrotas: 2,
      pontos: 22,
      historico: [],
      segundosParaProximaPartida: 60,
    };

    // 2º colocado na tabela de 8 times
    const res = avaliarFimDeTemporada(temporada, 0, 2, 8);
    expect(res.status).toBe('promovido');
    expect(res.novaDivisaoIndex).toBe(1);
  });

  it('deve rebaixar quando jogador terminar na zona de rebaixamento (Z-2)', () => {
    const temporada: EstadoTemporada = {
      partidasJogadas: 10,
      vitorias: 1,
      empates: 2,
      derrotas: 7,
      pontos: 5,
      historico: [],
      segundosParaProximaPartida: 60,
    };

    // 8º colocado na tabela (último de 8 times) na Série C (Index 1)
    const res = avaliarFimDeTemporada(temporada, 1, 8, 8);
    expect(res.status).toBe('rebaixado');
    expect(res.novaDivisaoIndex).toBe(0);
  });
});
