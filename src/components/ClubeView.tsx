'use client';

import { CheckCircle2, Edit3, Lock, RefreshCw, Trophy, Users, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';
import { DIVISOES, getDivisao } from '../config/divisoes';
import { obterTabelaCompleta } from '../lib/partidas';
import { useGameStore } from '../store/useGameStore';
import { CriarTimeModal } from './CriarTimeModal';
import { ContadorDinheiro } from './ContadorDinheiro';
import { EscudoSvg } from './EscudoSvg';
import { MascoteReativo } from './MascoteReativo';

type SubAbaClube = 'tabela' | 'trilha';

export const ClubeView: React.FC = () => {
  const { estado, editarTime, recomecarJogo } = useGameStore();
  const [subAbaAtiva, setSubAbaAtiva] = useState<SubAbaClube>('tabela');
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [modalConfirmarReset, setModalConfirmarReset] = useState(false);
  const [mascoteMensagem, setMascoteMensagem] = useState<string | null>(null);
  const [mascoteAnimando, setMascoteAnimando] = useState(false);

  if (!estado.time) return null;

  const divisao = getDivisao(estado.divisaoIndex);
  const tabelaClassificacao = obterTabelaCompleta(
    estado.time,
    estado.temporada,
    estado.tabelaRivais || []
  );

  const linhaJogador = tabelaClassificacao.find((l) => l.isJogador);
  const posicaoJogador = linhaJogador ? linhaJogador.posicao : 1;

  const dispararReacaoMascote = (msg: string) => {
    setMascoteAnimando(true);
    setMascoteMensagem(msg);
    setTimeout(() => setMascoteAnimando(false), 650);
    setTimeout(() => setMascoteMensagem(null), 2500);
  };

  const getEmojiDivisao = (idx: number) => {
    const emojis = ['🥉', '🥈', '🥇', '💎', '🏆', '👑'];
    return emojis[idx] || '⚽';
  };

  return (
    <div className="flex flex-col h-full bg-[linear-gradient(180deg,#dff5ff_0%,#fef3c7_52%,#fed7aa_100%)] text-slate-900 p-4 pb-24 overflow-y-auto select-none">
      {/* HEADER DE CENA COM MASCOTE REATIVO E RECORTE DE ESTÁDIO AO FUNDO */}
      <div className="relative mb-3 bg-white/95 backdrop-blur-md p-4 rounded-3xl border-3 border-white shadow-md overflow-hidden flex items-center justify-between">
        {/* Recorte Decorativo de Estádio */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <img src="/arte/estadio.png" alt="Estádio" className="w-full h-full object-cover" />
        </div>

        <div className="relative z-10 flex items-center space-x-3">
          <div className="p-1 bg-gradient-to-b from-amber-200 to-amber-400 rounded-2xl shadow-sm border-2 border-white">
            <EscudoSvg escudo={estado.time.escudo} corId={estado.time.corId} sigla={estado.time.sigla} tamanho={54} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight leading-tight">
              {estado.time.nome}
            </h2>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-xs font-bold text-slate-500">
                Sigla: <strong className="text-amber-700">{estado.time.sigla}</strong>
              </span>
              <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-2 py-0.2 rounded-full border border-sky-300">
                {divisao.sigla}
              </span>
            </div>
          </div>
        </div>

        {/* Mascote Reativo na Tela do Clube + Botão Editar */}
        <div className="relative z-10 flex items-center space-x-2">
          <MascoteReativo mensagem={mascoteMensagem} animando={mascoteAnimando} />
          <button
            onClick={() => setModalEdicaoAberto(true)}
            className="game-button btn-game-3d flex items-center space-x-1 bg-gradient-to-b from-orange-300 to-amber-400 text-slate-950 font-black text-xs px-3 py-2 rounded-2xl transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>
        </div>
      </div>

      {/* SELETOR DE SUB-ABAS (TABELA vs TRILHA) */}
      <div className="flex bg-white/90 p-1.5 rounded-2xl border-2 border-white shadow-sm mb-4">
        <button
          onClick={() => setSubAbaAtiva('tabela')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subAbaAtiva === 'tabela'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md scale-102 border border-amber-500'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Tabela de Classificação</span>
        </button>

        <button
          onClick={() => setSubAbaAtiva('trilha')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subAbaAtiva === 'trilha'
              ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md scale-102 border border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🗺️ Trilha & Estatísticas</span>
        </button>
      </div>

      {/* SUB-ABA 1: TABELA DE CLASSIFICAÇÃO OFICIAL */}
      {subAbaAtiva === 'tabela' && (
        <div className="space-y-3">
          {/* Card Resumo da Rodada e Status */}
          <div className="bg-white/95 p-3.5 rounded-3xl border-3 border-white shadow-md flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                {divisao.nome}
              </span>
              <h3 className="text-sm font-black text-slate-900">
                Rodada: <strong className="text-amber-600">{estado.temporada.partidasJogadas}/10</strong>
              </h3>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Sua Posição
              </span>
              <span
                className={`text-sm font-black px-2.5 py-0.5 rounded-full inline-block ${
                  posicaoJogador <= 2
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : posicaoJogador >= tabelaClassificacao.length - 1 && estado.divisaoIndex > 0
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {posicaoJogador}º Lugar {posicaoJogador <= 2 ? '🚀 (G-2)' : ''}
              </span>
            </div>
          </div>

          {/* Legenda de Acesso e Rebaixamento */}
          <div className="flex items-center justify-between text-[10px] font-black px-2">
            <span className="flex items-center gap-1 text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-lg border border-emerald-300">
              🟢 1º e 2º: Acesso / Promoção (G-2)
            </span>
            {estado.divisaoIndex > 0 && (
              <span className="flex items-center gap-1 text-rose-800 bg-rose-100/90 px-2 py-0.5 rounded-lg border border-rose-300">
                🔴 Z-2: Rebaixamento
              </span>
            )}
          </div>

          {/* Tabela de Classificação Estilizada */}
          <div className="bg-white rounded-3xl border-3 border-white shadow-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-200 text-[10px] font-black text-slate-600 uppercase">
                  <th className="py-2.5 pl-3 pr-1 text-center w-8">#</th>
                  <th className="py-2.5 px-2">Clube</th>
                  <th className="py-2.5 px-1.5 text-center">J</th>
                  <th className="py-2.5 px-1 text-center">V</th>
                  <th className="py-2.5 px-1 text-center">E</th>
                  <th className="py-2.5 px-1 text-center">D</th>
                  <th className="py-2.5 px-1 text-center">SG</th>
                  <th className="py-2.5 pr-3 pl-1 text-center font-black text-slate-900">PTS</th>
                </tr>
              </thead>
              <tbody>
                {tabelaClassificacao.map((item, idx) => {
                  const isG2 = item.posicao <= 2;
                  const isZ2 = item.posicao >= tabelaClassificacao.length - 1 && estado.divisaoIndex > 0;

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 text-xs transition-colors ${
                        item.isJogador
                          ? 'bg-gradient-to-r from-amber-200 via-amber-100 to-yellow-50 font-black shadow-inner'
                          : isG2
                          ? 'bg-emerald-50/50'
                          : isZ2
                          ? 'bg-rose-50/50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Posição */}
                      <td className="py-2.5 pl-3 pr-1 text-center">
                        <span
                          className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-black ${
                            item.posicao === 1
                              ? 'bg-amber-400 text-slate-950 shadow-xs'
                              : item.posicao === 2
                              ? 'bg-emerald-400 text-slate-950 shadow-xs'
                              : isZ2
                              ? 'bg-rose-400 text-white'
                              : 'text-slate-600 font-bold'
                          }`}
                        >
                          {item.posicao}º
                        </span>
                      </td>

                      {/* Nome do Time */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center space-x-1.5 truncate max-w-[130px] sm:max-w-[180px]">
                          {item.isJogador ? (
                            <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded uppercase shrink-0">
                              VOCÊ
                            </span>
                          ) : null}
                          <span
                            className={`truncate ${
                              item.isJogador
                                ? 'font-black text-slate-950 text-xs'
                                : 'font-bold text-slate-800 text-[11px]'
                            }`}
                          >
                            {item.nome}
                          </span>
                        </div>
                      </td>

                      {/* Jogos */}
                      <td className="py-2.5 px-1 text-center text-slate-600 font-mono text-[11px]">
                        {item.jogos}
                      </td>

                      {/* Vitórias */}
                      <td className="py-2.5 px-1 text-center text-emerald-700 font-mono font-bold text-[11px]">
                        {item.vitorias}
                      </td>

                      {/* Empates */}
                      <td className="py-2.5 px-1 text-center text-slate-500 font-mono text-[11px]">
                        {item.empates}
                      </td>

                      {/* Derrotas */}
                      <td className="py-2.5 px-1 text-center text-rose-600 font-mono text-[11px]">
                        {item.derrotas}
                      </td>

                      {/* Saldo de Gols */}
                      <td className="py-2.5 px-1 text-center font-mono text-[11px] text-slate-600">
                        {item.saldoGols > 0 ? `+${item.saldoGols}` : item.saldoGols}
                      </td>

                      {/* Pontos */}
                      <td className="py-2.5 pr-3 pl-1 text-center font-mono font-black text-xs text-slate-950">
                        {item.pontos}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: TRILHA DAS DIVISÕES & ESTATÍSTICAS */}
      {subAbaAtiva === 'trilha' && (
        <div className="space-y-5">
          {/* Trilha de divisões em formato de caminho de troféus. */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                Trilha das Divisões
              </h3>
            </div>

            <div className="space-y-3 relative">
              {DIVISOES.map((div, idx) => {
                const atual = idx === estado.divisaoIndex;
                const conquistada = idx < estado.divisaoIndex;
                const bloqueada = idx > estado.divisaoIndex;

                return (
                  <motion.div
                    key={div.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={
                      atual
                        ? { opacity: 1, y: 0, scale: [1.01, 1.03, 1.01] }
                        : { opacity: 1, y: 0, scale: 1 }
                    }
                    transition={
                      atual
                        ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 0.3, delay: idx * 0.05, ease: 'easeOut' }
                    }
                    className={`p-3.5 rounded-2xl border-3 transition-all flex items-center justify-between shadow-sm ${
                      atual
                        ? 'bg-gradient-to-r from-amber-100 to-yellow-100 border-white shadow-[0_5px_0_rgba(180,83,9,0.22)] scale-102 ring-2 ring-amber-300'
                        : conquistada
                        ? 'bg-white border-white shadow-[0_4px_0_rgba(21,128,61,0.15)] opacity-95'
                        : 'bg-slate-100/80 border-dashed border-slate-300 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border-2 ${
                          atual
                            ? 'bg-amber-400 text-slate-950 border-amber-500'
                            : conquistada
                            ? 'bg-emerald-400 text-white border-emerald-500'
                            : 'bg-slate-200 text-slate-400 border-slate-300'
                        }`}
                      >
                        {bloqueada ? (
                          <Lock className="w-5 h-5 text-slate-400" />
                        ) : conquistada ? (
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        ) : (
                          getEmojiDivisao(idx)
                        )}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-black text-slate-900">{div.nome}</h4>
                          {atual && (
                            <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-xs">
                              DIVISÃO ATUAL
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 font-bold mt-0.5">
                          Bônus de Receita:{' '}
                          <span className="text-emerald-700 font-black">{div.multiplicadorReceita}x</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs font-bold text-slate-500">
                      <span>Força Alvo:</span>
                      <div className="text-amber-800 font-black text-sm">{div.forcaInimigaTarget} pts</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Estatísticas da carreira. */}
          <div className="game-panel p-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <span>📊</span> Estatísticas da Carreira
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs font-bold">
              <div className="bg-emerald-50 p-3 rounded-2xl border-2 border-emerald-200">
                <span className="text-slate-500 block text-[11px]">Total Ganho</span>
                <ContadorDinheiro
                  valor={estado.estatisticas.totalGanho}
                  className="text-emerald-700 text-base font-black truncate block mt-0.5"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-2xl border-2 border-amber-200">
                <span className="text-slate-500 block text-[11px]">Jogos Simulados</span>
                <span className="text-amber-700 text-base font-black block mt-0.5">
                  {estado.estatisticas.totalPartidas} partidas
                </span>
              </div>

              <div className="bg-sky-50 p-3 rounded-2xl border-2 border-sky-200">
                <span className="text-slate-500 block text-[11px]">Vitórias Conquistadas</span>
                <span className="text-sky-700 text-base font-black block mt-0.5">
                  {estado.estatisticas.totalVitorias} vitórias
                </span>
              </div>

              <div className="bg-purple-50 p-3 rounded-2xl border-2 border-purple-200">
                <span className="text-slate-500 block text-[11px]">Gritos da Torcida</span>
                <span className="text-purple-700 text-base font-black block mt-0.5">
                  {estado.estatisticas.totalCliques} cliques
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zona de reinício. */}
      <div className="pt-3">
        <button
          onClick={() => setModalConfirmarReset(true)}
          className="w-full py-3.5 rounded-2xl bg-rose-100 hover:bg-rose-200 border-2 border-rose-300 text-rose-800 text-xs font-black flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>RECOMEÇAR JOGO DO ZERO</span>
        </button>
      </div>

      {/* Modal de edição do time. */}
      {modalEdicaoAberto && (
        <CriarTimeModal
          timeExistente={estado.time}
          onSalvar={(config) => {
            editarTime(config);
            setModalEdicaoAberto(false);
            dispararReacaoMascote('🎨 Dados do Clube Atualizados!');
          }}
          onCancelar={() => setModalEdicaoAberto(false)}
        />
      )}

      {/* Modal de confirmação de reinício. */}
      {modalConfirmarReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border-4 border-white p-6 rounded-3xl max-w-sm w-full text-center shadow-[0_8px_0_rgba(225,29,72,0.28),0_18px_32px_rgba(15,70,90,0.3)]">
            <span className="text-4xl block mb-2">⚠️</span>
            <h3 className="text-lg font-black text-rose-700 mb-2">RECOMEÇAR O JOGO?</h3>
            <p className="text-xs text-slate-600 mb-6 font-bold">
              Tem certeza que deseja apagar todo o progresso do seu time e recomeçar do zero? Essa ação não pode ser desfeita!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModalConfirmarReset(false)}
                className="game-button btn-game-3d w-1/2 py-2.5 rounded-xl bg-slate-200 text-slate-800 font-black text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  recomecarJogo();
                  setModalConfirmarReset(false);
                }}
                className="game-button btn-game-3d w-1/2 py-2.5 rounded-xl bg-rose-500 text-white font-black text-xs"
              >
                Sim, Recomeçar!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
