// ---------------------------------------------------------
// COMPONENTE: TARJETA DE CREACIÓN RÁPIDA DE COLECCIÓN
// ---------------------------------------------------------
import React from 'react';
import { Plus, ArrowRight } from 'lucide-react';

export function CreateCollectionCard({ onClick, isLightMode = false }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={`group relative rounded-3xl p-8 flex flex-col items-center justify-center text-center border-2 border-dashed transition-all duration-300 cursor-pointer min-h-[300px] select-none ${
        isLightMode
          ? 'bg-neutral-100/60 border-neutral-300 hover:border-amber-500/70 hover:bg-amber-500/5'
          : 'bg-[#111113]/50 border-neutral-800/80 hover:border-amber-500/50 hover:bg-[#151518]'
      }`}
    >
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-neutral-950 transition-all duration-300 shadow-lg shadow-amber-500/10">
        <Plus className="w-8 h-8 stroke-[2.5]" />
      </div>

      <h3 className={`text-lg font-black uppercase tracking-tight mb-2 ${
        isLightMode ? 'text-neutral-900' : 'text-white'
      }`}>
        + Nueva colección
      </h3>

      <p className="text-xs text-neutral-400 font-mono max-w-xs leading-relaxed mb-6">
        Organiza tus carpetas, separa cartas para intercambio o clasifica tus mazos favoritos.
      </p>

      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-neutral-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-md group-hover:shadow-amber-500/20">
        <span>Crear colección</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </div>
  );
}