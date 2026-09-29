import React from 'react';
import { getPaleta } from '../config/paletas';
import { ConfigEscudo } from '../types/game';

interface EscudoSvgProps {
  escudo: ConfigEscudo;
  corId: string;
  sigla: string;
  tamanho?: number;
}

export const EscudoSvg: React.FC<EscudoSvgProps> = ({
  escudo,
  corId,
  sigla,
  tamanho = 80,
}) => {
  const paleta = getPaleta(corId);
  const corPrimaria = paleta.primaria;
  const corSecundaria = paleta.secundaria;

  // Renderiza símbolo SVG central
  const renderSimbolo = () => {
    switch (escudo.simbolo) {
      case 'bola':
        return (
          <g transform="translate(50, 50) scale(0.6)">
            <circle cx="0" cy="0" r="22" fill={corSecundaria} stroke={corPrimaria} strokeWidth="3" />
            <polygon points="0,-12 11,-4 7,10 -7,10 -11,-4" fill={corPrimaria} />
          </g>
        );
      case 'estrela':
        return (
          <polygon
            points="50,30 54,42 67,42 56,50 60,62 50,54 40,62 44,50 33,42 46,42"
            fill={corSecundaria}
            stroke={corPrimaria}
            strokeWidth="1.5"
          />
        );
      case 'raio':
        return (
          <polygon
            points="52,26 38,52 48,52 44,74 62,44 51,44"
            fill={corSecundaria}
            stroke={corPrimaria}
            strokeWidth="1.5"
          />
        );
      case 'coroa':
        return (
          <path
            d="M34 62 L32 40 L44 48 L50 34 L56 48 L68 40 L66 62 Z"
            fill={corSecundaria}
            stroke={corPrimaria}
            strokeWidth="2"
          />
        );
      case 'chama':
        return (
          <path
            d="M50 28 C60 40, 64 52, 58 64 C54 70, 46 70, 42 64 C36 56, 40 44, 46 38 C46 46, 52 46, 50 28 Z"
            fill={corSecundaria}
          />
        );
      case 'montanha':
        return (
          <g>
            <polygon points="50,30 68,66 32,66" fill={corSecundaria} />
            <polygon points="50,30 55,40 50,44 45,40" fill="#FFFFFF" />
          </g>
        );
      case 'ancora':
        return (
          <g fill="none" stroke={corSecundaria} strokeWidth="4" strokeLinecap="round">
            <line x1="50" y1="30" x2="50" y2="66" />
            <line x1="40" y1="40" x2="60" y2="40" />
            <path d="M34 54 C34 68, 66 68, 66 54" />
          </g>
        );
      case 'trofeu':
        return (
          <path
            d="M36 34 H64 V48 C64 56, 56 62, 50 62 C44 62, 36 56, 36 48 Z M50 62 V70 M40 70 H60"
            fill={corSecundaria}
            stroke={corPrimaria}
            strokeWidth="2"
          />
        );
      default:
        return null;
    }
  };

  // Caminho do formato de contorno
  const getCaminhoFormato = () => {
    switch (escudo.formato) {
      case 'redondo':
        return <circle cx="50" cy="50" r="45" fill={corPrimaria} stroke={corSecundaria} strokeWidth="5" />;
      case 'losango':
        return (
          <polygon
            points="50,5 92,50 50,95 8,50"
            fill={corPrimaria}
            stroke={corSecundaria}
            strokeWidth="5"
          />
        );
      case 'frances':
        return (
          <path
            d="M 12,12 H 88 V 56 C 88,78 50,94 50,94 C 50,94 12,78 12,56 Z"
            fill={corPrimaria}
            stroke={corSecundaria}
            strokeWidth="5"
          />
        );
      case 'moderno':
        return (
          <path
            d="M 15,10 H 85 L 92,55 C 92,80 50,96 50,96 C 50,96 8,80 8,55 Z"
            fill={corPrimaria}
            stroke={corSecundaria}
            strokeWidth="5"
          />
        );
      case 'classico':
      default:
        return (
          <path
            d="M 10,10 H 90 V 50 C 90,75 50,95 50,95 C 50,95 10,75 10,50 Z"
            fill={corPrimaria}
            stroke={corSecundaria}
            strokeWidth="5"
          />
        );
    }
  };

  // Padrão interno de preenchimento
  const renderPadrao = () => {
    switch (escudo.padrao) {
      case 'faixa':
        return (
          <polygon points="0,20 100,70 100,85 0,35" fill={corSecundaria} opacity="0.85" />
        );
      case 'listras':
        return (
          <g fill={corSecundaria} opacity="0.85">
            <rect x="25" y="0" width="12" height="100" />
            <rect x="63" y="0" width="12" height="100" />
          </g>
        );
      case 'bipartido':
        return <rect x="50" y="0" width="50" height="100" fill={corSecundaria} opacity="0.85" />;
      case 'xadrez':
        return (
          <g fill={corSecundaria} opacity="0.85">
            <rect x="0" y="0" width="50" height="50" />
            <rect x="50" y="50" width="50" height="50" />
          </g>
        );
      case 'liso':
      default:
        return null;
    }
  };

  const clipId = `escudo-clip-${escudo.formato}-${sigla}`;

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 100 100"
      className="drop-shadow-md transition-transform duration-300 hover:scale-105"
    >
      <defs>
        <clipPath id={clipId}>
          {escudo.formato === 'redondo' && <circle cx="50" cy="50" r="43" />}
          {escudo.formato === 'losango' && <polygon points="50,7 90,50 50,93 10,50" />}
          {escudo.formato === 'frances' && (
            <path d="M 14,14 H 86 V 55 C 86,76 50,91 50,91 C 50,91 14,76 14,55 Z" />
          )}
          {escudo.formato === 'moderno' && (
            <path d="M 17,12 H 83 L 89,54 C 89,77 50,93 50,93 C 50,93 11,77 11,54 Z" />
          )}
          {escudo.formato === 'classico' && (
            <path d="M 12,12 H 88 V 49 C 88,73 50,92 50,92 C 50,92 12,73 12,49 Z" />
          )}
        </clipPath>
      </defs>

      {/* Formato base */}
      {getCaminhoFormato()}

      {/* Padrão cortado pela forma do escudo */}
      <g clipPath={`url(#${clipId})`}>
        {renderPadrao()}
        {renderSimbolo()}
      </g>

      {/* Sigla do time embaixo */}
      <text
        x="50"
        y="85"
        textAnchor="middle"
        fontSize="16"
        fontWeight="900"
        fill={paleta.textoSecundaria}
        stroke="#000000"
        strokeWidth="0.8"
        style={{ letterSpacing: '1px', textTransform: 'uppercase' }}
      >
        {sigla || 'FC'}
      </text>
    </svg>
  );
};
