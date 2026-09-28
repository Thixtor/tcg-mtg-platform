// ---------------------------------------------------------
// HOOK PERSONALIZADO: BÚSQUEDA REACTIVA CON MULTIFILTROS
// ---------------------------------------------------------
import { useState, useEffect } from 'react';
import { searchCardsApi } from '../api/cards';

const INITIAL_FILTERS = {
  type: null,
  colors: null,
  cmc: null,
};

export function useCardSearch(initialQuery = '', debounceDelay = 300) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  useEffect(() => {
    const hasQuery = searchTerm.trim().length >= 2;
    const hasActiveFilters = Boolean(
      filters.type || filters.colors || filters.cmc !== null
    );

    // Si no hay texto ni filtros activos, limpiamos
    if (!hasQuery && !hasActiveFilters) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const payload = {
        ...(hasQuery ? { q: searchTerm.trim() } : {}),
        // Solo enviar type si NO es 'all' ni está vacío:
        ...(filters.type && filters.type !== 'all' ? { type: filters.type } : {}),
        ...(filters.colors ? { colors: filters.colors } : {}),
        ...(filters.cmc !== null ? { cmc: filters.cmc } : {}),
        limit: 24,
        };

        const data = await searchCardsApi(payload);
        setResults(data || []);
      } catch (err) {
        console.error('Error buscando cartas:', err);
        setError('Error al consultar el catálogo. Intenta de nuevo.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [searchTerm, filters, debounceDelay]);

  return {
    searchTerm,
    setSearchTerm,
    filters,
    handleFilterChange,
    handleResetFilters,
    results,
    loading,
    error,
  };
}