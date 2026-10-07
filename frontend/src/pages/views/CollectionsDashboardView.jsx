// ---------------------------------------------------------
// VISTA: DASHBOARD GENERAL (CON FILTRO DE TRADE ACTIVO)
// ---------------------------------------------------------
import React, { useRef, useEffect } from 'react';
import { Folder, RefreshCw, Search, Lock, Globe, Star, Loader2, Repeat } from 'lucide-react';
import { CollectionStatsHeader } from '@/components/collections/CollectionStatsHeader';
import { CreateCollectionCard } from '@/components/collections/CreateCollectionCard';
import { CollectionCard } from '@/components/collections/CollectionCard';

export default function CollectionsDashboardView({
  collections,
  processedCollections,
  globalStats,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  priceSource = 'tcgplayer',
  onPriceSourceChange,
  sortBy,
  onSortChange,
  loading,
  onRefresh,
  onCreateClick,
  onSelectCollection,
  onDeleteCollection,
  onToggleFavorite,
  onNavigateToCatalog,
  isLightMode,
}) {
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="max-w-[1920px] mx-auto px-6 sm:px-8 py-8 space-y-6">
      {/* 1. Header con KPIs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-mono font-bold tracking-wider uppercase">
            <Folder className="w-3.5 h-3.5" />
            <span>Gestión de Inventario & Binders</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <span>Mis Carpetas & Colecciones</span>
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm font-mono max-w-xl">
            Organiza tus carpetas, audita cartas y mantén un control económico total según tu tienda de referencia.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <CollectionStatsHeader
            totalCollections={globalStats.totalCollections}
            totalCards={globalStats.totalCards}
            totalValue={globalStats.totalValue}
            priceSource={priceSource}
            isLightMode={isLightMode}
          />
          <button
            onClick={onRefresh}
            className="p-3 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-900 border border-neutral-800 transition shrink-0 cursor-pointer"
            title="Refrescar colecciones"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Barra de Búsqueda, Filtros y Selector de Tienda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-white/5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar colecciones, carpetas o notas..."
            className={`w-full pl-10 pr-16 py-2.5 rounded-xl text-xs font-mono outline-none transition border ${
              isLightMode 
                ? 'bg-white border-neutral-200 text-neutral-900 focus:border-amber-500' 
                : 'bg-[#121214] border-neutral-800 text-neutral-100 focus:border-amber-500'
            }`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-neutral-400 pointer-events-none">
            Ctrl + K
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Tienda en Dashboard */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/5 text-xs font-mono">
            <button
              type="button"
              onClick={() => onPriceSourceChange('tcgplayer')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                priceSource === 'tcgplayer'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              TCGplayer
            </button>
            <button
              type="button"
              onClick={() => onPriceSourceChange('cardkingdom')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                priceSource === 'cardkingdom'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Card Kingdom
            </button>
          </div>

          {/* Filtros de visibilidad y Trade */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/5 text-xs font-mono">
            <button
              type="button"
              onClick={() => onFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('trade')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeFilter === 'trade'
                  ? 'bg-emerald-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Repeat className="w-3 h-3" /> Trade
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('private')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeFilter === 'private'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Lock className="w-3 h-3" /> Privadas
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('public')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeFilter === 'public'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3" /> Públicas
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('favorites')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeFilter === 'favorites'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Star className="w-3 h-3" /> Favoritas
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-xs font-mono outline-none font-medium cursor-pointer ${
              isLightMode 
                ? 'bg-white border-neutral-200 text-neutral-800' 
                : 'bg-[#121214] border-neutral-800 text-neutral-200'
            }`}
          >
            <option value="recent">Más recientes</option>
            <option value="cards">Mayor cantidad de cartas</option>
            <option value="value">Mayor valor económico</option>
            <option value="name">Alfabético (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 3. Grid de Colecciones */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-neutral-500 text-xs font-mono gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <span>Cargando tus carpetas...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          <CreateCollectionCard
            onClick={onCreateClick}
            isLightMode={isLightMode}
          />

          {processedCollections.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              priceSource={priceSource}
              onOpen={onSelectCollection}
              onEdit={() => {}}
              onDelete={onDeleteCollection}
              onToggleFavorite={onToggleFavorite}
              onSearchCards={onNavigateToCatalog}
              onImportList={() => {}}
              isLightMode={isLightMode}
            />
          ))}
        </div>
      )}

      {!loading && (
        <div className="pt-4 flex items-center justify-between text-xs font-mono text-neutral-500 border-t border-white/5">
          <span>Mostrando {processedCollections.length} colecciones</span>
        </div>
      )}
    </div>
  );
}