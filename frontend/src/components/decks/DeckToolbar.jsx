// ---------------------------------------------------------
// COMPONENTE: TOOLBAR DIRECTA COMPLETAMENTE BORDERLESS
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
  X
} from 'lucide-react';

export default function DeckToolbar({
  currentTab,
  onChangeTab,
  zoneCounts = { main: 0, sideboard: 0, maybeboard: 0 },
  viewMode,
  onChangeViewMode,
  cardSize,
  onChangeCardSize,
  filterQuery = '',
  onFilterChange,
  sortBy = 'type',
  onSortChange,
  isLightMode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 py-1">
      
      {/* 1. ZONAS (MAIN, SIDE, MAYBE) */}
      <div className={`flex items-center gap-1 rounded-lg p-0.5 ${
        isLightMode ? 'bg-[#EFE9DC]' : 'bg-neutral-900/70'
      }`}>
        <button
          onClick={() => onChangeTab('main')}
          className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
            currentTab === 'main'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : (isLightMode ? 'text-neutral-600 hover:text-neutral-900' : 'text-neutral-400 hover:text-white')
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Mazo Principal</span>
          <span className="font-mono text-[10px] opacity-80">({zoneCounts.main})</span>
        </button>

        <button
          onClick={() => onChangeTab('sideboard')}
          className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
            currentTab === 'sideboard'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : (isLightMode ? 'text-neutral-600 hover:text-neutral-900' : 'text-neutral-400 hover:text-white')
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Sideboard</span>
          <span className="font-mono text-[10px] opacity-80">({zoneCounts.sideboard})</span>
        </button>

        <button
          onClick={() => onChangeTab('maybeboard')}
          className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
            currentTab === 'maybeboard'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : (isLightMode ? 'text-neutral-600 hover:text-neutral-900' : 'text-neutral-400 hover:text-white')
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Maybeboard</span>
          <span className="font-mono text-[10px] opacity-80">({zoneCounts.maybeboard})</span>
        </button>
      </div>

      {/* 2. FILTRADO, ORDEN Y VISTAS */}
      <div className="flex items-center gap-2">
        
        {/* Buscador interno */}
        <div className="relative flex items-center">
          <Search className="w-3 h-3 text-neutral-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrar en mazo..."
            value={filterQuery}
            onChange={(e) => onFilterChange?.(e.target.value)}
            className={`w-32 sm:w-40 rounded-lg pl-7 pr-6 py-1 text-xs outline-none focus:ring-1 focus:ring-amber-500 transition ${
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
            <option value="type">Por Tipo</option>
            <option value="cmc">Por Coste (CMC)</option>
            <option value="name">Por Nombre</option>
            <option value="price">Por Precio</option>
          </select>
          <ArrowUpDown className="w-3 h-3 text-neutral-400 absolute left-2 pointer-events-none" />
        </div>

        {/* Switch Modo Texto / Visual */}
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
            <span className="text-[11px] hidden md:inline">Texto</span>
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
            <span className="text-[11px] hidden md:inline">Visual</span>
          </button>
        </div>

        {/* Selector de Tamaño */}
        {viewMode === 'grid' && (
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