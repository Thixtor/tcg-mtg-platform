// ---------------------------------------------------------
// COMPONENTE: TARJETA DE CARTA CON BADGES DE ESTADO REALES
// ---------------------------------------------------------
import React from 'react';
import { getCardPriceBySource } from '@/utils/pricing';

export default function CollectionCardItem({ item, priceSource = 'tcgplayer', onClick }) {
  const cardData = item.card_catalog || item;
  const imgUrl = cardData?.image_url || cardData?.image_uris?.normal || cardData?.image_uris?.large;
  const cardName = cardData?.name || 'Carta Desconocida';
  const quantity = item.quantity || 1;
  const unitPrice = getCardPriceBySource(item, priceSource);

  // Estados de inventario derivados
  const isInDeck = Boolean(item.in_decks_count || item.is_in_deck);
  const isForTrade = Boolean(item.is_for_trade);

  return (
    <div className="group flex flex-col space-y-2 select-none">
      {/* Cabecera superior con Nombre y Cantidad de Copias */}
      <div className="flex items-center justify-between text-xs font-semibold px-1 text-neutral-300">
        <span className="truncate max-w-[130px] text-white/90 group-hover:text-purple-300 transition" title={cardName}>
          {cardName}
        </span>
        <span className="font-mono text-neutral-400 font-bold shrink-0">
          {quantity}x
        </span>
      </div>

      {/* Contenedor del Arte MTG */}
      <div 
        onClick={() => onClick?.(cardData)}
        className="relative aspect-[2.5/3.5] w-full rounded-2xl overflow-hidden bg-[#16141F] border border-white/10 group-hover:border-purple-500/60 transition-all duration-300 shadow-xl group-hover:shadow-purple-500/10 group-hover:scale-[1.02] cursor-pointer"
      >
        {imgUrl ? (
          <img 
            src={imgUrl} 
            alt={cardName}
            loading="lazy"
            className="w-full h-full object-cover object-center" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600 font-mono text-xs">
            Sin Imagen
          </div>
        )}

        {/* Badges de Estado Superiores */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {item.is_foil && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-gradient-to-r from-amber-400 via-pink-400 to-purple-500 text-black shadow-md">
              FOIL
            </span>
          )}
        </div>

        {/* Badges de Estado Inferiores */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
          <div className="flex items-center gap-1">
            {isInDeck && (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-amber-500 text-neutral-950 shadow-md">
                EN DECK
              </span>
            )}
            {isForTrade && (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-emerald-500 text-neutral-950 shadow-md">
                TRADE
              </span>
            )}
          </div>

          {unitPrice > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/80 backdrop-blur-sm text-emerald-400 border border-emerald-500/30">
              ${unitPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}