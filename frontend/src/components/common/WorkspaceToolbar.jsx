// ---------------------------------------------------------
// COMPONENTE: TOOLBAR UNIFICADA PARA MAZOS Y COLECCIONES
// ---------------------------------------------------------
import React from 'react';
import {
  Layers,
  Briefcase,
  HelpCircle,
  List,
  LayoutGrid,
  Search,
  ArrowUpDown,
  Sparkles,
  Repeat,
  X
} from 'lucide-react';

export default function WorkspaceToolbar({
  // Modos de vista
  viewMode = 'grid',
  onChangeViewMode,
  cardSize = 'md',
  onChangeCardSize,

  // Buscador y orden
  filterQuery = '',
  onFilterChange,
  sortBy = 'name',
  onSortChange,
  sortOptions = [
    { value: 'name', label: 'Por Nombre' },
    { value: 'price', label: 'Por Precio' },
    { value: 'cmc', label: 'Por Coste (CMC)' },
    { value: 'quantity', label: 'Por Cantidad' },
  ],

  // Selector de Zonas (Opcional, para Mazos)
  zonesConfig, // { activeZone, onChangeZone, counts: { main, sideboard, maybeboard } }

  // Filtros rápidos de Colección (Opcional)
  collectionFilters, // { onlyFoils, onToggleFoils, onlyTrade, onToggleTrade }

  isLightMode = false,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 py-1">
      
      {/* 1. ZONAS (Solo si se pasan en props) */}
      {zonesConfig && (
        <div className={`flex items-center gap-1 rounded-lg p-0.5 ${
          isLightMode ? 'bg-[#EFE9DC]' : 'bg-neutral-900/70'
        }`}>
          <button
            onClick={() => zonesConfig.onChangeZone('main')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              zonesConfig.activeZone === 'main'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : (isLightMode ? 'text-neutral-600 hover:text-neutral-900' : 'text-neutral-400 hover:text-white')
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mazo Principal</span>
            <span className="font-mono text-[10px] opacity-80">({zonesConfig.counts?.main ?? 0})</span>
          </button>

          <button
            onClick={() => zonesConfig.onChangeZone('sideboard')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              zonesConfig.activeZone === 'sideboard'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : (isLightMode ? 'text-neutral-600 hover:text-neutral-900' : 'text-neutral-400 hover:text-white')
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Sideboard</span>
            <span className="font-mono text-[10px] opacity-80">({zonesConfig.counts?.sideboard ?? 0})</span>
          </button>

          <button
            onClick={() => zonesConfig.onChangeZone('maybeboard')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              zonesConfig.activeZone === 'maybeboard'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : (isLightMode ? 'text-neutral-600 hover:text-neutral-900' : 'text-neutral-400 hover:text-white')
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Maybeboard</span>
            <span className="font-mono text-[10px] opacity-80">({zonesConfig.counts?.maybeboard ?? 0})</span>
          </button>
        </div>
      )}

      {/* 2. FILTROS RÁPIDOS DE BINDER (Si aplica) */}
      {collectionFilters && (
        <div className="flex items-center gap-2">
          <button
            onClick={collectionFilters.onToggleTrade}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition border flex items-center gap-1 ${
              collectionFilters.onlyTrade
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 font-bold'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400'
            }`}
          >
            <Repeat className="w-3 h-3" />
            <span>En Trade</span>
          </button>

          <button
            onClick={collectionFilters.onToggleFoils}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition border flex items-center gap-1 ${
              collectionFilters.onlyFoils
                ? 'bg-amber-500/20 text-amber-400 border-amber-500 font-bold'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Foil</span>
          </button>
        </div>
      )}

      {/* 3. BÚSQUEDA, ORDEN Y VISTA */}
      <div className="flex items-center gap-2">
        
        {/* Buscador interno */}
        <div className="relative flex items-center">
          <Search className="w-3 h-3 text-neutral-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrar cartas..."
            value={filterQuery}
            onChange={(e) => onFilterChange?.(e.target.value)}
            className={`w-32 sm:w-44 rounded-lg pl-7 pr-6 py-1 text-xs outline-none focus:ring-1 focus:ring-amber-500 transition ${
              isLightMode
                ? 'bg-[#EFE9DC] text-neutral-800 placeholder:text-neutral-400'
                : 'bg-neutral-900/70 text-neutral-200 placeholder:text-neutral-500'
            }`}
          />
          {filterQuery && (
            <button
              onClick={() => onFilterChange?.('')}
              className="absolute right-1.5 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Criterio de Orden */}
        <div className="relative flex items-center">
          <select
            value={sortBy}
            onChange={(e) => onSortChange?.(e.target.value)}
            className={`appearance-none rounded-lg pl-6 pr-6 py-1 text-xs font-medium cursor-pointer outline-none focus:ring-1 focus:ring-amber-500 ${
              isLightMode
                ? 'bg-[#EFE9DC] text-neutral-800'
                : 'bg-neutral-900/70 text-neutral-300'
            }`}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ArrowUpDown className="w-3 h-3 text-neutral-400 absolute left-2 pointer-events-none" />
        </div>

        {/* Switch Modo Texto / Visual (Si se provee onChangeViewMode) */}
        {onChangeViewMode && (
          <div className={`flex items-center rounded-lg p-0.5 ${
            isLightMode ? 'bg-[#EFE9DC]' : 'bg-neutral-900/70'
          }`}>
            <button
              onClick={() => onChangeViewMode('text')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition ${
                viewMode === 'text'
                  ? (isLightMode ? 'bg-[#FAF7F2] text-amber-600 font-bold shadow-sm' : 'bg-neutral-800 text-amber-400 font-bold')
                  : (isLightMode ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white')
              }`}
              title="Vista de texto"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onChangeViewMode('grid')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition ${
                viewMode === 'grid'
                  ? (isLightMode ? 'bg-[#FAF7F2] text-amber-600 font-bold shadow-sm' : 'bg-neutral-800 text-amber-400 font-bold')
                  : (isLightMode ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white')
              }`}
              title="Vista visual"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Selector de Tamaño en Grid */}
        {viewMode === 'grid' && onChangeCardSize && (
          <div className={`flex items-center rounded-lg px-1.5 py-1 text-[11px] font-mono ${
            isLightMode ? 'bg-[#EFE9DC]' : 'bg-neutral-900/70'
          }`}>
            {(['sm', 'md', 'lg']).map((size) => (
              <button
                key={size}
                onClick={() => onChangeCardSize(size)}
                className={`px-1.5 py-0.5 rounded uppercase font-bold transition ${
                  cardSize === size 
                    ? 'bg-amber-500 text-neutral-950' 
                    : (isLightMode ? 'text-neutral-600 hover:text-neutral-900' : 'text-neutral-400 hover:text-white')
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}