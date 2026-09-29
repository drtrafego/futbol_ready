import Phaser from 'phaser';
import { CONSTRUCOES } from '../config/construcoes';
import { getPaleta } from '../config/paletas';
import { sons } from '../lib/audio';
import { calcularCustoConstrucao, calcularReceitaPassiva } from '../lib/economia';
import { useGameStore } from '../store/useGameStore';
import { BuildingId, EstadoJogo } from '../types/game';
import { CampoCentral } from './cenario/CampoCentral';
import { EdificiosCenario } from './cenario/EdificiosCenario';
import { FluxoTorcedores } from './cenario/FluxoTorcedores';
import { PilhaMoedas } from './cenario/PilhaMoedas';
import { criarSpritesheetMascote } from './sprites/characterSprites';

interface LayoutConstrucao {
  id: BuildingId;
  nomeCurto: string;
  xPct: number;
  yPct: number;
  cor: number;
}

interface Ponto {
  x: number;
  y: number;
}

interface PersonagemTrabalhador {
  container: Phaser.GameObjects.Container;
  spriteMascote?: Phaser.GameObjects.Sprite;
  pernaEsquerda?: Phaser.GameObjects.Rectangle;
  pernaDireita?: Phaser.GameObjects.Rectangle;
  proximoIndiceConstrucao: number;
  construcaoReservada?: BuildingId;
  pontoTrabalho?: Ponto;
  tweenCaminhada?: Phaser.Tweens.Tween;
  tweenPernaEsquerda?: Phaser.Tweens.Tween;
  tweenPernaDireita?: Phaser.Tweens.Tween;
  tweenTrabalho?: Phaser.Tweens.Tween;
  proximaAcao?: Phaser.Time.TimerEvent;
}

const CAMINHOS_ICONES: Record<BuildingId, string> = {
  bilheteria: '/arte/icone-bilheteria.png',
  lanchonete: '/arte/icones/lanchonete.jpg',
  torcida: '/arte/icones/torcida.jpg',
  treinamento: '/arte/icone-campo-treino.png',
  base: '/arte/icone-categoria-base.png',
  comissao: '/arte/icones/comissao.jpg',
  marketing: '/arte/icones/marketing.jpg',
};

/**
 * Layout espacial do complexo esportivo estilo Age of Empires 1:
 * - Norte: Arquibancada à esquerda, Centro de Treino à direita
 * - Centro: O grande Campo de Futebol Oficial
 * - Sul-Médio: Lanchonete à esquerda, Comissão no centro, Alojamento da Base à direita
 * - Sul-Entrada: Boulevard com Bilheteria à esquerda e Marketing & Patrocínios à direita
 */
const LAYOUT: LayoutConstrucao[] = [
  // Zona Norte: Arquibancada (Esq) & Centro de Treino (Dir)
  { id: 'torcida', nomeCurto: 'Torcida', xPct: 0.18, yPct: 0.15, cor: 0xdc2626 },
  { id: 'treinamento', nomeCurto: 'Treino', xPct: 0.82, yPct: 0.15, cor: 0x22c55e },

  // Zona Sul-Médio: Lanchonete (Esq) & Comissão Técnica (Dir)
  { id: 'lanchonete', nomeCurto: 'Lanches', xPct: 0.22, yPct: 0.61, cor: 0xf97316 },
  { id: 'comissao', nomeCurto: 'Comissão', xPct: 0.78, yPct: 0.61, cor: 0x8b5cf6 },

  // Zona Sul-Entrada: Bilheteria (Esq), Base (Centro), Marketing (Dir)
  { id: 'bilheteria', nomeCurto: 'Bilheteria', xPct: 0.18, yPct: 0.83, cor: 0xf59e0b },
  { id: 'base', nomeCurto: 'Base', xPct: 0.50, yPct: 0.83, cor: 0x2563eb },
  { id: 'marketing', nomeCurto: 'Marketing', xPct: 0.82, yPct: 0.83, cor: 0x0284c7 },
];

const MARGEM_X = 36;
const MARGEM_TOPO = 64;
const MARGEM_BASE = 24;
const TAMANHO_AREA_TOQUE = 80;
const META_TOQUES_TREINO = 10;
const LARGURA_BARRA_TREINO = 12;
const ALTURA_BARRA_TREINO = 54;
const VELOCIDADE_PERSONAGEM = 50;
const DURACAO_PASSO_MINIMA_MS = 700;
const DURACAO_ANIMACAO_PERNAS_MS = 220;
const DURACAO_TRABALHO_MINIMA_MS = 2200;
const DURACAO_TRABALHO_MAXIMA_MS = 3200;
const DURACAO_TEXTO_FLUTUANTE_MS = 900;
const DIVISAO_MINIMA_REFLETORES = 2;
const DIVISAO_MINIMA_TELAO = 3;

export class BaseScene extends Phaser.Scene {
  private formaContainers: Partial<Record<BuildingId, Phaser.GameObjects.Container>> = {};
  private upgradeBadges: Partial<Record<BuildingId, Phaser.GameObjects.Container>> = {};
  private upgradeBotoesTexto: Partial<Record<BuildingId, Phaser.GameObjects.Text>> = {};
  private upgradeBotoesFundo: Partial<Record<BuildingId, Phaser.GameObjects.Rectangle>> = {};
  private edificiosVisuais: Partial<Record<BuildingId, Phaser.GameObjects.Container>> = {};
  private nivelTextos: Partial<Record<BuildingId, Phaser.GameObjects.Text>> = {};
  private lockTextos: Partial<Record<BuildingId, Phaser.GameObjects.Text>> = {};
  private pontosConstrucoes: Partial<Record<BuildingId, Ponto>> = {};
  private caminhosGfx?: Phaser.GameObjects.Graphics;
  private campoCentral?: CampoCentral;
  private edificiosGerador?: EdificiosCenario;
  private pilhaBilheteria?: PilhaMoedas;
  private pilhaLanchonete?: PilhaMoedas;
  private fluxoTorcedores?: FluxoTorcedores;
  private personagens: PersonagemTrabalhador[] = [];
  private construcoesReservadas = new Set<BuildingId>();
  private preenchimentoTreino?: Phaser.GameObjects.Rectangle;
  private contadorTreino?: Phaser.GameObjects.Text;
  private refletoresContainer?: Phaser.GameObjects.Container;
  private telaoContainer?: Phaser.GameObjects.Container;
  private telaoTextoPlacar?: Phaser.GameObjects.Text;
  private telaoTextoTime?: Phaser.GameObjects.Text;
  private onibusContainer?: Phaser.GameObjects.Container;
  private eventoOnibus?: Phaser.Time.TimerEvent;
  private timerReceitaMoedas?: Phaser.Time.TimerEvent;
  private timerGerarLootChao?: Phaser.Time.TimerEvent;
  private itensChao: Phaser.GameObjects.Container[] = [];
  private gandulaPadContainer?: Phaser.GameObjects.Container;
  private gandulaMascoteContainer?: Phaser.GameObjects.Container;
  private timerAutomacaoGandula?: Phaser.Time.TimerEvent;
  private gandulaEmMovimento = false;
  private cancelarInscricao?: () => void;
  private recursosLimpos = false;

