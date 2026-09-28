// ---------------------------------------------------------
// PÁGINA PRINCIPAL DE CATÁLOGO Y BÚSQUEDA MULTIFILTRO
// ---------------------------------------------------------
import React, { useState } from 'react';
import { useCardSearch } from '../hooks/useCardSearch';
import { SearchBar } from '../components/cards/SearchBar';
import { FilterBar } from '../components/search/FilterBar';
import { CardGrid } from '../components/cards/CardGrid';
import { CardDetailModal } from '../components/modal/CardDetailModal';

export function CatalogPage() {
  const {
    searchTerm,
    setSearchTerm,
    filters,
    handleFilterChange,
    handleResetFilters,
    results,
    loading,
    error,
  } = useCardSearch();

  const [selectedCard, setSelectedCard] = useState(null);

  const hasQuery = searchTerm.trim().length >= 2;
  const hasActiveFilters = Boolean(
    filters.type || filters.colors || filters.cmc !== null
  );
  const isSearchActive = hasQuery || hasActiveFilters;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 max-w-7xl mx-auto w-full">
      {/* Encabezado */}
      <header className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-100">
          Explorador de Cartas & Mercado MTG
        </h1>
        <p className="text-sm text-neutral-400 mt-2 max-w-lg mx-auto">
          Consulta cotizaciones históricas de Card Kingdom y TCGplayer sincronizadas en tu base de datos local.
        </p>
      </header>

      {/* Buscador reactivo por texto */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        onClear={() => setSearchTerm('')}
      />

      {/* Barra de Filtros Rápidos (Colores, Tipos, CMC) */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Estado: Error en la API */}
      {error && (
        <div className="text-center py-6 px-4 text-sm text-rose-400 bg-rose-950/20 border border-rose-900/50 rounded-xl max-w-lg mx-auto my-4">
          {error}
        </div>
      )}

      {/* Estado: Sin resultados tras una búsqueda */}
      {!loading && !error && isSearchActive && results.length === 0 && (
        <div className="text-center py-16 text-sm text-neutral-500">
          No se encontraron cartas que coincidan con los criterios seleccionados.
        </div>
      )}

      {/* Estado Inicial: Sin escribir ni activar filtros */}
      {!loading && !isSearchActive && (
        <div className="text-center py-16 text-neutral-600 text-xs">
          Escribe al menos 2 letras o selecciona filtros rápidos para explorar el catálogo.
        </div>
      )}

      {/* Grid de Cartas / Esqueletos */}
      <CardGrid
        cards={results}
        loading={loading}
        onSelectCard={(card) => setSelectedCard(card)}
      />

      {/* Modal de Detalle */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onSelectCard={(newCard) => setSelectedCard(newCard)}
        />
      )}
    </main>
  );
}