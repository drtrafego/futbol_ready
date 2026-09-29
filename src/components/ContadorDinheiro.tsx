'use client';

import { animate, useMotionValue, useMotionValueEvent } from 'motion/react';
import React, { useEffect, useState } from 'react';

interface ContadorDinheiroProps {
  valor: number;
  className?: string;
  prefixo?: string;
}

const formatarDinheiro = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

/** Exibe mudanças de dinheiro como uma contagem contínua, inclusive após gastos. */
export const ContadorDinheiro: React.FC<ContadorDinheiroProps> = ({
  valor,
  className,
  prefixo = '',
}) => {
  const valorAnimado = useMotionValue(0);
  const [valorExibido, setValorExibido] = useState(0);

  useMotionValueEvent(valorAnimado, 'change', (novoValor) => {
    setValorExibido(novoValor);
  });

  useEffect(() => {
    const controles = animate(valorAnimado, valor, {
      duration: 0.45,
      ease: 'easeOut',
    });

    return () => controles.stop();
  }, [valor, valorAnimado]);

  return (
    <span className={className}>
      {prefixo}
      {formatarDinheiro(Math.round(valorExibido * 100) / 100)}
    </span>
  );
};
