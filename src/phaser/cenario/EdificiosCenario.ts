import Phaser from 'phaser';
import { BuildingId } from '../../types/game';

export interface MetricasEdificio {
  largura: number;
  altura: number;
  corAcento: number;
  nome: string;
}

export class EdificiosCenario {
  private cena: Phaser.Scene;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
  }

  public criarEdificio(
    id: BuildingId,
    nome: string,
    corAcento: number,
    texturaIcone: string,
    nivel: number = 0
  ): Phaser.GameObjects.Container {
    const container = this.cena.add.container(0, 0);

    if (nivel === 0) {
      this.montarPlacaTerrenoInauguracao(container, nome, corAcento, texturaIcone);
      return container;
    }

    switch (id) {
      case 'bilheteria':
        this.montarBilheteria(container, nome, corAcento, texturaIcone);
        break;
      case 'lanchonete':
        this.montarLanchonete(container, nome, corAcento, texturaIcone);
        break;
      case 'torcida':
        this.montarArquibancada(container, nome, corAcento, texturaIcone);
        break;
      case 'treinamento':
        this.montarAcademiaCT(container, nome, corAcento, texturaIcone);
        break;
      case 'base':
        this.montarAlojamentoBase(container, nome, corAcento, texturaIcone);
        break;
      case 'comissao':
        this.montarComissaoTecnica(container, nome, corAcento, texturaIcone);
        break;
      case 'marketing':
        this.montarMarketing(container, nome, corAcento, texturaIcone);
        break;
    }

    // Adiciona adereços visuais de evolução esportiva conforme o nível
    this.adicionarEvolucaoNivel(container, id, corAcento, nivel);

    return container;
  }

  private montarPlacaTerrenoInauguracao(
    c: Phaser.GameObjects.Container,
    nome: string,
    corAcento: number,
    texturaIcone: string
  ) {
    // Sombra e base do terreno no chão com faixa zebrada de obras estilo Arcade Tycoon
    c.add(this.cena.add.ellipse(0, 24, 88, 28, 0x000000, 0.35));

    // Pad circular de obra no chão
    const padChao = this.cena.add
      .ellipse(0, 10, 80, 42, 0x1e293b, 0.85)
      .setStrokeStyle(2, 0xfacc15, 0.9);
    c.add(padChao);

    // Linha zebrada de obras em volta do terreno (faixas amarela e preta)
    for (let i = -3; i <= 3; i++) {
      const traco = this.cena.add
        .rectangle(i * 11, 24, 6, 3, i % 2 === 0 ? 0xfacc15 : 0x0f172a)
        .setAngle(-25);
      c.add(traco);
    }

    // Estacas de perigo de obra
    const estacaEsq = this.cena.add.rectangle(-32, 2, 4, 18, 0x78350f);
    const estacaDir = this.cena.add.rectangle(32, 2, 4, 18, 0x78350f);
    const travessa = this.cena.add.rectangle(0, -2, 66, 4, 0xf59e0b).setStrokeStyle(1, 0x78350f);
    c.add([estacaEsq, estacaDir, travessa]);

    // Medalhão com ícone semi-transparente do setor
    this.adicionarBrasaoFachada(c, 0, -14, texturaIcone, corAcento);

    // Texto no solo: TERRENO DISPONÍVEL
    const textoArea = this.cena.add
      .text(0, 10, '🏗️ INAUGURAR', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '8px',
        fontStyle: 'bold',
        color: '#fef08a',
      })
      .setOrigin(0.5);
    c.add(textoArea);
  }

  private montarBilheteria(
    c: Phaser.GameObjects.Container,
    nome: string,
    corAcento: number,
    texturaIcone: string
  ) {
    // Sombra no solo
    c.add(this.cena.add.ellipse(0, 26, 86, 26, 0x000000, 0.28));

    // Base / Calçada de pedra
    c.add(this.cena.add.rectangle(0, 20, 80, 16, 0x64748b).setStrokeStyle(1.5, 0x334155));

    // Cabine de alvenaria
    c.add(this.cena.add.rectangle(-8, 4, 52, 28, 0x9a3412).setStrokeStyle(1.5, 0x431407));

    // Balcão de atendimento com guichê de vidro
    c.add(this.cena.add.rectangle(-8, 5, 26, 12, 0x38bdf8, 0.75).setStrokeStyle(1.5, 0x0369a1));
    c.add(this.cena.add.rectangle(-8, 12, 34, 4, 0x78350f));

    // Catraca giratória ao lado direito da cabine
    const suporteCatraca = this.cena.add.rectangle(26, 14, 6, 16, 0x94a3b8).setStrokeStyle(1, 0x475569);
    const bracoCatraca = this.cena.add.rectangle(26, 8, 16, 3, 0xe2e8f0);
    c.add([suporteCatraca, bracoCatraca]);

    // Telhado colonial inclinado
    const telhado = this.cena.add.polygon(
      -8,
      -14,
      [
        [-34, 10],
        [34, 10],
        [24, -8],
        [-24, -8],
      ],
      0xb91c1c
    );
    telhado.setStrokeStyle(1.5, 0x7f1d1d);
    c.add(telhado);

    // Brasão circular com arte oficial
    this.adicionarBrasaoFachada(c, -8, -16, texturaIcone, corAcento);

    // Letreiro do edifício
    this.adicionarPlacaNome(c, 0, 36, '🎫 Bilheteria', corAcento);
  }

  private montarLanchonete(
    c: Phaser.GameObjects.Container,
    nome: string,
    corAcento: number,
    texturaIcone: string
  ) {
    // Sombra no solo
    c.add(this.cena.add.ellipse(0, 26, 84, 24, 0x000000, 0.28));

    // Pátio de madeira
    c.add(this.cena.add.rectangle(0, 20, 78, 16, 0x78350f).setStrokeStyle(1.5, 0x451a03));

    // Balcão do quiosque
    c.add(this.cena.add.rectangle(0, 8, 62, 22, 0x92400e).setStrokeStyle(1.5, 0x78350f));
    c.add(this.cena.add.rectangle(0, 1, 56, 6, 0xd97706));

    // Toldo listrado retrô
    const toldoFundo = this.cena.add.rectangle(0, -10, 68, 16, 0xf97316).setStrokeStyle(1.5, 0xc2410c);
    c.add(toldoFundo);

    // Listras do toldo
    for (let i = -2; i <= 2; i++) {
      if (i % 2 === 0) {
        c.add(this.cena.add.rectangle(i * 12, -10, 7, 16, 0xffffff, 0.9));
      }
    }

    // Copinhos / lanches sobre o balcão
    c.add(this.cena.add.rectangle(-14, 0, 4, 6, 0xef4444));
    c.add(this.cena.add.rectangle(-6, 0, 5, 5, 0xfacc15));
    c.add(this.cena.add.rectangle(12, -1, 7, 9, 0x0284c7)); // freezer pequeno

    // Brasão circular com arte oficial
    this.adicionarBrasaoFachada(c, 0, -22, texturaIcone, corAcento);

    // Letreiro
    this.adicionarPlacaNome(c, 0, 36, '🍔 Lanches', corAcento);
  }

  private montarArquibancada(
    c: Phaser.GameObjects.Container,
    nome: string,
    corAcento: number,
    texturaIcone: string
  ) {
    // Sombra no solo
    c.add(this.cena.add.ellipse(0, 28, 92, 26, 0x000000, 0.28));

    // 3 degraus de concreto da arquibancada
    const degrau1 = this.cena.add.rectangle(0, 20, 84, 14, 0x64748b).setStrokeStyle(1.5, 0x334155);
    const degrau2 = this.cena.add.rectangle(0, 8, 76, 14, 0x475569).setStrokeStyle(1.5, 0x1e293b);
    const degrau3 = this.cena.add.rectangle(0, -4, 68, 14, 0x334155).setStrokeStyle(1.5, 0x0f172a);
    c.add([degrau1, degrau2, degrau3]);

    // Fileira de torcedores sentados comemorando
    const coresTorcida = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];
    for (let i = -2; i <= 2; i++) {
      const xT = i * 14;
      const cabecaT = this.cena.add.circle(xT, -10, 4, 0xfde047);
      const corpoT = this.cena.add.rectangle(xT, -4, 8, 7, coresTorcida[(i + 4) % coresTorcida.length]);
      c.add([corpoT, cabecaT]);
    }

    // Mastro com bandeirão do time tremulando
    const mastro = this.cena.add.rectangle(34, -12, 2.5, 34, 0xe2e8f0);
    const bandeira = this.cena.add.rectangle(43, -22, 16, 10, corAcento).setStrokeStyle(1, 0xffffff);
    c.add([mastro, bandeira]);

    // Brasão circular com arte oficial
    this.adicionarBrasaoFachada(c, -16, -22, texturaIcone, corAcento);

    // Letreiro
    this.adicionarPlacaNome(c, 0, 36, '🏟️ Torcida', corAcento);
  }

  private montarAcademiaCT(
    c: Phaser.GameObjects.Container,
    nome: string,
    corAcento: number,
    texturaIcone: string
  ) {
    // Sombra no solo
    c.add(this.cena.add.ellipse(0, 28, 88, 24, 0x000000, 0.28));

    // Calçada de concreto
    c.add(this.cena.add.rectangle(0, 20, 80, 16, 0x475569).setStrokeStyle(1.5, 0x334155));

    // Galpão de treino esportivo
    c.add(this.cena.add.rectangle(0, 4, 68, 28, 0x1e293b).setStrokeStyle(1.5, 0x0f172a));

    // Janelas panorâmicas com reflexo
    c.add(this.cena.add.rectangle(-16, 4, 22, 14, 0x38bdf8, 0.65).setStrokeStyle(1, 0x0284c7));
    c.add(this.cena.add.rectangle(16, 4, 22, 14, 0x38bdf8, 0.65).setStrokeStyle(1, 0x0284c7));

    // Telhado metálico em arco
    c.add(this.cena.add.rectangle(0, -12, 74, 8, 0x15803d).setStrokeStyle(1.5, 0x166534));

    // Cones de treino na calçada
    c.add(this.cena.add.triangle(-28, 22, -3, 6, 3, 6, 0, -6, 0xf97316));
    c.add(this.cena.add.triangle(-20, 22, -3, 6, 3, 6, 0, -6, 0xfacc15));

    // Brasão circular com arte oficial
    this.adicionarBrasaoFachada(c, 0, -22, texturaIcone, corAcento);

    // Letreiro
    this.adicionarPlacaNome(c, 0, 36, '⚡ Centro de Treino', corAcento);
  }

  private montarAlojamentoBase(
    c: Phaser.GameObjects.Container,
    nome: string,
    corAcento: number,
    texturaIcone: string
  ) {
    // Sombra no solo
    c.add(this.cena.add.ellipse(0, 28, 86, 26, 0x000000, 0.28));

    // Jardim / Base de concreto
    c.add(this.cena.add.rectangle(0, 20, 78, 16, 0x334155).setStrokeStyle(1.5, 0x1e293b));

    // Casa de concentração
    c.add(this.cena.add.rectangle(0, 4, 62, 26, 0x1d4ed8).setStrokeStyle(1.5, 0x1e3a8a));

    // Porta e janela
    c.add(this.cena.add.rectangle(-14, 8, 12, 18, 0x78350f).setStrokeStyle(1, 0x451a03));
    c.add(this.cena.add.rectangle(12, 4, 16, 12, 0x93c5fd, 0.7).setStrokeStyle(1, 0x1e40af));

    // Telhado de duas águas
    const telhado = this.cena.add.triangle(0, -12, -38, 12, 38, 12, 0, -14, 0x1e3a8a);
    telhado.setStrokeStyle(1.5, 0x0f172a);
    c.add(telhado);

    // Brasão circular com arte oficial
    this.adicionarBrasaoFachada(c, 0, -20, texturaIcone, corAcento);

    // Letreiro
    this.adicionarPlacaNome(c, 0, 36, '🌟 Alojamento Base', corAcento);
  }

  private montarComissaoTecnica(
    c: Phaser.GameObjects.Container,
    nome: string,
    corAcento: number,
    texturaIcone: string
  ) {
    // Sombra no solo
    c.add(this.cena.add.ellipse(0, 28, 86, 26, 0x000000, 0.28));

    // Calçada
    c.add(this.cena.add.rectangle(0, 20, 78, 16, 0x475569).setStrokeStyle(1.5, 0x334155));

    // Edifício administrativo
    c.add(this.cena.add.rectangle(0, 4, 64, 26, 0x6b21a8).setStrokeStyle(1.5, 0x581c87));

    // Vidraça da sala de diretoria
    c.add(this.cena.add.rectangle(0, 4, 46, 14, 0xc084fc, 0.6).setStrokeStyle(1, 0x7e22ce));

    // Platibanda / Telhado reto
    c.add(this.cena.add.rectangle(0, -11, 68, 6, 0x3b0764).setStrokeStyle(1.5, 0x1e1b4b));

    // Prancheta tática estilizada do lado
    c.add(this.cena.add.rectangle(24, 6, 8, 12, 0xfef08a).setStrokeStyle(1, 0x78350f));

    // Brasão circular com arte oficial
    this.adicionarBrasaoFachada(c, 0, -20, texturaIcone, corAcento);

    // Letreiro
    this.adicionarPlacaNome(c, 0, 36, '📋 Comissão Técnica', corAcento);
  }

  private montarMarketing(
    c: Phaser.GameObjects.Container,
    nome: string,
    corAcento: number,
    texturaIcone: string
  ) {
    // Sombra no solo
    c.add(this.cena.add.ellipse(0, 28, 86, 26, 0x000000, 0.28));

    // Calçada de concreto tecnológico
    c.add(this.cena.add.rectangle(0, 20, 78, 16, 0x334155).setStrokeStyle(1.5, 0x0f172a));

    // Coluna de sustentação do telão
    c.add(this.cena.add.rectangle(0, 10, 14, 18, 0x475569).setStrokeStyle(1, 0x1e293b));

    // Painel Digital de LED Publicitário
    const painelLed = this.cena.add.rectangle(0, -6, 68, 28, 0x0284c7).setStrokeStyle(2, 0x38bdf8);
    c.add(painelLed);

    // Faixas de display de publicidade LED simuladas
    c.add(this.cena.add.rectangle(0, -9, 58, 6, 0xfacc15, 0.85));
    c.add(this.cena.add.rectangle(0, -1, 58, 4, 0xffffff, 0.7));

    // Megafone dourado no topo
    c.add(this.cena.add.circle(24, -18, 5, 0xf59e0b).setStrokeStyle(1, 0xd97706));

    // Brasão circular com arte oficial
    this.adicionarBrasaoFachada(c, -20, -18, texturaIcone, corAcento);

    // Letreiro
    this.adicionarPlacaNome(c, 0, 36, '📢 Marketing & Sponsors', corAcento);
  }

  private adicionarBrasaoFachada(
    c: Phaser.GameObjects.Container,
    x: number,
    y: number,
    textura: string,
    corAcento: number
  ) {
    const raio = 16;

    // Fundo do medalhão
    c.add(this.cena.add.circle(x, y, raio + 3, 0xffffff, 0.95));

    // Imagem do ícone
    const chave = this.cena.textures.exists(`${textura}-circular`) ? `${textura}-circular` : textura;
    const img = this.cena.add.image(x, y, chave);
    img.setDisplaySize(raio * 2 - 2, raio * 2 - 2);
    c.add(img);

    // Aro do medalhão
    c.add(this.cena.add.circle(x, y, raio + 3, 0xffffff, 0).setStrokeStyle(3, corAcento, 0.95));
  }

  private adicionarPlacaNome(..._args: unknown[]) {
    // Placas de nome e nível integradas de forma limpa nos Arcade Badges no BaseScene
  }

  private adicionarEvolucaoNivel(
    c: Phaser.GameObjects.Container,
    id: BuildingId,
    corAcento: number,
    nivel: number
  ) {
    if (nivel <= 0) return;

    // Nível 3+: Estrelas de prestígio sobre a construção
    if (nivel >= 3) {
      const numEstrelas = Math.min(5, Math.floor(nivel / 3));
      const estrelasStr = '⭐'.repeat(numEstrelas);
      const badgeEstrelas = this.cena.add
        .text(0, -38, estrelasStr, { fontSize: '10px' })
        .setOrigin(0.5);
      c.add(badgeEstrelas);
    }

    // Nível 5+: Banners e refletores laterais
    if (nivel >= 5) {
      const bandeiraEsq = this.cena.add
        .rectangle(-38, -12, 10, 6, corAcento)
        .setStrokeStyle(1, 0xffffff);
      const mastroEsq = this.cena.add.rectangle(-43, -6, 2, 22, 0x94a3b8);
      const bandeiraDir = this.cena.add
        .rectangle(38, -12, 10, 6, corAcento)
        .setStrokeStyle(1, 0xffffff);
      const mastroDir = this.cena.add.rectangle(43, -6, 2, 22, 0x94a3b8);
      c.add([mastroEsq, bandeiraEsq, mastroDir, bandeiraDir]);
    }

    // Nível 10+: Coroa dourada de elite e iluminação brilhante
    if (nivel >= 10) {
      const coroa = this.cena.add
        .text(0, -48, '👑 ELITE', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#facc15',
          stroke: '#0f172a',
          strokeThickness: 2,
        })
        .setOrigin(0.5);

      const halo = this.cena.add
        .ellipse(0, 24, 90, 24, 0xfacc15, 0.25)
        .setStrokeStyle(2, 0xfef08a, 0.8);

      c.add([halo, coroa]);
    }
  }
}
