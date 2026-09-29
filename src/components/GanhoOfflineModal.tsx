'use client';

import { Sparkles } from 'lucide-react';
import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { ContadorDinheiro } from './ContadorDinheiro';

export const GanhoOfflineModal: React.FC = () => {
  const { ganhoOfflineInfo, fecharGanhoOffline } = useGameStore();

  if (!ganhoOfflineInfo) return null;

  const minutos = Math.floor(ganhoOfflineInfo.segundos / 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/35 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gradient-to-b from-sky-100 to-amber-50 border-4 border-white p-6 rounded-[2rem] max-w-sm w-full text-center shadow-[0_10px_0_rgba(180,83,9,0.25),0_22px_42px_rgba(15,70,90,0.3)]">
        <div className="w-16 h-16 bg-gradient-to-b from-amber-200 to-amber-400 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-amber-500 shadow-md">
          <Sparkles className="w-8 h-8 text-amber-950 animate-pulse" />
        </div>

        <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight flex items-center justify-center gap-1.5">
          <span>🎉</span> BEM-VINDO DE VOLTA!
        </h3>
        <p className="text-xs text-slate-600 mb-4 font-bold">
          Enquanto você esteve fora por <span className="text-amber-800 font-black">{minutos} minutos</span>, a torcida continuou apoiando o clube!
        </p>

        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-2xl border-2 border-amber-300 mb-5 shadow-inner">
          <span className="text-xs font-black text-amber-900 block mb-1">
            Rendimento Passivo Coletado:
          </span>
          <ContadorDinheiro
            valor={ganhoOfflineInfo.ganho}
            prefixo="+"
            className="text-2xl font-black text-emerald-700 drop-shadow-xs font-mono"
          />
        </div>

        <button
          onClick={fecharGanhoOffline}
          className="game-button btn-game-3d w-full py-3.5 rounded-2xl bg-gradient-to-b from-orange-300 to-amber-400 text-slate-950 font-black text-base transition-all cursor-pointer"
        >
          COLETAR RECOMPENSA! ⚽
        </button>
      </div>
    </div>
  );
};
