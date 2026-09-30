// ---------------------------------------------------------
// COMPONENTE: TARJETA VISUAL DE CARTA (MAZOS Y COLECCIONES)
// ---------------------------------------------------------
import React from 'react';
import { Plus, Trash2, ArrowUpDown } from 'lucide-react';
import { extractCardPriceUsd } from '@/hooks/useCardCollectionFilter';

export default function CardGridItem({
  card,
  cardSize = 'md',
  isSelected = false,
  isLightMode = false,
  onHover,
  onClick,
  onIncrement,
  onRemove,
  onToggleTrade,
  badgeTopLeft,
  showTradeBadge = false,
}) {
  const cardName = card.card_catalog?.name || card.name || 'Carta';
  const imgUrl = 
    card.card_catalog?.image_url || 
    card.image_url || 
    card.card_faces?.[0]?.image_uris?.normal || 
    '';
  const quantity = card.quantity_needed ?? card.quantity ?? 1;
  const unitPrice = extractCardPriceUsd(card);

  const getCardSizeClass = () => {
    switch (cardSize) {
      case 'sm': return 'w-24 sm:w-28';
      case 'lg': return 'w-44 sm:w-48';
      default: return 'w-32 sm:w-36';
    }
  };

  return (
    <div
      onMouseEnter={() => onHover?.(card)}
      onClick={() => onClick?.(card)}
      className={`group relative rounded-xl border overflow-hidden transition flex flex-col justify-between cursor-pointer ${
        isSelected
          ? 'border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-500'
          : isLightMode 
            ? 'bg-white border-[#E8E2D5] hover:border-amber-500/60' 
            : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
      } ${getCardSizeClass()}`}
    >
      {/* Contenedor con Aspect Ratio MTG 2.5 / 3.5 */}
      <div className="aspect-[2.5/3.5] w-full relative bg-neutral-950 overflow-hidden">
        {imgUrl ? (
          <img 
            src={imgUrl} 
            alt={cardName} 
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
            loading="lazy" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-neutral-500">
            {cardName}
          </div>
        )}

        {/* Badge Superior Izquierdo: Condición o Categoría */}
        {badgeTopLeft && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-neutral-950/80 text-neutral-300 border border-neutral-800">
            {badgeTopLeft}
          </span>
        )}

        {/* Badge Superior Derecho: Cantidad */}
        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded bg-neutral-950/80 text-[10px] font-mono font-bold text-white border border-neutral-800">
          {quantity}x
        </span>

        {/* Badge Foil */}
        {card.is_foil && (
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-gradient-to-r from-amber-400 to-pink-500 text-black">
            FOIL
          </span>
        )}

        {/* Overlay con Controles al Hover */}
        {(onIncrement || onRemove || onToggleTrade) && (
          <div 
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition"
            onClick={(e) => e.stopPropagation()}
          >
            {onIncrement && (
              <button 
                onClick={() => onIncrement(card)} 
                className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white" 
                title="Aumentar"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            {onToggleTrade && (
              <button 
                onClick={() => onToggleTrade(card)} 
                className={`p-1 rounded ${card.is_for_trade ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`} 
                title="Conmutar Trade"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            )}
            {onRemove && (
              <button 
                onClick={() => onRemove(card)} 
                className="p-1 rounded bg-neutral-800 hover:bg-rose-900 text-rose-300" 
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info Inferior */}
      <div className={`p-2 space-y-0.5 ${isLightMode ? 'bg-[#FAF7F2]' : 'bg-neutral-950'}`}>
        <p className={`text-xs font-semibold truncate ${isLightMode ? 'text-neutral-900' : 'text-white'}`} title={cardName}>
          {cardName}
        </p>
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-amber-500 font-bold">x{quantity}</span>
          <span className="text-emerald-400 font-bold">
            ${(unitPrice * quantity).toFixed(2)}
          </span>
        </div>
        {showTradeBadge && card.is_for_trade && (
          <div className="text-[9px] text-center font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 rounded py-0.2 mt-0.5">
            En Trade
          </div>
        )}
      </div>
    </div>
  );
}