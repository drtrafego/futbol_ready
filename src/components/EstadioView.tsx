'use client';

import { AnimatePresence, motion } from 'motion/react';
import dynamic from 'next/dynamic';
import React from 'react';
import { calcularForcaTime, calcularReceitaPassiva } from '../lib/economia';
import { useGameStore } from '../store/useGameStore';

import { Volume2, VolumeX, Play } from 'lucide-react';
import { sons } from '../lib/audio';

const BaseCanvas = dynamic(
  () => import('../phaser/BaseCanvas').then((mod) => mod.BaseCanvas),
  { ssr: false }
);

export const EstadioView: React.FC = () => {
  const { estado, clicarGritoTorcida, jogarPartidaAgora, toastPartida, fecharToastPartida } = useGameStore();
  const [estaMudo, setEstaMudo] = React.useState(sons.isMudo());

  const handleAlternarSom = () => {
    const novoStatus = sons.alternarMudo();
    setEstaMudo(novoStatus);
  };

  const receitaPorSegundo = calcularReceitaPassiva(estado.construcoes, estado.divisaoIndex);
  const forcaTime = calcularForcaTime(
    estado.construcoes,
    estado.elenco,
    estado.formacao,
    estado.posturaTatica,
    estado.capitaoId
  );
  const segundosParaProxima = Math.max(0, Math.ceil(estado.temporada.segundosParaProximaPartida));

  return (
    <div className="relative w-full h-full min-h-[560px] overflow-hidden bg-emerald-900">
      <BaseCanvas />

      {/* HUD superior */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between p-3 pointer-events-none">
        <div className="pointer-events-auto bg-slate-950/80 backdrop-blur rounded-xl px-3 py-2 text-white shadow-lg border border-slate-800">
          <p className="text-[10px] uppercase tracking-wide text-emerald-300 font-bold">Caixa</p>
          <p className="text-lg font-black leading-none">
            R$ {estado.dinheiro.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] text-slate-300 mt-0.5">
            +R$ {receitaPorSegundo.toFixed(2)}/seg
          </p>
        </div>

        {/* Botão de Som / Mudo */}
        <div className="pointer-events-auto flex items-center">
          <button
            type="button"
            onClick={handleAlternarSom}
            title={estaMudo ? 'Ativar Efeitos Sonoros' : 'Silenciar Sons'}
            className="bg-slate-950/80 hover:bg-slate-900 text-amber-300 p-2.5 rounded-full shadow-lg border border-slate-700 active:scale-95 transition-transform cursor-pointer"
          >
            {estaMudo ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

        <div className="pointer-events-auto bg-slate-950/80 backdrop-blur rounded-xl px-3 py-2 text-white shadow-lg border border-slate-800 text-right flex flex-col items-end">
          <p className="text-[10px] uppercase tracking-wide text-amber-300 font-bold">Força</p>
          <p className="text-lg font-black leading-none">{forcaTime}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-slate-300">{segundosParaProxima}s</span>
            <button
              type="button"
              onClick={() => jogarPartidaAgora()}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[9px] uppercase px-2 py-0.5 rounded-md shadow-xs active:scale-95 cursor-pointer flex items-center gap-0.5"
              title="Jogar partida com animação completa agora!"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>Jogar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Botão Grito da Torcida, flutuante sobre a cena */}
      <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <button
          type="button"
          onClick={() => clicarGritoTorcida()}
          className="pointer-events-auto bg-amber-500 active:scale-95 transition-transform text-slate-950 font-black text-sm px-6 py-3 rounded-full shadow-xl border-2 border-amber-300"
        >
          📣 GRITO DA TORCIDA
        </button>
      </div>

      {/* Toast de resultado da partida */}
      <AnimatePresence>
        {toastPartida && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-950 border-2 border-emerald-400 text-white rounded-2xl px-5 py-4 shadow-2xl text-center min-w-[220px]"
          >
            <p className="text-xs uppercase tracking-wide text-emerald-300 font-bold mb-1">
              {toastPartida.resultado === 'vitoria'
                ? 'Vitória!'
                : toastPartida.resultado === 'empate'
                  ? 'Empate'
                  : 'Derrota'}
            </p>
            <p className="text-2xl font-black">
              {toastPartida.placarTime} x {toastPartida.placarAdversario}
            </p>
            <p className="text-xs text-slate-300 mt-1">vs {toastPartida.adversario}</p>
            <button
              type="button"
              onClick={() => fecharToastPartida()}
              className="mt-3 text-xs font-bold text-emerald-300 underline"
            >
              fechar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
