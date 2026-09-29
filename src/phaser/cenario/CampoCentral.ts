import Phaser from 'phaser';
import { sons } from '../../lib/audio';

export interface ConfigCampo {
  x: number;
  y: number;
  largura: number;
  altura: number;
  corUniforme: number;
  onToqueTreino: () => void;
}

export class CampoCentral {
  private cena: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private config: ConfigCampo;
  private bola: Phaser.GameObjects.Arc;
  private jogadorA: Phaser.GameObjects.Container;
  private jogadorB: Phaser.GameObjects.Container;
  private goleiro: Phaser.GameObjects.Container;
  private timerJogo?: Phaser.Time.TimerEvent;
  private posseBola: 'A' | 'B' = 'A';
  private chutando = false;

  constructor(cena: Phaser.Scene, config: ConfigCampo) {
    this.cena = cena;
    this.config = config;

    this.container = cena.add.container(config.x, config.y);
    this.container.setDepth(15);

    this.desenharGramado();
    this.desenharLinhas();
    this.desenharTraves();

    // Cria os jogadores de linha e o goleiro
    this.jogadorA = this.criarJogador(-config.largura * 0.22, 10, config.corUniforme, false);
    this.jogadorB = this.criarJogador(config.largura * 0.16, -14, config.corUniforme, false);
    this.goleiro = this.criarJogador(config.largura * 0.44, 0, 0xf59e0b, true);

    this.container.add([this.jogadorA, this.jogadorB, this.goleiro]);

    // Bola de futebol
    this.bola = cena.add
      .circle(this.jogadorA.x + 8, this.jogadorA.y + 10, 4, 0xffffff)
      .setStrokeStyle(1.5, 0x0f172a);
    this.container.add(this.bola);

    // Área interativa do campo para treino tátil
    this.container.setSize(config.largura, config.altura);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-config.largura / 2, -config.altura / 2, config.largura, config.altura),
      Phaser.Geom.Rectangle.Contains
    );
    this.container.on('pointerdown', () => this.aoTocarCampo());

    this.iniciarCicloPasses();
  }

  private desenharGramado() {
    const { largura, altura } = this.config;

    // Sombra do campo sobre o terreno
    const sombra = this.cena.add
      .rectangle(2, 4, largura + 10, altura + 8, 0x000000, 0.22)
      .setOrigin(0.5);
    this.container.add(sombra);

    // Base do campo de futebol
    const baseCampo = this.cena.add
      .rectangle(0, 0, largura, altura, 0x15803d)
      .setStrokeStyle(3, 0x166534)
      .setOrigin(0.5);
    this.container.add(baseCampo);

    // Faixas de corte da grama (estilo estádio profissional)
    const numFaixas = 6;
    const larguraFaixa = largura / numFaixas;
    for (let i = 0; i < numFaixas; i++) {
      if (i % 2 === 1) {
        const xFaixa = -largura / 2 + i * larguraFaixa + larguraFaixa / 2;
        const faixa = this.cena.add
          .rectangle(xFaixa, 0, larguraFaixa, altura, 0x16a34a, 0.42)
          .setOrigin(0.5);
        this.container.add(faixa);
      }
    }
  }

  private desenharLinhas() {
    const { largura, altura } = this.config;
    const corLinha = 0xffffff;
    const alphaLinha = 0.88;

    const margemX = 12;
    const margemY = 10;
    const campoW = largura - margemX * 2;
    const campoH = altura - margemY * 2;

    // Linhas perimetrais
    const perimetro = this.cena.add
      .rectangle(0, 0, campoW, campoH)
      .setStrokeStyle(1.8, corLinha, alphaLinha);

    // Linha do meio campo
    const linhaMeio = this.cena.add
      .line(0, 0, 0, -campoH / 2, 0, campoH / 2, corLinha, alphaLinha)
      .setLineWidth(1.8);

    // Círculo central
    const circuloCentral = this.cena.add
      .circle(0, 0, 22)
      .setStrokeStyle(1.8, corLinha, alphaLinha);

    const pontoCentral = this.cena.add.circle(0, 0, 2.5, corLinha, alphaLinha);

    // Áreas penais esquerda e direita
    const areaW = 28;
    const areaH = 46;
    const areaEsq = this.cena.add
      .rectangle(-campoW / 2 + areaW / 2, 0, areaW, areaH)
      .setStrokeStyle(1.6, corLinha, alphaLinha);

    const areaDir = this.cena.add
      .rectangle(campoW / 2 - areaW / 2, 0, areaW, areaH)
      .setStrokeStyle(1.6, corLinha, alphaLinha);

    this.container.add([perimetro, linhaMeio, circuloCentral, pontoCentral, areaEsq, areaDir]);
  }

  private desenharTraves() {
    const { largura } = this.config;
    const altTrave = 30;
    const xEsq = -largura / 2 + 7;
    const xDir = largura / 2 - 7;

    // Trave Esquerda
    const posteEsqSup = this.cena.add.rectangle(xEsq, -altTrave / 2, 3, 3, 0xffffff);
    const posteEsqInf = this.cena.add.rectangle(xEsq, altTrave / 2, 3, 3, 0xffffff);
    const redeEsq = this.cena.add.rectangle(xEsq - 5, 0, 8, altTrave, 0xffffff, 0.28).setStrokeStyle(1, 0xffffff, 0.7);

    // Trave Direita
    const posteDirSup = this.cena.add.rectangle(xDir, -altTrave / 2, 3, 3, 0xffffff);
    const posteDirInf = this.cena.add.rectangle(xDir, altTrave / 2, 3, 3, 0xffffff);
    const redeDir = this.cena.add.rectangle(xDir + 5, 0, 8, altTrave, 0xffffff, 0.28).setStrokeStyle(1, 0xffffff, 0.7);

    this.container.add([posteEsqSup, posteEsqInf, redeEsq, posteDirSup, posteDirInf, redeDir]);
  }

  private criarJogador(x: number, y: number, corCamisa: number, isGoleiro: boolean): Phaser.GameObjects.Container {
    const container = this.cena.add.container(x, y);

    // Sombra do jogador
    const sombra = this.cena.add.ellipse(0, 14, 12, 5, 0x000000, 0.35);

    // Chuteiras / Pernas
    const pernaEsq = this.cena.add.rectangle(-3, 8, 3, 7, 0x0f172a);
    const pernaDir = this.cena.add.rectangle(3, 8, 3, 7, 0x0f172a);

    // Calção
    const calcao = this.cena.add.rectangle(0, 3, 10, 5, isGoleiro ? 0x1e293b : 0xffffff);

    // Tronco / Camisa do time
    const tronco = this.cena.add
      .rectangle(0, -4, 11, 10, corCamisa)
      .setStrokeStyle(1, 0x0f172a, 0.4);

    // Cabeça
    const cabeca = this.cena.add.circle(0, -12, 5, 0xffedd5).setStrokeStyle(1, 0x0f172a, 0.5);

    // Cabelo
    const cabelo = this.cena.add.rectangle(0, -15, 8, 3, 0x451a03);

    container.add([sombra, pernaEsq, pernaDir, calcao, tronco, cabeca, cabelo]);
    return container;
  }

  private iniciarCicloPasses() {
    this.timerJogo = this.cena.time.addEvent({
      delay: 2800,
      loop: true,
      callback: () => this.trocarPasse(),
    });
  }

  private trocarPasse() {
    if (this.chutando) return;

    const origem = this.posseBola === 'A' ? this.jogadorA : this.jogadorB;
    const destino = this.posseBola === 'A' ? this.jogadorB : this.jogadorA;
    this.posseBola = this.posseBola === 'A' ? 'B' : 'A';

    // Jogador da posse chuta a bola
    this.cena.tweens.add({
      targets: origem,
      y: origem.y - 3,
      duration: 120,
      yoyo: true,
    });

    // Bola rola até o parceiro
    this.cena.tweens.add({
      targets: this.bola,
      x: destino.x + (this.posseBola === 'A' ? 6 : -6),
      y: destino.y + 8,
      duration: 750,
      ease: 'Power1.easeOut',
      onComplete: () => {
        // Jogador receptor comemora / domina
        this.cena.tweens.add({
          targets: destino,
          scaleY: 1.1,
          duration: 90,
          yoyo: true,
        });
      },
    });
  }

  public aoTocarCampo() {
    if (this.chutando) return;
    this.chutando = true;

    // Dispara a ação de treino da base no store
    this.config.onToqueTreino();
    sons.tocarChute();

    const chuteur = this.posseBola === 'A' ? this.jogadorA : this.jogadorB;
    const xGol = this.config.largura * 0.44;
    const yGol = Phaser.Math.Between(-10, 10);

    // Jogador chuta forte a gol
    this.cena.tweens.add({
      targets: chuteur,
      x: chuteur.x + 8,
      duration: 110,
      yoyo: true,
    });

    // Trajetória rápida da bola para o gol
    this.cena.tweens.add({
      targets: this.bola,
      x: xGol,
      y: yGol,
      duration: 420,
      ease: 'Cubic.easeOut',
      onStart: () => {
        this.criarParticulasChute(chuteur.x, chuteur.y);
      },
      onComplete: () => {
        // Goleiro tenta defender
        this.cena.tweens.add({
          targets: this.goleiro,
          y: yGol,
          duration: 180,
          yoyo: true,
        });

        // Balanço da rede / gol
        sons.tocarGol();
        this.mostrarTextoGol(xGol, yGol - 22);

        // Retorna a bola para o campo após o chute
        this.cena.time.delayedCall(800, () => {
          this.bola.setPosition(this.jogadorA.x + 8, this.jogadorA.y + 10);
          this.posseBola = 'A';
          this.chutando = false;
        });
      },
    });
  }

  private criarParticulasChute(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const p = this.cena.add
        .circle(this.config.x + x, this.config.y + y + 8, 2.5, 0xfef08a)
        .setDepth(90);
      const ang = Phaser.Math.Between(-120, 0);
      const rad = Phaser.Math.DegToRad(ang);
      const dist = Phaser.Math.Between(12, 24);

      this.cena.tweens.add({
        targets: p,
        x: p.x + Math.cos(rad) * dist,
        y: p.y + Math.sin(rad) * dist,
        alpha: 0,
        scale: 0.4,
        duration: 320,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  private mostrarTextoGol(x: number, y: number) {
    const texto = this.cena.add
      .text(this.config.x + x, this.config.y + y, '⚽ CHUTE!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(95);

    this.cena.tweens.add({
      targets: texto,
      y: texto.y - 24,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => texto.destroy(),
    });
  }

  public destroy() {
    this.timerJogo?.destroy();
    this.container.destroy();
  }
}
