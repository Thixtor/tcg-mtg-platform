// ---------------------------------------------------------
// COMPONENTE: CATALOG FILTERS (SISTEMA UNIFICADO DE FILTROS)
// ---------------------------------------------------------
import React, { useState } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  ShieldCheck, 
  Layers, 
  SlidersHorizontal 
} from 'lucide-react';

export const SYNERGY_OPTIONS = [
  { id: 'counters_minus', label: 'Contadores -1/-1', query: 'o:"-1/-1 counter"' },
  { id: 'counters_plus', label: 'Contadores +1/+1', query: 'o:"+1/+1 counter"' },
  { id: 'proliferate', label: 'Proliferar', query: 'o:proliferate' },
  { id: 'aristocrats', label: 'Sacrificio / Aristocrats', query: '(o:"sacrifice a creature" or o:"whenever a creature dies")' },
  { id: 'reanimator', label: 'Cementerio / Reanimator', query: '(o:"return" and o:"from your graveyard to the battlefield")' },
  { id: 'tokens', label: 'Fichas / Tokens', query: 'o:"create" and (o:"token" or o:"tokens")' },
  { id: 'treasures', label: 'Tesoros / Treasure', query: 'o:"Treasure token"' },
  { id: 'ramp', label: 'Rampa de Maná', query: '(o:"search your library for a" and o:"land card")' },
  { id: 'card_draw', label: 'Robo / Card Draw', query: '(o:"draws a card" or o:"draw two cards" or o:"draw three cards")' },
  { id: 'blink', label: 'Blink / Flicker', query: '(o:"exile" and o:"return it to the battlefield")' },
  { id: 'spellslinger', label: 'Spellslinger', query: '(o:"whenever you cast an instant or sorcery" or o:"magecraft")' },
  { id: 'lifegain', label: 'Ganancia de Vidas', query: '(o:"whenever you gain life" or o:"gains that much life")' },
];

export const COLOR_OPTIONS = [
  { id: 'w', label: 'Blanco', iconClass: 'ms ms-w ms-cost' },
  { id: 'u', label: 'Azul', iconClass: 'ms ms-u ms-cost' },
  { id: 'b', label: 'Negro', iconClass: 'ms ms-b ms-cost' },
  { id: 'r', label: 'Rojo', iconClass: 'ms ms-r ms-cost' },
  { id: 'g', label: 'Verde', iconClass: 'ms ms-g ms-cost' },
  { id: 'c', label: 'Incoloro', iconClass: 'ms ms-c ms-cost' },
];

export const TYPE_OPTIONS = [
  { id: 'creature', label: 'Criatura' },
  { id: 'instant', label: 'Instantáneo' },
  { id: 'sorcery', label: 'Conjuro' },
  { id: 'artifact', label: 'Artefacto' },
  { id: 'enchantment', label: 'Encantamiento' },
  { id: 'planeswalker', label: 'Planeswalker' },
  { id: 'land', label: 'Tierra' },
];

export const RARITY_OPTIONS = [
  { id: 'common', label: 'Común' },
  { id: 'uncommon', label: 'Infrecuente' },
  { id: 'rare', label: 'Rara' },
  { id: 'mythic', label: 'Mítica' },
];

export const FORMAT_OPTIONS = [
  { id: '', label: 'Cualquier Formato' },
  { id: 'commander', label: 'Commander / EDH' },
  { id: 'modern', label: 'Modern' },
  { id: 'standard', label: 'Standard' },
  { id: 'pioneer', label: 'Pioneer' },
  { id: 'legacy', label: 'Legacy' },
  { id: 'pauper', label: 'Pauper' },
];

