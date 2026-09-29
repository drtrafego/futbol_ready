import Phaser from 'phaser';
import { PilhaMoedas } from './PilhaMoedas';

interface Ponto {
  x: number;
  y: number;
}

export interface ConfigFluxo {
  pontoEntradaRua: Ponto;
  pontoBilheteria: Ponto;
  pontoPosCatraca: Ponto;
  pontoLanchonete: Ponto;
  pontoArquibancada: Ponto;
  pontoSaida: Ponto;
  pilhaBilheteria?: PilhaMoedas;
  pilhaLanchonete?: PilhaMoedas;
  valorIngresso: number;
  valorLanche: number;
}

interface TorcedorEmCena {
  container: Phaser.GameObjects.Container;
  pernaEsq: Phaser.GameObjects.Rectangle;
  pernaDir: Phaser.GameObjects.Rectangle;
  tweenCaminhada?: Phaser.Tweens.Tween;
  tweenPernas?: Phaser.Tweens.Tween;
}

export class FluxoTorcedores {
  private cena: Phaser.Scene;
  private config: ConfigFluxo;
  private torcedores: TorcedorEmCena[] = [];
  private timerSpawn?: Phaser.Time.TimerEvent;
  private maxTorcedores = 6;
  private ativo = true;

  constructor(cena: Phaser.Scene, config: ConfigFluxo) {
    this.cena = cena;
    this.config = config;

    // Dispara torcedores periodicamente
    this.timerSpawn = cena.time.addEvent({
      delay: 3500,
      loop: true,
      callback: () => this.spawnTorcedor(),
    });

    // Spawna os 2 primeiros torcedores logo no início
    cena.time.delayedCall(800, () => this.spawnTorcedor());
    cena.time.delayedCall(2200, () => this.spawnTorcedor());
  }

  public setValores(ingresso: number, lanche: number) {
    this.config.valorIngresso = ingresso;
    this.config.valorLanche = lanche;
  }

  public setPilhas(bilheteria: PilhaMoedas, lanchonete: PilhaMoedas) {
    this.config.pilhaBilheteria = bilheteria;
    this.config.pilhaLanchonete = lanchonete;
  }

  private spawnTorcedor() {
    if (!this.ativo || this.torcedores.length >= this.maxTorcedores) return;

    const { x, y } = this.config.pontoEntradaRua;
    const xInicio = x + Phaser.Math.Between(-20, 20);

    const container = this.cena.add.container(xInicio, y);
    container.setDepth(20);

    // Cores variadas para os torcedores
    const coresCamisa = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0x06b6d4];
    const corCamisa = Phaser.Utils.Array.GetRandom(coresCamisa);

    // Sombra
    const sombra = this.cena.add.ellipse(0, 10, 10, 4, 0x000000, 0.3);

    // Pernas
    const pernaEsq = this.cena.add.rectangle(-2.5, 5, 2.5, 6, 0x0f172a);
    const pernaDir = this.cena.add.rectangle(2.5, 5, 2.5, 6, 0x0f172a);

    // Tronco
    const tronco = this.cena.add.rectangle(0, -2, 8, 8, corCamisa).setStrokeStyle(1, 0x0f172a, 0.4);

    // Cabeça
    const cabeca = this.cena.add.circle(0, -9, 4, 0xfde047);

    // Boné
    const bone = this.cena.add.rectangle(0, -12, 7, 2.5, corCamisa);

    container.add([sombra, pernaEsq, pernaDir, tronco, cabeca, bone]);

    const torcedor: TorcedorEmCena = {
      container,
      pernaEsq,
      pernaDir,
    };
    this.torcedores.push(torcedor);

