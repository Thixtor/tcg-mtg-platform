// ---------------------------------------------------------
// COMPONENTE: QUERY EXPLANATION BANNER (PALETA UNIFICADA)
// ---------------------------------------------------------
import React from 'react';
import { Sparkles } from 'lucide-react';

export default function QueryExplanationBanner({
  explanationText,
  scryfallQuery,
}) {
  return (
    <div className="p-4 border border-[#2A2733] bg-[#131217] rounded-2xl font-mono text-xs space-y-1.5 shadow-md">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#E88B00]">
        <Sparkles className="w-3.5 h-3.5" />
        <span>¿Qué estás buscando?</span>
      </div>
      <p className="text-neutral-200 text-xs font-bold leading-relaxed">
        {explanationText}
      </p>
      {scryfallQuery && (
        <p className="text-[11px] text-neutral-400 truncate">
          <span className="text-[#E88B00] font-bold">Query:</span> {scryfallQuery}
        </p>
      )}
    </div>
  );
}