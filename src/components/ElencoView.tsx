'use client';

import { Award, Crown, RefreshCw, ShoppingCart, Sparkles, UserPlus, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';
import { calcularCustoTreino } from '../lib/elenco';
import { useGameStore } from '../store/useGameStore';
import { FormacaoTatica, Jogador, PosicaoJogador, PosturaTatica } from '../types/game';
import { ContadorDinheiro } from './ContadorDinheiro';
import { MascoteReativo } from './MascoteReativo';

export const ElencoView: React.FC = () => {
  const {
    estado,
    promoverJovemBase,
    venderJovemBase,
    treinarTitularAction,
    contratarJogadorMercadoAction,
    renovarMercadoAction,
    setFormacao,
    setPosturaTatica,
    definirCapitao,
    trocarJogadoresAction,
    alterarPosicaoAction,
  } = useGameStore();

  const [mascoteMensagem, setMascoteMensagem] = useState<string | null>(null);
  const [mascoteAnimando, setMascoteAnimando] = useState(false);
  const [jogadorSelecionadoTroca, setJogadorSelecionadoTroca] = useState<string | null>(null);

  const dispararReacaoMascote = (msg: string) => {
    setMascoteAnimando(true);
    setMascoteMensagem(msg);
    setTimeout(() => setMascoteAnimando(false), 650);
    setTimeout(() => setMascoteMensagem(null), 2500);
  };

  const formatarDinheiro = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getCorPosicao = (pos: PosicaoJogador) => {
    switch (pos) {
      case 'GOL':
        return 'bg-amber-400 text-slate-950 border-amber-500';
      case 'DEF':
        return 'bg-sky-500 text-white border-sky-600';
      case 'MEI':
        return 'bg-emerald-500 text-white border-emerald-600';
      case 'ATA':
        return 'bg-rose-500 text-white border-rose-600';
    }
  };

  const gol = estado.elenco.filter((p) => p.posicao === 'GOL');
  const def = estado.elenco.filter((p) => p.posicao === 'DEF');
  const mei = estado.elenco.filter((p) => p.posicao === 'MEI');
  const ata = estado.elenco.filter((p) => p.posicao === 'ATA');

  const calcularMedia = (lista: Jogador[]) => {
    if (lista.length === 0) return 0;
    return Math.round(lista.reduce((acc, p) => acc + p.overall, 0) / lista.length);
  };

  const mediaGol = calcularMedia(gol);
  const mediaDef = calcularMedia(def);
  const mediaMei = calcularMedia(mei);
  const mediaAta = calcularMedia(ata);
  const capitaoAtual = estado.elenco.find((j) => j.id === estado.capitaoId);

  const renderJogadorCard = (j: Jogador, indice: number) => {
    const custoTreino = calcularCustoTreino(j);
    const podeTreinar = estado.dinheiro >= custoTreino && j.overall < 99;
    const isCapitao = estado.capitaoId === j.id;
    const isSelecionadoTroca = jogadorSelecionadoTroca === j.id;

    return (
      <motion.div
        key={j.id}
        layout
        onClick={() => {
          if (!jogadorSelecionadoTroca) {
            setJogadorSelecionadoTroca(j.id);
            dispararReacaoMascote(`🔄 ${j.nome.split(' ')[0]} selecionado! Toque em outro jogador para trocar!`);
          } else if (jogadorSelecionadoTroca === j.id) {
            setJogadorSelecionadoTroca(null);
          } else {
            trocarJogadoresAction(jogadorSelecionadoTroca, j.id);
            setJogadorSelecionadoTroca(null);
            dispararReacaoMascote(`⚡ Posições trocadas entre os titulares!`);
          }
        }}
        initial={{ opacity: 0, scale: 0.78, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.72, y: -8 }}
        transition={{ duration: 0.28, delay: indice * 0.03, ease: 'easeOut' }}
        className={`flex flex-col items-center bg-white/95 border-2 p-1.5 rounded-2xl shadow-[0_4px_0_rgba(14,116,144,0.25)] backdrop-blur min-w-[76px] max-w-[86px] hover:scale-105 transition-transform relative group cursor-pointer ${
          isSelecionadoTroca
            ? 'border-amber-400 ring-4 ring-amber-400 scale-108 animate-pulse z-30'
            : isCapitao
              ? 'border-amber-400 ring-2 ring-amber-400/50'
              : 'border-white'
        }`}
      >
        <div className="flex items-center justify-between w-full px-1 mb-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const posicoes: PosicaoJogador[] = ['GOL', 'DEF', 'MEI', 'ATA'];
              const proxima = posicoes[(posicoes.indexOf(j.posicao) + 1) % posicoes.length];
              alterarPosicaoAction(j.id, proxima);
              dispararReacaoMascote(`🔄 ${j.nome.split(' ')[0]} agora é ${proxima}!`);
            }}
            className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border shadow-2xs hover:scale-110 transition-transform ${getCorPosicao(
              j.posicao
            )}`}
            title="Toque para alternar a posição tática deste jogador"
          >
            {j.posicao}
          </button>
          <span className="text-xs font-black text-amber-600 font-mono">⭐{j.overall}</span>
        </div>

        {isCapitao && (
          <span className="text-[7px] font-black bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 px-1 rounded-sm shadow-2xs leading-tight mb-0.5 border border-amber-300">
            👑 CAPITÃO
          </span>
        )}

        <div className="text-xl my-0.5 relative">
          👕
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              definirCapitao(j.id);
              dispararReacaoMascote(
                isCapitao ? 'Braçadeira devolvida!' : `⭐ ${j.nome.split(' ')[0]} é o novo Capitão!`
              );
            }}
            title={isCapitao ? 'Remover Capitão' : 'Tornar este jogador o Capitão da Equipe (+Liderança)'}
            className={`absolute -top-1.5 -right-2 text-[10px] p-0.5 rounded-full cursor-pointer transition-transform hover:scale-125 ${
              isCapitao ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
            }`}
          >
            <Crown className="w-3 h-3 fill-current" />
          </button>
        </div>

        <span className="text-[11px] font-black text-slate-800 truncate w-full text-center leading-tight">
          {j.nome.split(' ')[0]}
        </span>

        {/* Botão Treinar Titular (+1 Ov) */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            const sucesso = treinarTitularAction(j.id);
            if (sucesso) dispararReacaoMascote(`⚡ ${j.nome.split(' ')[0]} Treinado (+1 Ov)!`);
          }}
          disabled={!podeTreinar}
          whileTap={{ scale: 0.92 }}
          className={`mt-1.5 w-full py-1 px-1 rounded-xl text-[9px] font-black uppercase flex items-center justify-center space-x-0.5 border-b-2 transition-all cursor-pointer ${
            podeTreinar
              ? 'bg-gradient-to-b from-amber-300 to-amber-400 text-slate-950 border-amber-600 shadow-sm active:border-b-0 active:translate-y-0.5'
              : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
          }`}
          title={`Treinar ${j.nome} (+1 Overall) - Custo: ${formatarDinheiro(custoTreino)}`}
        >
          <Zap className="w-2.5 h-2.5 fill-current" />
          <span>+{formatarDinheiro(custoTreino)}</span>
        </motion.button>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[linear-gradient(180deg,#d1fae5_0%,#e0f2fe_50%,#fef3c7_100%)] text-slate-900 p-3 pt-4 pb-28 overflow-y-auto select-none">
      {/* HEADER DE CENA COM MASCOTE REATIVO E FAIXA DE ESTÁDIO AO FUNDO */}
      <div className="relative mb-3 bg-white/95 backdrop-blur-md p-3.5 rounded-3xl border-3 border-white shadow-md overflow-hidden flex items-center justify-between">
        {/* Recorte Decorativo de Estádio */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <img src="/arte/estadio.png" alt="Estádio" className="w-full h-full object-cover" />
        </div>

        <div className="relative z-10">
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>⚽</span> GERENCIAR TIME ({estado.formacao || '4-4-2'})
          </h2>
          <p className="text-xs text-slate-500 font-extrabold max-w-[200px]">
            Escale tática, escolha o capitão e treine seus craques!
          </p>
        </div>

        {/* Mascote Reativo na Tela do Elenco */}
        <div className="relative z-10 shrink-0">
          <MascoteReativo mensagem={mascoteMensagem} animando={mascoteAnimando} />
        </div>
      </div>

      {/* PRANCHETA TÁTICA DO TREINADOR */}
      <div className="mb-3 bg-white/95 backdrop-blur-md p-3 rounded-3xl border-2 border-slate-200 shadow-md">
        {jogadorSelecionadoTroca && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2.5 p-2 bg-amber-400 text-slate-950 rounded-2xl font-black text-xs text-center border-2 border-amber-300 shadow-md animate-bounce flex items-center justify-between"
          >
            <span>🔄 Toque em outro jogador para trocar de lugar!</span>
            <button
              onClick={() => setJogadorSelecionadoTroca(null)}
              className="text-[10px] bg-slate-950 text-white px-2 py-0.5 rounded-lg font-bold"
            >
              Cancelar
            </button>
          </motion.div>
        )}

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            📋 Prancheta Tática & Formação
          </span>
          {capitaoAtual && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              👑 {capitaoAtual.nome.split(' ')[0]} (+15% Liderança)
            </span>
          )}
        </div>

        {/* Formações Táticas */}
        <div className="grid grid-cols-4 gap-1.5 mb-2.5">
          {(['4-4-2', '4-3-3', '3-5-2', '5-3-2'] as FormacaoTatica[]).map((f) => {
            const ativa = (estado.formacao || '4-4-2') === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFormacao(f);
                  dispararReacaoMascote(`📋 Formação ${f} ativada!`);
                }}
                className={`py-1.5 px-1 rounded-xl text-center font-black text-xs transition-all cursor-pointer border ${
                  ativa
                    ? 'bg-slate-900 text-amber-300 border-amber-400 shadow-sm scale-102'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Postura de Jogo */}
        <div className="grid grid-cols-3 gap-1.5 mb-2.5">
          {[
            { id: 'ofensiva', label: '⚡ Ataque Total' },
            { id: 'equilibrada', label: '⚖️ Equilibrado' },
            { id: 'defensiva', label: '🛡️ Retranca' },
          ].map((p) => {
            const ativa = (estado.posturaTatica || 'equilibrada') === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPosturaTatica(p.id as PosturaTatica);
                  dispararReacaoMascote(`🎯 Postura: ${p.label}`);
                }}
                className={`py-1 px-1 rounded-xl text-center font-black text-[10px] transition-all cursor-pointer border ${
                  ativa
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <div>{p.label}</div>
              </button>
            );
          })}
        </div>

        {/* Dashboard de Força Setorial */}
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-200 text-center">
          <div className="bg-amber-50 rounded-xl p-1 border border-amber-200">
            <p className="text-[9px] font-bold text-amber-700">🧤 GOL</p>
            <p className="text-xs font-black text-slate-900 font-mono">{mediaGol}</p>
          </div>
          <div className="bg-sky-50 rounded-xl p-1 border border-sky-200">
            <p className="text-[9px] font-bold text-sky-700">🛡️ DEF</p>
            <p className="text-xs font-black text-slate-900 font-mono">{mediaDef}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-1 border border-emerald-200">
            <p className="text-[9px] font-bold text-emerald-700">⚙️ MEI</p>
            <p className="text-xs font-black text-slate-900 font-mono">{mediaMei}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-1 border border-rose-200">
            <p className="text-[9px] font-bold text-rose-700">⚽ ATA</p>
            <p className="text-xs font-black text-slate-900 font-mono">{mediaAta}</p>
          </div>
        </div>
      </div>

      {/* Campo Ilustrado (Formação Titular) */}
      <div className="relative w-[96%] mx-auto bg-gradient-to-br from-emerald-400 to-green-600 rounded-[2rem] border-4 border-white shadow-[0_8px_0_rgba(21,128,61,0.34),0_18px_24px_rgba(21,128,61,0.2)] p-2.5 flex flex-col justify-between overflow-hidden my-1 min-h-[360px] -skew-y-1">
        {/* Listras de Grama */}
        <div className="absolute inset-0 flex flex-col pointer-events-none opacity-25">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-black' : 'bg-white'}`} />
          ))}
        </div>

        {/* Linhas Brancas */}
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white/70" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-24 h-24 rounded-full border-2 border-white/70 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white/80" />
          </div>
        </div>

        {/* Atacantes */}
        <div className="flex justify-around z-10 pt-1 skew-y-1">
          <AnimatePresence mode="popLayout">{ata.map((j, indice) => renderJogadorCard(j, indice))}</AnimatePresence>
        </div>

        {/* Meio-Campo */}
        <div className="flex justify-around z-10 px-1 skew-y-1">
          <AnimatePresence mode="popLayout">
            {mei.map((j, indice) => renderJogadorCard(j, ata.length + indice))}
          </AnimatePresence>
        </div>

        {/* Defensores */}
        <div className="flex justify-around z-10 px-1 skew-y-1">
          <AnimatePresence mode="popLayout">
            {def.map((j, indice) => renderJogadorCard(j, ata.length + mei.length + indice))}
          </AnimatePresence>
        </div>

        {/* Goleiro */}
        <div className="flex justify-center z-10 pb-1 skew-y-1">
          <AnimatePresence mode="popLayout">
            {gol.map((j, indice) => renderJogadorCard(j, ata.length + mei.length + def.length + indice))}
          </AnimatePresence>
        </div>
      </div>

      {/* MERCADO DE TRANSFERÊNCIAS (CONTRATAR JOGADORES) */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              Mercado de Transferências
            </h3>
          </div>
          <button
            onClick={() => {
              renovarMercadoAction();
              dispararReacaoMascote('🔄 Mercado Atualizado!');
            }}
            className="flex items-center space-x-1 text-[11px] font-black text-sky-800 bg-sky-100 hover:bg-sky-200 px-2.5 py-1 rounded-xl border border-sky-300 cursor-pointer active:scale-95 transition-transform"
            title="Atualizar lista de jogadores disponíveis no mercado"
          >
            <RefreshCw className="w-3 h-3" />
            <span>RENOVAR</span>
          </button>
        </div>

        <div className="space-y-2">
          {(!estado.mercadoTransferencias || estado.mercadoTransferencias.length === 0) ? (
            <div className="game-panel border-dashed border-sky-200 p-4 text-center">
              <p className="text-xs text-slate-500 font-bold">
                Nenhum jogador no mercado. Clique em RENOVARR para gerar novos!
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {estado.mercadoTransferencias.map((atleta) => {
                const podeComprar = estado.dinheiro >= atleta.custoCompra;

                return (
                  <motion.div
                    key={atleta.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="game-tile bg-white p-3 flex items-center justify-between border-2 border-slate-100 shadow-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col items-center bg-sky-50 p-1.5 rounded-xl border-2 border-sky-200 min-w-[48px]">
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded border shadow-2xs ${getCorPosicao(
                            atleta.posicao
                          )}`}
                        >
                          {atleta.posicao}
                        </span>
                        <span className="text-xs font-black text-amber-600 mt-0.5 font-mono">
                          ⭐{atleta.overall}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-slate-900">{atleta.nome}</h4>
                        <div className="text-xs text-slate-500 font-bold space-x-1.5 mt-0.5">
                          <span>{atleta.idade} anos</span>
                          <span>•</span>
                          <span className="text-sky-700 font-black">
                            {formatarDinheiro(atleta.custoCompra)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <motion.button
                      onClick={() => {
                        const sucesso = contratarJogadorMercadoAction(atleta.id);
                        if (sucesso) dispararReacaoMascote(`⚽ Reforço Contratado: ${atleta.nome.split(' ')[0]}!`);
                      }}
                      disabled={!podeComprar}
                      whileTap={{ scale: 0.94 }}
                      className={`flex items-center space-x-1 text-xs font-black px-3.5 py-2 rounded-xl transition-all shadow-sm border-b-3 cursor-pointer ${
                        podeComprar
                          ? 'bg-gradient-to-b from-sky-400 to-blue-500 text-white border-blue-700 hover:from-sky-300 hover:to-blue-400 active:border-b-0 active:translate-y-0.5 btn-game-3d'
                          : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>CONTRATAR</span>
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* PENEIRA DA CATEGORIA DE BASE */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              Peneira da Base ({estado.peneira.length}/4 Vagas)
            </h3>
          </div>
          {estado.construcoes.base === 0 && (
            <span className="text-[11px] text-amber-800 font-black bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-300">
              💡 Construa a Base na aba Construções!
            </span>
          )}
        </div>

        {estado.peneira.length === 0 ? (
          <div className="game-panel border-dashed border-sky-200 p-6 text-center">
            <span className="text-3xl block mb-1">🔍</span>
            <p className="text-xs text-slate-600 font-bold">
              Nenhuma promessa em observação no momento.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Toque no Campo de Treino na tela do Estádio para trazer novos jovens talentos!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {estado.peneira.map((promessa) => (
                <motion.div
                  key={promessa.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  className="game-tile bg-white p-3 flex items-center justify-between hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col items-center bg-slate-50 p-2 rounded-xl border-2 border-slate-200 min-w-[50px]">
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded border shadow-2xs ${getCorPosicao(
                          promessa.posicao
                        )}`}
                      >
                        {promessa.posicao}
                      </span>
                      <span className="text-sm font-black text-amber-600 mt-0.5">
                        ⭐{promessa.overall}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-slate-900">{promessa.nome}</h4>
                      <div className="text-xs text-slate-500 font-bold space-x-1.5 mt-0.5 flex items-center">
                        <span>{promessa.idade} anos</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-black">
                          Potencial: {promessa.potencial} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações: Promover / Vender */}
                  <div className="flex space-x-2">
                    <motion.button
                      onClick={() => {
                        promoverJovemBase(promessa.id);
                        dispararReacaoMascote(`🌟 Promessa Promovida: ${promessa.nome.split(' ')[0]}!`);
                      }}
                      whileTap={{ scale: 0.94 }}
                      className="flex items-center space-x-1 bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-slate-950 text-xs font-black px-3 py-2 rounded-xl transition-all shadow-sm border-b-3 border-emerald-700 active:border-b-0 active:translate-y-0.5 cursor-pointer btn-game-3d"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>PROMOVER</span>
                    </motion.button>

                    <motion.button
                      onClick={() => {
                        venderJovemBase(promessa.id);
                        dispararReacaoMascote(`💰 Promessa Vendida!`);
                      }}
                      whileTap={{ scale: 0.94 }}
                      className="flex items-center space-x-1 bg-gradient-to-b from-amber-300 to-amber-400 hover:from-amber-200 hover:to-amber-300 text-slate-950 text-xs font-black px-3 py-2 rounded-xl border-b-3 border-amber-600 transition-all shadow-sm active:border-b-0 active:translate-y-0.5 cursor-pointer btn-game-3d"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <ContadorDinheiro valor={promessa.valorVenda} />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
