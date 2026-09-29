// ---------------------------------------------------------
// COMPONENTE: ANÁLISIS DE CURVA DE MANÁ Y SÍMBOLOS DE COLOR
// ---------------------------------------------------------
import React, { useMemo } from 'react';
import { BarChart3, PieChart, ShieldAlert } from 'lucide-react';

const COLOR_MAP = [
  { key: 'W', label: 'Blanco', bg: 'bg-amber-100', text: 'text-neutral-900', border: 'border-amber-200' },
  { key: 'U', label: 'Azul', bg: 'bg-sky-500', text: 'text-white', border: 'border-sky-400' },
  { key: 'B', label: 'Negro', bg: 'bg-neutral-800', text: 'text-neutral-100', border: 'border-neutral-600' },
  { key: 'R', label: 'Rojo', bg: 'bg-rose-500', text: 'text-white', border: 'border-rose-400' },
  { key: 'G', label: 'Verde', bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-400' },
  { key: 'C', label: 'Incoloro', bg: 'bg-neutral-600', text: 'text-neutral-200', border: 'border-neutral-500' }
];

export default function ManaAnalysisDrawer({ cards = [] }) {
  // Desglose de curva de maná (0, 1, 2, 3, 4, 5, 6, 7+) excluyendo tierras
  const manaCurve = useMemo(() => {
    const buckets = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, '7+': 0 };

    cards.forEach((card) => {
      const isLand = (card.type_line || card.name || '').toLowerCase().includes('land') ||
                     (card.type_line || '').toLowerCase().includes('tierra');
      if (isLand) return;

      const cmc = Math.floor(card.mana_value ?? card.cmc ?? 0);
      const qty = card.quantity_needed || 1;

      if (cmc <= 0) buckets[0] += qty;
      else if (cmc >= 7) buckets['7+'] += qty;
      else buckets[cmc] += qty;
    });

    return buckets;
  }, [cards]);

  const maxBucketVal = Math.max(...Object.values(manaCurve), 1);

  // Conteo de símbolos de color para devoción y balance
  const colorDistribution = useMemo(() => {
    const counts = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

    cards.forEach((card) => {
      const cost = card.mana_cost || '';
      const qty = card.quantity_needed || 1;

      for (let char of ['W', 'U', 'B', 'R', 'G', 'C']) {
        const regex = new RegExp(`\\{${char}\\}|\\{${char}/[A-Z0-9]\\}|\\{[A-Z0-9]/${char}\\}`, 'gi');
        const matches = (cost.match(regex) || []).length;
        counts[char] += matches * qty;
      }
    });

    return counts;
  }, [cards]);

  const totalSymbols = Object.values(colorDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-6">
      
      {/* 1. Curva de Maná */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            Curva de Maná (Valor de Maná / CMC)
          </h4>
          <span className="text-[10px] font-mono text-neutral-400">Sin incluir Tierras</span>
        </div>

        <div className="grid grid-cols-8 gap-2 pt-4 items-end h-32 px-2">
          {Object.entries(manaCurve).map(([bucket, count]) => {
            const heightPct = Math.round((count / maxBucketVal) * 100);
            return (
              <div key={bucket} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                <span className="text-[10px] font-mono font-bold text-neutral-400 group-hover:text-amber-400 transition">
                  {count}
                </span>
                <div className="w-full bg-neutral-950 rounded-t-lg h-full max-h-[80px] flex items-end p-0.5">
                  <div
                    style={{ height: `${Math.max(heightPct, 6)}%` }}
                    className="w-full rounded-t bg-gradient-to-t from-amber-500/50 to-amber-400 group-hover:from-amber-500 group-hover:to-amber-300 transition-all duration-300"
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-neutral-500">{bucket}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Distribución de Color y Devoción */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            Símbolos de Maná en Costes ({totalSymbols} requeridos)
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3">
          {COLOR_MAP.map(({ key, label, bg, text }) => {
            const count = colorDistribution[key] || 0;
            const pct = totalSymbols > 0 ? Math.round((count / totalSymbols) * 100) : 0;
            return (
              <div key={key} className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${bg} ${text}`}>
                    {key}
                  </span>
                  <span className="text-xs font-medium text-neutral-300">{label}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-white">{count}</span>
                  <span className="text-[10px] font-mono text-neutral-500 block">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}