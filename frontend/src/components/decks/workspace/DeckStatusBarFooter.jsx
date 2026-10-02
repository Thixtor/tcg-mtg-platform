// ---------------------------------------------------------
// COMPONENTE: BARRA DE ESTADO INFERIOR DEL MAZO
// ---------------------------------------------------------
import React from 'react';

export default function DeckStatusBarFooter({
  mainboardCount,
  isLegal,
  format,
  isLightMode
}) {
  return (
    <footer className={`fixed bottom-0 left-0 right-0 z-40 px-6 py-2 flex items-center justify-between text-xs font-mono backdrop-blur-md ${
      isLightMode ? 'bg-[#FAF7F2]/95 text-neutral-700 border-t border-[#E0D8C8]' : 'bg-[#0B0B0B]/95 text-neutral-400 border-t border-neutral-900'
    }`}>
      <div className="flex items-center gap-4">
        <span className={`font-bold ${isLightMode ? 'text-neutral-900' : 'text-white'}`}>
          {mainboardCount} Cartas en Baraja
        </span>
        <span>·</span>
        <span className={isLegal ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold'}>
          {isLegal ? 'Mazo Legal' : 'Revisar Legalidad'}
        </span>
        <span>·</span>
        <span>{format || 'COMMANDER'}</span>
      </div>

      <div className="text-[11px] opacity-60 hidden sm:block">
        Portions © Wizards of the Coast LLC · Scryfall compliant
      </div>
    </footer>
  );
}