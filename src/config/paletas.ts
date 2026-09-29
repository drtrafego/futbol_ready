import { PaletaCor } from '../types/game';

export const PALETAS_CORES: PaletaCor[] = [
  {
    id: 'azul_amarelo',
    nome: 'Azul & Canarinho',
    primaria: '#1E40AF', // Azul royal
    secundaria: '#FACC15', // Amarelo vívido
    textoPrimaria: '#FFFFFF',
    textoSecundaria: '#1E293B',
  },
  {
    id: 'vermelho_preto',
    nome: 'Rubro-Negro',
    primaria: '#DC2626', // Vermelho vivo
    secundaria: '#18181B', // Preto profundo
    textoPrimaria: '#FFFFFF',
    textoSecundaria: '#FFFFFF',
  },
  {
    id: 'verde_branco',
    nome: 'Verde & Branco',
    primaria: '#16A34A', // Verde esmeralda
    secundaria: '#F8FAFC', // Branco neve
    textoPrimaria: '#FFFFFF',
    textoSecundaria: '#0F172A',
  },
  {
    id: 'roxo_dourado',
    nome: 'Roxo & Dourado Imperial',
    primaria: '#7E22CE', // Roxo vibrante
    secundaria: '#F59E0B', // Dourado
    textoPrimaria: '#FFFFFF',
    textoSecundaria: '#1E293B',
  },
  {
    id: 'laranja_azul',
    nome: 'Laranja Dynamic & Azul',
    primaria: '#EA580C', // Laranja quente
    secundaria: '#0284C7', // Azul cerúleo
    textoPrimaria: '#FFFFFF',
    textoSecundaria: '#FFFFFF',
  },
  {
    id: 'celeste_marinho',
    nome: 'Azul Celeste & Marinho',
    primaria: '#38BDF8', // Azul celeste
    secundaria: '#0F172A', // Azul marinho
    textoPrimaria: '#0F172A',
    textoSecundaria: '#FFFFFF',
  },
  {
    id: 'vinho_ouro',
    nome: 'Vinho & Ouro',
    primaria: '#881337', // Vinho nobre
    secundaria: '#FBBF24', // Ouro claro
    textoPrimaria: '#FFFFFF',
    textoSecundaria: '#1E293B',
  },
  {
    id: 'tricolor_bahia',
    nome: 'Tricolor Bahiano',
    primaria: '#2563EB', // Azul
    secundaria: '#EF4444', // Vermelho
    textoPrimaria: '#FFFFFF',
    textoSecundaria: '#FFFFFF',
  },
  {
    id: 'preto_dourado',
    nome: 'Preto & Ouro Premium',
    primaria: '#09090B', // Preto carvão
    secundaria: '#EAB308', // Dourado radiante
    textoPrimaria: '#FFFFFF',
    textoSecundaria: '#09090B',
  },
  {
    id: 'turquesa_coral',
    nome: 'Turquesa & Coral',
    primaria: '#0D9488', // Turquesa mar
    secundaria: '#FB7185', // Coral rosado
    textoPrimaria: '#FFFFFF',
    textoSecundaria: '#FFFFFF',
  },
];

export function getPaleta(id: string): PaletaCor {
  return PALETAS_CORES.find((p) => p.id === id) || PALETAS_CORES[0];
}
