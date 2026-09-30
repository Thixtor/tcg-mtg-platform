// ---------------------------------------------------------
// COMPONENTE: ANALÍTICA INFERIOR DEL MAZO (ESTADÍSTICAS & TURNOS)
// ---------------------------------------------------------
import React, { useMemo } from 'react';
import { BarChart3, PieChart, Layers, Zap, ShieldCheck } from 'lucide-react';

const MANA_ICONS = {
  W: (
    <svg viewBox="0 0 100 100" className="w-3.5 h-3.5 fill-amber-100">
      <circle cx="50" cy="50" r="46" fill="#F8E7B9" />
      <path d="M50 16 L57 38 L80 38 L62 52 L68 74 L50 60 L32 74 L38 52 L20 38 L43 38 Z" fill="#D3A237" />
    </svg>
  ),
  U: (
    <svg viewBox="0 0 100 100" className="w-3.5 h-3.5">
      <circle cx="50" cy="50" r="46" fill="#0E68AB" />
      <path d="M50 18 C50 18 30 45 30 62 C30 73 39 82 50 82 C61 82 70 73 70 62 C70 45 50 18 50 18 Z" fill="#C1D7E9" />
    </svg>
  ),
  B: (
    <svg viewBox="0 0 100 100" className="w-3.5 h-3.5">
      <circle cx="50" cy="50" r="46" fill="#150B00" />
      <path d="M50 20 C35 20 30 35 30 50 C30 65 40 75 42 82 L58 82 C60 75 70 65 70 50 C70 35 65 20 50 20 Z" fill="#847B74" />
    </svg>
  ),
  R: (
    <svg viewBox="0 0 100 100" className="w-3.5 h-3.5">
      <circle cx="50" cy="50" r="46" fill="#D3202A" />
      <path d="M50 18 C45 32 32 40 38 58 C40 64 35 70 32 75 C45 84 62 80 65 68 C68 56 55 48 58 35 C60 28 55 22 50 18 Z" fill="#F8E7B9" />
    </svg>
  ),
  G: (
    <svg viewBox="0 0 100 100" className="w-3.5 h-3.5">
      <circle cx="50" cy="50" r="46" fill="#00733E" />
      <path d="M50 18 C38 28 28 42 35 60 C38 68 32 74 30 80 L70 80 C68 74 62 68 65 60 C72 42 62 28 50 18 Z" fill="#CADEC9" />
    </svg>
  ),
  C: (
    <svg viewBox="0 0 100 100" className="w-3.5 h-3.5">
      <circle cx="50" cy="50" r="46" fill="#9DA1AA" />
      <polygon points="50,20 78,50 50,80 22,50" fill="#ECEFF1" />
    </svg>
  )
};

// Función combinatoria nCr para probabilidad hipergeométrica
function combinations(n, r) {
  if (r < 0 || r > n) return 0;
  if (r === 0 || r === n) return 1;
  let c = 1;
  for (let i = 1; i <= r; i++) {
    c = (c * (n - (r - i))) / i;
  }
  return c;
}

// Probabilidad hipergeométrica: P(X >= 1) en muestra n
function probAtLeastOne(deckSize, successesInDeck, sampleSize) {
  if (deckSize <= 0 || successesInDeck <= 0 || sampleSize <= 0) return 0;
  const totalComb = combinations(deckSize, sampleSize);
  if (totalComb === 0) return 0;
  const zeroComb = combinations(deckSize - successesInDeck, sampleSize);
  const p = 1 - zeroComb / totalComb;
  return Math.min(Math.max(Math.round(p * 100), 0), 100);
}

function extractCardCmc(card) {
  if (typeof card.cmc === 'number') return card.cmc;
  if (typeof card.mana_value === 'number') return card.mana_value;
  const cost = card.mana_cost || '';
  if (!cost) return 0;
  let cmc = 0;
  const matches = cost.match(/\{([^}]+)\}/g) || [];
  matches.forEach((m) => {
    const sym = m.replace(/[{}]/g, '');
    const num = parseInt(sym, 10);
    if (!isNaN(num)) cmc += num;
    else if (sym !== 'X') cmc += 1;
  });
  return cmc;
}

