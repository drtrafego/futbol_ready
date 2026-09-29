export type PosicaoJogador = 'GOL' | 'DEF' | 'MEI' | 'ATA';

export interface Jogador {
  id: string;
  nome: string;
  posicao: PosicaoJogador;
  overall: number;
  idade: number;
  treinosRealizados?: number;
}

export interface JovemPromessa extends Jogador {
  potencial: number;
  valorVenda: number;
}

export interface JogadorMercado extends Jogador {
  custoCompra: number;
}

export type FormatoEscudo = 'classico' | 'redondo' | 'losango' | 'frances' | 'moderno';
export type PadraoEscudo = 'liso' | 'faixa' | 'listras' | 'bipartido' | 'xadrez';
export type SimboloEscudo = 'bola' | 'estrela' | 'raio' | 'coroa' | 'chama' | 'montanha' | 'ancora' | 'trofeu';

export interface ConfigEscudo {
  formato: FormatoEscudo;
  padrao: PadraoEscudo;
  simbolo: SimboloEscudo;
}

export interface PaletaCor {
  id: string;
  nome: string;
  primaria: string;
  secundaria: string;
  textoPrimaria: string;
  textoSecundaria: string;
}

export interface ConfigTime {
  nome: string;
  sigla: string;
  corId: string;
  escudo: ConfigEscudo;
}

export type BuildingId =
  | 'bilheteria'
  | 'lanchonete'
  | 'torcida'
  | 'treinamento'
  | 'base'
  | 'comissao'
  | 'marketing';

export interface DemandaConstrucao {
  id: BuildingId;
  nome: string;
  descricao: string;
  icone: string;
  custoBase: number;
  fatorCrescimento: number;
  rendimentoBase: number;
  tipoRendimento: 'passivo' | 'clique' | 'forca' | 'multiplicador_forca';
  divisaoMinima: number;
}

export interface PartidaResultado {
  id: string;
  adversario: string;
  placarTime: number;
  placarAdversario: number;
  resultado: 'vitoria' | 'empate' | 'derrota';
  pontosGanhos: number;
  data: number;
}

export interface EstadoTemporada {
  partidasJogadas: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  pontos: number;
  historico: PartidaResultado[];
  segundosParaProximaPartida: number;
}

export interface ClubeRival {
  id: string;
  nome: string;
  sigla: string;
  forca: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldoGols: number;
  pontos: number;
}

export interface LinhaClassificacao {
  posicao: number;
  id: string;
  nome: string;
  sigla: string;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldoGols: number;
  pontos: number;
  isJogador: boolean;
}

export type ModoQuantidadeCompra = 'x1' | 'x10' | 'max';

export type FormacaoTatica = '4-3-3' | '4-4-2' | '3-5-2' | '5-3-2';
export type PosturaTatica = 'ofensiva' | 'equilibrada' | 'defensiva';

export interface EstadoJogo {
  time: ConfigTime | null;
  dinheiro: number;
  construcoes: Record<BuildingId, number>;
  divisaoIndex: number;
  temporada: EstadoTemporada;
  tabelaRivais: ClubeRival[];
  elenco: Jogador[];
  peneira: JovemPromessa[];
  mercadoTransferencias: JogadorMercado[];
  toquesTreinoAtivo: number;
  formacao: FormacaoTatica;
  posturaTatica: PosturaTatica;
  capitaoId: string | null;
  salvoEm: number;
  versao: number;
  modoCompra: ModoQuantidadeCompra;
  gandulaContratado?: boolean;
  estatisticas: {
    totalGanho: number;
    totalPartidas: number;
    totalVitorias: number;
    totalCliques: number;
    criadoEm: number;
  };
}
