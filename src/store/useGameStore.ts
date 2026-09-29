import { create } from 'zustand';
import { CONSTRUCOES } from '../config/construcoes';
import { DIVISOES } from '../config/divisoes';
import {
  calcularCustoConstrucao,
  calcularCustoLote,
  calcularForcaTime,
  calcularGanhoOffline,
  calcularMaxCompravel,
  calcularReceitaPassiva,
  calcularValorClique,
} from '../lib/economia';
import {
  calcularCustoTreino,
  contratarJogadorMercado,
  dispensarPromessa,
  gerarElencoInicial,
  gerarJovemPromessa,
  gerarMercadoTransferencias,
  promoverPromessa,
  treinarTitular,
  trocarJogadores,
  alterarPosicaoJogador,
} from '../lib/elenco';
import {
  avaliarFimDeTemporada,
  gerarRivaisDivisao,
  obterTabelaCompleta,
  simularPartida,
  simularRodadaRivais,
} from '../lib/partidas';
import { carregarJogo, limparJogo, salvarJogo } from '../lib/save';
import { sons } from '../lib/audio';
import {
  BuildingId,
  ClubeRival,
  ConfigTime,
  EstadoJogo,
  FormacaoTatica,
  JogadorMercado,
  JovemPromessa,
  ModoQuantidadeCompra,
  PartidaResultado,
  PosicaoJogador,
  PosturaTatica,
} from '../types/game';

export type TelaId = 'estadio' | 'construcoes' | 'elenco' | 'clube';

export const ESTADO_INICIAL_PADRAO: EstadoJogo = {
  time: null,
  dinheiro: 0,
  construcoes: {
    bilheteria: 0,
    lanchonete: 0,
    torcida: 0,
    treinamento: 0,
    base: 0,
    comissao: 0,
    marketing: 0,
  },
  divisaoIndex: 0,
  temporada: {
    partidasJogadas: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    pontos: 0,
    historico: [],
    segundosParaProximaPartida: 60,
  },
  tabelaRivais: [],
  elenco: [],
  peneira: [],
  mercadoTransferencias: [],
  toquesTreinoAtivo: 0,
  formacao: '4-4-2',
  posturaTatica: 'equilibrada',
  capitaoId: null,
  salvoEm: Date.now(),
  versao: 3,
  modoCompra: 'x1',
  gandulaContratado: false,
  estatisticas: {
    totalGanho: 0,
    totalPartidas: 0,
    totalVitorias: 0,
    totalCliques: 0,
    criadoEm: Date.now(),
  },
};

interface StoreGame {
  estado: EstadoJogo;
  telaAtiva: TelaId;
  ganhoOfflineInfo: { segundos: number; ganho: number } | null;
  promocaoInfo: { divisaoAntiga: number; divisaoNova: number; status: 'promovido' | 'rebaixado' } | null;
  toastPartida: PartidaResultado | null;
  partidaEmAndamento: PartidaResultado | null;
  temporizadorPeneira: number;

  // Ações
  inicializarJogo: () => void;
  criarEConfigurarTime: (config: ConfigTime) => void;
  editarTime: (config: ConfigTime) => void;
  clicarGritoTorcida: () => number;
  comprarConstrucao: (id: BuildingId) => void;
  setModoCompra: (modo: ModoQuantidadeCompra) => void;
  trocarTela: (tela: TelaId) => void;
  promoverJovemBase: (promessaId: string) => void;
  venderJovemBase: (promessaId: string) => void;
  tocarTreinoAtivo: () => { maxAtingido: boolean; promessaRevelada?: JovemPromessa };
  treinarTitularAction: (jogadorId: string) => boolean;
  contratarJogadorMercadoAction: (mercadoId: string) => boolean;
  renovarMercadoAction: () => void;
  contratarGandulaAction: () => boolean;
  jogarPartidaAgora: () => void;
  fecharPartidaAnimada: () => void;
  tickPassivo: (deltaSegundos: number) => void;
  fecharGanhoOffline: () => void;
  fecharPromocaoInfo: () => void;
  fecharToastPartida: () => void;
  recomecarJogo: () => void;
  adicionarDinheiro: (valor: number) => void;
  setFormacao: (formacao: FormacaoTatica) => void;
  setPosturaTatica: (postura: PosturaTatica) => void;
  definirCapitao: (jogadorId: string) => void;
  trocarJogadoresAction: (idA: string, idB: string) => void;
  alterarPosicaoAction: (id: string, posicao: PosicaoJogador) => void;
}

