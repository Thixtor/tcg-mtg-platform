// ---------------------------------------------------------
// COMPONENTE: BARRA DE FILTROS RÁPIDOS PARA CATÁLOGO MTG
// ---------------------------------------------------------
import React from 'react';

const COLORS = [
  { id: 'W', label: 'W', name: 'Blanco', bg: 'bg-amber-100 text-amber-900 border-amber-300' },
  { id: 'U', label: 'U', name: 'Azul', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/50' },
  { id: 'B', label: 'B', name: 'Negro', bg: 'bg-neutral-800 text-neutral-300 border-neutral-600' },
  { id: 'R', label: 'R', name: 'Rojo', bg: 'bg-red-500/20 text-red-300 border-red-500/50' },
  { id: 'G', label: 'G', name: 'Verde', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' },
  { id: 'C', label: 'C', name: 'Incoloro', bg: 'bg-stone-500/20 text-stone-300 border-stone-500/50' },
];

const CARD_TYPES = [
  { id: 'all', label: 'Todos' },
  { id: 'Creature', label: 'Criatura' },
  { id: 'Instant', label: 'Instantáneo' },
  { id: 'Sorcery', label: 'Conjuro' },
  { id: 'Artifact', label: 'Artefacto' },
  { id: 'Enchantment', label: 'Encantamiento' },
  { id: 'Land', label: 'Tierra' },
  { id: 'Planeswalker', label: 'Planeswalker' },
];

const CMC_OPTIONS = [
  { val: null, label: 'CMC: Todo' },
  { val: 0, label: '0' },
  { val: 1, label: '1' },
  { val: 2, label: '2' },
  { val: 3, label: '3' },
  { val: 4, label: '4' },
  { val: 5, label: '5' },
  { val: 6, label: '6+' },
];

export function FilterBar({ filters, onFilterChange, onReset }) {
  const toggleColor = (colorId) => {
    const current = filters.colors ? filters.colors.split(',') : [];
    let updated;
    if (current.includes(colorId)) {
      updated = current.filter((c) => c !== colorId);
    } else {
      updated = [...current, colorId];
    }
    onFilterChange('colors', updated.length > 0 ? updated.join(',') : null);
  };

  const activeColors = filters.colors ? filters.colors.split(',') : [];
  const hasActiveFilters = Boolean(
    filters.colors || (filters.type && filters.type !== 'all') || filters.cmc !== null
  );

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-6 space-y-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Identidad de Color */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-neutral-400 font-medium mr-1">Color:</span>
          {COLORS.map((col) => {
            const isSelected = activeColors.includes(col.id);
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => toggleColor(col.id)}
                title={col.name}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all border ${
                  isSelected
                    ? `${col.bg} ring-2 ring-amber-500 scale-105 shadow-md`
                    : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:border-neutral-600'
                }`}
              >
                {col.label}
              </button>
            );
          })}
        </div>

        {/* Selector de CMC */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-neutral-400 font-medium mr-1">Coste:</span>
          <div className="flex rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 p-0.5">
            {CMC_OPTIONS.map((item) => {
              const isSelected = filters.cmc === item.val;
              return (
                <button
                  key={String(item.val)}
                  type="button"
                  onClick={() => onFilterChange('cmc', item.val)}
                  className={`px-2 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    isSelected
                      ? 'bg-amber-600 text-white font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Limpiar Filtros */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-neutral-400 hover:text-amber-400 underline transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Chips de tipo de carta */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
        {CARD_TYPES.map((type) => {
          const isSelected = (filters.type || 'all') === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onFilterChange('type', type.id === 'all' ? null : type.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                isSelected
                  ? 'bg-neutral-200 text-neutral-900 border-neutral-200 font-semibold'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              {type.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}