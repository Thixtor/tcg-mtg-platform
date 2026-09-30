// ---------------------------------------------------------
// COMPONENTE: RENDERIZADOR DE SÍMBOLOS DE MANÁ (MANA FONT)
// ---------------------------------------------------------
import React, { useMemo } from 'react';

/**
 * Normaliza los tokens de Scryfall ({W}, {B/G}, {2/W}, etc.)
 * para que coincidan con las clases oficiales de mana-font.
 */
function normalizeSymbol(raw) {
  // Limpia llaves y espacios
  let clean = raw.toLowerCase().replace(/[{}]/g, '').trim();

  // Caso especial: símbolos híbridos como 'w/u' -> 'wu'
  if (clean.includes('/')) {
    clean = clean.replace('/', '');
  }

  return clean;
}

export function ManaCost({ manaCost, size = 'sm', className = '' }) {
  const symbols = useMemo(() => {
    if (!manaCost || typeof manaCost !== 'string') return [];
    
    // Captura cualquier símbolo entre llaves: ej. {2}, {U}, {R}
    const matches = manaCost.match(/\{[^}]+\}/g);
    if (!matches) return [];

    return matches.map(normalizeSymbol);
  }, [manaCost]);

  if (symbols.length === 0) return null;

  // Escala de tamaños responsivos para Tailwind
  const sizeClasses = {
    xs: 'text-[11px]',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-xl',
  };

  return (
    <span className={`inline-flex items-center gap-0.5 select-none ${sizeClasses[size] || sizeClasses.sm} ${className}`}>
      {symbols.map((sym, idx) => (
        <i
          key={`${sym}-${idx}`}
          className={`ms ms-${sym} ms-cost ms-shadow`}
          title={`{${sym.toUpperCase()}}`}
        />
      ))}
    </span>
  );
}

/**
 * Utilidad: Reemplaza dinámicamente los símbolos de maná dentro
 * del texto del oráculo por sus iconos visuales.
 */
export function renderOracleWithMana(text) {
  if (!text) return null;

  const parts = text.split(/(\{[^}]+\})/g);

  return parts.map((part, i) => {
    if (/^\{[^}]+\}$/.test(part)) {
      return (
        <ManaCost
          key={i}
          manaCost={part}
          size="xs"
          className="align-baseline mx-0.5"
        />
      );
    }
    return part;
  });
}