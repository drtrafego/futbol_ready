'use client';

import { Building2, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import React from 'react';
import { CONSTRUCOES } from '../config/construcoes';
import { getDivisao } from '../config/divisoes';
import {
  calcularCustoConstrucao,
  calcularCustoLote,
  calcularMaxCompravel,
  calcularMultiplicadorMarco,
  calcularProximoMarco,
} from '../lib/economia';
import { useGameStore } from '../store/useGameStore';
import { BuildingId, ModoQuantidadeCompra } from '../types/game';
import { ContadorDinheiro } from './ContadorDinheiro';
import { MascoteReativo } from './MascoteReativo';

const ICONES_GERADOS: Record<BuildingId, string> = {
  bilheteria: '/arte/icone-bilheteria.png',
  lanchonete: '/arte/icones/lanchonete.jpg',
  torcida: '/arte/icones/torcida.jpg',
  treinamento: '/arte/icone-campo-treino.png',
  base: '/arte/icone-categoria-base.png',
  comissao: '/arte/icones/comissao.jpg',
  marketing: '/arte/icones/marketing.jpg',
};

const CORES_BORDA_CONSTRUCAO: Record<BuildingId, string> = {
  bilheteria: 'border-amber-400 ring-2 ring-amber-400/30',
  lanchonete: 'border-orange-500 ring-2 ring-orange-500/30',
  torcida: 'border-red-500 ring-2 ring-red-500/30',
  treinamento: 'border-emerald-500 ring-2 ring-emerald-500/30',
  base: 'border-blue-500 ring-2 ring-blue-500/30',
  comissao: 'border-purple-500 ring-2 ring-purple-500/30',
  marketing: 'border-cyan-400 ring-2 ring-cyan-400/30',
};

export const ConstrucoesView: React.FC = () => {
  const { estado, comprarConstrucao, setModoCompra } = useGameStore();
  const [construcaoEmCelebracao, setConstrucaoEmCelebracao] = React.useState<BuildingId | null>(null);
  const [mascoteMensagem, setMascoteMensagem] = React.useState<string | null>(null);
  const [mascoteAnimando, setMascoteAnimando] = React.useState(false);

  const handleEvoluirConstrucao = (item: typeof CONSTRUCOES[0]) => {
    comprarConstrucao(item.id as BuildingId);
    setConstrucaoEmCelebracao(item.id as BuildingId);
    setMascoteAnimando(true);
    setMascoteMensagem(`⚡ ${item.nome} Evoluída!`);

    window.setTimeout(() => {
      setConstrucaoEmCelebracao((id) => (id === item.id ? null : id));
      setMascoteAnimando(false);
    }, 650);

    window.setTimeout(() => {
      setMascoteMensagem(null);
    }, 2500);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 via-emerald-950/70 to-slate-950 text-slate-100 p-4 pb-28 overflow-y-auto select-none">
      {/* HEADER DE CENA INTEGRADO À BASE */}
      <div className="relative mb-3 bg-slate-800/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/80 shadow-lg overflow-hidden flex items-center justify-between">
        <div className="relative z-10">
          <h2 className="text-base font-black text-amber-300 tracking-tight flex items-center gap-1.5">
            <span>🏗️</span> ESTRUTURAS DO CLUBE
          </h2>
          <p className="text-xs text-slate-300 font-medium max-w-[210px] mt-0.5">
            Painel de apoio para conferência de métricas e expansão da Base.
          </p>
        </div>

        {/* Mascote Reativo */}
        <div className="relative z-10 shrink-0">
          <MascoteReativo mensagem={mascoteMensagem} animando={mascoteAnimando} />
        </div>
      </div>

      {/* DICA DE GAMEPLAY VIVA */}
      <div className="mb-3.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-2.5 flex items-center gap-2.5">
        <span className="text-lg">🏟️</span>
        <p className="text-[11px] text-emerald-200/90 font-medium leading-tight">
          <strong className="text-emerald-300">Base Viva:</strong> Você também pode tocar nas estruturas diretamente no mapa do estádio para evoluir e acompanhar a equipe trabalhando!
        </p>
      </div>

      {/* Barra de Saldo & Seletor de Lote */}
      <div className="mb-4 bg-slate-800/80 border border-slate-700/80 p-2.5 rounded-2xl shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <span className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-xs shadow-sm">🪙</span>
          <ContadorDinheiro
            valor={estado.dinheiro}
            className="text-base font-black text-amber-300 font-mono tracking-tight"
          />
        </div>

        <div className="flex bg-slate-900/90 p-0.5 rounded-full border border-slate-700 shadow-inner">
          {(['x1', 'x10', 'max'] as ModoQuantidadeCompra[]).map((modo) => (
            <button
              key={modo}
              onClick={() => setModoCompra(modo)}
              className={`px-2.5 py-0.5 text-xs font-black rounded-full transition-all uppercase cursor-pointer ${
                estado.modoCompra === modo
                  ? 'bg-amber-400 text-slate-950 shadow-sm scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {modo}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE CARDS DAS ESTRUTURAS */}
      <div className="space-y-3.5">
        {CONSTRUCOES.map((item, indice) => {
          const nivel = estado.construcoes[item.id as BuildingId] || 0;
          const bloqueado = estado.divisaoIndex < item.divisaoMinima;
          const divisaoNecessaria = getDivisao(item.divisaoMinima);
          const imagemIcone = ICONES_GERADOS[item.id as BuildingId];
          const bordaEstilo = CORES_BORDA_CONSTRUCAO[item.id as BuildingId] || 'border-slate-500';

          const { proximoMarco, progressoPorcentagem } = calcularProximoMarco(nivel);
          const multMarco = calcularMultiplicadorMarco(nivel);

          let qtdComprar = 1;
          let custoTotal = 0;

          if (estado.modoCompra === 'x1') {
            qtdComprar = 1;
            custoTotal = calcularCustoConstrucao(item.custoBase, item.fatorCrescimento, nivel);
          } else if (estado.modoCompra === 'x10') {
            qtdComprar = 10;
            custoTotal = calcularCustoLote(item.custoBase, item.fatorCrescimento, nivel, 10);
          } else {
            const maxCalc = calcularMaxCompravel(
              item.custoBase,
              item.fatorCrescimento,
              nivel,
              estado.dinheiro
            );
            qtdComprar = Math.max(1, maxCalc.quantidade);
            custoTotal =
              maxCalc.custoTotal > 0
                ? maxCalc.custoTotal
                : calcularCustoConstrucao(item.custoBase, item.fatorCrescimento, nivel);
          }

          const temSaldo = estado.dinheiro >= custoTotal && !bloqueado;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 14 }}
              animate={
                construcaoEmCelebracao === item.id
                  ? { opacity: 1, y: 0, scale: [1, 1.018, 1] }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              transition={
                construcaoEmCelebracao === item.id
                  ? { duration: 0.62, ease: 'easeOut' }
                  : { duration: 0.3, delay: indice * 0.04, ease: 'easeOut' }
              }
              className={`relative rounded-2xl p-3.5 border transition-all shadow-md ${
                bloqueado
                  ? 'bg-slate-900/60 border-dashed border-slate-700 opacity-60'
                  : 'bg-slate-800/90 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              {bloqueado ? (
                <div className="flex items-center space-x-3 text-slate-400 py-2">
                  <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700">
                    <Lock className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-300">{item.nome}</h3>
                    <p className="text-xs text-amber-400 font-bold mt-0.5">
                      🔒 Requer {divisaoNecessaria.nome}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Topo do Card com Ícone Circular igual ao da Base */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-13 h-13 rounded-full border-3 shadow-md shrink-0 overflow-hidden flex items-center justify-center bg-slate-950/70 p-0.5 ${bordaEstilo}`}
                      >
                        {imagemIcone ? (
                          <Image
                            src={imagemIcone}
                            alt={item.nome}
                            width={84}
                            height={84}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-slate-400" aria-hidden="true" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white leading-tight">{item.nome}</h3>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 max-w-[190px]">
                          {item.descricao}
                        </p>
                      </div>
                    </div>

                    <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                      Nv. {nivel}
                    </div>
                  </div>

                  {/* Rendimento e Efeito */}
                  <div className="mt-2.5 text-xs font-semibold text-slate-300 flex items-center flex-wrap gap-1.5">
                    <span>Efeito:</span>
                    <span className="text-emerald-400 font-black">
                      {item.tipoRendimento === 'passivo' && (
                        <>
                          <ContadorDinheiro
                            valor={item.rendimentoBase * nivel * multMarco}
                            prefixo="+"
                          />
                          /seg
                        </>
                      )}
                      {item.tipoRendimento === 'clique' && (
                        <>
                          <ContadorDinheiro
                            valor={item.rendimentoBase * nivel * multMarco}
                            prefixo="+"
                          />
                          /clique
                        </>
                      )}
                      {item.tipoRendimento === 'forca' &&
                        `+${item.rendimentoBase * nivel * multMarco} Força`}
                      {item.tipoRendimento === 'multiplicador_forca' &&
                        `+${Math.round(item.rendimentoBase * nivel * 100)}% Bônus Força`}
                    </span>
                    {multMarco > 1 && (
                      <span className="text-amber-300 font-black bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 rounded text-[10px]">
                        ⚡ {multMarco}x Marco!
                      </span>
                    )}
                  </div>

                  {/* Barra de Progresso para Próximo Marco */}
                  {proximoMarco && (
                    <div className="mt-2.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span>Próximo Marco (2x): Nível {proximoMarco}</span>
                        <span className="text-emerald-400 font-mono">{Math.floor(progressoPorcentagem)}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700/80 p-0.5">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: progressoPorcentagem / 100 }}
                          transition={{ duration: 0.55, ease: 'easeOut' }}
                          className="origin-left bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Botão de Upgrade Rápido */}
                  <motion.button
                    onClick={() => handleEvoluirConstrucao(item)}
                    disabled={!temSaldo}
                    whileTap={temSaldo ? { scale: 0.97 } : undefined}
                    transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                    className={`mt-3 w-full py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-between shadow-md transition-all cursor-pointer ${
                      temSaldo
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 border border-emerald-300/60 shadow-emerald-900/30'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    <span className="uppercase tracking-wide flex items-center gap-1.5">
                      <span>⬆️</span> EVOLUIR{' '}
                      {estado.modoCompra === 'max' ? `(${qtdComprar}x)` : `+${qtdComprar}`}
                    </span>

                    <div className="flex items-center space-x-1 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-700/60 text-amber-300 font-mono font-black text-xs">
                      <span>🪙</span>
                      <ContadorDinheiro valor={custoTotal} />
                    </div>
                  </motion.button>
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