  constructor() {
    super('BaseScene');
  }

  preload() {
    this.load.image('terreno', '/arte/terreno-base.png');
    (Object.entries(CAMINHOS_ICONES) as [BuildingId, string][]).forEach(([id, caminho]) => {
      this.load.image(id, caminho);
    });
    criarSpritesheetMascote(this, 'mascote_walk', 2);
  }

  create() {
    this.recursosLimpos = false;
    const { width, height } = this.scale;

    this.gerarTexturasCirculares();
    this.edificiosGerador = new EdificiosCenario(this);

    // 1. Terreno de fundo cobrindo o campus
    this.add.image(width / 2, height / 2, 'terreno').setDisplaySize(width, height);

    // 2. Trilhas, calçadas e vegetação estilo Age of Empires
    this.desenharCaminhos(width, height);

    // 3. Campo de Futebol Central (coração do CT)
    this.montarCampoCentral(width, height);

    // 4. Edifícios físicos assentados no solo
    this.montarConstrucoes(width, height);

    // 5. Pilhas de moedas físicas coletáveis (Pizza Ready)
    this.montarPilhasDeMoedas();

    // 6. Fluxo contínuo de torcedores visitando o estádio
    this.montarFluxoTorcedores(width, height);

    // 7. Elementos de evolução esportiva por divisão
    this.montarRefletores(width, height);
    this.montarTelao(width);
    this.montarOnibus(width);

    // 8. Trabalhadores da equipe técnica
    this.montarPersonagens();

    // 9. Loot de chão interativo (Sacos de Moeda 💰, Ingressos 🎟️, Energéticos 🥤) estilo Pizza Ready
    this.iniciarLootInterativoChao(width, height);

    // 10. Timer contínuo para abastecer as pilhas de moedas da Bilheteria e Lanchonete
    this.iniciarTimerReceitaMoedas();

    // 11. Gandula Automação de Loot e Coleta de Campo estilo Arcade Tycoon
    this.montarGandula(width, height);

    // Sincronização com o store do jogo
    const aoMudarEstado = () => this.atualizarConstrucoes(useGameStore.getState().estado);
    this.cancelarInscricao = useGameStore.subscribe(aoMudarEstado);
    aoMudarEstado();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.limparRecursos, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.limparRecursos, this);
  }

  private gerarTexturasCirculares() {
    const tamanho = 128;
    (Object.keys(CAMINHOS_ICONES) as BuildingId[]).forEach((id) => {
      const chave = `${id}-circular`;
      if (this.textures.exists(chave)) return;

      const canvasTexture = this.textures.createCanvas(chave, tamanho, tamanho);
      if (!canvasTexture) return;
      const ctx = canvasTexture.getContext();
      const centro = tamanho / 2;
      const raio = centro - 1;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centro, centro, raio, 0, Math.PI * 2, false);
      ctx.closePath();
      ctx.clip();

      const imgSource = this.textures.get(id)?.getSourceImage() as CanvasImageSource | undefined;
      if (imgSource) {
        ctx.drawImage(imgSource, 0, 0, tamanho, tamanho);
      }
      ctx.restore();
      canvasTexture.refresh();
    });
  }

  private desenharCaminhos(width: number, height: number) {
    this.caminhosGfx = this.add.graphics();
    this.caminhosGfx.setDepth(4);

    const corTerraBorda = 0xa16207;
    const corTerraCentro = 0xd4a373;
    const corPedra = 0x64748b;

    const desenharTrecho = (x1: number, y1: number, x2: number, y2: number, espessura: number) => {
      this.caminhosGfx?.lineStyle(espessura + 4, corTerraBorda, 0.45);
      this.caminhosGfx?.lineBetween(x1, y1, x2, y2);
      this.caminhosGfx?.lineStyle(espessura, corTerraCentro, 0.85);
      this.caminhosGfx?.lineBetween(x1, y1, x2, y2);
    };

    const cX = width / 2;
    const yEntrada = height * 0.95;
    const yPracaSul = height * 0.83;
    const yPracaMedio = height * 0.61;
    const yPracaNorte = height * 0.15;

    // Boulevard principal de pedra da entrada até a praça de lanches
    desenharTrecho(cX, yEntrada, cX, yPracaMedio, 22);

    // Eixo horizontal do Boulevard de Entrada (Bilheteria <-> Base <-> Marketing)
    desenharTrecho(width * 0.18, yPracaSul, width * 0.82, yPracaSul, 18);

    // Eixo horizontal da Praça Esportiva (Lanchonete <-> Comissão)
    desenharTrecho(width * 0.22, yPracaMedio, width * 0.78, yPracaMedio, 18);

    // Trilhas laterais conectando a praça média à zona do campo
    desenharTrecho(width * 0.18, yPracaMedio, width * 0.18, yPracaNorte, 14);
    desenharTrecho(width * 0.82, yPracaMedio, width * 0.82, yPracaNorte, 14);

    // Praças pavimentadas sob cada construção estilo Age of Empires
    LAYOUT.forEach((cfg) => {
      const px = width * cfg.xPct;
      const py = height * cfg.yPct;
      this.caminhosGfx?.fillStyle(corPedra, 0.35);
      this.caminhosGfx?.fillRoundedRect(px - 44, py - 20, 88, 44, 10);
    });

    // Elementos decorativos estilo vila medieval / Age of Empires (Árvores e Postes)
    const posArvores = [
      { x: width * 0.06, y: height * 0.12, emoji: '🌲' },
      { x: width * 0.94, y: height * 0.12, emoji: '🌲' },
      { x: width * 0.05, y: height * 0.38, emoji: '🌳' },
      { x: width * 0.95, y: height * 0.38, emoji: '🌳' },
      { x: width * 0.06, y: height * 0.72, emoji: '🌲' },
      { x: width * 0.94, y: height * 0.72, emoji: '🌲' },
      { x: width * 0.34, y: height * 0.92, emoji: '💡' },
      { x: width * 0.66, y: height * 0.92, emoji: '💡' },
    ];

    posArvores.forEach((item) => {
      this.add
        .text(item.x, item.y, item.emoji, { fontSize: '18px' })
        .setOrigin(0.5)
        .setDepth(6);
    });
  }

  private montarCampoCentral(width: number, height: number) {
    const estado = useGameStore.getState().estado;
    const corId = estado.time?.corId || 'azul_amarelo';
    const paleta = getPaleta(corId);
    const corUniformeHex = parseInt(paleta.primaria.replace('#', '0x'), 16) || 0x1e40af;

    const xCampo = width / 2;
    const yCampo = height * 0.38;
    const larguraCampo = Math.min(260, width - 68);
    const alturaCampo = 118;

    this.campoCentral = new CampoCentral(this, {
      x: xCampo,
      y: yCampo,
      largura: larguraCampo,
      altura: alturaCampo,
      corUniforme: corUniformeHex,
      onToqueTreino: () => this.aoTocarCampoCentral(),
    });
  }

  private montarConstrucoes(width: number, height: number) {
    if (!this.edificiosGerador) return;

    LAYOUT.forEach((cfg) => {
      const cx = width * cfg.xPct;
      const cy = height * cfg.yPct;

      const formaContainer = this.add.container(cx, cy);
      formaContainer.setDepth(16);

      // Constrói o edifício físico com arquitetura e fachada
      const visualEdificio = this.edificiosGerador!.criarEdificio(
        cfg.id,
        cfg.nomeCurto,
        cfg.cor,
        cfg.id,
        0
      );
      formaContainer.add(visualEdificio);
      this.edificiosVisuais[cfg.id] = visualEdificio;

      // Área interativa de toque
      formaContainer.setSize(TAMANHO_AREA_TOQUE, TAMANHO_AREA_TOQUE);
      formaContainer.setInteractive(
        new Phaser.Geom.Rectangle(
          -TAMANHO_AREA_TOQUE / 2,
          -TAMANHO_AREA_TOQUE / 2,
          TAMANHO_AREA_TOQUE,
          TAMANHO_AREA_TOQUE
        ),
        Phaser.Geom.Rectangle.Contains
      );
      formaContainer.on('pointerdown', () => this.aoTocarConstrucao(cfg.id, formaContainer));
      this.formaContainers[cfg.id] = formaContainer;

      // Se for a Base, anexa a barra vertical de progresso da Peneira
      if (cfg.id === 'base') {
        formaContainer.add(this.add.text(0, -6, '⚡', { fontSize: '16px' }).setOrigin(0.5).setDepth(20));
        this.montarIndicadorTreino(cx, cy);
      }

      // Botão Flutuante UNIFICADO no Estilo Arcade / Pizza Ready (Nível + Nome + Preço em 1 única pílula sem sobreposição!)
      const upgradeBadge = this.add.container(cx, cy - 48);
      upgradeBadge.setDepth(30);

      const fundoBadge = this.add
        .rectangle(0, 0, 96, 26, 0x059669)
        .setStrokeStyle(1.5, 0xfacc15);

      const textoBadge = this.add
        .text(0, 0, `${cfg.nomeCurto} • Nv. 0\n⬆️ R$ 0`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          align: 'center',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      upgradeBadge.add([fundoBadge, textoBadge]);
      upgradeBadge.setSize(96, 26);
      upgradeBadge.setInteractive({ useHandCursor: true });
      upgradeBadge.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.aoComprarUpgradeConstrucao(cfg.id, formaContainer);
      });

      this.upgradeBadges[cfg.id] = upgradeBadge;
      this.upgradeBotoesFundo[cfg.id] = fundoBadge;
      this.upgradeBotoesTexto[cfg.id] = textoBadge;

      this.pontosConstrucoes[cfg.id] = { x: cx, y: cy };
    });
  }

  private montarPilhasDeMoedas() {
    const pBilheteria = this.pontosConstrucoes.bilheteria;
    if (pBilheteria) {
      this.pilhaBilheteria = new PilhaMoedas(this, pBilheteria.x + 32, pBilheteria.y + 12, (valor) => {
        useGameStore.getState().adicionarDinheiro(valor);
      });
    }

    const pLanchonete = this.pontosConstrucoes.lanchonete;
    if (pLanchonete) {
      this.pilhaLanchonete = new PilhaMoedas(this, pLanchonete.x + 30, pLanchonete.y + 12, (valor) => {
        useGameStore.getState().adicionarDinheiro(valor);
      });
    }
  }

  private montarFluxoTorcedores(width: number, height: number) {
    const pBilheteria = this.pontosConstrucoes.bilheteria || { x: width * 0.5, y: height * 0.84 };
    const pLanchonete = this.pontosConstrucoes.lanchonete || { x: width * 0.2, y: height * 0.65 };
    const pTorcida = this.pontosConstrucoes.torcida || { x: width * 0.22, y: height * 0.20 };

    this.fluxoTorcedores = new FluxoTorcedores(this, {
      pontoEntradaRua: { x: width * 0.5, y: height * 0.96 },
      pontoBilheteria: { x: pBilheteria.x - 8, y: pBilheteria.y + 8 },
      pontoPosCatraca: { x: pBilheteria.x + 28, y: pBilheteria.y - 12 },
      pontoLanchonete: { x: pLanchonete.x, y: pLanchonete.y + 16 },
      pontoArquibancada: { x: pTorcida.x, y: pTorcida.y + 10 },
      pontoSaida: { x: width * 0.08, y: height * 0.96 },
      pilhaBilheteria: this.pilhaBilheteria,
      pilhaLanchonete: this.pilhaLanchonete,
      valorIngresso: 15,
      valorLanche: 10,
    });
  }

  private iniciarTimerReceitaMoedas() {
    this.timerReceitaMoedas = this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        if (this.recursosLimpos) return;
        const estado = useGameStore.getState().estado;
        const recPorSegundo = calcularReceitaPassiva(estado.construcoes, estado.divisaoIndex);
        if (recPorSegundo <= 0) return;

        const valorPassivo = recPorSegundo * 1.5;
        this.pilhaBilheteria?.adicionarValor(valorPassivo * 0.6);
        this.pilhaLanchonete?.adicionarValor(valorPassivo * 0.4);

        this.fluxoTorcedores?.setValores(
          Math.max(5, valorPassivo * 0.3),
          Math.max(3, valorPassivo * 0.2)
        );
      },
    });
  }

  private montarIndicadorTreino(xBase: number, yBase: number) {
    const xBarra = xBase + TAMANHO_AREA_TOQUE / 2 + LARGURA_BARRA_TREINO / 2 - 2;
    const baseBarra = yBase + ALTURA_BARRA_TREINO / 2 - 2;

    this.add
      .text(xBarra, yBase - ALTURA_BARRA_TREINO / 2 - 8, 'PENEIRA', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '8px',
        fontStyle: 'bold',
        color: '#fef3c7',
        stroke: '#14532d',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.add
      .rectangle(xBarra, yBase, LARGURA_BARRA_TREINO, ALTURA_BARRA_TREINO, 0x0f172a, 0.8)
      .setStrokeStyle(1.5, 0xffffff, 0.85)
      .setDepth(19);

    this.preenchimentoTreino = this.add
      .rectangle(xBarra, baseBarra, LARGURA_BARRA_TREINO - 4, 1, 0xfacc15)
      .setOrigin(0.5, 1)
      .setDepth(20)
      .setVisible(false);

    this.contadorTreino = this.add
      .text(xBarra, yBase + ALTURA_BARRA_TREINO / 2 + 7, `0/${META_TOQUES_TREINO}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#14532d',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(20);
  }

  private atualizarConstrucoes(estado: EstadoJogo) {
    LAYOUT.forEach((cfg) => {
      const forma = this.formaContainers[cfg.id];
      const nivelTexto = this.nivelTextos[cfg.id];
      const lockTexto = this.lockTextos[cfg.id];
      const upgradeBadge = this.upgradeBadges[cfg.id];
      const fundoBadge = this.upgradeBotoesFundo[cfg.id];
      const textoBadge = this.upgradeBotoesTexto[cfg.id];

      if (!forma || !nivelTexto || !lockTexto) return;

      const nivel = estado.construcoes[cfg.id] || 0;
      const config = CONSTRUCOES.find((construcao) => construcao.id === cfg.id);
      const bloqueado = !!config && estado.divisaoIndex < config.divisaoMinima;
      const estagio = nivel >= 7 ? 1.15 : nivel >= 3 ? 1.05 : 0.95;

      forma.setScale(estagio);
      forma.setAlpha(bloqueado ? 0.45 : 1);
      nivelTexto.setText(bloqueado ? 'Bloqueado' : `Nv. ${nivel}`);
      lockTexto.setVisible(bloqueado);

      // Re-renderiza a fachada do edifício com adereços de evolução conforme o nível
      if (this.edificiosGerador) {
        const visualAntigo = this.edificiosVisuais[cfg.id];
        if (visualAntigo) visualAntigo.destroy();

        const novoVisual = this.edificiosGerador.criarEdificio(
          cfg.id,
          cfg.nomeCurto,
          cfg.cor,
          cfg.id,
          nivel
        );
        forma.addAt(novoVisual, 0);
        this.edificiosVisuais[cfg.id] = novoVisual;
      }

      if (bloqueado) {
        forma.disableInteractive();
        if (upgradeBadge && fundoBadge && textoBadge) {
          upgradeBadge.setVisible(true);
          fundoBadge.setFillStyle(0x7f1d1d, 0.9).setStrokeStyle(1, 0xef4444);
          textoBadge.setText(`🔒 SÉR. ${(config?.divisaoMinima || 0) + 1}`).setColor('#fca5a5');
        }
      } else {
        if (!forma.input?.enabled) forma.setInteractive();
        const custo = config ? calcularCustoConstrucao(config.custoBase, config.fatorCrescimento, nivel) : 0;
        const temDinheiro = estado.dinheiro >= custo;

        if (upgradeBadge && fundoBadge && textoBadge) {
          upgradeBadge.setVisible(true);
          const custoTxt = custo >= 1_000_000
            ? `${(custo / 1_000_000).toFixed(1).replace('.', ',')}M`
            : custo >= 10_000
            ? `${(custo / 1_000).toFixed(1).replace('.', ',')}k`
            : `${custo}`;

          const acaoIcone = nivel === 0 ? '🏗️ INAUGURAR' : `⬆️ Nv. ${nivel + 1}`;
          if (temDinheiro) {
            fundoBadge.setFillStyle(0x059669, 0.95).setStrokeStyle(1.5, 0xfacc15);
            textoBadge.setText(`${acaoIcone}\nR$ ${custoTxt}`).setColor('#ffffff');
          } else {
            fundoBadge.setFillStyle(0x1e293b, 0.85).setStrokeStyle(1, 0x475569);
            textoBadge.setText(`${acaoIcone}\nR$ ${custoTxt}`).setColor('#94a3b8');
          }
        }
      }
    });

    this.atualizarIndicadorTreino(estado.toquesTreinoAtivo || 0);
    this.atualizarElementosDivisao(estado);
    this.atualizarGandula(estado);
  }

  private atualizarIndicadorTreino(toques: number) {
    if (!this.preenchimentoTreino || !this.contadorTreino) return;

    const toquesNormalizados = Phaser.Math.Clamp(toques, 0, META_TOQUES_TREINO);
    const alturaPreenchimento = ALTURA_BARRA_TREINO * (toquesNormalizados / META_TOQUES_TREINO);
    this.preenchimentoTreino.setVisible(alturaPreenchimento > 0);
    this.preenchimentoTreino.setDisplaySize(LARGURA_BARRA_TREINO - 4, Math.max(1, alturaPreenchimento));
    this.contadorTreino.setText(`${toquesNormalizados}/${META_TOQUES_TREINO}`);
  }

  private aoTocarCampoCentral() {
    const resultado = useGameStore.getState().tocarTreinoAtivo();
    const pBase = this.pontosConstrucoes.base;
    if (pBase) {
      this.criarEfeitoTreino(pBase.x, pBase.y);
    }

    if (resultado.maxAtingido) {
      const xCentral = this.scale.width / 2;
      const yCentral = this.scale.height * 0.42;
      this.mostrarTextoFlutuante(xCentral, yCentral - 35, '⭐ PROLETÁRIO REVELADO!', '#facc15');
      if (resultado.promessaRevelada) {
        this.mostrarTextoFlutuante(
          xCentral,
          yCentral - 15,
          `${resultado.promessaRevelada.nome} (Ov ${resultado.promessaRevelada.overall})`,
          '#ffffff'
        );
      }
    }
  }

  private aoTocarConstrucao(id: BuildingId, container: Phaser.GameObjects.Container) {
    if (id === 'base') {
      this.aoTocarTreinoAtivo(container);
      return;
    }

    let coletou = false;
    // Se houver moedas acumuladas no balcão da bilheteria ou lanchonete, coleta
    if (id === 'bilheteria' && this.pilhaBilheteria && this.pilhaBilheteria.getValor() > 0) {
      this.pilhaBilheteria.coletar();
      coletou = true;
    }
    if (id === 'lanchonete' && this.pilhaLanchonete && this.pilhaLanchonete.getValor() > 0) {
      this.pilhaLanchonete.coletar();
      coletou = true;
    }

    // Grito da Torcida / Toque interativo na construção para ganhar renda extra sem gastar dinheiro!
    const ganho = useGameStore.getState().clicarGritoTorcida();
    this.pulsarConstrucao(container);
    const ponto = this.pontosConstrucoes[id];
    if (ponto && !coletou) {
      this.mostrarTextoFlutuante(ponto.x, ponto.y - 32, `+R$ ${ganho}`, '#facc15');
    }
  }

  private aoComprarUpgradeConstrucao(id: BuildingId, container: Phaser.GameObjects.Container) {
    const nivelAntes = useGameStore.getState().estado.construcoes[id] || 0;
    useGameStore.getState().comprarConstrucao(id);
    const nivelDepois = useGameStore.getState().estado.construcoes[id] || 0;
    const ponto = this.pontosConstrucoes[id];

    if (nivelDepois === nivelAntes) {
      sons.tocarClique();
      if (ponto) this.mostrarTextoFlutuante(ponto.x, ponto.y - 48, 'Sem recursos', '#fee2e2');
      const badge = this.upgradeBadges[id];
      if (badge) {
        this.tweens.add({
          targets: badge,
          x: badge.x + 4,
          duration: 50,
          yoyo: true,
          repeat: 3,
        });
      }
      return;
    }

    sons.tocarCompra();
    sons.tocarMoeda();
    this.pulsarConstrucao(container);
    if (ponto) {
      if (nivelAntes === 0 && nivelDepois === 1) {
        this.criarParticulasInauguracao(ponto.x, ponto.y);
        const config = CONSTRUCOES.find((c) => c.id === id);
        this.mostrarTextoFlutuante(ponto.x, ponto.y - 54, `🎉 INAUGURADO: ${config?.nome.toUpperCase() || id}!`, '#facc15');
      } else {
        this.criarParticulasEvolucao(ponto.x, ponto.y);
        this.mostrarTextoFlutuante(ponto.x, ponto.y - 54, `⭐ NÍVEL ${nivelDepois}!`, '#fef08a');
      }
    }
  }

  private aoTocarTreinoAtivo(container: Phaser.GameObjects.Container) {
    const ponto = this.pontosConstrucoes.base;
    if (!ponto) return;

    const resultado = useGameStore.getState().tocarTreinoAtivo();
    this.pulsarConstrucao(container);
    this.criarEfeitoTreino(ponto.x, ponto.y + 2);
    if (!resultado.maxAtingido) return;

    this.mostrarTextoFlutuante(ponto.x, ponto.y - 54, 'MAX!', '#fef08a');
    const textoPromessa = resultado.promessaRevelada
      ? `⭐ ${resultado.promessaRevelada.nome} (Ov ${resultado.promessaRevelada.overall})`
      : 'Peneira cheia';
    this.mostrarTextoFlutuante(ponto.x + 16, ponto.y - 32, textoPromessa, '#ffffff');
  }

  private pulsarConstrucao(container: Phaser.GameObjects.Container) {
    const escalaAtual = container.scaleX;
    this.tweens.killTweensOf(container);
    this.tweens.add({
      targets: container,
      scale: escalaAtual * 1.12,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private criarEfeitoTreino(x: number, y: number) {
    const pulso = this.add.circle(x, y, 18, 0xfacc15, 0).setStrokeStyle(3, 0xfef3c7).setDepth(90).setScale(0.45);
    this.tweens.add({
      targets: pulso,
      scale: 1.8,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.easeOut',
      onComplete: () => pulso.destroy(),
    });
  }

  private criarParticulasEvolucao(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const p = this.add.circle(x, y, Phaser.Math.Between(3, 6), 0xfacc15).setDepth(90);
      const angulo = i * 30 + Phaser.Math.Between(-10, 10);
      const rad = Phaser.Math.DegToRad(angulo);
      const dist = Phaser.Math.Between(24, 48);

      this.tweens.add({
        targets: p,
        x: x + Math.cos(rad) * dist,
        y: y + Math.sin(rad) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 500,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  private criarParticulasInauguracao(x: number, y: number) {
    for (let i = 0; i < 20; i++) {
      const cor = i % 2 === 0 ? 0xfacc15 : 0x94a3b8;
      const p = this.add.circle(x, y, Phaser.Math.Between(4, 8), cor).setDepth(95);
      const rad = Phaser.Math.DegToRad(i * 18 + Phaser.Math.Between(-8, 8));
      const dist = Phaser.Math.Between(30, 65);

      this.tweens.add({
        targets: p,
        x: x + Math.cos(rad) * dist,
        y: y + Math.sin(rad) * dist - Phaser.Math.Between(10, 30),
        alpha: 0,
        scale: 0.1,
        duration: 700,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  private montarGandula(width: number, height: number) {
    const xPad = width * 0.5;
    const yPad = height * 0.90;

    // Placa no Chão para Contratação do Gandula de Moedas estilo Arcade Tycoon
    this.gandulaPadContainer = this.add.container(xPad, yPad);
    this.gandulaPadContainer.setDepth(28);

    const sombra = this.add.ellipse(0, 10, 86, 24, 0x000000, 0.35);
    const pad = this.add
      .ellipse(0, 0, 80, 32, 0x1e293b, 0.9)
      .setStrokeStyle(1.5, 0x38bdf8);

    const textoPad = this.add
      .text(0, 0, '👨‍💼 GANDULA COLETOR\n⚡ R$ 500', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '8.5px',
        fontStyle: 'bold',
        align: 'center',
        color: '#38bdf8',
      })
      .setOrigin(0.5);

    this.gandulaPadContainer.add([sombra, pad, textoPad]);
    this.gandulaPadContainer.setSize(86, 32);
    this.gandulaPadContainer.setInteractive({ useHandCursor: true });
    this.gandulaPadContainer.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      const contratado = useGameStore.getState().contratarGandulaAction();
      if (contratado) {
        this.mostrarTextoFlutuante(xPad, yPad - 24, '🎉 GANDULA CONTRATADO!', '#38bdf8');
        this.criarParticulasEvolucao(xPad, yPad);
      } else {
        this.mostrarTextoFlutuante(xPad, yPad - 24, 'R$ 500 necessários', '#fee2e2');
      }
    });

    // Personagem Gandula no Mapa quando contratado
    this.gandulaMascoteContainer = this.add.container(xPad, yPad);
    this.gandulaMascoteContainer.setDepth(30);

    const sombraGandula = this.add.ellipse(0, 10, 14, 5, 0x000000, 0.35);
    const colete = this.add.rectangle(0, -2, 11, 11, 0xfacc15).setStrokeStyle(1, 0x854d0e);
    const cabecaG = this.add.circle(0, -10, 5, 0xfbbf24);
    const sacoMoedas = this.add.circle(6, -2, 4, 0x16a34a).setStrokeStyle(1, 0xdcfce7);
    const badgeGandula = this.add
      .text(0, -22, '👨‍💼 GANDULA', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '7.5px',
        fontStyle: 'bold',
        color: '#facc15',
        stroke: '#0f172a',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.gandulaMascoteContainer.add([sombraGandula, colete, cabecaG, sacoMoedas, badgeGandula]);
    this.gandulaMascoteContainer.setVisible(false);

    // Inicia a automação do Gandula de recolher moedas e loot no chão
    this.iniciarLoopAutomacaoGandula();
  }

  private atualizarGandula(estado: EstadoJogo) {
    const contratado = !!estado.gandulaContratado;
    if (this.gandulaPadContainer) {
      this.gandulaPadContainer.setVisible(!contratado);
    }
    if (this.gandulaMascoteContainer) {
      this.gandulaMascoteContainer.setVisible(contratado);
    }
  }

  private iniciarLoopAutomacaoGandula() {
    this.timerAutomacaoGandula = this.time.addEvent({
      delay: 1800,
      loop: true,
      callback: () => {
        if (this.recursosLimpos || !this.gandulaMascoteContainer || this.gandulaEmMovimento) return;
        const estado = useGameStore.getState().estado;
        if (!estado.gandulaContratado) return;

        // 1. Procura item no chão (Loot Bag / Ingresso / Bebida)
        if (this.itensChao.length > 0) {
          const item = this.itensChao[0];
          if (item && item.active) {
            this.gandulaEmMovimento = true;
            this.tweens.add({
              targets: this.gandulaMascoteContainer,
              x: item.x,
              y: item.y,
              duration: 800,
              ease: 'Linear',
              onComplete: () => {
                if (item.active) {
                  sons.tocarMoeda();
                  const valor = Math.max(25, Math.floor(30 * (estado.divisaoIndex + 1)));
                  useGameStore.getState().adicionarDinheiro(valor);
                  this.mostrarTextoFlutuante(item.x, item.y - 20, `🤖 +R$ ${valor}`, '#22c55e');
                  this.criarParticulasEvolucao(item.x, item.y);
                  this.itensChao = this.itensChao.filter((i) => i !== item);
                  item.destroy();
                }
                this.gandulaEmMovimento = false;
              },
            });
            return;
          }
        }

        // 2. Se as pilhas da Bilheteria ou Lanchonete tiverem moedas acumuladas, recolhe!
        if (this.pilhaBilheteria && this.pilhaBilheteria.getValor() > 0) {
          const pBil = this.pontosConstrucoes.bilheteria;
          if (pBil) {
            this.gandulaEmMovimento = true;
            this.tweens.add({
              targets: this.gandulaMascoteContainer,
              x: pBil.x + 32,
              y: pBil.y + 12,
              duration: 900,
              ease: 'Linear',
              onComplete: () => {
                this.pilhaBilheteria?.coletar();
                this.mostrarTextoFlutuante(pBil.x + 32, pBil.y - 12, '🤖 COLETADO!', '#38bdf8');
                this.gandulaEmMovimento = false;
              },
            });
            return;
          }
        }

        if (this.pilhaLanchonete && this.pilhaLanchonete.getValor() > 0) {
          const pLan = this.pontosConstrucoes.lanchonete;
          if (pLan) {
            this.gandulaEmMovimento = true;
            this.tweens.add({
              targets: this.gandulaMascoteContainer,
              x: pLan.x + 30,
              y: pLan.y + 12,
              duration: 900,
              ease: 'Linear',
              onComplete: () => {
                this.pilhaLanchonete?.coletar();
                this.mostrarTextoFlutuante(pLan.x + 30, pLan.y - 12, '🤖 COLETADO!', '#38bdf8');
                this.gandulaEmMovimento = false;
              },
            });
            return;
          }
        }
      },
    });
  }

  private montarRefletores(width: number, height: number) {
    this.refletoresContainer = this.add.container(0, 0);
    this.refletoresContainer.setDepth(35);

    const posicoes: Ponto[] = [
      { x: 18, y: 34 },
      { x: width - 18, y: 34 },
      { x: 18, y: height - 26 },
      { x: width - 18, y: height - 26 },
    ];

    posicoes.forEach((pos) => {
      const sombra = this.add.ellipse(pos.x, pos.y + 18, 14, 5, 0x000000, 0.3);
      const baseConcreto = this.add.rectangle(pos.x, pos.y + 15, 10, 5, 0x94a3b8);
      const haste = this.add.rectangle(pos.x, pos.y, 4, 30, 0x64748b);
      const suporte = this.add.rectangle(pos.x, pos.y - 15, 16, 4, 0x475569);
      const lampadas = [-4, 0, 4].map((off) =>
        this.add.circle(pos.x + off, pos.y - 15, 2, 0xffffff).setStrokeStyle(1, 0xfef08a)
      );

      this.refletoresContainer?.add([sombra, baseConcreto, haste, suporte, ...lampadas]);
    });

    this.refletoresContainer.setVisible(false);
  }

  private montarTelao(width: number) {
    const x = width / 2;
    const y = 28;

    this.telaoContainer = this.add.container(x, y);
    this.telaoContainer.setDepth(36);

    const hasteEsq = this.add.rectangle(-46, 14, 4, 18, 0x475569);
    const hasteDir = this.add.rectangle(46, 14, 4, 18, 0x475569);
    const painel = this.add
      .rectangle(0, 0, 136, 26, 0x090d16)
      .setStrokeStyle(2, 0xf59e0b, 0.95);

    this.telaoTextoTime = this.add
      .text(0, -6, 'BERNARDO FC', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#fef08a',
      })
      .setOrigin(0.5);

    this.telaoTextoPlacar = this.add
      .text(0, 5, 'TEMPORADA 0/10', {
        fontFamily: 'monospace',
        fontSize: '8px',
        fontStyle: 'bold',
        color: '#38bdf8',
      })
      .setOrigin(0.5);

    this.telaoContainer.add([hasteEsq, hasteDir, painel, this.telaoTextoTime, this.telaoTextoPlacar]);
    this.telaoContainer.setVisible(false);
  }

  private montarOnibus(width: number) {
    const y = 44;
    this.onibusContainer = this.add.container(-80, y);
    this.onibusContainer.setDepth(45);

    const corpo = this.add.rectangle(0, 0, 68, 18, 0x1e3a8a).setStrokeStyle(1.5, 0xffffff, 0.9);
    const faixa = this.add.rectangle(0, -1, 68, 3.5, 0xfacc15);
    const vidros = this.add.rectangle(-8, -4, 40, 5, 0x93c5fd);
    const rodaEsq = this.add.circle(-18, 9, 4.5, 0x0f172a);
    const rodaDir = this.add.circle(18, 9, 4.5, 0x0f172a);
    const letreiro = this.add
      .text(0, -1, 'BERNARDO FC', {
        fontFamily: 'sans-serif',
        fontSize: '7px',
        fontStyle: 'bold',
        color: '#0f172a',
      })
      .setOrigin(0.5);

    this.onibusContainer.add([corpo, faixa, vidros, rodaEsq, rodaDir, letreiro]);

    const dispararOnibus = () => {
      if (this.recursosLimpos || !this.onibusContainer) return;
      this.onibusContainer.setPosition(-80, y);
      this.tweens.add({
        targets: this.onibusContainer,
        x: width + 80,
        duration: 4800,
        ease: 'Linear',
        onStart: () => {
          this.mostrarTextoFlutuante(width / 2, y - 18, '🚌 Ônibus do Time!', '#fef08a');
        },
      });
    };

    this.eventoOnibus = this.time.addEvent({
      delay: 24000,
      loop: true,
      callback: dispararOnibus,
    });

    this.time.delayedCall(4000, dispararOnibus);
  }

  private atualizarElementosDivisao(estado: EstadoJogo) {
    const divisao = estado.divisaoIndex;

    const mostrarRefletores = divisao >= DIVISAO_MINIMA_REFLETORES;
    this.refletoresContainer?.setVisible(mostrarRefletores);

    const mostrarTelao = divisao >= DIVISAO_MINIMA_TELAO;
    this.telaoContainer?.setVisible(mostrarTelao);

    if (mostrarTelao && this.telaoTextoTime && this.telaoTextoPlacar) {
      this.telaoTextoTime.setText(estado.time?.nome.toUpperCase() || 'BERNARDO FC');

      const ultimoJogo = estado.temporada.historico[0];
      if (ultimoJogo) {
        const siglaRes = ultimoJogo.resultado === 'vitoria' ? 'V' : ultimoJogo.resultado === 'empate' ? 'E' : 'D';
        this.telaoTextoPlacar.setText(`${ultimoJogo.placarTime}x${ultimoJogo.placarAdversario} [${siglaRes}]`);
      } else {
        this.telaoTextoPlacar.setText(`RODADA ${estado.temporada.partidasJogadas + 1}/10`);
      }
    }
  }

  private montarPersonagens() {
    const posicoesIniciais = [LAYOUT[0], LAYOUT[2], LAYOUT[4], LAYOUT[5]];
    const emojisFala = ['⚽', '🏆', '🍔', '⚡', '💵', '🔥', '👏'];

    posicoesIniciais.forEach((cfg, indice) => {
      const ponto = this.pontosConstrucoes[cfg.id];
      const cx = ponto?.x ?? this.scale.width / 2;
      const cy = ponto?.y ?? this.scale.height / 2;

      const container = this.add.container(cx + (indice - 1) * 16, cy + 24);
      container.setDepth(20);

      const sombra = this.add.ellipse(0, 10, 14, 5, 0x000000, 0.35);

      let spriteMascote: Phaser.GameObjects.Sprite | undefined;
      let pernaEsquerda: Phaser.GameObjects.Rectangle | undefined;
      let pernaDireita: Phaser.GameObjects.Rectangle | undefined;

      if (this.textures.exists('mascote_walk')) {
        spriteMascote = this.add.sprite(0, -6, 'mascote_walk', 0);
        spriteMascote.play('mascote_walk_andar');
        container.add([sombra, spriteMascote]);
      } else {
        pernaEsquerda = this.add.rectangle(-3, 6, 3, 7, 0x0f172a);
        pernaDireita = this.add.rectangle(3, 6, 3, 7, 0x0f172a);
        const tronco = this.add.rectangle(0, -2, 10, 10, 0x1e3a8a).setStrokeStyle(1, 0x0f172a, 0.4);
        const cabeca = this.add.circle(0, -10, 5, 0xfbbf24);
        container.add([sombra, pernaEsquerda, pernaDireita, tronco, cabeca]);
      }

      // Interatividade ao tocar no personagem: o boneco pula, comemora e entrega bônus!
      container.setSize(24, 32);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        sons.tocarGritoTorcida();

        this.tweens.add({
          targets: container,
          y: container.y - 12,
          duration: 120,
          yoyo: true,
          ease: 'Cubic.easeOut',
        });

        const estado = useGameStore.getState().estado;
        const valorBonus = Math.max(10, Math.floor(15 * (estado.divisaoIndex + 1)));
        useGameStore.getState().adicionarDinheiro(valorBonus);

        this.mostrarTextoFlutuante(container.x, container.y - 32, `❤️ +R$ ${valorBonus}`, '#facc15');
        this.criarParticulasEvolucao(container.x, container.y);
      });

      // Balão de pensamento / fala periódico estilo Age of Empires
      this.time.addEvent({
        delay: Phaser.Math.Between(4500, 9000),
        loop: true,
        callback: () => {
          if (this.recursosLimpos || !container.active) return;
          const emoji = Phaser.Math.RND.pick(emojisFala);
          const balao = this.add
            .text(container.x, container.y - 28, `💭 ${emoji}`, {
              fontFamily: 'system-ui, sans-serif',
              fontSize: '11px',
            })
            .setOrigin(0.5)
            .setDepth(90);

          this.tweens.add({
            targets: balao,
            y: balao.y - 14,
            alpha: 0,
            duration: 1300,
            ease: 'Cubic.easeOut',
            onComplete: () => balao.destroy(),
          });
        },
      });

      const personagem: PersonagemTrabalhador = {
        container,
        spriteMascote,
        pernaEsquerda,
        pernaDireita,
        proximoIndiceConstrucao: (indice + 1) % LAYOUT.length,
      };

      this.personagens.push(personagem);
      this.time.delayedCall(400 * indice, () => this.andarParaProximaConstrucao(personagem));
    });
  }

  private iniciarLootInterativoChao(width: number, height: number) {
    const tiposLoot = [
      { emoji: '💰', nome: 'Saco de Moedas', cor: '#facc15', valorMult: 2.5 },
      { emoji: '🎟️', nome: 'Ingresso Perdido', cor: '#38bdf8', valorMult: 3.5 },
      { emoji: '🥤', nome: 'Isotônico de Treino', cor: '#22c55e', valorMult: 2.0 },
    ];

    this.timerGerarLootChao = this.time.addEvent({
      delay: 7500,
      loop: true,
      callback: () => {
        if (this.recursosLimpos || this.itensChao.length >= 4) return;

        const x = Phaser.Math.Between(width * 0.18, width * 0.82);
        const y = Phaser.Math.Between(height * 0.28, height * 0.88);
        const configLoot = Phaser.Math.RND.pick(tiposLoot);

        const lootContainer = this.add.container(x, y);
        lootContainer.setDepth(25);

        const sombra = this.add.ellipse(0, 8, 18, 7, 0x000000, 0.35);
        const iconeText = this.add
          .text(0, -4, configLoot.emoji, { fontSize: '18px' })
          .setOrigin(0.5);

        lootContainer.add([sombra, iconeText]);
        lootContainer.setSize(30, 30);
        lootContainer.setInteractive({ useHandCursor: true });

        // Animação pulsante contínua estilo arcade
        this.tweens.add({
          targets: lootContainer,
          scaleX: 1.18,
          scaleY: 1.18,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });

        lootContainer.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          pointer.event.stopPropagation();
          sons.tocarMoeda();

          const estado = useGameStore.getState().estado;
          const valorFinal = Math.max(20, Math.floor(configLoot.valorMult * 15 * (estado.divisaoIndex + 1)));

          useGameStore.getState().adicionarDinheiro(valorFinal);
          this.criarParticulasEvolucao(x, y);
          this.mostrarTextoFlutuante(x, y - 24, `${configLoot.emoji} +R$ ${valorFinal}`, configLoot.cor);

          this.itensChao = this.itensChao.filter((i) => i !== lootContainer);
          lootContainer.destroy();
        });

        this.itensChao.push(lootContainer);

        // Se não for coletado em 14 segundos, desaparece suavemente
        this.time.delayedCall(14000, () => {
          if (lootContainer.active) {
            this.tweens.add({
              targets: lootContainer,
              alpha: 0,
              duration: 450,
              onComplete: () => {
                this.itensChao = this.itensChao.filter((i) => i !== lootContainer);
                lootContainer.destroy();
              },
            });
          }
        });
      },
    });
  }

  private andarParaProximaConstrucao(personagem: PersonagemTrabalhador) {
    if (this.recursosLimpos) return;

    const idConstrucao = this.reservarProximaConstrucao(personagem);
    if (!idConstrucao) {
      personagem.proximaAcao = this.time.delayedCall(600, () => this.andarParaProximaConstrucao(personagem));
      return;
    }

    const destino = this.pontosConstrucoes[idConstrucao];
    if (!destino) {
      this.liberarConstrucao(personagem);
      return;
    }

    const xDestino = destino.x + Phaser.Math.Between(-14, 14);
    const yDestino = destino.y + 24;
    personagem.pontoTrabalho = { x: xDestino, y: yDestino };

    const distancia = Phaser.Math.Distance.Between(personagem.container.x, personagem.container.y, xDestino, yDestino);
    const duracao = Math.max(DURACAO_PASSO_MINIMA_MS, (distancia / VELOCIDADE_PERSONAGEM) * 1000);

    this.iniciarAnimacaoPernas(personagem);
    personagem.tweenCaminhada?.stop();
    personagem.tweenCaminhada = this.tweens.add({
      targets: personagem.container,
      x: xDestino,
      y: yDestino,
      duration: duracao,
      ease: 'Linear',
      onComplete: () => this.iniciarTrabalho(personagem, idConstrucao),
    });
  }

  private reservarProximaConstrucao(personagem: PersonagemTrabalhador): BuildingId | undefined {
    for (let tentativa = 0; tentativa < LAYOUT.length; tentativa += 1) {
      const indice = (personagem.proximoIndiceConstrucao + tentativa) % LAYOUT.length;
      const id = LAYOUT[indice].id;
      if (this.construcoesReservadas.has(id)) continue;

      personagem.proximoIndiceConstrucao = (indice + 1) % LAYOUT.length;
      personagem.construcaoReservada = id;
      this.construcoesReservadas.add(id);
      return id;
    }

    return undefined;
  }

  private iniciarAnimacaoPernas(personagem: PersonagemTrabalhador) {
    if (personagem.spriteMascote) {
      if (!personagem.spriteMascote.anims.isPlaying) {
        personagem.spriteMascote.play('mascote_walk_andar');
      }
      return;
    }
    if (!personagem.pernaEsquerda || !personagem.pernaDireita) return;

    this.pararAnimacaoPernas(personagem);
    personagem.tweenPernaEsquerda = this.tweens.add({
      targets: personagem.pernaEsquerda,
      angle: { from: -22, to: 22 },
      duration: DURACAO_ANIMACAO_PERNAS_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    personagem.tweenPernaDireita = this.tweens.add({
      targets: personagem.pernaDireita,
      angle: { from: 22, to: -22 },
      duration: DURACAO_ANIMACAO_PERNAS_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private pararAnimacaoPernas(personagem: PersonagemTrabalhador) {
    if (personagem.spriteMascote) {
      personagem.spriteMascote.stop();
      personagem.spriteMascote.setFrame(0);
      return;
    }

    personagem.tweenPernaEsquerda?.stop();
    personagem.tweenPernaDireita?.stop();
    personagem.tweenPernaEsquerda = undefined;
    personagem.tweenPernaDireita = undefined;
    personagem.pernaEsquerda?.setAngle(0);
    personagem.pernaDireita?.setAngle(0);
  }

  private iniciarTrabalho(personagem: PersonagemTrabalhador, id: BuildingId) {
    if (this.recursosLimpos || personagem.construcaoReservada !== id) return;

    personagem.tweenCaminhada?.stop();
    personagem.tweenCaminhada = undefined;
    this.pararAnimacaoPernas(personagem);

    const yTrabalho = personagem.pontoTrabalho?.y ?? personagem.container.y;
    const duracao = Phaser.Math.Between(DURACAO_TRABALHO_MINIMA_MS, DURACAO_TRABALHO_MAXIMA_MS);

    personagem.tweenTrabalho = this.tweens.add({
      targets: personagem.container,
      y: yTrabalho - 3,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    personagem.proximaAcao = this.time.delayedCall(duracao, () => {
      if (this.recursosLimpos || personagem.construcaoReservada !== id) return;

      personagem.tweenTrabalho?.stop();
      personagem.tweenTrabalho = undefined;
      personagem.container.setY(yTrabalho);

      this.mostrarReceitaDaConstrucao(id, duracao);
      this.liberarConstrucao(personagem);
      this.andarParaProximaConstrucao(personagem);
    });
  }

  private liberarConstrucao(personagem: PersonagemTrabalhador) {
    if (personagem.construcaoReservada) this.construcoesReservadas.delete(personagem.construcaoReservada);
    personagem.construcaoReservada = undefined;
    personagem.pontoTrabalho = undefined;
    personagem.proximaAcao = undefined;
  }

  private mostrarReceitaDaConstrucao(id: BuildingId, duracaoTrabalhoMs: number) {
    const estado = useGameStore.getState().estado;
    const receitaPorSegundo = calcularReceitaPassiva(estado.construcoes, estado.divisaoIndex);
    const nivelConstrucao = estado.construcoes[id] || 0;
    const niveisTotais = LAYOUT.reduce((total, c) => total + (estado.construcoes[c.id] || 0), 0);
    const ponto = this.pontosConstrucoes[id];
    if (receitaPorSegundo <= 0 || nivelConstrucao <= 0 || niveisTotais <= 0 || !ponto) return;

    const valor = receitaPorSegundo * (duracaoTrabalhoMs / 1000) * (nivelConstrucao / niveisTotais);
    this.mostrarTextoFlutuante(
      ponto.x,
      ponto.y - 44,
      `+R$ ${valor.toFixed(2).replace('.', ',')}`,
      '#16a34a'
    );
  }

  private mostrarTextoFlutuante(x: number, y: number, texto: string, cor: string) {
    const label = this.add
      .text(x, y, texto, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: cor,
        stroke: '#ffffff',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(100);

    this.tweens.add({
      targets: label,
      y: y - 36,
      alpha: 0,
      duration: DURACAO_TEXTO_FLUTUANTE_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  private limparRecursos() {
    if (this.recursosLimpos) return;
    this.recursosLimpos = true;

    this.cancelarInscricao?.();
    this.cancelarInscricao = undefined;

    this.eventoOnibus?.destroy();
    this.eventoOnibus = undefined;

    this.timerReceitaMoedas?.destroy();
    this.timerReceitaMoedas = undefined;

    this.timerGerarLootChao?.destroy();
    this.timerGerarLootChao = undefined;
    this.itensChao.forEach((item) => item.destroy());
    this.itensChao = [];

    this.timerAutomacaoGandula?.destroy();
    this.timerAutomacaoGandula = undefined;
    this.gandulaPadContainer?.destroy();
    this.gandulaPadContainer = undefined;
    this.gandulaMascoteContainer?.destroy();
    this.gandulaMascoteContainer = undefined;

    this.campoCentral?.destroy();
    this.campoCentral = undefined;

    this.fluxoTorcedores?.destroy();
    this.fluxoTorcedores = undefined;

    this.pilhaBilheteria?.destroy();
    this.pilhaBilheteria = undefined;

    this.pilhaLanchonete?.destroy();
    this.pilhaLanchonete = undefined;

    this.personagens.forEach((personagem) => {
      personagem.proximaAcao?.remove();
      personagem.tweenCaminhada?.stop();
      personagem.tweenTrabalho?.stop();
      this.pararAnimacaoPernas(personagem);
    });
    this.personagens = [];
    this.construcoesReservadas.clear();

    this.tweens.killAll();
    Object.values(this.formaContainers).forEach((forma) => forma?.off('pointerdown'));
    Object.values(this.upgradeBadges).forEach((badge) => badge?.off('pointerdown'));
  }
}
