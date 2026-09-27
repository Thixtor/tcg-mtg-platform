// ---------------------------------------------------------
// 7. COMPONENTE TARJETA INDIVIDUAL (CARD ITEM)
// ---------------------------------------------------------
import React from 'react';

export function CardItem({ card, onSelect }) {
  // Manejo de imagen normal provista por Scryfall o fallback
  const imageUrl = card.image_url || card.scryfall_raw_data?.image_uris?.normal;
  const cardName = card.name || 'Carta sin nombre';
  const setCode = (card.set || card.scryfall_raw_data?.set || '').toUpperCase();

  return (
    <div
      onClick={() => onSelect(card)}
      className="group relative flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-200 transform hover:-translate-y-1"
    >
      <div className="w-full aspect-[2.5/3.5] bg-neutral-950 overflow-hidden flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={cardName}
            loading="lazy"
            className="w-full h-full object-contain select-none"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center text-neutral-500">
            <span className="text-3xl mb-2">🃏</span>
            <span className="text-xs">Imagen no disponible</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col justify-between flex-grow bg-neutral-900/90 border-t border-neutral-800">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 line-clamp-1 group-hover:text-amber-400 transition-colors">
            {cardName}
          </h3>
          <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
            {card.type_line || card.scryfall_raw_data?.type_line || 'Magic Card'}
          </p>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/60 text-xs text-neutral-400">
          <span className="px-2 py-0.5 bg-neutral-800 rounded text-[11px] font-mono font-medium uppercase text-neutral-300">
            {setCode || 'N/A'}
          </span>
          <span className="text-[11px] text-amber-500 font-medium group-hover:underline">
            Ver cotizaciones →
          </span>
        </div>
      </div>
    </div>
  );
}