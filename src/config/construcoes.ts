import { DemandaConstrucao } from '../types/game';

export const CONSTRUCOES: DemandaConstrucao[] = [
  {
    id: 'bilheteria',
    nome: 'Arquibancada & Bilheteria',
    descricao: 'Gera receita passiva contínua com a venda de ingressos aos torcedores no estádio.',
    icone: 'Ticket',
    custoBase: 30,
    fatorCrescimento: 1.15,
    rendimentoBase: 0.5, // R$ 0.50 / seg no Nível 1
    tipoRendimento: 'passivo',
    divisaoMinima: 0,
  },
  {
    id: 'lanchonete',
    nome: 'Lanchonete do Estádio',
    descricao: 'Vende pastéis, refrigerantes e pipoca em dia de jogo. Aumenta os ganhos passivos.',
    icone: 'Utensils',
    custoBase: 250,
    fatorCrescimento: 1.16,
    rendimentoBase: 2.0, // R$ 2.00 / seg no Nível 1
    tipoRendimento: 'passivo',
    divisaoMinima: 0,
  },
  {
    id: 'torcida',
    nome: 'Torcida Organizada',
    descricao: 'Aumenta o valor de cada clique manual no botão "Grito da Torcida".',
    icone: 'Megaphone',
    custoBase: 80,
    fatorCrescimento: 1.14,
    rendimentoBase: 1.5, // R$ 1.50 por clique por nível
    tipoRendimento: 'clique',
    divisaoMinima: 0,
  },
  {
    id: 'treinamento',
    nome: 'Campo de Treinamento',
    descricao: 'Melhora o condicionamento físico e a tática dos jogadores, aumentando a Força do Time.',
    icone: 'Dumbbell',
    custoBase: 500,
    fatorCrescimento: 1.18,
    rendimentoBase: 4, // +4 força por nível
    tipoRendimento: 'forca',
    divisaoMinima: 0,
  },
  {
    id: 'base',
    nome: 'Categoria de Base',
    descricao: 'Forma jovens talentos pro time. Aumenta a Força e revela promessas de tempos em tempos.',
    icone: 'GraduationCap',
    custoBase: 3000,
    fatorCrescimento: 1.20,
    rendimentoBase: 10, // +10 força por nível
    tipoRendimento: 'forca',
    divisaoMinima: 0,
  },
  {
    id: 'comissao',
    nome: 'Comissão Técnica',
    descricao: 'Técnico renomado, preparador e analista. Multiplica a força ganha no treino e na base.',
    icone: 'UserCheck',
    custoBase: 15000,
    fatorCrescimento: 1.25,
    rendimentoBase: 0.08, // +8% no multiplicador por nível
    tipoRendimento: 'multiplicador_forca',
    divisaoMinima: 1, // Desbloqueia na Série C (Divisão Index 1)
  },
  {
    id: 'marketing',
    nome: 'Marketing & Patrocínios',
    descricao: 'Painéis publicitários de LED e contratos com grandes marcas. Multiplica a receita dos torcedores e gera renda passiva!',
    icone: 'Megaphone',
    custoBase: 1200,
    fatorCrescimento: 1.16,
    rendimentoBase: 6.0, // R$ 6.00 / seg no Nível 1
    tipoRendimento: 'passivo',
    divisaoMinima: 0,
  },
];
