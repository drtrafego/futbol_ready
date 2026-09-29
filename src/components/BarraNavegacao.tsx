'use client';

import { Building2, Shield, Trophy, Users } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';
import { TelaId, useGameStore } from '../store/useGameStore';

export const BarraNavegacao: React.FC = () => {
  const { telaAtiva, trocarTela, estado } = useGameStore();

  const abas: { id: TelaId; rotulo: string; icone: React.ReactNode }[] = [
    { id: 'estadio', rotulo: 'Base', icone: <Trophy className="w-5 h-5" /> },
    { id: 'construcoes', rotulo: 'Construções', icone: <Building2 className="w-5 h-5" /> },
    { id: 'elenco', rotulo: 'Elenco', icone: <Users className="w-5 h-5" /> },
    { id: 'clube', rotulo: 'Clube', icone: <Shield className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/88 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-5px_18px_rgba(14,116,144,0.14)] backdrop-blur-md">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1.5 rounded-[1.45rem] bg-sky-100/90 p-1.5">
        {abas.map((aba) => {
          const ativa = telaAtiva === aba.id;
          return (
            <motion.button
              key={aba.id}
              onClick={() => trocarTela(aba.id)}
              animate={{ scale: ativa ? 1.05 : 1 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 520, damping: 24 }}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-150 font-black cursor-pointer ${
                ativa
                  ? 'bg-gradient-to-b from-orange-300 to-amber-400 text-slate-950 shadow-[0_3px_0_rgba(180,83,9,0.28)] border-2 border-white'
                  : 'text-sky-700 hover:text-slate-800 hover:bg-white/75'
              }`}
            >
              {aba.icone}
              <span className="text-[11px] mt-0.5 tracking-tight">{aba.rotulo}</span>

              {/* Badge indicadora na aba Elenco caso haja novas promessas */}
              {aba.id === 'elenco' && estado.peneira.length > 0 && (
                <span className="absolute top-1.5 right-3 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-bounce shadow" />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
