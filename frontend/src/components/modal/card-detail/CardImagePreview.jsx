// TCG/frontend/src/components/modal/card-detail/CardImagePreview.jsx
// ============================================================================
// COMPONENTE: VISOR DE ILUSTRACIÓN & SELECTOR DE IMPRESIONES (DFC)
// ============================================================================

import React from 'react';
import { RotateCw, RefreshCw, Palette, Loader2 } from 'lucide-react';

export default function CardImagePreview({
  normalizedCard,
  activeVersion,
  baseCardId,
  faceIndex,
  onToggleFace,
  availablePrints,
  loadingPrints,
  onSelectPrint,
  onHoverPrint,
  onLeavePrint
}) {
  const currentSelectedId = activeVersion?.id || activeVersion?.scryfall_card_id || baseCardId;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Marco de la Ilustración */}
      <div className="relative group w-full max-w-[240px] aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-2xl border border-neutral-700/60 bg-neutral-950 transition-all duration-300">
        <img
          src={normalizedCard.imageUrl}
          alt={normalizedCard.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {normalizedCard.isMultiFace && (
          <button
            type="button"
            onClick={onToggleFace}
            title="Girar carta"
            className="absolute bottom-2.5 right-2.5 p-2 rounded-full bg-black/80 hover:bg-amber-500 hover:text-black text-white border border-white/20 transition-all shadow-xl cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Botón de Volteo Rápido */}
      {normalizedCard.isMultiFace && (
        <button
          type="button"
          onClick={onToggleFace}
          className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer font-mono"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Voltear ({faceIndex === 0 ? 'Cara Posterior' : 'Cara Frontal'})</span>
        </button>
      )}

      {/* Selector de Impresiones Alternativas */}
      <div className="w-full mt-4">
        <div className="flex items-center justify-between text-xs mb-2 px-1">
          <span className="font-bold flex items-center gap-1.5 text-neutral-400 font-mono">
            <Palette className="w-3.5 h-3.5 text-amber-500" /> 
            Estilos y Ediciones ({availablePrints.length || 1})
          </span>
          {loadingPrints && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
        </div>

        {availablePrints.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto p-1.5 scrollbar-thin scrollbar-thumb-neutral-700 max-w-full rounded-lg bg-neutral-900/30 border border-neutral-800/60">
            {availablePrints.map((print) => {
              const isSelected = String(currentSelectedId) === String(print.id);
              const thumb = print.image_uris?.small || print.card_faces?.[0]?.image_uris?.small;

              return (
                <button
                  type="button"
                  key={print.id}
                  onClick={() => onSelectPrint(print)}
                  onMouseEnter={() => onHoverPrint(print)}
                  onMouseLeave={onLeavePrint}
                  title={`${print.set_name} (#${print.collector_number})`}
                  className={`relative shrink-0 w-11 h-15 rounded overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-500/50 scale-105 shadow-md brightness-105'
                      : 'border-neutral-700/80 opacity-60 hover:opacity-100 hover:border-amber-400 hover:scale-105 hover:brightness-110'
                  }`}
                >
                  {thumb ? (
                    <img src={thumb} alt={print.set} className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <span className="text-[9px] font-mono p-1 uppercase">{print.set}</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-neutral-500 italic px-1 font-mono">Única impresión registrada en catálogo.</p>
        )}
      </div>
    </div>
  );
}