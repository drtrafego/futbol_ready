/**
 * Gerenciador de Áudio e Efeitos Sonoros com Web Audio API nativa.
 * 100% procedural: funciona offline, no Vercel, sem arquivos externos ou dependências pagas.
 */

class GerenciadorAudio {
  private ctx: AudioContext | null = null;
  private mudo: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const salvoMudo = localStorage.getItem('jb_audio_mudo');
      this.mudo = salvoMudo === 'true';
    }
  }

  private obterContexto(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMudo(): boolean {
    return this.mudo;
  }

  public alternarMudo(): boolean {
    this.mudo = !this.mudo;
    if (typeof window !== 'undefined') {
      localStorage.setItem('jb_audio_mudo', String(this.mudo));
    }
    return this.mudo;
  }

  public setMudo(valor: boolean): void {
    this.mudo = valor;
    if (typeof window !== 'undefined') {
      localStorage.setItem('jb_audio_mudo', String(valor));
    }
  }

  /**
   * Chute na bola (grave e impactante)
   */
  public tocarChute(): void {
    if (this.mudo) return;
    const ctx = this.obterContexto();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.18);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.2);
    } catch {
      // Ignora restrições do navegador
    }
  }

  /**
   * Gol comemorado (trombeta de estádio + comemoração)
   */
  public tocarGol(): void {
    if (this.mudo) return;
    const ctx = this.obterContexto();
    if (!ctx) return;

    try {
      const notas = [261.63, 329.63, 392.00, 523.25]; // Dó, Mi, Sol, Dó alto
      const t = ctx.currentTime;

      notas.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const inicio = t + idx * 0.14;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, inicio);

        gain.gain.setValueAtTime(0.28, inicio);
        gain.gain.exponentialRampToValueAtTime(0.001, inicio + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(inicio);
        osc.stop(inicio + 0.38);
      });

      // Efeito de buzina de estádio triunfante no final
      const oscFinal = ctx.createOscillator();
      const gainFinal = ctx.createGain();
      const tFinal = t + 0.58;

      oscFinal.type = 'square';
      oscFinal.frequency.setValueAtTime(523.25, tFinal); // Dó agudo prolongado
      gainFinal.gain.setValueAtTime(0.32, tFinal);
      gainFinal.gain.exponentialRampToValueAtTime(0.001, tFinal + 0.8);

      oscFinal.connect(gainFinal);
      gainFinal.connect(ctx.destination);

      oscFinal.start(tFinal);
      oscFinal.stop(tFinal + 0.85);
    } catch {
      // Silencioso se der erro
    }
  }

  /**
   * Apito do juiz (dois trinados agudos)
   */
  public tocarApito(): void {
    if (this.mudo) return;
    const ctx = this.obterContexto();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      [0, 0.18].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const inicio = t + delay;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(2600, inicio);
        osc.frequency.linearRampToValueAtTime(2900, inicio + 0.08);

        gain.gain.setValueAtTime(0.22, inicio);
        gain.gain.exponentialRampToValueAtTime(0.001, inicio + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(inicio);
        osc.stop(inicio + 0.14);
      });
    } catch {
      // Silencioso
    }
  }

  /**
   * Coleta de moedas (brilho metálico estilo arcade Pizza Ready)
   */
  public tocarMoeda(): void {
    if (this.mudo) return;
    const ctx = this.obterContexto();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, t); // Si
      osc.frequency.setValueAtTime(1318.51, t + 0.07); // Mi agudo

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.24);
    } catch {
      // Silencioso
    }
  }

  /**
   * Compra / Upgrade de instalação realizado com sucesso
   */
  public tocarCompra(): void {
    if (this.mudo) return;
    const ctx = this.obterContexto();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const notas = [523.25, 659.25, 783.99, 1046.50]; // Acorde Maior Dó, Mi, Sol, Dó
      notas.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const inicio = t + idx * 0.06;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, inicio);

        gain.gain.setValueAtTime(0.24, inicio);
        gain.gain.exponentialRampToValueAtTime(0.001, inicio + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(inicio);
        osc.stop(inicio + 0.25);
      });
    } catch {
      // Silencioso
    }
  }

  /**
   * Grito da torcida / Estádio vibrando
   */
  public tocarGritoTorcida(): void {
    if (this.mudo) return;
    const ctx = this.obterContexto();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      // Ruído branco filtrado simulando palmas e grito coletivo
      const duracao = 0.55;
      const bufferSize = ctx.sampleRate * duracao;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, t);
      filter.Q.setValueAtTime(1.2, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + duracao);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(t);
      noise.stop(t + duracao);
    } catch {
      // Silencioso
    }
  }

  /**
   * Toque de clique na interface
   */
  public tocarClique(): void {
    if (this.mudo) return;
    const ctx = this.obterContexto();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.05);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    } catch {
      // Silencioso
    }
  }
}

export const sons = new GerenciadorAudio();
