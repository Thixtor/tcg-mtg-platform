// ---------------------------------------------------------
// COMPONENTE: ANALÍTICA DEL MAZO (ESTADÍSTICAS & COSTES)
// ---------------------------------------------------------
import React, { useMemo, useState } from 'react';
import { 
  BarChart3, 
  PieChart, 
  Layers, 
  Zap, 
  DollarSign, 
  Tag
} from 'lucide-react';
import { ManaGlyph } from '@/components/common/ManaSymbol';
import { getCardPriceBySource } from '@/utils/pricing';

const COLOR_CONFIG = {
  W: { label: 'Blanco', bg: '#F8E7B9' },
  U: { label: 'Azul', bg: '#0E68AB' },
  B: { label: 'Negro', bg: '#3F3F46' },
  R: { label: 'Rojo', bg: '#EF4444' },
  G: { label: 'Verde', bg: '#22C55E' },
  C: { label: 'Incoloro', bg: '#71717A' },
  M: { label: 'Multicolor', bg: '#EAB308' },
};

const TYPE_COLORS = {
  tierras: '#64748B',
  criaturas: '#EF4444',
  artefactos: '#E2E8F0',
  encantamientos: '#F59E0B',
  instantaneos: '#3B82F6',
  conjuros: '#10B981',
  otros: '#8B5CF6'
};

