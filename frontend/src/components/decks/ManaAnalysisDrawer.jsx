// ---------------------------------------------------------
// COMPONENTE: CURVA DE MANÁ E ICONOS VECTORIALES DE MTG
// ---------------------------------------------------------
import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';

// Iconos vectoriales de los 6 tipos de maná canónicos de MTG (Regla 107.4)
const MANA_ICONS = {
  W: (
    <svg viewBox="0 0 100 100" className="w-4 h-4 fill-amber-100 drop-shadow-sm">
      <circle cx="50" cy="50" r="46" fill="#F8E7B9" />
      <path d="M50 16 L57 38 L80 38 L62 52 L68 74 L50 60 L32 74 L38 52 L20 38 L43 38 Z" fill="#D3A237" />
    </svg>
  ),
  U: (
    <svg viewBox="0 0 100 100" className="w-4 h-4 drop-shadow-sm">
      <circle cx="50" cy="50" r="46" fill="#0E68AB" />
      <path d="M50 18 C50 18 30 45 30 62 C30 73 39 82 50 82 C61 82 70 73 70 62 C70 45 50 18 50 18 Z" fill="#C1D7E9" />
    </svg>
  ),
  B: (
    <svg viewBox="0 0 100 100" className="w-4 h-4 drop-shadow-sm">
      <circle cx="50" cy="50" r="46" fill="#150B00" />
      <path d="M50 20 C35 20 30 35 30 50 C30 65 40 75 42 82 L58 82 C60 75 70 65 70 50 C70 35 65 20 50 20 Z" fill="#847B74" />
    </svg>
  ),
  R: (
    <svg viewBox="0 0 100 100" className="w-4 h-4 drop-shadow-sm">
      <circle cx="50" cy="50" r="46" fill="#D3202A" />
      <path d="M50 18 C45 32 32 40 38 58 C40 64 35 70 32 75 C45 84 62 80 65 68 C68 56 55 48 58 35 C60 28 55 22 50 18 Z" fill="#F8E7B9" />
    </svg>
  ),
  G: (
    <svg viewBox="0 0 100 100" className="w-4 h-4 drop-shadow-sm">
      <circle cx="50" cy="50" r="46" fill="#00733E" />
      <path d="M50 18 C38 28 28 42 35 60 C38 68 32 74 30 80 L70 80 C68 74 62 68 65 60 C72 42 62 28 50 18 Z" fill="#CADEC9" />
    </svg>
  ),
  C: (
    <svg viewBox="0 0 100 100" className="w-4 h-4 drop-shadow-sm">
      <circle cx="50" cy="50" r="46" fill="#9DA1AA" />
      <polygon points="50,20 78,50 50,80 22,50" fill="#ECEFF1" />
    </svg>
  )
};

/**
 * Extrae el Mana Value (CMC) de una carta incluso si el backend no lo calculó
 */
function extractCardCmc(card) {
  if (typeof card.cmc === 'number') return card.cmc;
  if (typeof card.mana_value === 'number') return card.mana_value;

  // Parser de respaldo desde mana_cost (ej: "{3}{G}{W}" -> 5)
  const cost = card.mana_cost || '';
  if (!cost) return 0;

  let cmc = 0;
  const matches = cost.match(/\{([^}]+)\}/g) || [];
  matches.forEach((m) => {
    const sym = m.replace(/[{}]/g, '');
    const num = parseInt(sym, 10);
    if (!isNaN(num)) {
      cmc += num;
    } else if (sym !== 'X') {
      cmc += 1;
    }
  });
  return cmc;
}

export default function ManaAnalysisDrawer({ cards = [] }) {
  // 1. Curva de maná calculada (excluyendo tierras, Regla 305)
  const manaCurve = useMemo(() => {
    const buckets = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, '7+': 0 };

    cards.forEach((card) => {
      const isLand = (card.type_line || card.name || '').toLowerCase().includes('land') ||
                     (card.type_line || '').toLowerCase().includes('tierra');
      if (isLand) return;

      const cmc = Math.floor(extractCardCmc(card));
      const qty = card.quantity_needed || 1;

      if (cmc <= 0) buckets[0] += qty;
      else if (cmc >= 7) buckets['7+'] += qty;
      else buckets[cmc] += qty;
    });

    return buckets;
  }, [cards]);

  const maxVal = Math.max(...Object.values(manaCurve), 1);

  // 2. Conteo de símbolos de maná coloreados
  const colorDistribution = useMemo(() => {
    const counts = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

    cards.forEach((card) => {
      const cost = card.mana_cost || '';
      const qty = card.quantity_needed || 1;

      ['W', 'U', 'B', 'R', 'G', 'C'].forEach((sym) => {
        const regex = new RegExp(`\\{${sym}\\}|\\{${sym}/[A-Z0-9]\\}|\\{[A-Z0-9]/${sym}\\}`, 'gi');
        const matches = (cost.match(regex) || []).length;
        counts[sym] += matches * qty;
      });
    });

    return counts;
  }, [cards]);

  const totalSymbols = Object.values(colorDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* 1. Curva de Maná */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
            Curva de Maná
          </h4>
          <span className="text-[10px] font-mono text-neutral-400">Sin Tierras</span>
        </div>

        {/* Gráfico de barras */}
        <div className="grid grid-cols-8 gap-1.5 pt-3 items-end h-28 px-1">
          {Object.entries(manaCurve).map(([bucket, count]) => {
            const heightPct = Math.round((count / maxVal) * 100);
            return (
              <div key={bucket} className="flex flex-col items-center gap-1 h-full justify-end group">
                <span className="text-[10px] font-mono text-neutral-400 group-hover:text-amber-400 font-bold transition">
                  {count}
                </span>
                <div className="w-full bg-neutral-950 rounded-t h-full max-h-[68px] flex items-end p-0.5">
                  <div
                    style={{ height: `${Math.max(heightPct, count > 0 ? 8 : 2)}%` }}
                    className={`w-full rounded-t transition-all duration-300 ${
                      count > 0
                        ? 'bg-gradient-to-t from-amber-500/70 to-amber-400 group-hover:from-amber-400 group-hover:to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                        : 'bg-neutral-800/40'
                    }`}
                  />
                </div>
                <span className="text-[10px] font-mono text-neutral-500 font-bold">{bucket}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Distribución con Iconos Reales de Maná */}
      <div>
        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
          <h4 className="text-xs font-bold text-white">Símbolos de Maná</h4>
          <span className="text-[10px] font-mono text-neutral-400">{totalSymbols} req.</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 pt-2">
          {Object.entries(MANA_ICONS).map(([key, iconSvg]) => {
            const count = colorDistribution[key] || 0;
            return (
              <div
                key={key}
                className="flex items-center justify-between px-2 py-1 rounded-lg bg-neutral-950/80 border border-neutral-800/90"
              >
                <div className="flex items-center gap-1.5">
                  {iconSvg}
                  <span className="text-[11px] font-bold text-neutral-300 font-mono">{key}</span>
                </div>
                <span className="text-xs font-mono font-bold text-white">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}