    // Inicia rota: Entrada -> Bilheteria
    this.iniciarAnimacaoPernas(torcedor);
    this.andarAte(
      torcedor,
      this.config.pontoBilheteria.x + Phaser.Math.Between(-6, 6),
      this.config.pontoBilheteria.y + 12,
      1200,
      () => this.aoChegarBilheteria(torcedor)
    );
  }

  private aoChegarBilheteria(torcedor: TorcedorEmCena) {
    if (!this.ativo) return;
    this.pararAnimacaoPernas(torcedor);

    // Torcedor compra o ingresso (espera 600ms)
    this.cena.time.delayedCall(600, () => {
      if (!this.ativo || !torcedor.container.active) return;

      // Adiciona moedas na pilha da bilheteria
      if (this.config.pilhaBilheteria && this.config.valorIngresso > 0) {
        this.config.pilhaBilheteria.adicionarValor(this.config.valorIngresso);
      }

      // Passa pela catraca e segue para dentro do complexo
      this.iniciarAnimacaoPernas(torcedor);
      this.andarAte(
        torcedor,
        this.config.pontoPosCatraca.x,
        this.config.pontoPosCatraca.y,
        700,
        () => this.decidirProximoDestino(torcedor)
      );
    });
  }

  private decidirProximoDestino(torcedor: TorcedorEmCena) {
    if (!this.ativo) return;

    // 50% passam na lanchonete, 50% vão direto para a arquibancada
    const vaiParaLanchonete = Math.random() < 0.5;

    if (vaiParaLanchonete) {
      this.andarAte(
        torcedor,
        this.config.pontoLanchonete.x + Phaser.Math.Between(-10, 10),
        this.config.pontoLanchonete.y + 14,
        1400,
        () => this.aoChegarLanchonete(torcedor)
      );
    } else {
      this.andarAte(
        torcedor,
        this.config.pontoArquibancada.x + Phaser.Math.Between(-16, 16),
        this.config.pontoArquibancada.y + Phaser.Math.Between(-4, 8),
        1600,
        () => this.aoChegarArquibancada(torcedor)
      );
    }
  }

  private aoChegarLanchonete(torcedor: TorcedorEmCena) {
    if (!this.ativo) return;
    this.pararAnimacaoPernas(torcedor);

    // Torcedor compra lanche
    this.cena.time.delayedCall(700, () => {
      if (!this.ativo || !torcedor.container.active) return;

      if (this.config.pilhaLanchonete && this.config.valorLanche > 0) {
        this.config.pilhaLanchonete.adicionarValor(this.config.valorLanche);
      }

      // Segue para a arquibancada após o lanche
      this.iniciarAnimacaoPernas(torcedor);
      this.andarAte(
        torcedor,
        this.config.pontoArquibancada.x + Phaser.Math.Between(-16, 16),
        this.config.pontoArquibancada.y + Phaser.Math.Between(-4, 8),
        1400,
        () => this.aoChegarArquibancada(torcedor)
      );
    });
  }

  private aoChegarArquibancada(torcedor: TorcedorEmCena) {
    if (!this.ativo) return;
    this.pararAnimacaoPernas(torcedor);

    // Torcedor assiste ao treino e pula comemorando
    const tweenPulo = this.cena.tweens.add({
      targets: torcedor.container,
      y: torcedor.container.y - 4,
      duration: 220,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.easeInOut',
    });

    // Fica na arquibancada por 6 a 9 segundos, depois sai
    this.cena.time.delayedCall(Phaser.Math.Between(6000, 9000), () => {
      if (!this.ativo || !torcedor.container.active) return;
      tweenPulo.stop();

      // Anda para a saída
      this.iniciarAnimacaoPernas(torcedor);
      this.andarAte(
        torcedor,
        this.config.pontoSaida.x,
        this.config.pontoSaida.y,
        1800,
        () => this.removerTorcedor(torcedor)
      );
    });
  }

  private andarAte(
    torcedor: TorcedorEmCena,
    destX: number,
    destY: number,
    duracao: number,
    onComplete: () => void
  ) {
    torcedor.tweenCaminhada?.stop();
    torcedor.tweenCaminhada = this.cena.tweens.add({
      targets: torcedor.container,
      x: destX,
      y: destY,
      duration: duracao,
      ease: 'Linear',
      onComplete,
    });
  }

  private iniciarAnimacaoPernas(torcedor: TorcedorEmCena) {
    this.pararAnimacaoPernas(torcedor);
    torcedor.tweenPernas = this.cena.tweens.add({
      targets: torcedor.pernaEsq,
      angle: { from: -20, to: 20 },
      duration: 160,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private pararAnimacaoPernas(torcedor: TorcedorEmCena) {
    torcedor.tweenPernas?.stop();
    torcedor.tweenPernas = undefined;
    torcedor.pernaEsq.setAngle(0);
    torcedor.pernaDir.setAngle(0);
  }

  private removerTorcedor(torcedor: TorcedorEmCena) {
    torcedor.tweenCaminhada?.stop();
    this.pararAnimacaoPernas(torcedor);
    torcedor.container.destroy();
    this.torcedores = this.torcedores.filter((t) => t !== torcedor);
  }

  public destroy() {
    this.ativo = false;
    this.timerSpawn?.destroy();
    this.torcedores.forEach((t) => {
      t.tweenCaminhada?.stop();
      t.tweenPernas?.stop();
      t.container.destroy();
    });
    this.torcedores = [];
  }
}
