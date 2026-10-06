// ---------------------------------------------------------
// COMPONENTE: PANEL DE FILTROS VISUALES (TCGPLAYER & DUAL SLIDERS)
// ---------------------------------------------------------
import React from 'react';
import { 
  Swords, 
  Zap, 
  Flame, 
  Shield, 
  Sparkles, 
  Layers, 
  RotateCcw,
  Check,
  Crown,
  DollarSign,
  Store
} from 'lucide-react';
import { ManaGlyph } from '@/components/common/ManaSymbol';
import DualRangeSlider from '@/components/common/DualRangeSlider';

const TYPES = [
  { id: 'creature', label: 'Criatura', icon: Swords },
  { id: 'instant', label: 'Instantáneo', icon: Zap },
  { id: 'sorcery', label: 'Conjuro', icon: Flame },
  { id: 'artifact', label: 'Artefacto', icon: Shield },
  { id: 'enchantment', label: 'Encantamiento', icon: Sparkles },
  { id: 'planeswalker', label: 'Planeswalker', icon: Layers },
  { id: 'land', label: 'Tierra', icon: Layers },
];

const COLORS = [
  { id: 'w', sym: 'w', label: 'Blanco' },
  { id: 'u', sym: 'u', label: 'Azul' },
  { id: 'b', sym: 'b', label: 'Negro' },
  { id: 'r', sym: 'r', label: 'Rojo' },
  { id: 'g', sym: 'g', label: 'Verde' },
  { id: 'c', sym: 'c', label: 'Incoloro' },
];

const FORMATS = [
  { id: 'commander', label: 'Commander / EDH' },
  { id: 'modern', label: 'Modern' },
  { id: 'standard', label: 'Standard' },
  { id: 'pioneer', label: 'Pioneer' },
  { id: 'pauper', label: 'Pauper' },
];

const RARITIES = [
  { id: 'common', label: 'Común' },
  { id: 'uncommon', label: 'Infrecuente' },
  { id: 'rare', label: 'Rara' },
  { id: 'mythic', label: 'Mítica' },
];

