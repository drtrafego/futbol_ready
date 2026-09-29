'use client';

import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { limparJogo, salvarJogo } from '../lib/save';
import { useGameStore } from '../store/useGameStore';
import { BarraNavegacao } from './BarraNavegacao';
import { CelebracaoPromocaoModal } from './CelebracaoPromocaoModal';
import { ClubeView } from './ClubeView';
import { ConstrucoesView } from './ConstrucoesView';
import { CriarTimeModal } from './CriarTimeModal';
import { ElencoView } from './ElencoView';
import { EstadioView } from './EstadioView';
import { GanhoOfflineModal } from './GanhoOfflineModal';
import { PartidaAnimadaModal } from './PartidaAnimadaModal';

export const JogoBernardo: React.FC = () => {
  const {
    estado,
    telaAtiva,
    trocarTela,
    partidaEmAndamento,
    fecharPartidaAnimada,
    inicializarJogo,
    criarEConfigurarTime,
    tickPassivo,
  } = useGameStore();

  const ultimoTickRef = useRef<number>(Date.now());
  const ultimoSaveRef = useRef<number>(Date.now());

  // 1. Inicializa o estado do jogo ao carregar (suporta ?reset=1 para limpar localStorage)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reset') === '1' || params.get('limpar') === '1') {
        limparJogo();
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
    inicializarJogo();
  }, [inicializarJogo]);

  // 2. Laço principal do jogo com delta em tempo real (Date.now())
  useEffect(() => {
    if (!estado.time) return;

    ultimoTickRef.current = Date.now();

    const intervalId = setInterval(() => {
      const agora = Date.now();
      const deltaMs = agora - ultimoTickRef.current;
      ultimoTickRef.current = agora;

      const deltaSegundos = deltaMs / 1000;
      if (deltaSegundos > 0) {
        tickPassivo(deltaSegundos);
      }

      // Auto-save a cada 5 segundos
      if (agora - ultimoSaveRef.current >= 5000) {
        ultimoSaveRef.current = agora;
        const estadoAtual = useGameStore.getState().estado;
        if (estadoAtual.time) {
          salvarJogo(estadoAtual);
        }
      }
    }, 250);

    return () => clearInterval(intervalId);
  }, [estado.time, tickPassivo]);

  // 3. Handlers de salvar ao ocultar aba e ao fechar a janela
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const estadoAtual = useGameStore.getState().estado;
        if (estadoAtual.time) salvarJogo(estadoAtual);
      }
    };

    const handleBeforeUnload = () => {
      const estadoAtual = useGameStore.getState().estado;
      if (estadoAtual.time) salvarJogo(estadoAtual);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Se o time ainda não foi criado (primeiro acesso ou reset), força a tela de criação
  if (!estado.time) {
    return <CriarTimeModal onSalvar={criarEConfigurarTime} />;
  }

  const painelAberto = telaAtiva !== 'estadio';

  return (
    <div className="flex flex-col h-screen w-screen max-w-md mx-auto bg-gradient-to-b from-sky-300 via-sky-100 to-emerald-100 shadow-2xl relative overflow-hidden font-sans border-x-4 border-white/70">
      {/* A Base é o cenário permanente do jogo: nunca é desmontada nem trocada por outra tela. */}
      <main className="flex-1 relative overflow-hidden">
        <EstadioView />

        {/* Construções, Elenco e Clube são painéis que sobem POR CIMA do cenário, nunca substituem ele. */}
        <AnimatePresence>
          {painelAberto && (
            <motion.div
              key={telaAtiva}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="absolute inset-x-0 bottom-0 z-40 h-[92%] bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="relative flex items-center justify-end px-4 py-3 border-b border-slate-200 bg-slate-50">
                <span className="w-10 h-1.5 bg-slate-300 rounded-full absolute left-1/2 -translate-x-1/2 top-1.5" />
                <button
                  type="button"
                  onClick={() => trocarTela('estadio')}
                  className="text-xs font-black text-slate-500 bg-slate-200 rounded-full px-3 py-1.5"
                >
                  ✕ Voltar pra Base
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {telaAtiva === 'construcoes' && <ConstrucoesView />}
                {telaAtiva === 'elenco' && <ElencoView />}
                {telaAtiva === 'clube' && <ClubeView />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modais Globais de Ganho Offline, Partida Animada e Celebração */}
      <GanhoOfflineModal />
      <CelebracaoPromocaoModal />
      {partidaEmAndamento && (
        <PartidaAnimadaModal partida={partidaEmAndamento} onFechar={fecharPartidaAnimada} />
      )}

      {/* Barra de Navegação Inferior */}
      <BarraNavegacao />
    </div>
  );
};