export default function DeckAnalyticsSection({ cards = [] }) {
  // 1. Conteo por tipos
  const typeCounts = useMemo(() => {
    const counts = {
      creatures: 0,
      instants: 0,
      sorceries: 0,
      artifacts: 0,
      enchantments: 0,
      planeswalkers: 0,
      lands: 0,
      others: 0
    };

    cards.forEach((c) => {
      const t = (c.type_line || '').toLowerCase();
      const qty = c.quantity_needed || 1;
      if (t.includes('land') || t.includes('tierra')) counts.lands += qty;
      else if (t.includes('creature') || t.includes('criatura')) counts.creatures += qty;
      else if (t.includes('instant') || t.includes('instantáneo')) counts.instants += qty;
      else if (t.includes('sorcery') || t.includes('conjuro')) counts.sorceries += qty;
      else if (t.includes('artifact') || t.includes('artefacto')) counts.artifacts += qty;
      else if (t.includes('enchantment') || t.includes('encantamiento')) counts.enchantments += qty;
      else if (t.includes('planeswalker')) counts.planeswalkers += qty;
      else counts.others += qty;
    });

    return counts;
  }, [cards]);

  // 2. Curva de Maná
  const manaCurve = useMemo(() => {
    const buckets = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, '7+': 0 };
    cards.forEach((c) => {
      const isLand = (c.type_line || c.name || '').toLowerCase().includes('land') ||
                     (c.type_line || '').toLowerCase().includes('tierra');
      if (isLand) return;

      const cmc = Math.floor(extractCardCmc(c));
      const qty = c.quantity_needed || 1;
      if (cmc <= 0) buckets[0] += qty;
      else if (cmc >= 7) buckets['7+'] += qty;
      else buckets[cmc] += qty;
    });
    return buckets;
  }, [cards]);

  const maxVal = Math.max(...Object.values(manaCurve), 1);

  // 3. Símbolos de Maná
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

  // 4. Modelo de Curva Probable en Turnos Tempranos (T1 a T4)
  const turnProbabilities = useMemo(() => {
    const totalCards = cards.reduce((a, c) => a + (c.quantity_needed || 1), 0) || 99;
    const lands = typeCounts.lands;
    const spells1 = manaCurve[1] || 0;
    const spells2 = manaCurve[2] || 0;
    const spells3 = manaCurve[3] || 0;
    const spells4 = manaCurve[4] || 0;

    // Mano inicial (7 cartas) + 1 carta robada por turno adicional
    return [
      { turn: 'Turno 1', sample: 7, landsProb: probAtLeastOne(totalCards, lands, 7), playProb: probAtLeastOne(totalCards, spells1, 7), desc: 'Tierra + Jugada Coste 1' },
      { turn: 'Turno 2', sample: 8, landsProb: probAtLeastOne(totalCards, lands, 8), playProb: probAtLeastOne(totalCards, spells2, 8), desc: 'Tierra + Jugada Coste 2' },
      { turn: 'Turno 3', sample: 9, landsProb: probAtLeastOne(totalCards, lands, 9), playProb: probAtLeastOne(totalCards, spells3, 9), desc: 'Tierra + Jugada Coste 3' },
      { turn: 'Turno 4', sample: 10, landsProb: probAtLeastOne(totalCards, lands, 10), playProb: probAtLeastOne(totalCards, spells4, 10), desc: 'Tierra + Jugada Coste 4' }
    ];
  }, [cards, typeCounts.lands, manaCurve]);

  return (
    <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-6 mt-6">
      
      {/* Título de la Sección */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-500" />
          Estadísticas & Análisis Estratégico del Mazo
        </h3>
        <span className="text-xs font-mono text-neutral-400">Auditoría en tiempo real</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        
        {/* PANEL 1: DISTRIBUCIÓN POR TIPOS DE CARTA */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
          <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5 pb-2 border-b border-neutral-800">
            <Layers className="w-3.5 h-3.5 text-amber-500" /> Cantidad por Tipos
          </h4>
          <div className="space-y-1.5 pt-3 font-mono text-xs">
            <div className="flex justify-between text-neutral-300"><span>Criaturas:</span><strong className="text-white">{typeCounts.creatures}</strong></div>
            <div className="flex justify-between text-neutral-300"><span>Instantáneos:</span><strong className="text-white">{typeCounts.instants}</strong></div>
            <div className="flex justify-between text-neutral-300"><span>Conjuros:</span><strong className="text-white">{typeCounts.sorceries}</strong></div>
            <div className="flex justify-between text-neutral-300"><span>Artefactos:</span><strong className="text-white">{typeCounts.artifacts}</strong></div>
            <div className="flex justify-between text-neutral-300"><span>Encantamientos:</span><strong className="text-white">{typeCounts.enchantments}</strong></div>
            <div className="flex justify-between text-neutral-300"><span>Planeswalkers:</span><strong className="text-white">{typeCounts.planeswalkers}</strong></div>
            <div className="flex justify-between text-neutral-300 border-t border-neutral-800/80 pt-1 text-emerald-400">
              <span>Tierras:</span><strong>{typeCounts.lands}</strong>
            </div>
          </div>
        </div>

        {/* PANEL 2: CURVA DE MANÁ (CMC) */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Curva de Maná
            </h4>
            <span className="text-[10px] font-mono text-neutral-500">Sin Tierras</span>
          </div>

          <div className="grid grid-cols-8 gap-1 items-end h-28 pt-2 px-1">
            {Object.entries(manaCurve).map(([bucket, count]) => {
              const heightPct = Math.round((count / maxVal) * 100);
              return (
                <div key={bucket} className="flex flex-col items-center gap-1 h-full justify-end group">
                  <span className="text-[10px] font-mono text-neutral-400 group-hover:text-amber-400 font-bold transition">
                    {count}
                  </span>
                  <div className="w-full bg-neutral-900 rounded-t h-full max-h-[64px] flex items-end p-0.5">
                    <div
                      style={{ height: `${Math.max(heightPct, count > 0 ? 8 : 2)}%` }}
                      className={`w-full rounded-t transition-all duration-300 ${
                        count > 0 ? 'bg-gradient-to-t from-amber-500/70 to-amber-400' : 'bg-neutral-800/40'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 font-bold">{bucket}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL 3: SÍMBOLOS Y DEVOCIÓN DE COLOR */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-emerald-400" /> Símbolos de Maná
            </h4>
            <span className="text-[10px] font-mono text-neutral-400">{totalSymbols} req.</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-2">
            {Object.entries(MANA_ICONS).map(([key, iconSvg]) => {
              const count = colorDistribution[key] || 0;
              return (
                <div key={key} className="flex items-center justify-between px-2 py-1 rounded bg-neutral-900 border border-neutral-800/80">
                  <div className="flex items-center gap-1">
                    {iconSvg}
                    <span className="text-[10px] font-bold text-neutral-300 font-mono">{key}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-white">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL 4: PROBABILIDAD DE CURVA EN PRIMEROS TURNOS (HIPERGEOMÉTRICA) */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
          <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5 pb-2 border-b border-neutral-800">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Probabilidad en Turnos 1–4
          </h4>

          <div className="space-y-2 pt-2 font-mono text-[11px]">
            {turnProbabilities.map((t) => (
              <div key={t.turn} className="flex items-center justify-between bg-neutral-900/60 p-1.5 rounded border border-neutral-800/60">
                <span className="text-neutral-300 font-semibold">{t.turn}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400" title="Probabilidad de tener al menos una tierra">{t.landsProb}% Tierra</span>
                  <span>/</span>
                  <span className="text-amber-400" title="Probabilidad de tener hechizo de ese coste">{t.playProb}% Jugada</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </section>
  );
}