// ============================================================================
// COMPONENTE: TARJETA DE CARTA EN COLECCIÓN CON CONTADOR Y TOGGLE DE TRADE
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Despliega la información básica de la carta física en el binder.
// - Botón de Trade: Alterna exclusivamente la bandera de disponibilidad comercial
//   (is_for_trade) en la base de datos sin crear publicaciones prematuras.
// - Control Rápido: Ajuste directo de cantidades (+ / -) con eliminación protegida.
// ============================================================================

import React, { useState } from 'react';
import { Plus, Minus, Loader2, Sparkles, ArrowLeftRight } from 'lucide-react';
import { updateCollectionCardApi, removeCardFromCollectionApi } from '@/api/collections';

export default function CollectionCardItem({
  item,
  collectionId,
  priceSource = 'tcgplayer',
  onClick,
  onCardClick,
  onToggleTrade,
  onQuantityUpdated,
  onCardDeleted,
  isLightMode
}) {
  const [updating, setUpdating] = useState(false);

  const cardName = item.card_catalog?.name || item.name || 'Carta MTG';
  const imageUrl = item.card_catalog?.image_url || item.image_url || '/placeholder-card.png';
  const condition = item.condition || 'NM';
  const isFoil = Boolean(item.is_foil);
  const isForTrade = Boolean(item.is_for_trade);
  const currentQuantity = Number(item.quantity || 1);

  // Precios calculados según la tienda seleccionada
  const prices = item.card_catalog?.prices || item.prices || {};
  const displayPrice = priceSource === 'cardkingdom'
    ? (prices.ck_retail || prices.usd ? (parseFloat(prices.usd) * 1.08).toFixed(2) : null)
    : (prices.usd || item.price_usd || null);

  // 1. Ajustar cantidad de copias (+1 / -1)
  const handleQuantityAdjust = async (e, delta) => {
    e.stopPropagation();
    if (updating) return;

    const newQty = currentQuantity + delta;
    setUpdating(true);

    try {
      if (newQty <= 0) {
        const confirmDelete = window.confirm(`¿Deseas eliminar "${cardName}" de esta colección?`);
        if (confirmDelete) {
          await removeCardFromCollectionApi(collectionId, item.id);
          onCardDeleted?.(item.id);
        }
      } else {
        const res = await updateCollectionCardApi(collectionId, item.id, {
          quantity: newQty
        });
        onQuantityUpdated?.(item.id, res.quantity ?? newQty);
      }
    } catch (err) {
      console.error('[CollectionCardItem] Error al modificar copias:', err);
      alert('No fue posible actualizar la cantidad de la carta.');
    } finally {
      setUpdating(false);
    }
  };

  // 2. Alternar disponibilidad comercial (solo flag is_for_trade)
  const handleToggleTradeAvailability = async (e) => {
    e.stopPropagation();
    if (updating) return;

    setUpdating(true);
    try {
      const nextTradeState = !isForTrade;
      await updateCollectionCardApi(collectionId, item.id, {
        is_for_trade: nextTradeState
      });

      if (typeof onToggleTrade === 'function') {
        onToggleTrade();
      } else if (typeof onQuantityUpdated === 'function') {
        onQuantityUpdated(item.id, currentQuantity, nextTradeState);
      }
    } catch (err) {
      console.error('[CollectionCardItem] Error alternando disponibilidad de trade:', err);
      alert('No se pudo cambiar la disponibilidad para trade.');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenDetail = () => {
    if (typeof onClick === 'function') onClick(item);
    else if (typeof onCardClick === 'function') onCardClick(item);
  };

  return (
    <div
      onClick={handleOpenDetail}
      className={`group relative rounded-2xl p-2.5 border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isLightMode
          ? 'bg-[#FAF7F2] border-neutral-300 hover:border-amber-500 shadow-sm'
          : 'bg-[#131217] border-[#2A2733] hover:border-[#E88B00]/70 hover:shadow-[0_0_15px_rgba(232,139,0,0.1)]'
      }`}
    >
      {/* 1. Imagen y Badges */}
      <div className="relative aspect-[2.5/3.5] w-full rounded-xl overflow-hidden bg-neutral-950 mb-2">
        <img
          src={imageUrl}
          alt={cardName}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Badge Foil */}
        {isFoil && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1 shadow">
            <Sparkles className="w-2.5 h-2.5" />
            <span>FOIL</span>
          </div>
        )}

        {/* Botón de Disponibilidad para Trade */}
        <button
          type="button"
          disabled={updating}
          onClick={handleToggleTradeAvailability}
          title={isForTrade ? 'Disponible para Trade (Click para retirar de trade)' : 'No disponible para Trade (Click para poner disponible)'}
          className={`absolute top-2 right-2 p-1.5 rounded-lg text-[10px] font-mono font-bold transition shadow cursor-pointer ${
            isForTrade
              ? 'bg-[#E88B00] text-black ring-2 ring-[#FF9D0A] shadow-[#E88B00]/30'
              : 'bg-black/70 text-neutral-400 hover:text-white border border-neutral-700'
          }`}
        >
          {updating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ArrowLeftRight className="w-3 h-3 stroke-[2.5]" />
          )}
        </button>
      </div>

      {/* 2. Información de la Carta */}
      <div className="space-y-1 mb-2 px-0.5">
        <h4 className="text-xs font-bold truncate text-white" title={cardName}>
          {cardName}
        </h4>
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
          <span>{condition}</span>
          <span className="text-[#E88B00] font-bold">
            {displayPrice ? `$${parseFloat(displayPrice).toFixed(2)}` : ''}
          </span>
        </div>
      </div>

      {/* 3. Control Rápido de Copias (- / Contador / +) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex items-center justify-between p-1 rounded-xl border font-mono ${
          isLightMode
            ? 'bg-neutral-200/80 border-neutral-300'
            : 'bg-neutral-950 border-[#2A2733]'
        }`}
      >
        <button
          type="button"
          disabled={updating}
          onClick={(e) => handleQuantityAdjust(e, -1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-900 hover:bg-rose-950/60 hover:text-rose-400 text-neutral-400 border border-neutral-800 transition active:scale-90 cursor-pointer disabled:opacity-40"
          title="Restar 1 copia"
        >
          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        <span className="font-bold text-xs text-[#E88B00] px-2 min-w-[28px] text-center">
          {updating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin inline text-[#E88B00]" />
          ) : (
            `${currentQuantity}x`
          )}
        </span>

        <button
          type="button"
          disabled={updating}
          onClick={(e) => handleQuantityAdjust(e, +1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-900 hover:bg-[#E88B00]/20 hover:text-[#E88B00] text-neutral-400 border border-neutral-800 transition active:scale-90 cursor-pointer disabled:opacity-40"
          title="Sumar 1 copia"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}