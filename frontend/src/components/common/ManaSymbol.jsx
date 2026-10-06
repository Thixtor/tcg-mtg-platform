// ---------------------------------------------------------
// COMPONENTE: SÍMBOLOS DE MANÁ Y COSTES MTG (MANA FONT)
// ---------------------------------------------------------
import React from 'react';

const SYMBOL_MAP = {
  w: 'ms-w',
  u: 'ms-u',
  b: 'ms-b',
  r: 'ms-r',
  g: 'ms-g',
  c: 'ms-c',
  t: 'ms-tap',
  q: 'ms-untap',
  x: 'ms-x',
};

/**
 * Glifo individual de maná o acción escalado armónicamente con el texto.
 * @param {string} symbol - Código del símbolo (ej: 'w', 'u', '3', 't').
 * @param {string} size - Clase de tamaño (ej: 'text-[11px]', 'text-xs', 'text-sm').
 */
export function ManaGlyph({ symbol, size = 'text-[11px]', cost = true, shadow = true, className = '' }) {
  if (!symbol) return null;

  const clean = symbol.toString().toLowerCase().replace(/[{}/]/g, '');
  const mappedClass = SYMBOL_MAP[clean] || `ms-${clean}`;

  return (
    <i
      className={`ms ${mappedClass} ${cost ? 'ms-cost' : ''} ${shadow ? 'ms-shadow' : ''} ${size} ${className} inline-flex items-center justify-center align-middle leading-none`}
      title={symbol.toUpperCase()}
    />
  );
}

/**
 * Parsea y renderiza secuencias de coste alineadas al tamaño del texto.
 */
export default function ManaCost({ costString, size = 'text-[11px]', gap = 'gap-0.5', className = '' }) {
  if (!costString) return null;

  const symbols = costString.match(/\{[^}]+\}/g) || [];

  if (symbols.length === 0) {
    return <span className={className}>{costString}</span>;
  }

  return (
    <span className={`inline-flex items-center ${gap} ${className}`}>
      {symbols.map((sym, idx) => (
        <ManaGlyph key={`${sym}-${idx}`} symbol={sym} size={size} />
      ))}
    </span>
  );
}