// ---------------------------------------------------------
// COMPONENTE: FORMATEADOR DE TEXTO MTG CON SÍMBOLOS EN LÍNEA
// ---------------------------------------------------------
import React, { useMemo } from 'react';
import { ManaSymbol } from './ManaSymbol';

export function FormattedText({ text, size = 'xs', className = '' }) {
  const parsedContent = useMemo(() => {
    if (!text || typeof text !== 'string') return null;

    // Divide preservando saltos de línea y tokens {X}
    const tokens = text.split(/(\{[^}]+\}|\n)/g);

    return tokens.map((part, index) => {
      // 1. Manejo de saltos de línea de texto MTG
      if (part === '\n') {
        return <br key={`br-${index}`} />;
      }

      // 2. Manejo de símbolos de maná o acciones ({T}, {W}, {2}, etc.)
      if (/^\{[^}]+\}$/.test(part)) {
        return (
          <ManaSymbol
            key={`sym-${index}`}
            symbol={part}
            size={size}
            className="mx-0.5 align-baseline"
          />
        );
      }

      // 3. Texto estándar
      return part;
    });
  }, [text, size]);

  return <span className={`leading-relaxed ${className}`}>{parsedContent}</span>;
}