function extractCardCmc(card) {
  if (!card) return 0;
  if (typeof card.cmc === 'number') return card.cmc;
  if (typeof card.mana_value === 'number') return card.mana_value;
  const cost = card.mana_cost || card.card_catalog?.mana_cost || '';
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

function getCardColorType(card) {
  if (!card) return 'C';
  const colors = card.colors || card.card_catalog?.colors || [];
  if (colors.length === 0) {
    const cost = card.mana_cost || card.card_catalog?.mana_cost || '';
    if (cost.includes('{W}')) return 'W';
    if (cost.includes('{U}')) return 'U';
    if (cost.includes('{B}')) return 'B';
    if (cost.includes('{R}')) return 'R';
    if (cost.includes('{G}')) return 'G';
    return 'C';
  }
  if (colors.length === 1) return colors[0];
  return 'M';
}

export default function DeckAnalyticsSection({ cards = [], initialPriceSource = 'tcgplayer' }) {
  const [activePriceSource, setActivePriceSource] = useState(initialPriceSource);
  const [hoveredCmc, setHoveredCmc] = useState(null);

  // 1. Valor económico total del mazo
  const totalDeckPrice = useMemo(() => {
    if (!Array.isArray(cards)) return 0;
    return cards.reduce((acc, card) => {
      const cardData = card.card_catalog || card;
      const qty = card.quantity_needed || card.quantity || 1;
      const price = getCardPriceBySource(cardData, activePriceSource);
      return acc + (Number(price || 0) * qty);
    }, 0);
  }, [cards, activePriceSource]);

  // 2. Conteo por tipos
  const typeCounts = useMemo(() => {
    const counts = {
      tierras: 0,
      criaturas: 0,
      artefactos: 0,
      encantamientos: 0,
      instantaneos: 0,
      conjuros: 0,
      otros: 0
    };

    if (!Array.isArray(cards)) return counts;

    cards.forEach((c) => {
      const t = (c.type_line || c.card_catalog?.type_line || '').toLowerCase();
      const qty = c.quantity_needed || c.quantity || 1;
      if (t.includes('land') || t.includes('tierra')) counts.tierras += qty;
      else if (t.includes('creature') || t.includes('criatura')) counts.criaturas += qty;
      else if (t.includes('artifact') || t.includes('artefacto')) counts.artefactos += qty;
      else if (t.includes('enchantment') || t.includes('encantamiento')) counts.encantamientos += qty;
      else if (t.includes('instant') || t.includes('instantáneo')) counts.instantaneos += qty;
      else if (t.includes('sorcery') || t.includes('conjuro')) counts.conjuros += qty;
      else counts.otros += qty;
    });

    return counts;
  }, [cards]);

  const totalTypesCount = useMemo(() => {
    return Object.values(typeCounts).reduce((a, b) => a + b, 0) || 1;
  }, [typeCounts]);

  // 3. Subtipos más comunes (Tribal)
  const topSubtypes = useMemo(() => {
    const map = {};
    if (Array.isArray(cards)) {
      cards.forEach((c) => {
        const typeLine = c.type_line || c.card_catalog?.type_line || '';
        if (typeLine.includes('—')) {
          const subtypesPart = typeLine.split('—')[1] || '';
          const words = subtypesPart.trim().split(/\s+/);
          const qty = c.quantity_needed || c.quantity || 1;
          words.forEach((w) => {
            if (w && w.length > 2) {
              map[w] = (map[w] || 0) + qty;
            }
          });
        }
      });
    }

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const totalSubtypes = entries.reduce((acc, curr) => acc + curr[1], 0) || 1;
    const top = entries.slice(0, 5).map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / totalSubtypes) * 100)
    }));

    const othersCount = entries.slice(5).reduce((acc, curr) => acc + curr[1], 0);
    if (othersCount > 0) {
      top.push({
        name: 'Otras',
        count: othersCount,
        pct: Math.round((othersCount / totalSubtypes) * 100)
      });
    }

    return top;
  }, [cards]);

  // 4. Curva de Maná
  const { manaCurve, maxBucketCount, averageCmc, totalManaValue } = useMemo(() => {
    const buckets = {
      0: { total: 0, colors: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, M: 0 } },
      1: { total: 0, colors: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, M: 0 } },
      2: { total: 0, colors: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, M: 0 } },
      3: { total: 0, colors: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, M: 0 } },
      4: { total: 0, colors: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, M: 0 } },
      5: { total: 0, colors: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, M: 0 } },
      6: { total: 0, colors: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, M: 0 } },
      '7+': { total: 0, colors: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, M: 0 } },
    };

    let totalCmcSum = 0;
    let nonLandsCount = 0;

    if (Array.isArray(cards)) {
      cards.forEach((c) => {
        const t = (c.type_line || c.card_catalog?.type_line || c.name || '').toLowerCase();
        if (t.includes('land') || t.includes('tierra')) return;

        const cmc = Math.floor(extractCardCmc(c));
        const qty = c.quantity_needed || c.quantity || 1;
        const colorType = getCardColorType(c);

        totalCmcSum += cmc * qty;
        nonLandsCount += qty;

        const bucketKey = cmc <= 0 ? 0 : cmc >= 7 ? '7+' : cmc;
        if (buckets[bucketKey]) {
          buckets[bucketKey].total += qty;
          buckets[bucketKey].colors[colorType] = (buckets[bucketKey].colors[colorType] || 0) + qty;
        }
      });
    }

    const maxCount = Math.max(...Object.values(buckets).map((b) => b.total), 1);
    const avg = nonLandsCount > 0 ? (totalCmcSum / nonLandsCount).toFixed(2) : '0.00';

    return {
      manaCurve: buckets,
      maxBucketCount: maxCount,
      averageCmc: avg,
      totalManaValue: totalCmcSum,
    };
  }, [cards]);

  // 5. Conteo de símbolos de color
  const colorDistribution = useMemo(() => {
    const counts = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    if (Array.isArray(cards)) {
      cards.forEach((card) => {
        const cost = card.mana_cost || card.card_catalog?.mana_cost || '';
        const qty = card.quantity_needed || card.quantity || 1;
        ['W', 'U', 'B', 'R', 'G', 'C'].forEach((sym) => {
          const regex = new RegExp(`\\{${sym}\\}|\\{${sym}/[A-Z0-9]\\}|\\{[A-Z0-9]/${sym}\\}`, 'gi');
          const matches = (cost.match(regex) || []).length;
          counts[sym] += matches * qty;
        });
      });
    }
    return counts;
  }, [cards]);

  const totalSymbols = Object.values(colorDistribution).reduce((a, b) => a + b, 0);

  // Donut SVG para tipos
  const typeDonutSegments = useMemo(() => {
    let cumulative = 0;
    return Object.entries(typeCounts).map(([key, count]) => {
      if (count === 0) return null;
      const pct = (count / totalTypesCount) * 100;
      const strokeDasharray = `${pct} ${100 - pct}`;
      const strokeDashoffset = -cumulative;
      cumulative += pct;
      return {
        key,
        count,
        pct: Math.round(pct),
        color: TYPE_COLORS[key] || '#71717A',
        strokeDasharray,
        strokeDashoffset
      };
    }).filter(Boolean);
  }, [typeCounts, totalTypesCount]);

  return (
    <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6 mt-6">
      
      {/* 1. Cabecera con selector de tienda y precio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            Estadísticas & Análisis Estratégico del Mazo
          </h3>
          <span className="text-xs font-mono text-neutral-400">Auditoría de curvas, tipos y costes en tiempo real</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-neutral-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActivePriceSource('tcgplayer')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                activePriceSource === 'tcgplayer'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              TCGplayer
            </button>
            <button
              type="button"
              onClick={() => setActivePriceSource('cardkingdom')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                activePriceSource === 'cardkingdom'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Card Kingdom
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-mono">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-bold">${totalDeckPrice.toFixed(2)} USD</span>
          </div>
        </div>
      </div>

      {/* 2. Grilla 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PANEL 1: CURVA DE MANÁ */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
            <h4 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Valor de Maná (Curva)
            </h4>
            <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
              <span>Media: <strong className="text-amber-400 text-sm">{averageCmc}</strong></span>
              <span>·</span>
              <span>Total: <strong className="text-neutral-200 text-sm">{totalManaValue}</strong></span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-3 h-48 pt-6 px-2">
            {Object.entries(manaCurve).map(([bucket, data]) => {
              const count = data.total;
              const isHovered = hoveredCmc === bucket;
              const heightPct = Math.round((count / maxBucketCount) * 100);

              return (
                <div 
                  key={bucket}
                  onMouseEnter={() => setHoveredCmc(bucket)}
                  onMouseLeave={() => setHoveredCmc(null)}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end cursor-pointer group/bar"
                >
                  <span className={`text-xs font-mono font-bold transition-all ${
                    isHovered ? 'text-amber-400 scale-125' : count > 0 ? 'text-white' : 'text-neutral-600'
                  }`}>
                    {count}
                  </span>

                  <div className="w-full bg-neutral-900/90 rounded-t-lg h-full max-h-[135px] flex items-end p-0.5 border border-neutral-800 group-hover/bar:border-amber-500/50 transition">
                    <div 
                      style={{ height: `${Math.max(heightPct, count > 0 ? 10 : 3)}%` }}
                      className="w-full rounded-t-md flex flex-col-reverse overflow-hidden transition-all duration-300"
                    >
                      {count > 0 ? (
                        Object.entries(data.colors).map(([colKey, colCount]) => {
                          if (colCount <= 0) return null;
                          const segPct = (colCount / count) * 100;
                          const cfg = COLOR_CONFIG[colKey] || COLOR_CONFIG.C;
                          return (
                            <div 
                              key={colKey}
                              style={{ height: `${segPct}%`, backgroundColor: cfg.bg }}
                              title={`${colCount}x ${cfg.label}`}
                              className="w-full transition-opacity hover:opacity-80"
                            />
                          );
                        })
                      ) : (
                        <div className="w-full h-full bg-neutral-800/20" />
                      )}
                    </div>
                  </div>

                  <span className={`text-xs font-mono font-bold transition-colors ${
                    isHovered ? 'text-amber-400' : 'text-neutral-400'
                  }`}>
                    {bucket}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-neutral-800/80 text-xs font-mono text-neutral-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F8E7B9]" /> Blanco</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0E68AB]" /> Azul</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3F3F46] border border-neutral-600" /> Negro</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Rojo</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" /> Verde</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#71717A]" /> Incoloro</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EAB308]" /> Multi</span>
          </div>
        </div>

        {/* PANEL 2: TIPOS DE CARTAS */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
            <h4 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-sky-400" /> Tipos de Cartas
            </h4>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {typeCounts.tierras} Tierras ({Math.round((typeCounts.tierras / totalTypesCount) * 100)}%)
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {typeDonutSegments.map((seg) => (
                  <circle
                    key={seg.key}
                    cx="18"
                    cy="18"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="4.5"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-bold text-white font-mono">{cards.length}</span>
                <span className="text-[9px] text-neutral-400 font-mono uppercase tracking-wider">Cartas</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs text-neutral-300 w-full sm:w-auto">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.criaturas }} /> Criaturas</span>
                <strong className="text-white">{typeCounts.criaturas}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.tierras }} /> Tierras</span>
                <strong className="text-white">{typeCounts.tierras}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.artefactos }} /> Artefactos</span>
                <strong className="text-white">{typeCounts.artefactos}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.encantamientos }} /> Encantos</span>
                <strong className="text-white">{typeCounts.encantamientos}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.instantaneos }} /> Instantáneos</span>
                <strong className="text-white">{typeCounts.instantaneos}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.conjuros }} /> Conjuros</span>
                <strong className="text-white">{typeCounts.conjuros}</strong>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-800/80 text-[11px] font-mono text-neutral-500 text-center">
            Proporción balanceada para el formato Commander / Construido
          </div>
        </div>

        {/* PANEL 3: SUBTIPOS PRINCIPALES */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
            <h4 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-500" /> Subtipos Principales (Tribal)
            </h4>
            <span className="text-xs font-mono text-neutral-400">Distribución de subtipos</span>
          </div>

          <div className="space-y-3.5 py-3 font-mono text-xs">
            {topSubtypes.length > 0 ? (
              topSubtypes.map((sub) => (
                <div key={sub.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-200 font-semibold">{sub.name}</span>
                    <span className="text-neutral-400 font-bold">
                      {sub.count} ({sub.pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden border border-neutral-800">
                    <div 
                      style={{ width: `${Math.max(sub.pct, 4)}%` }} 
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-500 py-8 text-center italic">Sin subtipos registrados en las cartas del mazo.</p>
            )}
          </div>

          <div className="pt-3 border-t border-neutral-800/80 text-[11px] font-mono text-neutral-500 text-center">
            Sinergia y consistencia tribal calculada sobre criaturas y permanentes
          </div>
        </div>

        {/* PANEL 4: SÍMBOLOS & COSTES DE COLOR */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
            <h4 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" /> Símbolos & Devoción de Color
            </h4>
            <span className="text-xs font-mono text-neutral-400">{totalSymbols} requeridos</span>
          </div>

          <div className="grid grid-cols-3 gap-3 py-3">
            {['W', 'U', 'B', 'R', 'G', 'C'].map((symbol) => {
              const count = colorDistribution[symbol] || 0;
              const pct = totalSymbols > 0 ? Math.round((count / totalSymbols) * 100) : 0;

              return (
                <div key={symbol} className="flex flex-col justify-between p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ManaGlyph symbol={`{${symbol}}`} size="text-[16px]" cost={true} shadow={true} />
                      <span className="text-xs font-bold text-neutral-300 font-mono">{symbol}</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-white">{count}</span>
                  </div>

                  <div className="w-full bg-neutral-950 rounded-full h-1.5 mt-2.5 overflow-hidden border border-neutral-800">
                    <div 
                      style={{ width: `${pct}%` }} 
                      className="bg-amber-500 h-full rounded-full transition-all duration-300" 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-neutral-800/80 text-[11px] font-mono text-neutral-500 text-center">
            Demanda total de maná coloreado para ajustar la base de tierras
          </div>
        </div>

      </div>

    </section>
  );
}