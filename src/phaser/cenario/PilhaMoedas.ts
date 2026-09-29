import Phaser from 'phaser';
import { sons } from '../../lib/audio';

export class PilhaMoedas {
  private cena: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private moedasVisual: Phaser.GameObjects.Ellipse[] = [];
  private valorAcumulado: number = 0;
  private x: number;
  private y: number;
  private aoColetar: (valor: number) => void;
  private textoValor?: Phaser.GameObjects.Text;

  constructor(
    cena: Phaser.Scene,
    x: number,
    y: number,
    aoColetar: (valor: number) => void
  ) {
    this.cena = cena;
    this.x = x;
    this.y = y;
    this.aoColetar = aoColetar;

    this.container = cena.add.container(x, y);
    this.container.setDepth(25);

    // Sombra da pilha no chão
    const sombra = cena.add.ellipse(0, 4, 22, 10, 0x000000, 0.3);
    this.container.add(sombra);

    // Texto de valor acima da pilha
    this.textoValor = cena.add
      .text(0, -22, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#0f172a',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.container.add(this.textoValor);

    // Área interativa para toque e coleta
    this.container.setSize(32, 32);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-16, -20, 32, 32),
      Phaser.Geom.Rectangle.Contains
    );
    this.container.on('pointerdown', () => this.coletar());
  }

  public adicionarValor(valor: number) {
    if (valor <= 0) return;
    this.valorAcumulado += valor;

    // Atualiza a quantidade visual de moedas empilhadas (máx 6)
    const totalMoedas = Math.min(6, Math.max(1, Math.floor(Math.log10(this.valorAcumulado + 1) * 2)));

    while (this.moedasVisual.length < totalMoedas) {
      const indice = this.moedasVisual.length;
      const offsetH = -indice * 3.5;

      // Base da moeda (borda dourada escura)
      const baseMoeda = this.cena.add
        .ellipse(0, offsetH + 1, 16, 7, 0xb45309)
        .setStrokeStyle(1, 0x78350f);

      // Topo brilhante da moeda
      const topoMoeda = this.cena.add
        .ellipse(0, offsetH, 15, 6, 0xfacc15)
        .setStrokeStyle(1, 0xfef08a);

      this.container.add([baseMoeda, topoMoeda]);
      this.moedasVisual.push(topoMoeda);

      // Leve animação de queda da moeda no topo da pilha
      topoMoeda.setScale(0);
      baseMoeda.setScale(0);
      this.cena.tweens.add({
        targets: [topoMoeda, baseMoeda],
        scaleX: 1,
        scaleY: 1,
        duration: 140,
        ease: 'Back.easeOut',
      });
    }

    if (this.textoValor) {
      this.textoValor.setText(`R$ ${Math.floor(this.valorAcumulado)}`);
      this.textoValor.setVisible(true);
      this.textoValor.setY(-this.moedasVisual.length * 3.5 - 12);
    }
  }

  public coletar() {
    if (this.valorAcumulado <= 0) return;

    sons.tocarMoeda();
    const valorParaEntregar = this.valorAcumulado;
    this.valorAcumulado = 0;

    // Dispara partículas de moedas voando para cima
    for (let i = 0; i < Math.min(8, this.moedasVisual.length + 2); i++) {
      const moedaParticula = this.cena.add
        .ellipse(this.x, this.y - i * 3, 14, 6, 0xfde047)
        .setStrokeStyle(1, 0xf59e0b)
        .setDepth(95);

      const angulo = Phaser.Math.Between(-70, 70);
      const dist = Phaser.Math.Between(25, 45);
      const rad = Phaser.Math.DegToRad(angulo - 90);

      this.cena.tweens.add({
        targets: moedaParticula,
        x: this.x + Math.cos(rad) * dist,
        y: this.y + Math.sin(rad) * dist - 25,
        alpha: 0,
        scale: 0.6,
        duration: 480,
        ease: 'Cubic.easeOut',
        onComplete: () => moedaParticula.destroy(),
      });
    }

    // Texto flutuante de coleta
    const textoFlutuante = this.cena.add
      .text(this.x, this.y - 25, `+R$ ${valorParaEntregar.toFixed(2).replace('.', ',')}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#facc15',
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(100);

    this.cena.tweens.add({
      targets: textoFlutuante,
      y: this.y - 55,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => textoFlutuante.destroy(),
    });

    // Limpa a pilha visual com animação
    this.moedasVisual.forEach((moeda) => moeda.destroy());
    this.moedasVisual = [];
    if (this.textoValor) this.textoValor.setVisible(false);

    // Entrega o valor coletado ao callback
    this.aoColetar(valorParaEntregar);
  }

  public getValor(): number {
    return this.valorAcumulado;
  }

  public destroy() {
    this.container.destroy();
  }
}
