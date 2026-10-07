// ============================================================================
// COMPONENTE: REGLAS ORACLE, TEXTO IMPRESO Y AMBIENTACIÓN (FLAVOR TEXT)
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Parsea glifos de maná inline ({W}, {U}, {T}, etc.) en el texto oficial.
// - Soporta textos impresos históricos y citas de ambientación.
// ============================================================================

import React from 'react';
import { ManaGlyph } from '@/components/common/ManaSymbol';

function FormattedRulesText({ text }) {
  if (!text) return <p className="italic text-neutral-500">Sin texto de reglas activo.</p>;

  return (
    <div className="space-y-2">
      {text.split('\n').map((paragraph, pIdx) => {
        const parts = paragraph.split(/(\{[^}]+\})/g);
        return (
          <p key={pIdx} className="leading-relaxed">
            {parts.map((part, idx) => {
              if (part.startsWith('{') && part.endsWith('}')) {
                return (
                  <span key={idx} className="inline-block mx-0.5 align-middle">
                    <ManaGlyph symbol={part} size="text-[12px]" cost={true} shadow={true} />
                  </span>
                );
              }
              return <span key={idx}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

export default function CardOracleRules({ normalizedCard, isLightMode }) {
  return (
    <div className={`p-4 rounded-xl text-xs sm:text-sm leading-relaxed border space-y-3 ${
      isLightMode ? 'bg-white border-neutral-200' : 'bg-neutral-900/60 border-neutral-800'
    }`}>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1 font-mono">
          Texto de Reglas (Oracle)
        </span>
        <FormattedRulesText text={normalizedCard.oracleText} />
      </div>

      {normalizedCard.printedText && normalizedCard.printedText !== normalizedCard.oracleText && (
        <div className="pt-2 border-t border-neutral-800/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1 font-mono">
            Texto Impreso en esta Versión
          </span>
          <p className="text-xs text-neutral-300 italic">{normalizedCard.printedText}</p>
        </div>
      )}

      {normalizedCard.flavorText && (
        <div className="pt-2 border-t border-neutral-800/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5 font-mono">
            Ambientación
          </span>
          <p className="text-xs italic text-neutral-400 leading-normal">
            "{normalizedCard.flavorText}"
          </p>
        </div>
      )}
    </div>
  );
}