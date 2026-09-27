// ---------------------------------------------------------
// COMPONENTE TARJETA INDIVIDUAL (CARD ITEM)
// ---------------------------------------------------------
import React from 'react';

// Mapeo semántico de rarezas MTG a estilos de Tailwind
const RARITY_STYLES = {
  mythic: {
    label: 'Mítica',
    badge: 'bg-orange-950/70 border-orange-700/80 text-orange-400',
    indicator: 'bg-orange-500',
  },
  rare: {
    label: 'Rara',
    badge: 'bg-amber-950/70 border-amber-700/80 text-amber-400',
    indicator: 'bg-amber-400',
  },
  uncommon: {
    label: 'Infrecuente',
    badge: 'bg-slate-800/80 border-slate-600 text-slate-300',
    indicator: 'bg-slate-300',
  },
  common: {
    label: 'Común',
    badge: 'bg-neutral-900 border-neutral-800 text-neutral-400',
    indicator: 'bg-neutral-500',
  },
};

export function CardItem({ card, onSelect }) {
  const imageUrl = card.image_url || card.scryfall_raw_data?.image_uris?.normal;
  const cardName = card.name || 'Carta sin nombre';
  const setCode = (card.set || card.scryfall_raw_data?.set || '').toUpperCase();
  const rarityKey = (card.rarity || card.scryfall_raw_data?.rarity || 'common').toLowerCase();
  const rarityConfig = RARITY_STYLES[rarityKey] || RARITY_STYLES.common;

  return (
    <div
      onClick={() => onSelect(card)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(card)}
      className="group relative flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/70 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-200 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
    >
      {/* Contenedor de Imagen: respeta estrictamente 2.5 / 3.5 sin distorsionar */}
      <div className="w-full aspect-[2.5/3.5] bg-neutral-950 relative overflow-hidden flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={cardName}
            loading="lazy"
            className="w-full h-full object-contain select-none transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center text-neutral-600">
            <span className="text-3xl mb-2">🃏</span>
            <span className="text-xs">Imagen no disponible</span>
          </div>
        )}

        {/* Badge de Rareza Flotante */}
        <span
          className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium border backdrop-blur-md flex items-center gap-1 shadow-sm ${rarityConfig.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${rarityConfig.indicator}`} />
          {rarityConfig.label}
        </span>
      </div>

      {/* Información de la carta */}
      <div className="p-3 flex flex-col justify-between flex-grow bg-neutral-900/90 border-t border-neutral-800">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 line-clamp-1 group-hover:text-amber-400 transition-colors" title={cardName}>
            {cardName}
          </h3>
          <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
            {card.type_line || card.scryfall_raw_data?.type_line || 'Magic Card'}
          </p>
        </div>

        {/* Barra de pie de tarjeta: Set y CTA */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/60 text-xs text-neutral-400">
          <span className="px-2 py-0.5 bg-neutral-800 rounded text-[11px] font-mono font-medium uppercase text-neutral-300">
            {setCode || 'N/A'}
          </span>
          <span className="text-[11px] text-amber-500 font-medium group-hover:underline flex items-center gap-0.5">
            Precios →
          </span>
        </div>
      </div>
    </div>
  );
}