export const useGameStore = create<StoreGame>((set, get) => ({
  estado: ESTADO_INICIAL_PADRAO,
  telaAtiva: 'estadio',
  ganhoOfflineInfo: null,
  promocaoInfo: null,
  toastPartida: null,
  partidaEmAndamento: null,
  temporizadorPeneira: 0,

  inicializarJogo: () => {
    const save = carregarJogo();
    const agora = Date.now();

    if (save && save.time) {
      let mercado = save.mercadoTransferencias || [];
      if (mercado.length === 0) {
        mercado = gerarMercadoTransferencias(save.divisaoIndex);
      }

      let rivais = save.tabelaRivais || [];
      if (rivais.length === 0) {
        rivais = gerarRivaisDivisao(save.divisaoIndex);
      }

      // Quando o jogador sai do jogo, a geração de dinheiro para.
      // O saldo permanece idêntico ao momento do fechamento.
      const estadoAtualizado: EstadoJogo = {
        ...save,
        dinheiro: save.dinheiro,
        mercadoTransferencias: mercado,
        tabelaRivais: rivais,
        salvoEm: agora,
      };

      set({
        estado: estadoAtualizado,
        ganhoOfflineInfo: null,
      });

      salvarJogo(estadoAtualizado);
    } else {
      set({ estado: ESTADO_INICIAL_PADRAO });
    }
  },

  criarEConfigurarTime: (config: ConfigTime) => {
    const elencoInicial = gerarElencoInicial();
    const mercadoInicial = gerarMercadoTransferencias(0);
    const rivaisIniciais = gerarRivaisDivisao(0);

    const estadoNovo: EstadoJogo = {
      ...ESTADO_INICIAL_PADRAO,
      time: config,
      elenco: elencoInicial,
      mercadoTransferencias: mercadoInicial,
      tabelaRivais: rivaisIniciais,
      dinheiro: 50,
      salvoEm: Date.now(),
      estatisticas: {
        ...ESTADO_INICIAL_PADRAO.estatisticas,
        criadoEm: Date.now(),
      },
    };

    set({ estado: estadoNovo });
    salvarJogo(estadoNovo);
  },

  editarTime: (config: ConfigTime) => {
    const estadoAtual = get().estado;
    const novoEstado: EstadoJogo = {
      ...estadoAtual,
      time: config,
      salvoEm: Date.now(),
    };

    set({ estado: novoEstado });
    salvarJogo(novoEstado);
  },

  clicarGritoTorcida: () => {
    const { estado } = get();
    const valorClique = calcularValorClique(estado.construcoes, estado.divisaoIndex);

    sons.tocarGritoTorcida();

    const novoEstado: EstadoJogo = {
      ...estado,
      dinheiro: estado.dinheiro + valorClique,
      estatisticas: {
        ...estado.estatisticas,
        totalGanho: estado.estatisticas.totalGanho + valorClique,
        totalCliques: estado.estatisticas.totalCliques + 1,
      },
    };

    set({ estado: novoEstado });
    return valorClique;
  },

  adicionarDinheiro: (valor: number) => {
    if (valor <= 0) return;
    const { estado } = get();
    sons.tocarMoeda();
    const novoEstado: EstadoJogo = {
      ...estado,
      dinheiro: estado.dinheiro + valor,
      estatisticas: {
        ...estado.estatisticas,
        totalGanho: estado.estatisticas.totalGanho + valor,
      },
    };
    set({ estado: novoEstado });
  },

  comprarConstrucao: (id: BuildingId) => {
    const { estado } = get();
    const configBuilding = CONSTRUCOES.find((c) => c.id === id);
    if (!configBuilding) return;

    if (estado.divisaoIndex < configBuilding.divisaoMinima) return;

    const nivelAtual = estado.construcoes[id] || 0;
    const custoBase = configBuilding.custoBase;
    const fator = configBuilding.fatorCrescimento;

    let qtdAComprar = 0;
    let custoTotal = 0;

    if (estado.modoCompra === 'x1') {
      qtdAComprar = 1;
      custoTotal = calcularCustoConstrucao(custoBase, fator, nivelAtual);
    } else if (estado.modoCompra === 'x10') {
      qtdAComprar = 10;
      custoTotal = calcularCustoLote(custoBase, fator, nivelAtual, 10);
    } else {
      const maxCalc = calcularMaxCompravel(custoBase, fator, nivelAtual, estado.dinheiro);
      qtdAComprar = maxCalc.quantidade;
      custoTotal = maxCalc.custoTotal;
    }

    if (qtdAComprar > 0 && estado.dinheiro >= custoTotal) {
      sons.tocarCompra();
      const novoEstado: EstadoJogo = {
        ...estado,
        dinheiro: estado.dinheiro - custoTotal,
        construcoes: {
          ...estado.construcoes,
          [id]: nivelAtual + qtdAComprar,
        },
      };

      set({ estado: novoEstado });
      salvarJogo(novoEstado);
    }
  },

  setModoCompra: (modo: ModoQuantidadeCompra) => {
    const { estado } = get();
    set({ estado: { ...estado, modoCompra: modo } });
  },

  trocarTela: (tela: TelaId) => {
    set({ telaAtiva: tela });
  },

  promoverJovemBase: (promessaId: string) => {
    const { estado } = get();
    sons.tocarCompra();
    const { novoElenco, novaPeneira } = promoverPromessa(promessaId, estado.elenco, estado.peneira);

    const novoEstado: EstadoJogo = {
      ...estado,
      elenco: novoElenco,
      peneira: novaPeneira,
    };

    set({ estado: novoEstado });
    salvarJogo(novoEstado);
  },

  venderJovemBase: (promessaId: string) => {
    const { estado } = get();
    sons.tocarMoeda();
    const { novaPeneira, valorVenda } = dispensarPromessa(promessaId, estado.peneira);

    const novoEstado: EstadoJogo = {
      ...estado,
      dinheiro: estado.dinheiro + valorVenda,
      peneira: novaPeneira,
      estatisticas: {
        ...estado.estatisticas,
        totalGanho: estado.estatisticas.totalGanho + valorVenda,
      },
    };

    set({ estado: novoEstado });
    salvarJogo(novoEstado);
  },

  tocarTreinoAtivo: () => {
    const { estado } = get();
    const toques = (estado.toquesTreinoAtivo || 0) + 1;
    const MAX_TOQUES = 10;

    if (toques >= MAX_TOQUES) {
      sons.tocarCompra();
      let novaPeneira = [...estado.peneira];
      let promessaRevelada: JovemPromessa | undefined = undefined;

      if (novaPeneira.length < 4) {
        promessaRevelada = gerarJovemPromessa(estado.divisaoIndex);
        novaPeneira.push(promessaRevelada);
      }

      const novoEstado: EstadoJogo = {
        ...estado,
        toquesTreinoAtivo: 0,
        peneira: novaPeneira,
      };

      set({ estado: novoEstado });
      salvarJogo(novoEstado);

      return { maxAtingido: true, promessaRevelada };
    } else {
      sons.tocarChute();
      const novoEstado: EstadoJogo = {
        ...estado,
        toquesTreinoAtivo: toques,
      };

      set({ estado: novoEstado });
      return { maxAtingido: false };
    }
  },

  treinarTitularAction: (jogadorId: string) => {
    const { estado } = get();
    const jogador = estado.elenco.find((j) => j.id === jogadorId);
    if (!jogador || jogador.overall >= 99) return false;

    const custo = calcularCustoTreino(jogador);
    if (estado.dinheiro < custo) return false;

    sons.tocarCompra();
    const novoElenco = treinarTitular(jogadorId, estado.elenco);
    const novoEstado: EstadoJogo = {
      ...estado,
      dinheiro: estado.dinheiro - custo,
      elenco: novoElenco,
    };

    set({ estado: novoEstado });
    salvarJogo(novoEstado);
    return true;
  },

  contratarJogadorMercadoAction: (mercadoId: string) => {
    const { estado } = get();
    const jogadorMercado = (estado.mercadoTransferencias || []).find((m) => m.id === mercadoId);
    if (!jogadorMercado) return false;

    if (estado.dinheiro < jogadorMercado.custoCompra) return false;

    sons.tocarCompra();
    const { novoElenco, novoMercado } = contratarJogadorMercado(
      mercadoId,
      estado.mercadoTransferencias || [],
      estado.elenco
    );

    const novoEstado: EstadoJogo = {
      ...estado,
      dinheiro: estado.dinheiro - jogadorMercado.custoCompra,
      elenco: novoElenco,
      mercadoTransferencias: novoMercado,
    };

    set({ estado: novoEstado });
    salvarJogo(novoEstado);
    return true;
  },

  renovarMercadoAction: () => {
    const { estado } = get();
    const novoMercado = gerarMercadoTransferencias(estado.divisaoIndex);

    const novoEstado: EstadoJogo = {
      ...estado,
      mercadoTransferencias: novoMercado,
    };

    set({ estado: novoEstado });
    salvarJogo(novoEstado);
  },

  contratarGandulaAction: () => {
    const { estado } = get();
    if (estado.gandulaContratado) return false;
    const custo = 500;
    if (estado.dinheiro < custo) {
      sons.tocarClique();
      return false;
    }
    const novoEstado: EstadoJogo = {
      ...estado,
      dinheiro: estado.dinheiro - custo,
      gandulaContratado: true,
    };
    set({ estado: novoEstado });
    salvarJogo(novoEstado);
    sons.tocarCompra();
    return true;
  },

  jogarPartidaAgora: () => {
    const { estado } = get();
    if (!estado.time) return;

    const forcaTime = calcularForcaTime(
      estado.construcoes,
      estado.elenco,
      estado.formacao,
      estado.posturaTatica,
      estado.capitaoId
    );
    const resultadoPartida = simularPartida({ forcaTime, divisaoIndex: estado.divisaoIndex });
    sons.tocarApito();

    let novosRivais = estado.tabelaRivais && estado.tabelaRivais.length > 0
      ? [...estado.tabelaRivais]
      : gerarRivaisDivisao(estado.divisaoIndex);

    novosRivais = simularRodadaRivais(novosRivais, estado.divisaoIndex);

    const partidasJogadas = estado.temporada.partidasJogadas + 1;
    const vitorias = estado.temporada.vitorias + (resultadoPartida.resultado === 'vitoria' ? 1 : 0);
    const empates = estado.temporada.empates + (resultadoPartida.resultado === 'empate' ? 1 : 0);
    const derrotas = estado.temporada.derrotas + (resultadoPartida.resultado === 'derrota' ? 1 : 0);
    const pontos = estado.temporada.pontos + resultadoPartida.pontosGanhos;
    const historico = [resultadoPartida, ...estado.temporada.historico].slice(0, 10);

    let novaTemporada = {
      partidasJogadas,
      vitorias,
      empates,
      derrotas,
      pontos,
      historico,
      segundosParaProximaPartida: 60,
    };

    let novaDivisaoIndex = estado.divisaoIndex;
    let novaPromocaoInfo = get().promocaoInfo;

    // Fim da temporada após 10 jogos
    if (partidasJogadas >= 10) {
      const tabelaClassificacao = obterTabelaCompleta(estado.time, novaTemporada, novosRivais);
      const linhaJogador = tabelaClassificacao.find((l) => l.isJogador);
      const posicaoFinal = linhaJogador ? linhaJogador.posicao : 1;

      const avaliacao = avaliarFimDeTemporada(
        novaTemporada,
        estado.divisaoIndex,
        posicaoFinal,
        tabelaClassificacao.length
      );

      if (avaliacao.status !== 'mantido') {
        novaPromocaoInfo = {
          divisaoAntiga: estado.divisaoIndex,
          divisaoNova: avaliacao.novaDivisaoIndex,
          status: avaliacao.status,
        };
        novaDivisaoIndex = avaliacao.novaDivisaoIndex;
      }

      novosRivais = gerarRivaisDivisao(novaDivisaoIndex);

      novaTemporada = {
        partidasJogadas: 0,
        vitorias: 0,
        empates: 0,
        derrotas: 0,
        pontos: 0,
        historico,
        segundosParaProximaPartida: 60,
      };
    }

    const bonusDinheiro = resultadoPartida.resultado === 'vitoria' ? 60 * (estado.divisaoIndex + 1) : 0;

    const estadoAtualizado: EstadoJogo = {
      ...estado,
      dinheiro: estado.dinheiro + bonusDinheiro,
      divisaoIndex: novaDivisaoIndex,
      temporada: novaTemporada,
      tabelaRivais: novosRivais,
      salvoEm: Date.now(),
      estatisticas: {
        ...estado.estatisticas,
        totalGanho: estado.estatisticas.totalGanho + bonusDinheiro,
        totalPartidas: estado.estatisticas.totalPartidas + 1,
        totalVitorias: estado.estatisticas.totalVitorias + (resultadoPartida.resultado === 'vitoria' ? 1 : 0),
      },
    };

    set({
      estado: estadoAtualizado,
      partidaEmAndamento: resultadoPartida,
      toastPartida: resultadoPartida,
      promocaoInfo: novaPromocaoInfo,
    });
    salvarJogo(estadoAtualizado);
  },

  fecharPartidaAnimada: () => set({ partidaEmAndamento: null }),

  tickPassivo: (deltaSegundos: number) => {
    const { estado, temporizadorPeneira } = get();
    if (!estado.time) return;

    // 1. Receita passiva
    const receitaPorSeg = calcularReceitaPassiva(estado.construcoes, estado.divisaoIndex);
    const ganhoTick = receitaPorSeg * deltaSegundos;
    const novoDinheiro = estado.dinheiro + ganhoTick;

    // 2. Timer de partida
    let novosSegundosPartida = estado.temporada.segundosParaProximaPartida - deltaSegundos;
    let novoToast: PartidaResultado | null = get().toastPartida;
    let novaPartidaEmAndamento: PartidaResultado | null = get().partidaEmAndamento;
    let novaTemporada = { ...estado.temporada };
    let novaDivisaoIndex = estado.divisaoIndex;
    let novaPromocaoInfo = get().promocaoInfo;
    let novosRivais = estado.tabelaRivais && estado.tabelaRivais.length > 0
      ? [...estado.tabelaRivais]
      : gerarRivaisDivisao(estado.divisaoIndex);

    if (novosSegundosPartida <= 0) {
      novosSegundosPartida = 60; // Reseta timer de 60s

      const forcaTime = calcularForcaTime(
        estado.construcoes,
        estado.elenco,
        estado.formacao,
        estado.posturaTatica,
        estado.capitaoId
      );
      const resultadoPartida = simularPartida({ forcaTime, divisaoIndex: estado.divisaoIndex });
      sons.tocarApito();

      // Simula rodada dos rivais
      novosRivais = simularRodadaRivais(novosRivais, estado.divisaoIndex);

      const partidasJogadas = novaTemporada.partidasJogadas + 1;
      const vitorias = novaTemporada.vitorias + (resultadoPartida.resultado === 'vitoria' ? 1 : 0);
      const empates = novaTemporada.empates + (resultadoPartida.resultado === 'empate' ? 1 : 0);
      const derrotas = novaTemporada.derrotas + (resultadoPartida.resultado === 'derrota' ? 1 : 0);
      const pontos = novaTemporada.pontos + resultadoPartida.pontosGanhos;
      const historico = [resultadoPartida, ...novaTemporada.historico].slice(0, 10);

      novaTemporada = {
        partidasJogadas,
        vitorias,
        empates,
        derrotas,
        pontos,
        historico,
        segundosParaProximaPartida: novosSegundosPartida,
      };

      novoToast = resultadoPartida;
      novaPartidaEmAndamento = resultadoPartida;

      // Fim da temporada após 10 jogos
      if (partidasJogadas >= 10) {
        const tabelaClassificacao = obterTabelaCompleta(estado.time, novaTemporada, novosRivais);
        const linhaJogador = tabelaClassificacao.find((l) => l.isJogador);
        const posicaoFinal = linhaJogador ? linhaJogador.posicao : 1;

        const avaliacao = avaliarFimDeTemporada(
          novaTemporada,
          estado.divisaoIndex,
          posicaoFinal,
          tabelaClassificacao.length
        );

        if (avaliacao.status !== 'mantido') {
          novaPromocaoInfo = {
            divisaoAntiga: estado.divisaoIndex,
            divisaoNova: avaliacao.novaDivisaoIndex,
            status: avaliacao.status,
          };
          novaDivisaoIndex = avaliacao.novaDivisaoIndex;
        }

        // Gera nova liga/tabela para a próxima temporada
        novosRivais = gerarRivaisDivisao(novaDivisaoIndex);

        // Reseta pontuação para nova temporada
        novaTemporada = {
          partidasJogadas: 0,
          vitorias: 0,
          empates: 0,
          derrotas: 0,
          pontos: 0,
          historico,
          segundosParaProximaPartida: 60,
        };
      }
    } else {
      novaTemporada.segundosParaProximaPartida = novosSegundosPartida;
    }

    // 3. Peneira da base (Revela novas promessas a cada ~40 seg se nivelBase > 0)
    let novaPeneira = [...estado.peneira];
    let novoTempoPeneira = temporizadorPeneira + deltaSegundos;
    const nivelBase = estado.construcoes.base || 0;

    if (nivelBase > 0 && novoTempoPeneira >= 40 && novaPeneira.length < 4) {
      novoTempoPeneira = 0;
      const novaPromessa = gerarJovemPromessa(estado.divisaoIndex);
      novaPeneira.push(novaPromessa);
    }

    const estadoAtualizado: EstadoJogo = {
      ...estado,
      dinheiro: novoDinheiro,
      divisaoIndex: novaDivisaoIndex,
      temporada: novaTemporada,
      tabelaRivais: novosRivais,
      peneira: novaPeneira,
      salvoEm: Date.now(),
      estatisticas: {
        ...estado.estatisticas,
        totalGanho: estado.estatisticas.totalGanho + ganhoTick,
        totalPartidas: estado.estatisticas.totalPartidas + (novoToast && novoToast !== get().toastPartida ? 1 : 0),
        totalVitorias: estado.estatisticas.totalVitorias + (novoToast && novoToast.resultado === 'vitoria' && novoToast !== get().toastPartida ? 1 : 0),
      },
    };

    set({
      estado: estadoAtualizado,
      toastPartida: novoToast,
      partidaEmAndamento: novaPartidaEmAndamento,
      promocaoInfo: novaPromocaoInfo,
      temporizadorPeneira: novoTempoPeneira,
    });
  },

  fecharGanhoOffline: () => set({ ganhoOfflineInfo: null }),
  fecharPromocaoInfo: () => set({ promocaoInfo: null }),
  fecharToastPartida: () => set({ toastPartida: null }),

  recomecarJogo: () => {
    limparJogo();
    set({
      estado: ESTADO_INICIAL_PADRAO,
      telaAtiva: 'estadio',
      ganhoOfflineInfo: null,
      promocaoInfo: null,
      toastPartida: null,
      partidaEmAndamento: null,
    });
  },

  setFormacao: (formacao: FormacaoTatica) => {
    const { estado } = get();
    const novoEstado: EstadoJogo = {
      ...estado,
      formacao,
      salvoEm: Date.now(),
    };
    sons.tocarClique();
    set({ estado: novoEstado });
    salvarJogo(novoEstado);
  },

  setPosturaTatica: (posturaTatica: PosturaTatica) => {
    const { estado } = get();
    const novoEstado: EstadoJogo = {
      ...estado,
      posturaTatica,
      salvoEm: Date.now(),
    };
    sons.tocarClique();
    set({ estado: novoEstado });
    salvarJogo(novoEstado);
  },

  definirCapitao: (jogadorId: string) => {
    const { estado } = get();
    const capitaoId = estado.capitaoId === jogadorId ? null : jogadorId;
    const novoEstado: EstadoJogo = {
      ...estado,
      capitaoId,
      salvoEm: Date.now(),
    };
    sons.tocarCompra();
    set({ estado: novoEstado });
    salvarJogo(novoEstado);
  },

  trocarJogadoresAction: (idA: string, idB: string) => {
    const { estado } = get();
    const novoElenco = trocarJogadores(idA, idB, estado.elenco);
    const novoEstado: EstadoJogo = {
      ...estado,
      elenco: novoElenco,
      salvoEm: Date.now(),
    };
    sons.tocarCompra();
    set({ estado: novoEstado });
    salvarJogo(novoEstado);
  },

  alterarPosicaoAction: (id: string, posicao: PosicaoJogador) => {
    const { estado } = get();
    const novoElenco = alterarPosicaoJogador(id, posicao, estado.elenco);
    const novoEstado: EstadoJogo = {
      ...estado,
      elenco: novoElenco,
      salvoEm: Date.now(),
    };
    sons.tocarClique();
    set({ estado: novoEstado });
    salvarJogo(novoEstado);
  },
}));
