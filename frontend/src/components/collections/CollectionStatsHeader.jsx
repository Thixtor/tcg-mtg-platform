// ---------------------------------------------------------
// COMPONENTE: KPIS DE COLECCIONES
// ---------------------------------------------------------
import React from 'react';
import { Folder, Layers, DollarSign } from 'lucide-react';

export function CollectionStatsHeader({ 
  totalCollections = 0, 
  totalCards = 0, 
  totalValue = 0,
  isLightMode = false 
}) {
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalValue);

  return (
    <div className={`grid grid-cols-3 gap-2 sm:gap-6 p-3.5 sm:p-4 rounded-2xl border backdrop-blur-md transition-all ${
      isLightMode 
        ? 'bg-white/80 border-neutral-200/80 shadow-sm' 
        : 'bg-[#121214]/80 border-white/5 shadow-2xl'
    }`}>
      {/* 1. Colecciones */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
          <Folder className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <span className={`text-sm sm:text-xl font-black font-mono block leading-none ${
            isLightMode ? 'text-neutral-900' : 'text-white'
          }`}>
            {totalCollections}
          </span>
          <span className="text-[10px] sm:text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
            Colecciones
          </span>
        </div>
      </div>

      {/* 2. Total Cartas */}
      <div className="flex items-center gap-2.5 sm:gap-3 border-x border-white/5 px-2 sm:px-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
          <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <span className={`text-sm sm:text-xl font-black font-mono block leading-none ${
            isLightMode ? 'text-neutral-900' : 'text-white'
          }`}>
            {totalCards.toLocaleString()}
          </span>
          <span className="text-[10px] sm:text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
            Cartas
          </span>
        </div>
      </div>

      {/* 3. Valor Total de Mercado */}
      <div className="flex items-center gap-2.5 sm:gap-3 pl-1 sm:pl-2">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <span className={`text-sm sm:text-xl font-black font-mono block leading-none ${
            isLightMode ? 'text-neutral-900' : 'text-emerald-400'
          }`}>
            {formattedValue}
          </span>
          <span className="text-[10px] sm:text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
            Valor estimado
          </span>
        </div>
      </div>
    </div>
  );
}