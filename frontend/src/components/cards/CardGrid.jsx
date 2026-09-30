// ---------------------------------------------------------
// COMPONENTE: CUADRÍCULA DE CARTAS CINEMATOGRÁFICA (BORDERLESS)
// ---------------------------------------------------------
import React, { useState } from 'react';
import { Plus, Crown } from 'lucide-react';
import { QuickCardActionModal } from './QuickCardActionModal';
import { ManaCost } from './ManaCost';

export function CardGrid({ cards = [], loading = false, onSelectCard }) {
  const [quickCard, setQuickCard] = useState(null);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-7 animate-pulse">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div key={idx} className="flex flex-col space-y-2.5">
            <div 
              className="w-full bg-neutral-900/80 rounded-2xl shadow-xl"
              style={{ aspectRatio: '2.5 / 3.5' }} 
            />
            <div className="h-3.5 bg-neutral-900 rounded-md w-3/4 mx-1" />
            <div className="h-2.5 bg-neutral-900/60 rounded-md w-1/2 mx-1" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-7">
        {cards.map((card) => {
          const raw = card.scryfall_raw_data || {};
          const imageUrl =
            card.image_url ||
            raw.image_uris?.normal ||
            raw.image_uris?.large ||
            raw.card_faces?.[0]?.image_uris?.normal ||
            null;

          const cardMana = card.mana_cost || raw.mana_cost || '';

          const isLegendary =
            (card.type_line || raw.type_line || '').toLowerCase().includes('legendary') &&
            (card.type_line || raw.type_line || '').toLowerCase().includes('creature');

          return (
            <div
              key={card.id}
              className="group relative flex flex-col transition-all duration-300 ease-out hover:-translate-y-2 cursor-pointer"
            >
              {/* --------------------------------------------------------- */}
              {/* PÓSTER CINEMATOGRÁFICO SIN BORDES                         */}
              {/* --------------------------------------------------------- */}
              <div
                onClick={() => onSelectCard && onSelectCard(card)}
                className="relative w-full rounded-2xl overflow-hidden shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-amber-500/15"
                style={{ aspectRatio: '2.5 / 3.5' }}
              >
                <div className="absolute inset-0 bg-neutral-950 flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={card.name}
                      className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-neutral-600 text-xs">
                      <span className="text-3xl mb-1">🃏</span>
                      <span className="font-mono text-[10px]">Sin imagen</span>
                    </div>
                  )}
                </div>

                {/* Sombra de viñeta al hacer hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Micro-botón de asignación rápida */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickCard(card);
                  }}
                  className={`absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 shadow-md ${
                    isLegendary
                      ? 'bg-amber-500/90 hover:bg-amber-400 text-stone-950 font-bold scale-95 group-hover:scale-105'
                      : 'bg-neutral-950/70 hover:bg-amber-600 text-neutral-200 hover:text-white border border-white/10 hover:border-transparent opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
                  }`}
                  title={isLegendary ? 'Crear mazo con este Comandante o añadir' : 'Añadir a mazo o colección'}
                >
                  {isLegendary ? <Crown className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>

              {/* --------------------------------------------------------- */}
              {/* METADATOS FLOTANTES CON SÍMBOLOS DE MANÁ                  */}
              {/* --------------------------------------------------------- */}
              <div 
                onClick={() => onSelectCard && onSelectCard(card)}
                className="mt-2.5 px-0.5 space-y-1"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <h4
                    className="text-xs font-semibold text-neutral-200 line-clamp-1 group-hover:text-amber-400 transition-colors"
                    title={card.name}
                  >
                    {card.name}
                  </h4>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase flex-shrink-0">
                    {(card.set || raw.set || '').toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] min-h-[16px]">
                  {/* Símbolos de maná vectoriales */}
                  <div className="max-w-[70%] truncate flex items-center">
                    {cardMana ? (
                      <ManaCost manaCost={cardMana} size="xs" />
                    ) : (
                      <span className="text-[10px] text-neutral-500 font-mono">Incoloro</span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-500 truncate capitalize font-sans">
                    {(card.type_line || raw.type_line || '').split('—')[0].trim()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <QuickCardActionModal
        isOpen={Boolean(quickCard)}
        onClose={() => setQuickCard(null)}
        card={quickCard}
      />
    </>
  );
}