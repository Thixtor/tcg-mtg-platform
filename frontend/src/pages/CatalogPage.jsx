// ---------------------------------------------------------
// 11. PÁGINA PRINCIPAL DE CATÁLOGO Y BÚSQUEDA
// ---------------------------------------------------------
import React, { useState } from 'react';
import { useCardSearch } from '../hooks/useCardSearch';
import { SearchBar } from '../components/cards/SearchBar';
import { CardGrid } from '../components/cards/CardGrid';
import { CardDetailModal } from '../components/modal/CardDetailModal';

export function CatalogPage() {
  const { searchTerm, setSearchTerm, results, loading, error } = useCardSearch();
  const [selectedCard, setSelectedCard] = useState(null);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 max-w-7xl mx-auto">
      {/* Encabezado */}
      <header className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-100">
          Explorador de Cartas & Mercado MTG
        </h1>
        <p className="text-sm text-neutral-400 mt-2 max-w-lg mx-auto">
          Consulta cotizaciones históricas de Card Kingdom y TCGplayer sincronizadas en tu base de datos local.
        </p>
      </header>

      {/* Buscador Interactivo */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        onClear={() => setSearchTerm('')}
      />

      {/* Estados: Loading, Error, Vacío */}
      {loading && (
        <div className="text-center py-12 text-sm text-amber-400 font-medium animate-pulse">
          Buscando cartas en el catálogo local...
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-sm text-rose-400 bg-rose-950/20 border border-rose-900/50 rounded-xl max-w-lg mx-auto">
          {error}
        </div>
      )}

      {!loading && !error && searchTerm.trim().length >= 2 && results.length === 0 && (
        <div className="text-center py-12 text-sm text-neutral-500">
          No se encontraron cartas que coincidan con "<span className="text-neutral-300">{searchTerm}</span>".
        </div>
      )}

      {!loading && searchTerm.trim().length < 2 && (
        <div className="text-center py-16 text-neutral-600 text-xs">
          Escribe al menos 2 letras para iniciar la búsqueda en el catálogo.
        </div>
      )}

      {/* Resultados */}
      <CardGrid
        cards={results}
        onSelectCard={(card) => setSelectedCard(card)}
      />

      {/* Modal de Detalle y Cotización */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </main>
  );
}