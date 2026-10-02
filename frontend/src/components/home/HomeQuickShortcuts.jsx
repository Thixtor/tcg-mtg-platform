// ---------------------------------------------------------
// COMPONENTE: ATAJOS RÁPIDOS INFERIORES (CARPETAS Y TRADE)
// ---------------------------------------------------------
import React from 'react';
import { Layers, ArrowLeftRight, ArrowRight } from 'lucide-react';

export default function HomeQuickShortcuts({ isLightMode, onNavigateToCatalog, onNavigateToTradeWall }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
      <div className={`p-8 border flex flex-col justify-between space-y-4 shadow-xl transition hover:border-amber-500/50 ${
        isLightMode ? 'bg-white border-[#E8E2D5]' : 'bg-[#121214] border-neutral-800'
      }`}>
        <div className="space-y-2.5">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold tracking-tight">Carpetas & Inventario Físico</h3>
          <p className="text-xs text-neutral-400 leading-relaxed font-mono">
            Organiza tus carpetas físicas, audita cartas faltantes en tus barajas y marca ejemplares para intercambio comunitario.
          </p>
        </div>
        <div>
          <button
            onClick={() => onNavigateToCatalog?.()}
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-500 hover:underline"
          >
            <span>Explorar cartas en el catálogo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className={`p-8 border flex flex-col justify-between space-y-4 shadow-xl transition hover:border-emerald-500/50 ${
        isLightMode ? 'bg-white border-[#E8E2D5]' : 'bg-[#121214] border-neutral-800'
      }`}>
        <div className="space-y-2.5">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold tracking-tight">Muro de Intercambio P2P</h3>
          <p className="text-xs text-neutral-400 leading-relaxed font-mono">
            Descubre qué jugadores locales buscan las cartas que tienes disponibles y coordina trades justos con cotizaciones actualizadas.
          </p>
        </div>
        <div>
          <button
            onClick={onNavigateToTradeWall}
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 hover:underline"
          >
            <span>Ir al Muro de Trade</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}