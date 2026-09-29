'use client';

import { AnimatePresence, motion } from 'motion/react';
import React from 'react';

interface MascoteReativoProps {
  mensagem?: string | null;
  animando?: boolean;
  tamanho?: 'normal' | 'grande';
}

export const MascoteReativo: React.FC<MascoteReativoProps> = ({ mensagem, animando, tamanho = 'grande' }) => {
  const dimensoes =
    tamanho === 'grande'
      ? 'w-20 h-28 sm:w-24 sm:h-32'
      : 'w-14 h-20 sm:w-16 sm:h-22';

  return (
    <div className="relative flex items-center justify-center pointer-events-none">
      {/* Balão de Fala do Mascote */}
      <AnimatePresence>
        {mensagem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: -65 }}
            exit={{ opacity: 0, scale: 0.8, y: -30 }}
            transition={{ type: 'spring', stiffness: 450, damping: 22 }}
            className="absolute z-30 bg-white text-slate-950 px-3.5 py-2 rounded-2xl border-3 border-amber-400 shadow-2xl text-xs font-black tracking-tight whitespace-nowrap"
          >
            {mensagem}
            {/* Pontinha do Balão */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-r-3 border-b-3 border-amber-400 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Personagem Mascote Animado */}
      <motion.div
        animate={
          animando
            ? { y: [0, -18, 0, -10, 0], scale: [1, 1.18, 1, 1.1, 1], rotate: [0, -8, 8, -4, 0] }
            : { y: [0, -6, 0] }
        }
        transition={
          animando
            ? { duration: 0.7, ease: 'easeOut' }
            : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
        }
        className={`${dimensoes} relative drop-shadow-xl`}
      >
        <img
          src="/arte/torcedor.png"
          alt="Mascote do Clube"
          className="w-full h-full object-contain drop-shadow-lg"
        />
      </motion.div>
    </div>
  );
};
