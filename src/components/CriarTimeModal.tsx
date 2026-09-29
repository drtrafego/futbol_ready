'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FORMATOS_ESCUDO, OpcaoEscudo, PADROES_ESCUDO, SIMBOLOS_ESCUDO } from '../config/escudos';
import { PALETAS_CORES } from '../config/paletas';
import { ConfigEscudo, ConfigTime, FormatoEscudo, PadraoEscudo, SimboloEscudo } from '../types/game';
import { EscudoSvg } from './EscudoSvg';

const FormSchema = z.object({
  nome: z
    .string()
    .min(3, 'O nome deve ter pelo menos 3 caracteres')
    .max(24, 'O nome deve ter no máximo 24 caracteres')
    .regex(/^[a-zA-Z0-9-áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+$/, 'Caracteres inválidos no nome'),
  sigla: z
    .string()
    .min(1, 'Sigla obrigatória')
    .max(4, 'A sigla deve ter no máximo 4 letras')
    .toUpperCase(),
  corId: z.string(),
  formato: z.enum(['classico', 'redondo', 'losango', 'frances', 'moderno']),
  padrao: z.enum(['liso', 'faixa', 'listras', 'bipartido', 'xadrez']),
  simbolo: z.enum(['bola', 'estrela', 'raio', 'coroa', 'chama', 'montanha', 'ancora', 'trofeu']),
});

type FormValues = z.infer<typeof FormSchema>;

interface CriarTimeModalProps {
  timeExistente?: ConfigTime | null;
  onSalvar: (config: ConfigTime) => void;
  onCancelar?: () => void;
}

const EMOJIS_SIMBOLOS: Record<SimboloEscudo, string> = {
  bola: '⚽',
  estrela: '⭐',
  raio: '⚡',
  coroa: '👑',
  chama: '🔥',
  montanha: '⛰️',
  ancora: '⚓',
  trofeu: '🏆',
};

const cicloOpcao = <T extends string>(
  lista: OpcaoEscudo<T>[],
  atual: T,
  direcao: -1 | 1
): T => {
  const index = lista.findIndex((item) => item.id === atual);
  const nextIndex = (index + direcao + lista.length) % lista.length;
  return lista[nextIndex].id;
};

export const CriarTimeModal: React.FC<CriarTimeModalProps> = ({
  timeExistente,
  onSalvar,
  onCancelar,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      nome: timeExistente?.nome || 'Bernardo FC',
      sigla: timeExistente?.sigla || 'BFC',
      corId: timeExistente?.corId || 'azul_amarelo',
      formato: timeExistente?.escudo?.formato || 'classico',
      padrao: timeExistente?.escudo?.padrao || 'faixa',
      simbolo: timeExistente?.escudo?.simbolo || 'bola',
    },
  });

  const nomeObs = watch('nome');
  const siglaObs = watch('sigla');
  const corIdObs = watch('corId');
  const formatoObs = watch('formato');
  const padraoObs = watch('padrao');
  const simboloObs = watch('simbolo');

  // Atualização automática da sigla com base no nome digitado
  useEffect(() => {
    if (!timeExistente && nomeObs && !siglaObs) {
      const palavras = nomeObs.trim().split(/\s+/);
      let sugerida = '';
      if (palavras.length >= 2) {
        sugerida = (palavras[0][0] + palavras[1][0] + (palavras[2]?.[0] || 'C')).toUpperCase();
      } else if (palavras[0].length >= 3) {
        sugerida = palavras[0].substring(0, 3).toUpperCase();
      }
      if (sugerida) setValue('sigla', sugerida);
    }
  }, [nomeObs, siglaObs, timeExistente, setValue]);

  const sortearCombinacao = () => {
    const corRandom = PALETAS_CORES[Math.floor(Math.random() * PALETAS_CORES.length)].id;
    const formatoRandom = FORMATOS_ESCUDO[Math.floor(Math.random() * FORMATOS_ESCUDO.length)].id;
    const padraoRandom = PADROES_ESCUDO[Math.floor(Math.random() * PADROES_ESCUDO.length)].id;
    const simboloRandom = SIMBOLOS_ESCUDO[Math.floor(Math.random() * SIMBOLOS_ESCUDO.length)].id;

    setValue('corId', corRandom);
    setValue('formato', formatoRandom);
    setValue('padrao', padraoRandom);
    setValue('simbolo', simboloRandom);
  };

  const onSubmit = (values: FormValues) => {
    const config: ConfigTime = {
      nome: values.nome.trim(),
      sigla: values.sigla.trim().toUpperCase(),
      corId: values.corId,
      escudo: {
        formato: values.formato as FormatoEscudo,
        padrao: values.padrao as PadraoEscudo,
        simbolo: values.simbolo as SimboloEscudo,
      },
    };
    onSalvar(config);
  };

  const escudoPreview: ConfigEscudo = {
    formato: formatoObs,
    padrao: padraoObs,
    simbolo: simboloObs,
  };

  const formatoAtual = FORMATOS_ESCUDO.find((f) => f.id === formatoObs) || FORMATOS_ESCUDO[0];
  const padraoAtual = PADROES_ESCUDO.find((p) => p.id === padraoObs) || PADROES_ESCUDO[0];
  const simboloAtual = SIMBOLOS_ESCUDO.find((s) => s.id === simboloObs) || SIMBOLOS_ESCUDO[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-sky-950/40 p-3 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-[2rem] border-[5px] border-white bg-gradient-to-b from-sky-100 via-amber-50 to-emerald-100 p-4 text-slate-900 shadow-[0_16px_0_rgba(15,80,100,0.22),0_24px_50px_rgba(15,70,90,0.3)] my-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <div className="rounded-[1.45rem] bg-white/90 px-3 py-3 shadow-sm">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-sky-600">Seu clube dos sonhos</p>
          <h2 className="mt-0.5 text-center text-xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-1.5">
            <span>⚽</span> {timeExistente ? 'EDITAR O CLUBE' : 'MONTE SEU CLUBE!'}
          </h2>
        </div>
        <p className="mb-3 mt-1.5 text-center text-xs font-bold text-slate-500">
          Escolha o nome, as cores e monte o escudo oficial da sua equipe!
        </p>

        {/* Prévia do escudo */}
        <div className="relative mb-4 flex flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border-3 border-white bg-gradient-to-br from-sky-300 via-sky-200 to-emerald-300 p-3.5 shadow-[inset_0_-5px_0_rgba(18,130,100,0.14)]">
          <span className="absolute left-4 top-3 text-lg opacity-70">☁️</span>
          <span className="absolute right-4 top-4 text-base opacity-70">✨</span>
          <div className="relative p-1.5 bg-white rounded-3xl shadow-[0_5px_0_rgba(25,90,100,0.2)] border-2 border-white">
            <EscudoSvg escudo={escudoPreview} corId={corIdObs} sigla={siglaObs || 'BFC'} tamanho={100} />
          </div>
          <div className="mt-2 text-center">
            <span className="text-base font-black text-slate-900 block leading-tight">
              {nomeObs || 'Nome do Time'}
            </span>
            <span className="text-xs font-black text-sky-800">Sigla oficial: {siglaObs || 'BFC'}</span>
          </div>
          <button
            type="button"
            onClick={sortearCombinacao}
            className="game-button btn-game-3d mt-2.5 rounded-full bg-gradient-to-b from-orange-300 to-amber-400 px-4 py-1.5 text-xs font-black text-slate-900 cursor-pointer shadow-md"
          >
            🎲 Sortear Combinação Aleatória
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          {/* Nome e sigla */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label className="block text-xs font-black mb-1 text-slate-700">Nome do clube</label>
              <input
                {...register('nome')}
                type="text"
                placeholder="Ex: Bernardo FC"
                className="w-full rounded-2xl border-2 border-sky-100 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-inner outline-none focus:border-sky-400"
              />
              {errors.nome && <span className="text-xs text-rose-600 font-bold">{errors.nome.message}</span>}
            </div>
            <div>
              <label className="block text-xs font-black mb-1 text-slate-700">Sigla (1-4)</label>
              <input
                {...register('sigla')}
                type="text"
                placeholder="BFC"
                maxLength={4}
                className="w-full rounded-2xl border-2 border-sky-100 bg-white px-3 py-2 text-center text-sm font-black uppercase text-slate-900 shadow-inner outline-none focus:border-sky-400"
              />
              {errors.sigla && <span className="text-xs text-rose-600 font-bold">{errors.sigla.message}</span>}
            </div>
          </div>

          {/* Seletor de cores do time */}
          <div>
            <label className="block text-xs font-black mb-1 text-slate-700">Cores do Time</label>
            <div className="grid max-h-28 grid-cols-2 gap-2 overflow-y-auto pr-1">
              {PALETAS_CORES.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setValue('corId', p.id)}
                  className={`flex items-center justify-between p-2 rounded-2xl border-2 text-left text-xs font-bold transition-all cursor-pointer ${
                    corIdObs === p.id
                      ? 'border-sky-500 bg-sky-100 shadow-[0_3px_0_rgba(14,116,144,0.28)] scale-[1.02]'
                      : 'border-white bg-white/80 shadow-sm hover:border-sky-200'
                  }`}
                >
                  <span className="truncate max-w-[100px] text-slate-800 font-extrabold">{p.nome}</span>
                  <div className="flex space-x-1 shrink-0">
                    <span
                      className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                      style={{ backgroundColor: p.primaria }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                      style={{ backgroundColor: p.secundaria }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* SELETORES DO ESCUDO LÚDICOS E SEM SOBREPOSIÇÃO (STEPPER ARCADE COM SETAS) */}
          <div className="space-y-2.5 bg-white/70 p-3 rounded-2xl border-2 border-white shadow-inner">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1">
              <span>🛡️</span> Montagem do Escudo
            </h3>

            {/* 1. Formato do Escudo */}
            <div>
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[11px] font-black text-slate-700">Formato:</span>
                <span className="text-[10px] font-bold text-slate-500 font-mono">
                  {FORMATOS_ESCUDO.findIndex((f) => f.id === formatoObs) + 1} de {FORMATOS_ESCUDO.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setValue('formato', cicloOpcao(FORMATOS_ESCUDO, formatoObs, -1))}
                  className="w-9 h-9 rounded-xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center font-black text-slate-800 active:scale-95 transition-transform cursor-pointer hover:border-sky-300"
                  title="Formato anterior"
                >
                  ◀
                </button>
                <div className="flex-1 bg-white py-2 px-3 rounded-xl border-2 border-sky-300 shadow-xs text-center font-black text-xs text-sky-950 truncate">
                  {formatoAtual.nome}
                </div>
                <button
                  type="button"
                  onClick={() => setValue('formato', cicloOpcao(FORMATOS_ESCUDO, formatoObs, 1))}
                  className="w-9 h-9 rounded-xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center font-black text-slate-800 active:scale-95 transition-transform cursor-pointer hover:border-sky-300"
                  title="Próximo formato"
                >
                  ▶
                </button>
              </div>
            </div>

            {/* 2. Padrão das Faixas */}
            <div>
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[11px] font-black text-slate-700">Padrão / Faixas:</span>
                <span className="text-[10px] font-bold text-slate-500 font-mono">
                  {PADROES_ESCUDO.findIndex((p) => p.id === padraoObs) + 1} de {PADROES_ESCUDO.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setValue('padrao', cicloOpcao(PADROES_ESCUDO, padraoObs, -1))}
                  className="w-9 h-9 rounded-xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center font-black text-slate-800 active:scale-95 transition-transform cursor-pointer hover:border-amber-300"
                  title="Padrão anterior"
                >
                  ◀
                </button>
                <div className="flex-1 bg-white py-2 px-3 rounded-xl border-2 border-amber-300 shadow-xs text-center font-black text-xs text-amber-950 truncate">
                  {padraoAtual.nome}
                </div>
                <button
                  type="button"
                  onClick={() => setValue('padrao', cicloOpcao(PADROES_ESCUDO, padraoObs, 1))}
                  className="w-9 h-9 rounded-xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center font-black text-slate-800 active:scale-95 transition-transform cursor-pointer hover:border-amber-300"
                  title="Próximo padrão"
                >
                  ▶
                </button>
              </div>
            </div>

            {/* 3. Símbolo Central */}
            <div>
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[11px] font-black text-slate-700">Símbolo Central:</span>
                <span className="text-[10px] font-bold text-slate-500 font-mono">
                  {SIMBOLOS_ESCUDO.findIndex((s) => s.id === simboloObs) + 1} de {SIMBOLOS_ESCUDO.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setValue('simbolo', cicloOpcao(SIMBOLOS_ESCUDO, simboloObs, -1))}
                  className="w-9 h-9 rounded-xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center font-black text-slate-800 active:scale-95 transition-transform cursor-pointer hover:border-emerald-300"
                  title="Símbolo anterior"
                >
                  ◀
                </button>
                <div className="flex-1 bg-white py-2 px-3 rounded-xl border-2 border-emerald-300 shadow-xs text-center font-black text-xs text-emerald-950 flex items-center justify-center gap-1.5 truncate">
                  <span className="text-base">{EMOJIS_SIMBOLOS[simboloObs as SimboloEscudo] || '⚽'}</span>
                  <span>{simboloAtual.nome}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setValue('simbolo', cicloOpcao(SIMBOLOS_ESCUDO, simboloObs, 1))}
                  className="w-9 h-9 rounded-xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center font-black text-slate-800 active:scale-95 transition-transform cursor-pointer hover:border-emerald-300"
                  title="Próximo símbolo"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2.5 pt-2 border-t-2 border-white">
            {onCancelar && (
              <button
                type="button"
                onClick={onCancelar}
                className="game-button btn-game-3d w-1/3 rounded-2xl bg-slate-200 py-3 text-xs font-black text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="game-button btn-game-3d flex-1 rounded-2xl bg-gradient-to-b from-orange-300 to-amber-400 py-3 text-sm font-black text-slate-900 cursor-pointer shadow-md"
            >
              {timeExistente ? 'SALVAR ALTERAÇÕES' : 'COMEÇAR A JOGAR! ⚽'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