export default function CatalogFilters({
  selectedColors = [],
  onToggleColor,
  selectedTypes = [],
  onToggleType,
  selectedRarities = [],
  onToggleRarity,
  isLegendary,
  onToggleLegendary,
  cmcMin = 0,
  onChangeCmcMin,
  cmcMax = 16,
  onChangeCmcMax,
  priceMin = 0,
  onChangePriceMin,
  priceMax = 100,
  onChangePriceMax,
  priceSource = 'tcgplayer',
  onChangePriceSource,
  selectedFormat = '',
  onSelectFormat,
  selectedSynergies = [],
  onToggleSynergy,
  onResetFilters,
  isLightMode = false,
}) {
  const [showAdvancedRanges, setShowAdvancedRanges] = useState(true);

  return (
    <div className={`border rounded-none font-mono text-xs space-y-5 p-5 ${
      isLightMode ? 'bg-[#FAF7F2] border-[#DDD5C7]' : 'bg-[#131217] border-[#2A2733]'
    }`}>
      
      {/* CABECERA DE CONTROL */}
      <div className="flex items-center justify-between border-b border-[#2A2733] pb-3">
        <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-wider">
          <SlidersHorizontal className="w-4 h-4 text-[#E88B00]" />
          <span>Filtros Globales de Catálogo</span>
        </div>
        <button
          type="button"
          onClick={onResetFilters}
          className="text-[#E88B00] hover:text-[#FF9D0A] flex items-center gap-1 font-bold tracking-wider uppercase text-[10px] cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restablecer Filtros</span>
        </button>
      </div>

      {/* SECCIÓN 1: IDENTIDAD DE COLOR */}
      <div className="space-y-2">
        <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-wider block">
          Colores de Maná
        </span>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((c) => {
            const isSelected = selectedColors.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggleColor?.(c.id)}
                className={`px-3 py-2 flex items-center gap-2 border uppercase text-[11px] font-bold tracking-wider rounded-none transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#E88B00] text-black border-[#E88B00] font-black'
                    : 'bg-[#0C0B0E] border-[#2A2733] text-neutral-300 hover:border-neutral-500'
                }`}
              >
                <i className={c.iconClass} />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 2: TIPOS DE CARTA & SUPER-TIPO LEGENDARIO */}
      <div className="space-y-2">
        <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-wider block">
          Tipos de Carta
        </span>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((t) => {
            const isSelected = selectedTypes.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onToggleType?.(t.id)}
                className={`px-3 py-1.5 border uppercase text-[10px] font-bold tracking-wider rounded-none transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#E88B00] text-black border-[#E88B00] font-black'
                    : 'bg-[#0C0B0E] border-[#2A2733] text-neutral-300 hover:border-neutral-500'
                }`}
              >
                {t.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onToggleLegendary?.(isLegendary === true ? null : true)}
            className={`px-3 py-1.5 border uppercase text-[10px] font-bold tracking-wider rounded-none transition cursor-pointer ${
              isLegendary === true
                ? 'bg-[#E88B00] text-black border-[#E88B00] font-black'
                : 'bg-[#0C0B0E] border-[#2A2733] text-neutral-300 hover:border-neutral-500'
            }`}
          >
            ★ Solo Legendarias
          </button>
        </div>
      </div>

      {/* SECCIÓN 3: RAREZAS & FORMATO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <div className="space-y-2">
          <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-wider block">
            Rareza
          </span>
          <div className="flex flex-wrap gap-1.5">
            {RARITY_OPTIONS.map((r) => {
              const isSelected = selectedRarities.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onToggleRarity?.(r.id)}
                  className={`px-3 py-1.5 border uppercase text-[10px] font-bold tracking-wider rounded-none transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#E88B00] text-black border-[#E88B00] font-black'
                      : 'bg-[#0C0B0E] border-[#2A2733] text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-wider block">
            Formato Legal
          </span>
          <select
            value={selectedFormat}
            onChange={(e) => onSelectFormat?.(e.target.value)}
            className="w-full bg-[#0C0B0E] border border-[#2A2733] px-3 py-2 text-white font-mono text-xs outline-none rounded-none focus:border-[#E88B00]"
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SECCIÓN 4: RANGOS DUALES (CMC & PRECIO) */}
      <div className="border border-[#2A2733] p-4 bg-[#0C0B0E] space-y-4 rounded-none">
        <div className="flex items-center justify-between border-b border-[#2A2733] pb-2">
          <span className="text-white font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-[#E88B00]" />
            <span>Rangos de Coste (CMC) y Precios de Mercado</span>
          </span>
          <button
            type="button"
            onClick={() => setShowAdvancedRanges(!showAdvancedRanges)}
            className="text-neutral-400 hover:text-white"
          >
            {showAdvancedRanges ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showAdvancedRanges && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            
            {/* Coste de Maná Convertido (CMC) */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400 uppercase">Coste de Maná (CMC):</span>
                <span className="text-[#E88B00] font-bold">{cmcMin} - {cmcMax >= 16 ? '16+' : cmcMax}</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="16"
                  value={cmcMin}
                  onChange={(e) => onChangeCmcMin?.(Number(e.target.value))}
                  className="w-full accent-[#E88B00]"
                />
                <input
                  type="range"
                  min="0"
                  max="16"
                  value={cmcMax}
                  onChange={(e) => onChangeCmcMax?.(Number(e.target.value))}
                  className="w-full accent-[#E88B00]"
                />
              </div>
            </div>

            {/* Rango de Precios */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 uppercase">Precio USD:</span>
                  <div className="flex border border-[#2A2733]">
                    <button
                      type="button"
                      onClick={() => onChangePriceSource?.('tcgplayer')}
                      className={`px-1.5 py-0.5 text-[9px] font-bold ${priceSource === 'tcgplayer' ? 'bg-[#E88B00] text-black' : 'text-neutral-400'}`}
                    >
                      TCG
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangePriceSource?.('cardkingdom')}
                      className={`px-1.5 py-0.5 text-[9px] font-bold ${priceSource === 'cardkingdom' ? 'bg-[#E88B00] text-black' : 'text-neutral-400'}`}
                    >
                      CK
                    </button>
                  </div>
                </div>
                <span className="text-emerald-400 font-bold">${priceMin} - {priceMax >= 100 ? 'Max' : `$${priceMax}`} USD</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={priceMin}
                  onChange={(e) => onChangePriceMin?.(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={priceMax}
                  onChange={(e) => onChangePriceMax?.(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* SECCIÓN 5: SINERGIAS Y ARQUETIPOS */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[#E88B00] font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sinergias de Mazo & Arquetipos</span>
          </span>
          {selectedSynergies.length > 0 && (
            <span className="text-[10px] text-neutral-400">
              {selectedSynergies.length} seleccionadas
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SYNERGY_OPTIONS.map((syn) => {
            const isSelected = selectedSynergies.some((s) => s.id === syn.id);
            return (
              <button
                key={syn.id}
                type="button"
                onClick={() => onToggleSynergy?.(syn)}
                className={`px-3 py-1.5 uppercase text-[10px] font-bold tracking-wider rounded-none border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#E88B00] text-black border-[#E88B00] font-black shadow-md shadow-[#E88B00]/20'
                    : 'bg-[#0C0B0E] border-[#2A2733] text-neutral-300 hover:border-neutral-500 hover:text-white'
                }`}
              >
                {syn.label}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}