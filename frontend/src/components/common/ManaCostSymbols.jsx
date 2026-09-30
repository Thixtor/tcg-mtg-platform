// ---------------------------------------------------------
// COMPONENTE: SÍMBOLOS DE MANÁ VISUALES (SCRYFALL SYMBOLS)
// ---------------------------------------------------------
import React from 'react';

// Mapeo de colores canónicos de maná de MTG
const MANA_STYLES = {
  W: 'bg-[#F9FAEB] text-[#1E1C1A] border-[#DCD3BE]',
  U: 'bg-[#0E68AB] text-white border-[#084A7D]',
  B: 'bg-[#150B00] text-[#D8D5D0] border-[#38332E]',
  R: 'bg-[#D3202A] text-white border-[#9E141C]',
  G: 'bg-[#00733E] text-white border-[#004D29]',
  C: 'bg-[#CBC2BF] text-[#2C2B29] border-[#9E9895]',
  X: 'bg-[#73706B] text-white border-[#524F4B]',
};

export default function ManaCostSymbols({ manaCost = '' }) {
  if (!manaCost || typeof manaCost !== 'string') return null;

  // Extraer los símbolos delimitados por llaves {W}, {U}, {2}, {B/R}, etc.
  const symbols = manaCost.match(/\{([^}]+)\}/g);
  if (!symbols || symbols.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-0.5 shrink-0 select-none">
      {symbols.map((sym, idx) => {
        const clean = sym.replace(/[{}]/g, '').toUpperCase();
        
        // Coste numérico genérico o incoloro
        const isNumber = !isNaN(clean);
        const styleClass = MANA_STYLES[clean] || (isNumber ? 'bg-[#CBC2BF] text-[#201D1A] border-[#9E9895]' : 'bg-[#73706B] text-white border-neutral-700');

        return (
          <span
            key={idx}
            className={`w-3.5 h-3.5 text-[9px] font-black rounded-full flex items-center justify-center border leading-none shadow-[0_1px_2px_rgba(0,0,0,0.4)] ${styleClass}`}
            title={`Maná ${clean}`}
          >
            {clean}
          </span>
        );
      })}
    </span>
  );
}