export default function VisualFilterPanel({
  selectedTypes = [],
  onToggleType,
  selectedColors = [],
  onToggleColor,
  selectedFormat = '',
  onSelectFormat,
  selectedRarities = [],
  onToggleRarity,
  cmcMin = 0,
  onChangeCmcMin,
  cmcMax = 16,
  onChangeCmcMax,
  isLegendary = null,
  onToggleLegendary,
  priceMin = 0,
  onChangePriceMin,
  priceMax = 100,
  onChangePriceMax,
  priceSource = 'tcgplayer', // 'tcgplayer' | 'cardkingdom'
  onChangePriceSource,
  onResetFilters,
  isLightMode = false,
}) {
  const isCmcFiltered = cmcMin > 0 || cmcMax < 16;
  const isPriceFiltered = priceMin > 0 || priceMax < 100;

  return (
    <div className={`rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-6 transition-all ${
      isLightMode ? 'bg-white/80 shadow-neutral-200/60' : 'bg-[#111113]/90 shadow-black/60'
    }`}>
      {/* Cabecera */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="space-y-0.5">
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-amber-500 block">
            Filtros Visuales
          </span>
          <h3 className={`text-base font-bold ${isLightMode ? 'text-neutral-900' : 'text-white'}`}>
            Selección Rápida e Intuitiva
          </h3>
        </div>
        <button
          type="button"
          onClick={onResetFilters}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-neutral-400 hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restablecer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Columna 1: Tipos y Legendarias */}
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-wider block">
              Tipo de carta
            </span>
            <div className="flex flex-col gap-1.5">
              {TYPES.map((t) => {
                const Icon = t.icon;
                const active = selectedTypes.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onToggleType(t.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                      active
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                        : isLightMode
                          ? 'bg-[#FAF7F2] text-neutral-700 hover:bg-[#EAE4D7]'
                          : 'bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </div>
                    {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtro Legendaria */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono font-semibold text-neutral-400 uppercase tracking-wider block">
              ¿Es Legendaria?
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onToggleLegendary(isLegendary === true ? null : true)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isLegendary === true
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                    : isLightMode
                      ? 'bg-[#FAF7F2] text-neutral-700 hover:bg-[#EAE4D7]'
                      : 'bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <Crown className="w-3 h-3 text-amber-400" />
                <span>Legendaria</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleLegendary(isLegendary === false ? null : false)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isLegendary === false
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                    : isLightMode
                      ? 'bg-[#FAF7F2] text-neutral-700 hover:bg-[#EAE4D7]'
                      : 'bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <span>No Legendaria</span>
              </button>
            </div>
          </div>
        </div>

        {/* Columna 2: Identidad de Color */}
        <div className="space-y-2.5">
          <span className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-wider block">
            Color o Maná
          </span>
          <div className="flex flex-col gap-1.5">
            {COLORS.map((c) => {
              const active = selectedColors.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggleColor(c.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                      : isLightMode
                        ? 'bg-[#FAF7F2] text-neutral-700 hover:bg-[#EAE4D7]'
                        : 'bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ManaGlyph symbol={c.sym} size="text-[13px]" cost={true} shadow={true} />
                    <span>{c.label}</span>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Columna 3: Sliders de Doble Punto (CMC y Precio) */}
        <div className="space-y-6">
          {/* Barra Dual de Coste de Maná (CMC) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400 font-semibold uppercase tracking-wider">Coste de Maná</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 font-bold">
                {!isCmcFiltered 
                  ? 'Cualquier coste' 
                  : `${cmcMin} a ${cmcMax >= 16 ? '16+' : cmcMax} CMC`}
              </span>
            </div>
            
            <DualRangeSlider
              min={0}
              max={16}
              step={1}
              valueMin={cmcMin}
              valueMax={cmcMax}
              onChangeMin={onChangeCmcMin}
              onChangeMax={onChangeCmcMax}
              accentColor="amber"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 px-0.5">
              <span>0</span>
              <span>4</span>
              <span>8</span>
              <span>12</span>
              <span>16+</span>
            </div>
          </div>

          {/* Barra Dual de Rango de Precio (USD) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Rango de Precio
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold">
                {!isPriceFiltered 
                  ? 'Cualquier precio' 
                  : `$${priceMin} - ${priceMax >= 100 ? 'Sin límite' : `$${priceMax}`}`}
              </span>
            </div>

            <DualRangeSlider
              min={0}
              max={100}
              step={1}
              valueMin={priceMin}
              valueMax={priceMax}
              onChangeMin={onChangePriceMin}
              onChangeMax={onChangePriceMax}
              accentColor="emerald"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 px-0.5">
              <span>$0</span>
              <span>$25</span>
              <span>$50</span>
              <span>$75</span>
              <span>$100+</span>
            </div>

            {/* Selector de Tienda / Fuente de Precios */}
            <div className="pt-2 space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Store className="w-3 h-3 text-amber-500" /> Fuente de Cotización
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => onChangePriceSource('tcgplayer')}
                  className={`py-1 px-2 rounded-lg transition cursor-pointer text-center ${
                    priceSource === 'tcgplayer'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                      : isLightMode
                        ? 'bg-[#FAF7F2] text-neutral-600 hover:text-neutral-900'
                        : 'bg-black/30 text-neutral-400 hover:text-white'
                  }`}
                >
                  TCGplayer Market
                </button>
                <button
                  type="button"
                  onClick={() => onChangePriceSource('cardkingdom')}
                  className={`py-1 px-2 rounded-lg transition cursor-pointer text-center ${
                    priceSource === 'cardkingdom'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                      : isLightMode
                        ? 'bg-[#FAF7F2] text-neutral-600 hover:text-neutral-900'
                        : 'bg-black/30 text-neutral-400 hover:text-white'
                  }`}
                >
                  Card Kingdom
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Columna 4: Formato Legal y Rareza */}
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-wider block">
              Formato oficial
            </span>
            <div className="flex flex-col gap-1.5">
              {FORMATS.map((f) => {
                const active = selectedFormat === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onSelectFormat(active ? '' : f.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                      active
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                        : isLightMode
                          ? 'bg-[#FAF7F2] text-neutral-700 hover:bg-[#EAE4D7]'
                          : 'bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>{f.label}</span>
                    {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-wider block">
              Rareza
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {RARITIES.map((r) => {
                const active = selectedRarities.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onToggleRarity(r.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer text-center ${
                      active
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                        : isLightMode
                          ? 'bg-[#FAF7F2] text-neutral-700 hover:bg-[#EAE4D7]'
                          : 'bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}