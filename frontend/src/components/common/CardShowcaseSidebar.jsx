// ---------------------------------------------------------
// COMPONENTE: PANEL LATERAL DE INSPECCIÓN (BORDERLESS)
// ---------------------------------------------------------
import React from 'react';
import { Crown, Compass, Sparkles, DollarSign, Flame, X } from 'lucide-react';

export default function CardShowcaseSidebar({
  displayCard,
  commanders = [],
  onSelectHoveredCard,
  onNavigateToTradeWall,
  readinessPct,
  availableCount,
  inOtherDeckCount,
  missingCount,
  statusFilter,
  setStatusFilter,
  isLightMode
}) {
  return (
    <aside className="w-full space-y-3">
      
      {/* 1. TARJETA DE INSPECCIÓN */}
      <div className={`rounded-2xl p-4 shadow-sm flex flex-col items-center text-center space-y-3 transition ${
        isLightMode
          ? 'bg-[#EFE9DC] text-[#2C2825]'
          : 'bg-neutral-900/60 text-neutral-100'
      }`}>
        
        <div className="w-full flex items-center justify-center gap-2">
          {commanders.length > 1 ? (
            <div className="flex gap-2 justify-center">
              {commanders.map((cmd) => (
                <div
                  key={cmd.deck_card_id}
                  onClick={() => onSelectHoveredCard?.(cmd)}
                  className={`relative w-28 aspect-[2.5/3.5] rounded-xl overflow-hidden cursor-pointer shadow transition ${
                    displayCard?.deck_card_id === cmd.deck_card_id
                      ? 'ring-2 ring-amber-500'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={cmd.image_url} alt={cmd.name} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 px-1 rounded bg-amber-500 text-neutral-950 font-bold text-[8px] flex items-center gap-0.5">
                    <Crown className="w-2 h-2" /> Partner
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`relative w-full max-w-[230px] aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-md ${
              isLightMode ? 'bg-[#E2DBD0]' : 'bg-neutral-950'
            }`}>
              {displayCard?.image_url ? (
                <img
                  src={displayCard.image_url}
                  alt={displayCard.name}
                  className="w-full h-full object-cover transition-opacity duration-150"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-xs font-mono opacity-50">
                  <Sparkles className="w-6 h-6 text-amber-500 mb-2" />
                  <span>Pasa el cursor sobre una carta</span>
                </div>
              )}
              {displayCard?.category === 'commander' && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-neutral-950 font-bold text-[9px] flex items-center gap-1 shadow">
                  <Crown className="w-2.5 h-2.5" /> Comandante
                </div>
              )}
              {displayCard?.category === 'companion' && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-sky-500 text-neutral-950 font-bold text-[9px] flex items-center gap-1 shadow">
                  <Compass className="w-2.5 h-2.5" /> Companion
                </div>
              )}
            </div>
          )}
        </div>

        {displayCard && (
          <div className="w-full text-left space-y-1 pt-1">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold truncate ${isLightMode ? 'text-[#1F1C19]' : 'text-white'}`}>
                {displayCard.name}
              </h3>
              <span className={`text-[10px] font-mono ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                {(displayCard.set_code || '---').toUpperCase()}
              </span>
            </div>
            <p className={`text-xs font-mono truncate ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
              {displayCard.type_line || displayCard.category?.toUpperCase()}
            </p>
          </div>
        )}

        {/* Precios Estimados */}
        <div className="w-full grid grid-cols-2 gap-2 pt-2 font-mono text-left">
          <div className={`rounded-lg p-2 ${
            isLightMode ? 'bg-[#FAF7F2]' : 'bg-neutral-950/70'
          }`}>
            <span className={`text-[9px] flex items-center gap-1 ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
              <DollarSign className="w-2.5 h-2.5 text-amber-500" /> Precio Tienda
            </span>
            <span className={`text-xs font-bold ${isLightMode ? 'text-[#1F1C19]' : 'text-white'}`}>
              {displayCard?.prices?.usd ? `$${displayCard.prices.usd}` : '$0.49 USD'}
            </span>
          </div>

          <div className={`rounded-lg p-2 ${
            isLightMode ? 'bg-[#FAF7F2]' : 'bg-neutral-950/70'
          }`}>
            <span className={`text-[9px] flex items-center gap-1 ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
              <Flame className="w-2.5 h-2.5 text-emerald-600" /> Trade Local
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {displayCard?.available_in_trade_count ?? 3} disp.
            </span>
          </div>
        </div>

        <button
          onClick={onNavigateToTradeWall}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Trade Ahora</span>
        </button>
      </div>

      {/* 2. AUDITORÍA FÍSICA CLICABLE */}
      <div className={`rounded-xl p-3 space-y-2 text-xs font-mono transition ${
        isLightMode 
          ? 'bg-[#EFE9DC] text-[#2C2825]' 
          : 'bg-neutral-900/60 text-neutral-200'
      }`}>
        <div className="flex justify-between items-center">
          <span className={isLightMode ? 'text-neutral-600' : 'text-neutral-400'}>Auditoría Física:</span>
          <span className="text-emerald-500 font-bold">{readinessPct}%</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
          <button
            onClick={() => setStatusFilter?.(statusFilter === 'DISPONIBLE' ? null : 'DISPONIBLE')}
            className={`p-1.5 rounded transition ${
              statusFilter === 'DISPONIBLE'
                ? (isLightMode ? 'bg-emerald-200 text-emerald-900 font-bold' : 'bg-emerald-950 text-emerald-300 ring-1 ring-emerald-500')
                : (isLightMode ? 'bg-[#FAF7F2] text-neutral-700' : 'bg-neutral-950/70 text-neutral-300')
            }`}
          >
            <span className="text-[9px] block text-neutral-500">Disp.</span>
            <span className="text-emerald-500 font-bold">{availableCount}</span>
          </button>

          <button
            onClick={() => setStatusFilter?.(statusFilter === 'EN_OTRO_MAZO' ? null : 'EN_OTRO_MAZO')}
            className={`p-1.5 rounded transition ${
              statusFilter === 'EN_OTRO_MAZO'
                ? (isLightMode ? 'bg-amber-200 text-amber-900 font-bold' : 'bg-amber-950 text-amber-300 ring-1 ring-amber-500')
                : (isLightMode ? 'bg-[#FAF7F2] text-neutral-700' : 'bg-neutral-950/70 text-neutral-300')
            }`}
          >
            <span className="text-[9px] block text-neutral-500">Otros</span>
            <span className="text-amber-500 font-bold">{inOtherDeckCount}</span>
          </button>

          <button
            onClick={() => setStatusFilter?.(statusFilter === 'FALTANTE' ? null : 'FALTANTE')}
            className={`p-1.5 rounded transition ${
              statusFilter === 'FALTANTE'
                ? (isLightMode ? 'bg-rose-200 text-rose-900 font-bold' : 'bg-rose-950 text-rose-300 ring-1 ring-rose-500')
                : (isLightMode ? 'bg-[#FAF7F2] text-neutral-700' : 'bg-neutral-950/70 text-neutral-300')
            }`}
          >
            <span className="text-[9px] block text-neutral-500">Falta</span>
            <span className="text-rose-500 font-bold">{missingCount}</span>
          </button>
        </div>

        {statusFilter && (
          <button
            onClick={() => setStatusFilter?.(null)}
            className="w-full pt-1 text-[10px] text-amber-500 hover:underline flex items-center justify-center gap-1"
          >
            <X className="w-2.5 h-2.5" /> Limpiar filtro ({statusFilter})
          </button>
        )}
      </div>

    </aside>
  );
}