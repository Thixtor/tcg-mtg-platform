// ---------------------------------------------------------
// ÁTOMO: RENDERIZADOR DE UN SÍMBOLO INDIVIDUAL
// ---------------------------------------------------------
import React from 'react';
import { normalizeManaClass } from '../../../utils/manaSymbols';

const SIZE_VARIANTS = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

export function ManaSymbol({ symbol, size = 'sm', shadow = true, className = '' }) {
  const normalized = normalizeManaClass(symbol);
  if (!normalized) return null;

  return (
    <i
      className={`ms ms-${normalized} ms-cost ${shadow ? 'ms-shadow' : ''} ${SIZE_VARIANTS[size] || SIZE_VARIANTS.sm} select-none ${className}`}
      aria-label={`Símbolo ${symbol}`}
      title={`{${symbol.replace(/[{}]/g, '').toUpperCase()}}`}
    />
  );
}