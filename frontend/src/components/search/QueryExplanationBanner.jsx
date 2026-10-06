// ---------------------------------------------------------
// COMPONENTE: TRADUCTOR INTELIGENTE EN LENGUAJE NATURAL
// ---------------------------------------------------------
import React from 'react';
import { Sparkles, Terminal } from 'lucide-react';

export default function QueryExplanationBanner({
  explanationText = '',
  scryfallQuery = '',
  isLightMode = false,
}) {
  if (!explanationText && !scryfallQuery) return null;

  return (
    <div className={`rounded-2xl p-4 shadow-lg backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
      isLightMode ? 'bg-amber-500/10 text-neutral-900' : 'bg-neutral-900/70 text-neutral-100'
    }`}>
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold block">
            ¿Qué estás buscando?
          </span>
          <p className="text-xs sm:text-sm font-medium">
            {explanationText || 'Mostrando todas las cartas que coinciden con los filtros.'}
          </p>
        </div>
      </div>

      {scryfallQuery && (
        <div className="flex items-center gap-2 self-start md:self-auto px-3 py-1.5 rounded-xl bg-black/40 text-[11px] font-mono text-neutral-400 shrink-0">
          <Terminal className="w-3.5 h-3.5 text-amber-500" />
          <span className="truncate max-w-xs">{scryfallQuery}</span>
        </div>
      )}
    </div>
  );
}