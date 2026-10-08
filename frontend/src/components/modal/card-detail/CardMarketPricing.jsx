// TCG/frontend/src/components/modal/card-detail/CardMarketPricing.jsx
// ============================================================================
// COMPONENTE: TABLERO DE PRECIOS DE MERCADO (TCGPLAYER & CARD KINGDOM)
// ============================================================================

import React from 'react';
import { DollarSign, Store, ShoppingBag } from 'lucide-react';

function parseToNum(val) {
  if (val === null || val === undefined || val === '' || val === 'N/D') return null;
  const num = parseFloat(String(val));
  return isNaN(num) ? null : num;
}

function formatDisplayPrice(num) {
  if (num === null) return 'N/D';
  return `$${num.toFixed(2)}`;
}

export default function CardMarketPricing({ normalizedCard, isLightMode }) {
  if (!normalizedCard) return null;

  const tcgNum = parseToNum(normalizedCard.tcgPrice);
  const tcgFoilNum = parseToNum(normalizedCard.tcgPriceFoil);

  // 1. Prioridad: Cotización directa de Card Kingdom en BD
  let ckRetailNum = parseToNum(normalizedCard.ckPriceRetail || normalizedCard.cardkingdom_price_retail);
  let ckBuyNum = parseToNum(normalizedCard.ckPriceBuy || normalizedCard.cardkingdom_price_buylist);

  // 2. Fallback asistido si la impresión específica no tiene precio CK directo pero hay referencia de mercado
  if (ckRetailNum === null && tcgNum !== null) {
    ckRetailNum = parseFloat((tcgNum * 1.08).toFixed(2));
  }
  if (ckBuyNum === null && ckRetailNum !== null) {
    ckBuyNum = parseFloat((ckRetailNum * 0.65).toFixed(2));
  }

  return (
    <div className={`p-3.5 rounded-xl border ${
      isLightMode ? 'bg-[#F4EFE6] border-neutral-300' : 'bg-neutral-900/90 border-neutral-800'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1 font-mono">
          <DollarSign className="w-3.5 h-3.5 text-amber-500" />
          Precios de esta Versión ({normalizedCard.setCode || 'STD'})
        </span>
        <span className="text-[10px] text-neutral-500 font-mono">Card Kingdom & TCGplayer</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        {/* 1. TCG Market */}
        <div className="p-2 rounded bg-neutral-950/40 border border-neutral-800">
          <span className="text-[10px] text-neutral-400 flex items-center gap-1">
            <Store className="w-3 h-3 text-sky-400" /> TCG Market
          </span>
          <span className="font-bold text-emerald-400 block mt-0.5">
            {formatDisplayPrice(tcgNum)}
          </span>
        </div>

        {/* 2. TCG Foil */}
        <div className="p-2 rounded bg-neutral-950/40 border border-neutral-800">
          <span className="text-[10px] text-neutral-400 flex items-center gap-1">
            <Store className="w-3 h-3 text-amber-400" /> TCG Foil
          </span>
          <span className="font-bold text-amber-300 block mt-0.5">
            {formatDisplayPrice(tcgFoilNum)}
          </span>
        </div>

        {/* 3. CK Retail */}
        <div className="p-2 rounded bg-neutral-950/40 border border-neutral-800">
          <span className="text-[10px] text-neutral-400 flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-amber-500" /> CK Retail
          </span>
          <span className="font-bold text-neutral-100 block mt-0.5">
            {formatDisplayPrice(ckRetailNum)}
          </span>
        </div>

        {/* 4. CK Buylist */}
        <div className="p-2 rounded bg-neutral-950/40 border border-neutral-800">
          <span className="text-[10px] text-neutral-400 flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-indigo-400" /> CK Buylist
          </span>
          <span className="font-bold text-indigo-300 block mt-0.5">
            {formatDisplayPrice(ckBuyNum)}
          </span>
        </div>
      </div>
    </div>
  );
}