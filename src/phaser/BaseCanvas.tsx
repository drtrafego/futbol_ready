'use client';

import Phaser from 'phaser';
import React, { useEffect, useRef } from 'react';
import { BaseScene } from './BaseScene';

const LARGURA_JOGO = 380;
const ALTURA_JOGO = 620;

export const BaseCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const jogoRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || jogoRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: LARGURA_JOGO,
      height: ALTURA_JOGO,
      transparent: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [BaseScene],
    };

    jogoRef.current = new Phaser.Game(config);

    return () => {
      jogoRef.current?.destroy(true);
      jogoRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
};
