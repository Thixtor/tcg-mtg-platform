// ---------------------------------------------------------
// PÁGINA PRINCIPAL: CATÁLOGO CON BÚSQUEDA RÁPIDA Y AVANZADA
// ---------------------------------------------------------
import React, { useState } from 'react';
import { SlidersHorizontal, Search } from 'lucide-react';
import { useCardSearch } from '../hooks/useCardSearch';
import { SmartSearchBar } from '../components/search/SmartSearchBar';
import { AdvancedSearchPanel } from '../components/search/AdvancedSearchPanel';
import { CardGrid } from '../components/cards/CardGrid';
import { CardDetailModal } from '../components/modal/CardDetailModal';

export function CatalogPage() {
  const {
    searchTerm,
    setSearchTerm,
    results,
    loading,
    error,
  } = useCardSearch();

  // Conmutador de modo: 'simple' (Omnibox reactivo) | 'advanced' (Panel visual multicampo)
  const [searchMode, setSearchMode] = useState('simple');
  const [selectedCard, setSelectedCard] = useState(null);

  const isSearchActive = Boolean(searchTerm.trim());

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 max-w-7xl mx-auto w-full">
      {/* --------------------------------------------------------- */}
      {/* ENCABEZADO Y SELECTOR DE MODO                             */}
      {/* --------------------------------------------------------- */}
      <header className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-100">
          Explorador de Cartas & Mercado MTG
        </h1>
        <p className="text-sm text-neutral-400 mt-2 max-w-lg mx-auto">
          Consulta cotizaciones históricas y busca cartas utilizando atajos de tipo, operadores o la búsqueda avanzada.
        </p>
      </header>

      {/* Pestañas de modo de búsqueda */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-neutral-900 border border-neutral-800 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setSearchMode('simple')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              searchMode === 'simple'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Búsqueda Rápida</span>
          </button>

          <button
            type="button"
            onClick={() => setSearchMode('advanced')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              searchMode === 'advanced'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Búsqueda Avanzada</span>
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* VISTA CONDICIONAL: OMNIBOX VS PANEL AVANZADO             */}
      {/* --------------------------------------------------------- */}
      {searchMode === 'simple' ? (
        <SmartSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          onClear={() => setSearchTerm('')}
        />
      ) : (
        <AdvancedSearchPanel
          currentQuery={searchTerm}
          onSearch={(query) => {
            setSearchTerm(query);
          }}
          onClear={() => setSearchTerm('')}
        />
      )}

      {/* --------------------------------------------------------- */}
      {/* ESTADOS DE RETROALIMENTACIÓN DE LA CONSULTA               */}
      {/* --------------------------------------------------------- */}
      {error && (
        <div className="text-center py-6 px-4 text-sm text-rose-400 bg-rose-950/20 border border-rose-900/50 rounded-xl max-w-lg mx-auto my-4">
          {error}
        </div>
      )}

      {!loading && !error && isSearchActive && results.length === 0 && (
        <div className="text-center py-16 text-sm text-neutral-500">
          No se encontraron cartas que coincidan con los criterios seleccionados.
        </div>
      )}

      {!loading && !isSearchActive && (
        <div className="text-center py-16 text-neutral-600 text-xs">
          Escribe en la barra superior o haz clic en los tipos de carta para explorar el catálogo.
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* GRID DE RESULTADOS Y MODAL                               */}
      {/* --------------------------------------------------------- */}
      <CardGrid
        cards={results}
        loading={loading}
        onSelectCard={(card) => setSelectedCard(card)}
      />

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </main>
  );
}