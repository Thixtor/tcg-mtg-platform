// frontend/src/components/cards/card-detail/CardMarketPricing.jsx
// ============================================================================
// SUBCOMPONENTE: COTIZACIONES DE MERCADO EN TIEMPO REAL (TCG & CARD KINGDOM)
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Renderiza cotizaciones comparativas entre TCGplayer y Card Kingdom.
// - Maneja precios Regular, Foil, Retail y Buylist.
// - Soporta modo oscuro y claro de forma armónica.
// - Formato de moneda defensivo (tolera valores null, undefined o string numérico).
// ============================================================================

import React from 'react';
import { DollarSign, ExternalLink, Sparkles, ShoppingBag } from 'lucide-react';

/**
 * Formatea un valor monetario a USD con dos decimales.
 * @param {string|number|null} val 
 * @returns {string}
 */
function formatUsd(val) {
  if (val === null || val === undefined || val === '') return '—';
  const num = parseFloat(String(val));
  if (isNaN(num)) return '—';
  return `$${num.toFixed(2)}`;
}

export default function CardMarketPricing({ normalizedCard, isLightMode }) {
  if (!normalizedCard) return null;

  const {
    tcgPrice,
    tcgPriceFoil,
    ckPriceRetail,
    ckPriceBuy,
    ckPriceFoil,
    name
  } = normalizedCard;

  const tcgSearchUrl = `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(name)}&view=grid`;
  const ckSearchUrl = `https://www.cardkingdom.com/purchasing/mtg_singles?search=header&filter%5Bname%5D=${encodeURIComponent(name)}`;

  return (
    <div className="space-y-2.5 font-mono">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-400 flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5 text-amber-500" />
          Precios de Referencia de Mercado
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* ============================================================= */}
        {/* TARJETA 1: TCGPLAYER */}
        {/* ============================================================= */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between transition-colors ${
          isLightMode 
            ? 'bg-neutral-100/80 border-neutral-200 hover:border-neutral-300' 
            : 'bg-[#181622]/60 border-[#2A2733] hover:border-neutral-700'
        }`}>
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />
                TCGplayer
              </span>
              <a
                href={tcgSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-neutral-400 hover:text-sky-400 inline-flex items-center gap-1 transition"
                title="Ver en TCGplayer"
              >
                <span>Mercado</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 text-[11px]">Regular:</span>
                <span className={`font-bold ${tcgPrice ? 'text-white' : 'text-neutral-500'}`}>
                  {formatUsd(tcgPrice)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-400 text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Foil:
                </span>
                <span className={`font-bold ${tcgPriceFoil ? 'text-amber-300' : 'text-neutral-500'}`}>
                  {formatUsd(tcgPriceFoil)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================= */}
        {/* TARJETA 2: CARD KINGDOM */}
        {/* ============================================================= */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between transition-colors ${
          isLightMode 
            ? 'bg-neutral-100/80 border-neutral-200 hover:border-neutral-300' 
            : 'bg-[#181622]/60 border-[#2A2733] hover:border-neutral-700'
        }`}>
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />
                Card Kingdom
              </span>
              <a
                href={ckSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-neutral-400 hover:text-amber-400 inline-flex items-center gap-1 transition"
                title="Ver en Card Kingdom"
              >
                <span>Tienda</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 text-[11px]">Retail (Venta):</span>
                <span className={`font-bold ${ckPriceRetail ? 'text-white' : 'text-neutral-500'}`}>
                  {formatUsd(ckPriceRetail)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-400 text-[11px]">Buylist (Compra):</span>
                <span className={`font-bold ${ckPriceBuy ? 'text-emerald-400' : 'text-neutral-500'}`}>
                  {formatUsd(ckPriceBuy)}
                </span>
              </div>

              {ckPriceFoil && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 text-[11px] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Foil:
                  </span>
                  <span className="font-bold text-amber-300">
                    {formatUsd(ckPriceFoil)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}