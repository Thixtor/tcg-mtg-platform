// ---------------------------------------------------------
// COMPONENTE: CARRIL HORIZONTAL DE MAZOS (ESTILO RECOMENDADOS)
// ---------------------------------------------------------
import React from 'react';
import { Plus, Shield } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function DeckSelectorRail({
  decks = [],
  selectedDeckId,
  onSelectDeck,
  onOpenCreateDeckModal
}) {
  const { isLightMode } = useTheme();

  return (
    <div className="w-full px-6 pt-3 pb-1">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-wider ${
            isLightMode ? 'text-neutral-700' : 'text-neutral-400'
          }`}>
            Mis Mazos
          </span>
          <span className={`text-[11px] font-mono ${
            isLightMode ? 'text-neutral-500' : 'text-neutral-500'
          }`}>
            ({decks.length} / 10)
          </span>
        </div>
      </div>

      {/* Carril Horizontal Deslizable */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-800">
        
        {/* Tarjeta para Crear Nuevo Mazo */}
        <button
          onClick={onOpenCreateDeckModal}
          className={`shrink-0 w-44 h-20 rounded-xl flex flex-col items-center justify-center gap-1.5 transition border-2 border-dashed ${
            isLightMode
              ? 'border-[#DDD5C5] hover:border-amber-500 bg-[#EAE4D7]/50 text-neutral-700 hover:text-amber-700'
              : 'border-neutral-800 hover:border-amber-500/80 bg-neutral-900/40 text-neutral-400 hover:text-amber-400'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold">Nuevo Mazo</span>
        </button>

        {/* Tarjetas de Mazos Existentes */}
        {decks.map((deck) => {
          const isSelected = deck.id === selectedDeckId;
          const formatTag = (deck.format || 'Commander').slice(0, 3).toUpperCase();

          return (
            <div
              key={deck.id}
              onClick={() => onSelectDeck(deck.id)}
              className={`shrink-0 w-52 h-20 rounded-xl p-2.5 cursor-pointer relative overflow-hidden flex flex-col justify-between transition-all select-none ${
                isSelected
                  ? (isLightMode 
                      ? 'bg-[#EAE4D7] ring-2 ring-amber-500 shadow-md' 
                      : 'bg-neutral-900 ring-2 ring-amber-500 shadow-lg')
                  : (isLightMode
                      ? 'bg-[#EFE9DC]/70 hover:bg-[#EAE4D7] opacity-80 hover:opacity-100'
                      : 'bg-neutral-900/60 hover:bg-neutral-900 opacity-75 hover:opacity-100')
              }`}
            >
              <div className="flex items-center justify-between gap-1 z-10">
                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-neutral-950 font-black text-[9px] tracking-wider uppercase">
                  {formatTag}
                </span>
                <span className={`text-[10px] font-mono ${
                  isSelected ? 'text-amber-500 font-bold' : (isLightMode ? 'text-neutral-500' : 'text-neutral-500')
                }`}>
                  {deck.total_cards || 100} cartas
                </span>
              </div>

              <div className="z-10 truncate">
                <h4 className={`text-xs font-bold truncate ${
                  isLightMode ? 'text-[#1F1C19]' : 'text-white'
                }`}>
                  {deck.name}
                </h4>
                <p className={`text-[10px] truncate font-mono ${
                  isLightMode ? 'text-neutral-600' : 'text-neutral-400'
                }`}>
                  {deck.format || 'Commander'}
                </p>
              </div>

              {/* Acento sutil en la esquina si está activo */}
              {isSelected && (
                <div className="absolute right-0 bottom-0 w-8 h-8 bg-gradient-to-tl from-amber-500/20 to-transparent pointer-events-none" />
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
}