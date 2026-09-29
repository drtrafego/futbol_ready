import { FormatoEscudo, PadraoEscudo, SimboloEscudo } from '../types/game';

export interface OpcaoEscudo<T> {
  id: T;
  nome: string;
}

export const FORMATOS_ESCUDO: OpcaoEscudo<FormatoEscudo>[] = [
  { id: 'classico', nome: 'Escudo Clássico' },
  { id: 'redondo', nome: 'Circular' },
  { id: 'losango', nome: 'Losango' },
  { id: 'frances', nome: 'Estilo Francês' },
  { id: 'moderno', nome: 'Vanguardista' },
];

export const PADROES_ESCUDO: OpcaoEscudo<PadraoEscudo>[] = [
  { id: 'liso', nome: 'Liso' },
  { id: 'faixa', nome: 'Faixa Diagonal' },
  { id: 'listras', nome: 'Listras Verticais' },
  { id: 'bipartido', nome: 'Metade a Metade' },
  { id: 'xadrez', nome: 'Quatro Quadrantes' },
];

export const SIMBOLOS_ESCUDO: OpcaoEscudo<SimboloEscudo>[] = [
  { id: 'bola', nome: 'Bola de Futebol' },
  { id: 'estrela', nome: 'Estrela Campeã' },
  { id: 'raio', nome: 'Raio Elétrico' },
  { id: 'coroa', nome: 'Coroa Real' },
  { id: 'chama', nome: 'Fogo / Chama' },
  { id: 'montanha', nome: 'Pico da Montanha' },
  { id: 'ancora', nome: 'Âncora Navio' },
  { id: 'trofeu', nome: 'Taça / Troféu' },
];
