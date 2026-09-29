'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, FastForward, Award, Shield, Zap } from 'lucide-react';
import { PartidaResultado } from '../types/game';
import { useGameStore } from '../store/useGameStore';
import { EscudoSvg } from './EscudoSvg';
import { MascoteReativo } from './MascoteReativo';
import { sons } from '../lib/audio';

interface PartidaAnimadaModalProps {
  partida: PartidaResultado;
  onFechar: () => void;
}

export const PartidaAnimadaModal: React.FC<PartidaAnimadaModalProps> = ({ partida, onFechar }) => {
  const { estado, trocarTela } = useGameStore();

  // Etapas da animação da partida:
  // 0: Entrada dos times (0')
  // 1: Primeiro lance ofensivo (25')
  // 2: Segundo lance / contra-ataque (60')
  // 3: Lance decisivo final (82')
  // 4: Fim de partida e apito final (90')
  const [fase, setFase] = useState<number>(0);
  const [placarAtualTime, setPlacarAtualTime] = useState<number>(0);
  const [placarAtualRival, setPlacarAtualRival] = useState<number>(0);
  const [eventoTexto, setEventoTexto] = useState<string>('Bola rolando no estádio! Começa o espetáculo!');
  const [mostrarGolBanner, setMostrarGolBanner] = useState<string | null>(null);

  if (!estado.time) return null;

  // Avanço automático das fases da partida
  useEffect(() => {
    sons.tocarApito();

    // Fase 0 -> 1 aos 1.4s
    const t1 = setTimeout(() => {
      setFase(1);
      if (partida.placarTime > 0) {
        sons.tocarGol();
        setEventoTexto(`⚽ 28' GOOOOL DO ${estado.time?.nome.toUpperCase()}! Chute de primeira no ângulo!`);
        setPlacarAtualTime(1);
        setMostrarGolBanner(`⚽ GOOOOOOL DO ${estado.time?.nome.toUpperCase()}!`);
        setTimeout(() => setMostrarGolBanner(null), 1800);
      } else {
        sons.tocarChute();
        setEventoTexto(`⚡ 28' ${estado.time?.nome} avança na velocidade, chuta forte e a bola raspa a trave!`);
      }
    }, 1400);

    // Fase 1 -> 2 aos 3.4s
    const t2 = setTimeout(() => {
      setFase(2);
      if (partida.placarAdversario > 0) {
        sons.tocarApito();
        setEventoTexto(`⚠️ 61' Gol do ${partida.adversario}! Chute rasteiro sem chances.`);
        setPlacarAtualRival(1);
        setMostrarGolBanner(`⚠️ GOL DO ${partida.adversario.toUpperCase()}`);
        setTimeout(() => setMostrarGolBanner(null), 1600);
      } else {
        sons.tocarChute();
        setEventoTexto(`🧤 61' Contra-ataque rival perigoso... DEFENDEU O NOSSO GOLEIRÃO!`);
      }
    }, 3400);

    // Fase 2 -> 3 aos 5.4s
    const t3 = setTimeout(() => {
      setFase(3);
      if (partida.placarTime > 1) {
        sons.tocarGol();
        const golsRestantes = partida.placarTime;
        setPlacarAtualTime(golsRestantes);
        setEventoTexto(`🔥 84' MAIS UM GOL DO ${estado.time?.nome.toUpperCase()}! Jogada mágica de ataque!`);
        setMostrarGolBanner(`🔥 GOLAÇO ESPETACULAR!`);
        setTimeout(() => setMostrarGolBanner(null), 1800);
      } else if (partida.placarAdversario > 1) {
        sons.tocarApito();
        setPlacarAtualRival(partida.placarAdversario);
        setEventoTexto(`⚠️ 84' Ataque perigoso e mais um gol do ${partida.adversario}.`);
      } else {
        sons.tocarChute();
        setEventoTexto(`⏱️ 84' Pressão total nos minutos finais! Torcida empurra o time!`);
      }
    }, 5400);

    // Fase 3 -> 4 (Fim de Jogo) aos 7.2s
    const t4 = setTimeout(() => {
      setFase(4);
      sons.tocarApito();
      setPlacarAtualTime(partida.placarTime);
      setPlacarAtualRival(partida.placarAdversario);
      if (partida.resultado === 'vitoria') {
        sons.tocarCompra();
        setEventoTexto(`🎺 APITO FINAL! VITÓRIA HISTÓRICA DO ${estado.time?.nome.toUpperCase()}! (+3 PONTOS)`);
      } else if (partida.resultado === 'empate') {
        setEventoTexto(`🎺 APITO FINAL! Empate guerreiro (+1 PONTO)!`);
      } else {
        setEventoTexto(`🎺 APITO FINAL! Derrota disputada. Cabeça erguida para a próxima!`);
      }
    }, 7200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [partida, estado.time]);

  // Função para pular animação direto pro final
  const handlePular = () => {
    sons.tocarApito();
    setPlacarAtualTime(partida.placarTime);
    setPlacarAtualRival(partida.placarAdversario);
    setFase(4);
    if (partida.resultado === 'vitoria') {
      sons.tocarCompra();
      setEventoTexto(`🎺 APITO FINAL! VITÓRIA HISTÓRICA DO ${estado.time?.nome.toUpperCase()}! (+3 PONTOS)`);
    } else if (partida.resultado === 'empate') {
      setEventoTexto(`🎺 APITO FINAL! Empate guerreiro (+1 PONTO)!`);
    } else {
      setEventoTexto(`🎺 APITO FINAL! Derrota disputada. Cabeça erguida para a próxima!`);
    }
  };

  const getMinutosJogo = () => {
    switch (fase) {
      case 0:
        return "10'";
      case 1:
        return "35'";
      case 2:
        return "64'";
      case 3:
        return "85'";
      default:
        return "90'";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md select-none animate-fadeIn">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 border-4 border-amber-400 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative text-white">
        
        {/* BARRA SUPERIOR: TRANSMISSÃO AO VIVO DA PARTIDA */}
        <div className="bg-slate-950/90 px-3 py-2 border-b-2 border-amber-400/80 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
            <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">AO VIVO</span>
            <span className="text-xs font-mono font-bold text-amber-300 ml-1">⏱️ {getMinutosJogo()}</span>
          </div>

          {fase < 4 && (
            <button
              onClick={handlePular}
              className="text-[10px] font-black bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-full flex items-center gap-1 active:scale-95 transition-transform cursor-pointer border border-white/40"
            >
              <FastForward className="w-3 h-3" />
              PULAR
            </button>
          )}
        </div>

        {/* PAINEL CENTRAL DE PLACAR EM DESTAQUE */}
        <div className="p-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/10 flex items-center justify-between">
          {/* Time do Jogador */}
          <div className="flex flex-col items-center flex-1 max-w-[100px]">
            <div className="p-1 bg-white/10 rounded-xl border border-white/20 shadow-sm">
              <EscudoSvg escudo={estado.time.escudo} corId={estado.time.corId} sigla={estado.time.sigla} tamanho={40} />
            </div>
            <span className="text-xs font-black text-white truncate text-center mt-1 w-full">
              {estado.time.nome}
            </span>
          </div>

          {/* Placar Gigante Neon */}
          <div className="flex flex-col items-center px-3">
            <div className="bg-slate-950 px-4 py-1.5 rounded-2xl border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)] flex items-center space-x-2">
              <span className="text-2xl font-black font-mono text-emerald-400">{placarAtualTime}</span>
              <span className="text-lg font-black text-amber-400">-</span>
              <span className="text-2xl font-black font-mono text-rose-400">{placarAtualRival}</span>
            </div>
            <span className="text-[9px] font-extrabold uppercase text-slate-400 mt-1 tracking-wider">
              {fase >= 4 ? 'Placar Final' : 'Em Andamento'}
            </span>
          </div>

          {/* Time Rival */}
          <div className="flex flex-col items-center flex-1 max-w-[100px]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-rose-500 to-red-700 border border-white/30 flex items-center justify-center text-lg shadow-sm">
              🛡️
            </div>
            <span className="text-xs font-black text-slate-200 truncate text-center mt-1 w-full">
              {partida.adversario}
            </span>
          </div>
        </div>

        {/* GRAMADO ANIMADO: ARENA DE JOGO COM JOGADORES EM MOVIMENTO */}
        <div className="relative h-56 bg-gradient-to-b from-emerald-600 to-emerald-700 overflow-hidden border-y-2 border-emerald-500/50 shadow-inner flex flex-col justify-center items-center">
          {/* Linhas do Campo */}
          <div className="absolute inset-x-4 top-1/2 h-0.5 bg-white/30 -translate-y-1/2 pointer-events-none" />
          <div className="absolute w-20 h-20 rounded-full border-2 border-white/30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute top-2 inset-x-12 h-14 border-b-2 border-x-2 border-white/30 pointer-events-none rounded-b-lg" />
          <div className="absolute bottom-2 inset-x-12 h-14 border-t-2 border-x-2 border-white/30 pointer-events-none rounded-t-lg" />

          {/* Trave do Gol no Topo */}
          <div className="absolute top-0 w-28 h-6 bg-white/20 border-b-2 border-x-2 border-white rounded-b-md flex items-center justify-center text-[10px] text-white/70 font-mono">
            🥅
          </div>

          {/* BANNER 3D PULSANTE DE GOL! */}
          <AnimatePresence>
            {mostrarGolBanner && (
              <motion.div
                initial={{ scale: 0.2, y: 20, opacity: 0 }}
                animate={{ scale: 1.15, y: 0, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.4, type: 'spring', bounce: 0.5 }}
                className="absolute z-30 px-4 py-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 font-black text-base rounded-2xl border-3 border-white shadow-2xl tracking-wide flex items-center gap-1.5"
              >
                <span>💥</span>
                <span>{mostrarGolBanner}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BONECO 1: ATACANTE DO BERNARDO FC CORRENDO COM A BOLA */}
          <motion.div
            animate={
              fase === 1
                ? { x: [-50, 40, 0], y: [40, -20, -10] }
                : fase === 2
                ? { x: [-30, -50, -40], y: [20, 30, 20] }
                : fase === 3
                ? { x: [-20, 50, 10], y: [10, -30, -20] }
                : { x: [-40, -30, -40], y: [20, 10, 20] }
            }
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute z-10 flex flex-col items-center pointer-events-none"
          >
            {/* Torcedor/Mascote como atacante */}
            <motion.div
              animate={{ y: [0, -6, 0], rotate: [-4, 4, -4] }}
              transition={{ duration: 0.45, repeat: Infinity }}
              className="w-12 h-auto drop-shadow-lg"
            >
              <img src="/arte/torcedor.png" alt="Atacante" className="w-full h-auto" />
            </motion.div>
            <span className="text-[8px] font-black bg-amber-400 text-slate-950 px-1 rounded shadow-xs mt-0.5 uppercase">
              {estado.time.sigla}
            </span>
          </motion.div>

          {/* BOLA DE FUTEBOL EM MOVIMENTO RÁPIDO */}
          <motion.div
            animate={
              fase === 1
                ? { x: [-40, 55, 0], y: [50, -45, -50], rotate: [0, 720, 1440] }
                : fase === 2
                ? { x: [20, -60, -30], y: [-30, 40, 20], rotate: [0, -720, -1080] }
                : fase === 3
                ? { x: [-10, 60, 0], y: [10, -50, -40], rotate: [0, 1080, 2160] }
                : { x: [-30, -35, -30], y: [30, 25, 30], rotate: [0, 360, 0] }
            }
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute z-20 text-xl pointer-events-none drop-shadow-md"
          >
            ⚽
          </motion.div>

          {/* BONECO 2: GOLEIRO RIVAL NA TRAVE */}
          <motion.div
            animate={
              fase === 1
                ? { x: [0, 30, -20, 0], y: [-55, -45, -55] }
                : fase === 3
                ? { x: [-20, 20, 0], y: [-50, -60, -50] }
                : { x: [-15, 15, -15], y: [-55, -55, -55] }
            }
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-6 z-10 flex flex-col items-center pointer-events-none"
          >
            <div className="text-2xl drop-shadow-md">🧤</div>
            <span className="text-[7px] font-black bg-rose-600 text-white px-1 rounded shadow-xs">
              GOL
            </span>
          </motion.div>

          {/* BONECO 3: ZAGUEIRO ADVERSÁRIO DANDO COMBATE */}
          <motion.div
            animate={
              fase === 2
                ? { x: [40, -20, 30], y: [-10, 20, 0] }
                : { x: [20, 0, 20], y: [0, -10, 0] }
            }
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute z-10 flex flex-col items-center pointer-events-none"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-rose-500 to-red-700 border-2 border-white flex items-center justify-center text-xs font-black text-white shadow-md">
              🛡️
            </div>
            <span className="text-[7px] font-black bg-slate-900 text-white px-1 rounded shadow-xs mt-0.5">
              RIVAL
            </span>
          </motion.div>
        </div>

        {/* FEED DE LANCES / NARRADOR DO JOGO */}
        <div className="p-3 bg-slate-950/95 border-t-2 border-emerald-500/40 text-center min-h-[56px] flex items-center justify-center">
          <p className="text-xs font-black text-amber-200 leading-snug animate-pulse">
            {eventoTexto}
          </p>
        </div>

        {/* PAINEL DE CONCLUSÃO AO APITAR O FIM DE JOGO */}
        {fase >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 bg-gradient-to-b from-slate-900 to-slate-950 border-t-2 border-amber-400 flex flex-col gap-2.5"
          >
            {/* Resumo do Resultado */}
            <div
              className={`p-2.5 rounded-2xl border-2 text-center font-black flex items-center justify-center gap-2 shadow-lg ${
                partida.resultado === 'vitoria'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-300'
                  : partida.resultado === 'empate'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 border-amber-300'
                  : 'bg-gradient-to-r from-rose-600 to-red-700 text-white border-rose-400'
              }`}
            >
              {partida.resultado === 'vitoria' && <Trophy className="w-5 h-5" />}
              {partida.resultado === 'empate' && <Award className="w-5 h-5" />}
              {partida.resultado === 'derrota' && <Shield className="w-5 h-5" />}
              <span className="text-xs uppercase tracking-wide">
                {partida.resultado === 'vitoria'
                  ? 'Vitória Espetacular! +3 Pontos'
                  : partida.resultado === 'empate'
                  ? 'Empate Conquistado! +1 Ponto'
                  : 'Derrota! +0 Pontos'}
              </span>
            </div>

            {/* Ações Finais */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => {
                  onFechar();
                  trocarTela('clube');
                }}
                className="py-2.5 px-2 bg-gradient-to-b from-amber-300 to-amber-400 hover:from-amber-200 hover:to-amber-300 text-slate-950 rounded-2xl font-black text-[11px] uppercase border-b-3 border-amber-600 active:translate-y-0.5 active:border-b-0 transition-all cursor-pointer shadow-md flex items-center justify-center gap-1"
              >
                <Trophy className="w-3.5 h-3.5" />
                Ver Tabela
              </button>

              <button
                onClick={onFechar}
                className="py-2.5 px-2 bg-gradient-to-b from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-white rounded-2xl font-black text-[11px] uppercase border-b-3 border-blue-700 active:translate-y-0.5 active:border-b-0 transition-all cursor-pointer shadow-md flex items-center justify-center gap-1"
              >
                Continuar ⚽
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
