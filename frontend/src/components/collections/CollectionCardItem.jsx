// ---------------------------------------------------------
// COMPONENTE: TARJETA DE CARTA CON FLIP DFC Y TOGGLE DE TRADE
// ---------------------------------------------------------
import React, { useState } from 'react';
import { Repeat, RotateCw } from 'lucide-react';
import { getCardPriceBySource } from '@/utils/pricing';
import apiClient from '@/api/client';

export default function CollectionCardItem({ 
  item, 
  priceSource = 'tcgplayer', 
  onClick,
  onToggleTrade,
}) {
  const [isTrade, setIsTrade] = useState(Boolean(item.is_for_trade));
  const [isUpdatingTrade, setIsUpdatingTrade] = useState(false);
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);

  const cardData = item.card_catalog || item;
  const raw = cardData?.scryfall_raw_data || cardData;

  // Detección de cartas de doble cara (DFCs)
  const cardFaces = Array.isArray(raw?.card_faces) && raw.card_faces.length > 1 ? raw.card_faces : null;
  const isMultiFace = Boolean(cardFaces);
  const activeFace = isMultiFace ? cardFaces[currentFaceIndex] : null;

  // Resolución de imagen dinámica según cara activa
  const imgUrl = 
    activeFace?.image_uris?.normal ||
    activeFace?.image_uris?.large ||
    cardData?.image_url || 
    cardData?.image_uris?.normal || 
    cardData?.image_uris?.large ||
    raw?.image_uris?.normal;

  const cardName = activeFace?.name || cardData?.name || 'Carta Desconocida';
  const quantity = item.quantity || 1;
  const unitPrice = getCardPriceBySource(item, priceSource);
  const isInDeck = Boolean(item.in_decks_count || item.is_in_deck);

  const handleFlipCard = (e) => {
    e.stopPropagation();
    setCurrentFaceIndex((prev) => (prev === 0 ? 1 : 0));
  };

  const handleTradeClick = async (e) => {
    e.stopPropagation();
    const nextState = !isTrade;
    setIsTrade(nextState);
    setIsUpdatingTrade(true);

    try {
      if (item.collection_id && item.id) {
        await apiClient.patch(`/collections/${item.collection_id}/cards/${item.id}`, {
          is_for_trade: nextState
        });
      }
      onToggleTrade?.(item.id, nextState);
    } catch (err) {
      console.warn('[CollectionCardItem] Fallo al actualizar trade:', err);
      setIsTrade(!nextState);
    } finally {
      setIsUpdatingTrade(false);
    }
  };

  return (
    <div className="group flex flex-col space-y-2 select-none">
      {/* Cabecera superior */}
      <div className="flex items-center justify-between text-xs font-semibold px-1 text-neutral-300">
        <span className="truncate max-w-[130px] text-white/90 group-hover:text-amber-400 transition" title={cardName}>
          {cardName}
        </span>
        <span className="font-mono text-neutral-400 font-bold shrink-0">
          {quantity}x
        </span>
      </div>

      {/* Contenedor del Arte MTG */}
      <div 
        onClick={() => onClick?.(cardData)}
        className="relative aspect-[2.5/3.5] w-full rounded-2xl overflow-hidden bg-[#16141F] border border-white/10 group-hover:border-amber-500/60 transition-all duration-300 shadow-xl group-hover:shadow-amber-500/10 group-hover:scale-[1.02] cursor-pointer"
      >
        {imgUrl ? (
          <img 
            src={imgUrl} 
            alt={cardName}
            loading="lazy"
            className="w-full h-full object-cover object-center transition-all duration-500" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600 font-mono text-xs">
            Sin Imagen
          </div>
        )}

        {/* Botón Flotante para Girar Cartas de Doble Cara */}
        {isMultiFace && (
          <button
            type="button"
            onClick={handleFlipCard}
            title={currentFaceIndex === 0 ? 'Voltear a cara trasera' : 'Voltear a cara frontal'}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 hover:bg-amber-500 hover:text-black text-white border border-white/20 transition-all shadow-xl z-30 cursor-pointer active:rotate-180"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Badges Superiores */}
        <div className={`absolute ${isMultiFace ? 'top-10' : 'top-2'} right-2 flex flex-col items-end gap-1 pointer-events-none`}>
          {item.is_foil && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-gradient-to-r from-amber-400 via-pink-400 to-purple-500 text-black shadow-md">
              FOIL
            </span>
          )}
        </div>

        {/* Botón interactivo de Trade */}
        <button
          type="button"
          onClick={handleTradeClick}
          disabled={isUpdatingTrade}
          title={isTrade ? 'Quitar de Trade' : 'Poner disponible para Trade'}
          className={`absolute top-2 left-2 p-1.5 rounded-lg text-[9px] font-mono font-bold flex items-center gap-1 transition-all z-20 cursor-pointer shadow-lg backdrop-blur-md ${
            isTrade
              ? 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
              : 'bg-black/70 text-neutral-400 hover:text-white hover:bg-black/90 border border-white/10'
          }`}
        >
          <Repeat className="w-3 h-3" />
          <span className="hidden group-hover:inline text-[8px] uppercase">
            {isTrade ? 'Trade' : '+Trade'}
          </span>
        </button>

        {/* Badges Inferiores */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
          <div className="flex items-center gap-1">
            {isInDeck && (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-amber-500 text-neutral-950 shadow-md">
                EN DECK
              </span>
            )}
            {isTrade && (
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