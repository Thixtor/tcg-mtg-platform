// ---------------------------------------------------------
// COMPONENTE: PANEL DE FILTROS VISUALES (PALETA UNIFICADA)
// ---------------------------------------------------------
import React from 'react';
import { RotateCcw } from 'lucide-react';

const CARD_TYPES = [
  { id: 'creature', label: 'Criatura' },
  { id: 'instant', label: 'Instantáneo' },
  { id: 'sorcery', label: 'Conjuro' },
  { id: 'artifact', label: 'Artefacto' },
  { id: 'enchantment', label: 'Encantamiento' },
  { id: 'planeswalker', label: 'Planeswalker' },
  { id: 'land', label: 'Tierra' },
];

const COLORS = [
  { id: 'w', label: 'Blanco', iconClass: 'ms ms-w ms-cost' },
  { id: 'u', label: 'Azul', iconClass: 'ms ms-u ms-cost' },
  { id: 'b', label: 'Negro', iconClass: 'ms ms-b ms-cost' },
  { id: 'r', label: 'Rojo', iconClass: 'ms ms-r ms-cost' },
  { id: 'g', label: 'Verde', iconClass: 'ms ms-g ms-cost' },
  { id: 'c', label: 'Incoloro', iconClass: 'ms ms-c ms-cost' },
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
  onResetFilters,
}) {
  return (
    <div className="p-6 border border-[#2A2733] bg-[#131217] rounded-2xl font-mono text-xs space-y-6 shadow-xl">

      {/* CABECERA */}
      <div className="flex items-center justify-between border-b border-[#2A2733] pb-3">
        <div>
          <span className="text-[10px] font-bold text-[#E88B00] uppercase tracking-wider block">
            Filtros Visuales
          </span>
          <h3 className="text-sm font-black text-white tracking-tight">
            Selección Rápida e Intuitiva
          </h3>
        </div>
        <button
          type="button"
          onClick={onResetFilters}
          className="text-neutral-400 hover:text-[#E88B00] flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restablecer</span>
        </button>
      </div>

      {/* CONTENIDO EN COLUMNAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* 1. TIPO DE CARTA & LEGENDARIA */}
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
              Tipo de Carta
            </span>
            <div className="flex flex-col gap-1.5">
              {CARD_TYPES.map((t) => {
                const isSelected = selectedTypes.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onToggleType?.(t.id)}
                    className={`px-3 py-2 text-left border rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#1F170E] border-[#E88B00] text-[#E88B00] shadow-sm'
                        : 'bg-[#0C0B0E] border-[#2A2733] text-neutral-300 hover:border-neutral-500 hover:text-white'
                    }`}
                  >
                    <span>{t.label}</span>
                    {isSelected && <span className="text-[#E88B00] font-black">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selector de Legendaria */}
          <div className="space-y-2 pt-1 border-t border-[#2A2733]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
              ¿Es Legendaria?
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onToggleLegendary?.(isLegendary === true ? null : true)}
                className={`py-2 text-center border rounded-xl text-[11px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  isLegendary === true
                    ? 'bg-[#E88B00] text-black border-[#E88B00] font-black shadow-sm'
                    : 'bg-[#0C0B0E] border-[#2A2733] text-neutral-300 hover:border-neutral-500'
                }`}
              >
                ★ Legendaria
              </button>
              <button
                type="button"
                onClick={() => onToggleLegendary?.(isLegendary === false ? null : false)}
                className={`py-2 text-center border rounded-xl text-[11px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  isLegendary === false
                    ? 'bg-[#E88B00] text-black border-[#E88B00] font-black shadow-sm'
                    : 'bg-[#0C0B0E] border-[#2A2733] text-neutral-300 hover:border-neutral-500'
                }`}
              >
                No Legendaria
              </button>
            </div>
          </div>
        </div>

        {/* 2. COLOR O MANÁ */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
            Color o Maná
          </span>
          <div className="flex flex-col gap-1.5">
            {COLORS.map((c) => {
              const isSelected = selectedColors.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggleColor?.(c.id)}
                  className={`px-3 py-2 text-left border rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#1F170E] border-[#E88B00] text-[#E88B00] shadow-sm'
                      : 'bg-[#0C0B0E] border-[#2A2733] text-neutral-300 hover:border-neutral-500 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <i className={c.iconClass} />
                    <span>{c.label}</span>
                  </div>
                  {isSelected && <span className="text-[#E88B00] font-black">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. COSTE DE MANÁ & PRECIO DE MERCADO */}
        <div className="space-y-5">
          {/* Slider CMC */}
          <div className="p-3.5 bg-[#0C0B0E] border border-[#2A2733] rounded-xl space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
              <span className="text-neutral-400">Coste de Maná</span>
              <span className="text-[#E88B00] font-bold">
                {cmcMin === 0 && cmcMax >= 16 ? 'Cualquier coste' : `${cmcMin} - ${cmcMax >= 16 ? '16+' : cmcMax}`}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
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
            <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
              <span>0</span>
              <span>4</span>
              <span>8</span>
              <span>12</span>
              <span>16+</span>
            </div>
          </div>

          {/* Slider Precio */}
          <div className="p-3.5 bg-[#0C0B0E] border border-[#2A2733] rounded-xl space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
              <span className="text-neutral-400">$ Rango de Precio</span>
              <span className="text-[#E88B00] font-bold">
                {priceMin === 0 && priceMax >= 100 ? 'Cualquier precio' : `$${priceMin} - ${priceMax >= 100 ? 'Max' : `$${priceMax}`}`}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="range"
                min="0"
                max="100"
                value={priceMin}
                onChange={(e) => onChangePriceMin?.(Number(e.target.value))}
                className="w-full accent-[#E88B00]"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={priceMax}
                onChange={(e) => onChangePriceMax?.(Number(e.target.value))}
                className="w-full accent-[#E88B00]"
              />
            </div>
            <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
              <span>$0</span>
              <span>$25</span>
              <span>$50</span>
              <span>$75</span>
              <span>$100+</span>
            </div>
          </div>

          {/* Fuente de Cotización */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
              Fuente de Cotización
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onChangePriceSource?.('tcgplayer')}
                className={`py-2 text-center border rounded-xl text-[11px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  priceSource === 'tcgplayer'
                    ? 'bg-[#E88B00] text-black border-[#E88B00] font-black shadow-sm'
                    : 'bg-[#0C0B0E] border-[#2A2733] text-neutral-400 hover:text-white hover:border-neutral-500'
                }`}
              >
                TCGplayer Market
              </button>
              <button
                type="button"
                onClick={() => onChangePriceSource?.('cardkingdom')}
                className={`py-2 text-center border rounded-xl text-[11px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  priceSource === 'cardkingdom'
                    ? 'bg-[#E88B00] text-black border-[#E88B00] font-black shadow-sm'
                    : 'bg-[#0C0B0E] border-[#2A2733] text-neutral-400 hover:text-white hover:border-neutral-500'
                }`}
              >
                Card Kingdom
              </button>
            </div>
          </div>
        </div>

        {/* 4. FORMATO OFICIAL & RAREZA */}
        <div className="space-y-4">
          {/* Formato Oficial */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
              Formato Oficial
            </span>
            <div className="flex flex-col gap-1.5">
              {FORMATS.map((f) => {
                const isSelected = selectedFormat === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onSelectFormat?.(isSelected ? '' : f.id)}
                    className={`px-3 py-1.5 text-left border rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#1F170E] border-[#E88B00] text-[#E88B00] shadow-sm'
                        : 'bg-[#0C0B0E] border-[#2A2733] text-neutral-300 hover:border-neutral-500 hover:text-white'
                    }`}
                  >
                    <span>{f.label}</span>
                    {isSelected && <span className="text-[#E88B00] font-black">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rareza */}
          <div className="space-y-2 pt-1 border-t border-[#2A2733]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
              Rareza
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {RARITIES.map((r) => {
                const isSelected = selectedRarities.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onToggleRarity?.(r.id)}
                    className={`py-1.5 text-center border rounded-xl text-[11px] font-bold uppercase tracking-wider transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#E88B00] text-black border-[#E88B00] font-black shadow-sm'
                        : 'bg-[#0C0B0E] border-[#2A2733] text-neutral-300 hover:border-neutral-500 hover:text-white'
                    }`}
                  >
                    {r.label}
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