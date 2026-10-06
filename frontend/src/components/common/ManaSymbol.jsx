// ---------------------------------------------------------
// COMPONENTE: SÍMBOLOS DE MANÁ Y COSTES MTG (MANA FONT)
// ---------------------------------------------------------
import React from 'react';

/**
 * Glifo individual de maná o acción basado en Mana Font.
 * @param {string} symbol - Código del símbolo (ej: 'w', 'u', '3', 't').
 * @param {string} size - Clase de tamaño tipográfico de Tailwind.
 * @param {boolean} cost - Activa el círculo de coste (ms-cost).
 * @param {boolean} shadow - Activa la sombra dimensional (ms-shadow).
 */
export function ManaGlyph({ symbol, size = 'text-sm', cost = true, shadow = true, className = '' }) {
  if (!symbol) return null;

  const clean = symbol.toString().toLowerCase().replace(/[{}/]/g, '');
  
  // Soporte para símbolos especiales de acción
  const symbolClass = clean === 't' ? 'ms-tap' : clean === 'q' ? 'ms-untap' : `ms-${clean}`;

  return (
    <i
      className={`ms ${symbolClass} ${cost ? 'ms-cost' : ''} ${shadow ? 'ms-shadow' : ''} ${size} ${className} inline-flex items-center justify-center align-middle`}
      title={symbol.toUpperCase()}
    />
  );
}

/**
 * Parsea y renderiza secuencias de coste de maná (ej: "{2}{W}{U}").
 * @param {string} costString - Cadena de coste con notación Scryfall/MTG.
 * @param {string} size - Tamaño del glifo.
 * @param {string} gap - Espaciado horizontal entre símbolos.
 */
export default function ManaCost({ costString, size = 'text-xs', gap = 'gap-0.5', className = '' }) {
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