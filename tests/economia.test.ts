import { describe, expect, it } from 'vitest';
import {
  calcularCustoConstrucao,
  calcularCustoLote,
  calcularMaxCompravel,
  calcularMultiplicadorMarco,
  calcularProximoMarco,
  calcularReceitaPassiva,
  calcularValorClique,
  calcularForcaTime,
  calcularGanhoOffline,
} from '../src/lib/economia';
import { BuildingId, Jogador } from '../src/types/game';

describe('Fórmulas Econômicas e Puras', () => {
  it('deve calcular o custo unitário corretamente', () => {
    // Custo base: 10, Fator: 1.15, Nível: 0 -> 10
    expect(calcularCustoConstrucao(10, 1.15, 0)).toBe(10);
    // Nível: 1 -> 11
    expect(calcularCustoConstrucao(10, 1.15, 1)).toBe(11);
    // Nível: 2 -> Math.floor(10 * 1.15^2) = Math.floor(13.225) = 13
    expect(calcularCustoConstrucao(10, 1.15, 2)).toBe(13);
  });

  it('deve calcular custo em lote (PG) com precisão', () => {
    const custo1 = calcularCustoLote(10, 1.15, 0, 1); // Nível 0 -> Nível 1
    expect(custo1).toBe(10);

    const custo2 = calcularCustoLote(10, 1.15, 0, 2); // Nível 0 e Nível 1
    // Nível 0: 10, Nível 1: 11 -> Soma 21
    expect(custo2).toBe(21);
  });

  it('deve calcular a quantidade máxima comprável com base na fórmula fechada', () => {
    const custoBase = 10;
    const fator = 1.15;

    // Com R$ 21 no Nível 0, dá pra comprar exatamente 2 níveis
    const res = calcularMaxCompravel(custoBase, fator, 0, 21);
    expect(res.quantidade).toBe(2);
    expect(res.custoTotal).toBeLessThanOrEqual(21);

    // Com R$ 5, não dá pra comprar nenhum nível
    const res0 = calcularMaxCompravel(custoBase, fator, 0, 5);
    expect(res0.quantidade).toBe(0);
    expect(res0.custoTotal).toBe(0);
  });

  it('deve calcular o multiplicador de marcos corretamente', () => {
    expect(calcularMultiplicadorMarco(0)).toBe(1);
    expect(calcularMultiplicadorMarco(9)).toBe(1);
    expect(calcularMultiplicadorMarco(10)).toBe(2); // Marco 10 -> x2
    expect(calcularMultiplicadorMarco(25)).toBe(4); // Marco 10 e 25 -> x4
    expect(calcularMultiplicadorMarco(100)).toBe(16); // 10, 25, 50, 100 -> x16
  });

  it('deve calcular o próximo marco e progresso em porcentagem', () => {
    const marco0 = calcularProximoMarco(0);
    expect(marco0.proximoMarco).toBe(10);
    expect(marco0.progressoPorcentagem).toBe(0);

    const marco5 = calcularProximoMarco(5);
    expect(marco5.proximoMarco).toBe(10);
    expect(marco5.progressoPorcentagem).toBe(50);
  });

  it('deve calcular receita passiva com multiplicador de divisão', () => {
    const construcoes: Record<BuildingId, number> = {
      bilheteria: 10, // R$ 0.5 * 10 * x2 (marco 10) = R$ 10.00
      lanchonete: 0,
      torcida: 0,
      treinamento: 0,
      base: 0,
      comissao: 0,
    };

    // Divisão 0 (Série D, mult 1.0) -> 10
    expect(calcularReceitaPassiva(construcoes, 0)).toBe(10);

    // Divisão 1 (Série C, mult 2.5) -> 10 * 2.5 = 25
    expect(calcularReceitaPassiva(construcoes, 1)).toBe(25);
  });

  it('deve calcular o valor do clique manual', () => {
    const construcoes: Record<BuildingId, number> = {
      bilheteria: 0,
      lanchonete: 0,
      torcida: 5, // 1 + 5 * 1.5 = 8.5 -> floor(8.5) = 8
      treinamento: 0,
      base: 0,
      comissao: 0,
    };

    expect(calcularValorClique(construcoes, 0)).toBe(8);
  });

  it('deve calcular força do time combinando titulares e instalações', () => {
    const elenco: Jogador[] = Array.from({ length: 11 }, (_, i) => ({
      id: `p_${i}`,
      nome: `Jogador ${i}`,
      posicao: 'DEF',
      overall: 50,
      idade: 20,
    })); // Soma do overall = 550

    const construcoes: Record<BuildingId, number> = {
      bilheteria: 0,
      lanchonete: 0,
      torcida: 0,
      treinamento: 10, // 10 * 4 * 2 (marco 10) = 80
      base: 0,
      comissao: 1, // +8% comissão (mult 1.08)
    };

    // Força instalacoes: 80 * 1.08 = 86.4
    // Total = Math.floor(550 + 86.4) = 636
    expect(calcularForcaTime(construcoes, elenco)).toBe(636);
  });

  it('deve calcular ganho offline sem limite/teto máximo', () => {
    const agora = 1000000;
    const dezMinutosAtras = agora - 600 * 1000; // 600 segundos
    const receitaPorSegundo = 50;

    const res = calcularGanhoOffline(dezMinutosAtras, agora, receitaPorSegundo);
    expect(res.segundosDecorridos).toBe(600);
    expect(res.ganhoTotal).toBe(30000);
  });

  it('deve incluir o departamento de marketing na receita passiva', () => {
    const construcoes: Record<BuildingId, number> = {
      bilheteria: 0,
      lanchonete: 0,
      torcida: 0,
      treinamento: 0,
      base: 0,
      comissao: 0,
      marketing: 5, // 5 * 6.0 = 30.0 / seg
    };

    expect(calcularReceitaPassiva(construcoes, 0)).toBe(30);
  });

  it('deve aplicar bônus de capitão e formação tática na força do time', () => {
    const elenco: Jogador[] = Array.from({ length: 11 }, (_, i) => ({
      id: `p_${i}`,
      nome: `Jogador ${i}`,
      posicao: 'DEF',
      overall: 50,
      idade: 20,
    }));

    const construcoes: Record<BuildingId, number> = {
      bilheteria: 0,
      lanchonete: 0,
      torcida: 0,
      treinamento: 0,
      base: 0,
      comissao: 0,
      marketing: 0,
    };

    const forcaBase = calcularForcaTime(construcoes, elenco);
    expect(forcaBase).toBe(550);

    // Com capitão (overall 50 -> +7 bônus de liderança)
    const forcaComCapitao = calcularForcaTime(construcoes, elenco, '4-4-2', 'equilibrada', 'p_0');
    expect(forcaComCapitao).toBe(557);

    // Com postura ofensiva (+5%) e formação 4-3-3 (+3%)
    const forcaTatica = calcularForcaTime(construcoes, elenco, '4-3-3', 'ofensiva', 'p_0');
    expect(forcaTatica).toBeGreaterThan(forcaComCapitao);
  });
});
