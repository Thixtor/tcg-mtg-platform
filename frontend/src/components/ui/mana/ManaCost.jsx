// ---------------------------------------------------------
// MOLÉCULA: RENDERIZADOR DE COSTES DE MANÁ
// ---------------------------------------------------------
import React, { useMemo } from 'react';
import { ManaSymbol } from './ManaSymbol';

export function ManaCost({ cost, size = 'sm', className = '' }) {
  const symbols = useMemo(() => {
    if (!cost || typeof cost !== 'string') return [];
    const matches = cost.match(/\{[^}]+\}/g);
    return matches || [];
  }, [cost]);

  if (symbols.length === 0) return null;

  return (
    <span className={`inline-flex items-center gap-0.5 align-middle ${className}`}>
      {symbols.map((sym, index) => (
        <ManaSymbol key={`${sym}-${index}`} symbol={sym} size={size} />
      ))}
    </span>
  );
}