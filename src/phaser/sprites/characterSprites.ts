import Phaser from 'phaser';

/**
 * Paleta de cores para os personagens de pixel art
 */
const PALETA: Record<number, string> = {
  0: 'transparent',
  1: '#0f172a', // Contorno escuro
  2: '#ffe0b2', // Pele clara
  3: '#fbbf24', // Cabelo / Boné amarelo
  4: '#2563eb', // Camisa azul
  5: '#ffffff', // Branco (detalhes / meia)
  6: '#1e293b', // Calção escuro
  7: '#10b981', // Verde
  8: '#ef4444', // Vermelho (faixa / cachecol)
  9: '#f97316', // Laranja
};

/**
 * Matrizes de 16x20 pixels para o ciclo de caminhada de 4 quadros do Mascote/Treinador:
 * Quadro 0: Parado / Neutro
 * Quadro 1: Perna esquerda avançada, perna direita recuada
 * Quadro 2: Meio-passo / Contato (bobbing suave)
 * Quadro 3: Perna direita avançada, perna esquerda recuada
 */
const QUADROS_MASCOTE: number[][][] = [
  // Quadro 0: Neutro
  [
    [0, 0, 0, 0, 1, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 1, 2, 2, 1, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 2, 8, 8, 2, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0],
    [0, 0, 1, 2, 4, 5, 4, 4, 5, 4, 2, 1, 0, 0, 0, 0],
    [0, 0, 1, 2, 4, 4, 4, 4, 4, 4, 2, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 6, 6, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 6, 6, 1, 1, 6, 6, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 1, 1, 2, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 5, 5, 1, 1, 5, 5, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 5, 5, 1, 1, 5, 5, 1, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
  ],
  // Quadro 1: Perna esquerda à frente
  [
    [0, 0, 0, 0, 1, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 1, 2, 2, 1, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 2, 8, 8, 2, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0],
    [0, 1, 2, 1, 4, 5, 4, 4, 5, 4, 1, 0, 0, 0, 0, 0],
    [0, 1, 2, 1, 4, 4, 4, 4, 4, 4, 1, 2, 1, 0, 0, 0],
    [0, 0, 1, 1, 4, 4, 4, 4, 4, 4, 1, 2, 1, 0, 0, 0],
    [0, 0, 0, 1, 6, 6, 6, 6, 6, 6, 1, 1, 0, 0, 0, 0],
    [0, 0, 1, 6, 6, 1, 0, 1, 6, 6, 1, 0, 0, 0, 0, 0],
    [0, 1, 2, 2, 1, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0],
    [0, 1, 5, 5, 1, 0, 0, 0, 0, 1, 5, 5, 1, 0, 0, 0],
    [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Quadro 2: Meio-passo / Bob
  [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 1, 2, 2, 1, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 2, 8, 8, 2, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0],
    [0, 0, 1, 2, 4, 5, 4, 4, 5, 4, 2, 1, 0, 0, 0, 0],
    [0, 0, 1, 2, 4, 4, 4, 4, 4, 4, 2, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 6, 6, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 6, 6, 1, 1, 6, 6, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 1, 1, 2, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 5, 5, 1, 1, 5, 5, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Quadro 3: Perna direita à frente
  [
    [0, 0, 0, 0, 1, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 1, 2, 2, 1, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 2, 8, 8, 2, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 4, 4, 4, 4, 4, 4, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 4, 5, 4, 4, 5, 4, 1, 2, 1, 0, 0],
    [0, 0, 0, 1, 2, 1, 4, 4, 4, 4, 4, 4, 1, 2, 1, 0],
    [0, 0, 0, 1, 2, 1, 4, 4, 4, 4, 4, 4, 1, 1, 0, 0],
    [0, 0, 0, 0, 1, 1, 6, 6, 6, 6, 6, 6, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 6, 6, 1, 0, 1, 6, 6, 1, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 1, 2, 2, 1, 0, 0],
    [0, 0, 1, 5, 5, 1, 0, 0, 0, 0, 0, 1, 5, 5, 1, 0],
    [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
];

/**
 * Registra a textura do spritesheet de caminhada dinamicamente no TextureManager do Phaser.
 */
export function criarSpritesheetMascote(scene: Phaser.Scene, key: string, scale: number = 2): void {
  if (scene.textures.exists(key)) return;

  const h = QUADROS_MASCOTE[0].length;
  const w = QUADROS_MASCOTE[0][0].length;
  const frameW = w * scale;
  const frameH = h * scale;

  const canvas = document.createElement('canvas');
  canvas.width = frameW * QUADROS_MASCOTE.length;
  canvas.height = frameH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  QUADROS_MASCOTE.forEach((quadro, frameIndex) => {
    const offsetX = frameIndex * frameW;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const corId = quadro[y][x];
        if (corId === 0 || !PALETA[corId]) continue;
        ctx.fillStyle = PALETA[corId];
        ctx.fillRect(offsetX + x * scale, y * scale, scale, scale);
      }
    }
  });

  // Registra no TextureManager
  scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
    frameWidth: frameW,
    frameHeight: frameH,
  });

  // Cria a animação de caminhada no AnimationManager
  const animKey = `${key}_andar`;
  if (!scene.anims.exists(animKey)) {
    scene.anims.create({
      key: animKey,
      frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1,
    });
  }
}
