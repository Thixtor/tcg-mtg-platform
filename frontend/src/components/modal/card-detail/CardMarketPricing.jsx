// ============================================================================
// COMPONENTE: TABLERO DE PRECIOS DE MERCADO (TCGPLAYER & CARD KINGDOM)
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Desglosa cotizaciones Market Retail, Foil y Buylist de la versión activa.
// ============================================================================

import React from 'react';
import { DollarSign, Store, ShoppingBag } from 'lucide-react';

export default function CardMarketPricing({ normalizedCard, isLightMode }) {
  return (
    <div className={`p-3.5 rounded-xl border ${
      isLightMode ? 'bg-[#F4EFE6] border-neutral-300' : 'bg-neutral-900/90 border-neutral-800'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1 font-mono">
          <DollarSign className="w-3.5 h-3.5 text-amber-500" />
          Precios de esta Versión ({normalizedCard.setCode})
        </span>
        <span className="text-[10px] text-neutral-500 font-mono">Card Kingdom & TCGplayer</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="p-2 rounded bg-neutral-950/40 border border-neutral-800">
          <span className="text-[10px] text-neutral-400 block flex items-center gap-1">
            <Store className="w-3 h-3 text-sky-400" /> TCG Market
          </span>
          <span className="font-bold text-emerald-400">
            {normalizedCard.tcgPrice ? `$${normalizedCard.tcgPrice}` : 'N/D'}
          </span>
        </div>

        <div className="p-2 rounded bg-neutral-950/40 border border-neutral-800">
          <span className="text-[10px] text-neutral-400 block flex items-center gap-1">
            <Store className="w-3 h-3 text-amber-400" /> TCG Foil
          </span>
          <span className="font-bold text-amber-300">
            {normalizedCard.tcgPriceFoil ? `$${normalizedCard.tcgPriceFoil}` : 'N/D'}
          </span>
        </div>

        <div className="p-2 rounded bg-neutral-950/40 border border-neutral-800">
          <span className="text-[10px] text-neutral-400 block flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-amber-500" /> CK Retail
          </span>
          <span className="font-bold text-neutral-100">
            {normalizedCard.ckPriceRetail ? `$${normalizedCard.ckPriceRetail}` : 'N/D'}
          </span>
        </div>

        <div className="p-2 rounded bg-neutral-950/40 border border-neutral-800">
          <span className="text-[10px] text-neutral-400 block flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-indigo-400" /> CK Buylist
          </span>
          <span className="font-bold text-indigo-300">
            {normalizedCard.ckPriceBuy ? `$${normalizedCard.ckPriceBuy}` : 'N/D'}
          </span>
        </div>
      </div>
    </div>
  );
}