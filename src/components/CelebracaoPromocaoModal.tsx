'use client';

import { ArrowUpRight, Trophy } from 'lucide-react';
import React from 'react';
import { getDivisao } from '../config/divisoes';
import { useGameStore } from '../store/useGameStore';

export const CelebracaoPromocaoModal: React.FC = () => {
  const { promocaoInfo, fecharPromocaoInfo } = useGameStore();

  if (!promocaoInfo) return null;

  const divisaoNova = getDivisao(promocaoInfo.divisaoNova);
  const ePromocao = promocaoInfo.status === 'promovido';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/35 p-4 backdrop-blur-sm animate-fadeIn">
      <div
        className={`bg-white border-4 ${
          ePromocao ? 'border-amber-400' : 'border-rose-400'
        } p-6 rounded-[2rem] max-w-sm w-full text-center shadow-[0_10px_0_rgba(180,83,9,0.25),0_22px_42px_rgba(15,70,90,0.3)]`}
      >
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border-2 shadow-md ${
            ePromocao
              ? 'bg-gradient-to-b from-amber-200 to-amber-400 border-amber-500'
              : 'bg-rose-100 border-rose-400'
          }`}
        >
          {ePromocao ? (
            <Trophy className="w-8 h-8 text-amber-950 animate-bounce" />
          ) : (
            <ArrowUpRight className="w-8 h-8 text-rose-600 rotate-180" />
          )}
        </div>

        <h3
          className={`text-xl font-black mb-1 uppercase tracking-tight ${
            ePromocao ? 'text-amber-800' : 'text-rose-700'
          }`}
        >
          {ePromocao ? 'PROMOÇÃO DE DIVISÃO! 🎉' : 'REBAIXAMENTO DE DIVISÃO'}
        </h3>

        <p className="text-xs text-slate-600 mb-4 font-bold">
          {ePromocao
            ? 'Excelente temporada! Seu time conquistou o acesso para a divisão superior!'
            : 'Fim de temporada difícil. O time acumulou poucos pontos e caiu de divisão.'}
        </p>

        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-2xl border-2 border-amber-300 mb-4 shadow-inner">
          <span className="text-xs font-black text-slate-600 block mb-0.5">Nova Divisão Oficial:</span>
          <span className="text-lg font-black text-amber-800 block">{divisaoNova.nome}</span>
          <span className="text-xs font-black text-emerald-700 block mt-1">
            Bônus de Receita: {divisaoNova.multiplicadorReceita}x
          </span>
        </div>

        {divisaoNova.desbloqueios.length > 0 && ePromocao && (
          <div className="mb-5 bg-amber-50 p-3 rounded-2xl border-2 border-amber-200 text-left text-xs">
            <span className="font-black text-amber-900 block mb-1">Novidades Desbloqueadas:</span>
            <ul className="list-disc list-inside text-slate-700 font-bold space-y-0.5">
              {divisaoNova.desbloqueios.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={fecharPromocaoInfo}
          className={`w-full py-3.5 rounded-2xl font-black text-base shadow-md transition-transform active:scale-95 cursor-pointer btn-game-3d ${
            ePromocao
              ? 'bg-gradient-to-b from-orange-300 to-amber-400 text-slate-950 border-b-4 border-orange-600'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-2 border-slate-300'
          }`}
        >
          {ePromocao ? 'AVANÇAR PARA A NOVA DIVISÃO! 🏆' : 'CONTINUAR TRABALHANDO'}
        </button>
      </div>
    </div>
  );
};
