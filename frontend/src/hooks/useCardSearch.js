// src/hooks/useCardSearch.js
// ============================================================================
// HOOK REACT: BÚSQUEDA Y FILTRADO DE CARTAS EN CATÁLOGO / EXPLORADOR
// ============================================================================
import { useState, useEffect } from 'react';
import axios from 'axios';
import { searchCardsApi } from '../api/cards';

const INITIAL_FILTERS = {
  type: null,
  colors: null,
  cmc: null,
};

export function useCardSearch(initialQuery = '', debounceDelay = 350) {
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
    const trimmed = searchTerm ? searchTerm.trim() : '';

    // Si no hay término de búsqueda ni filtros aplicados, mantener limpio sin consultar cartas
    const hasActiveFilters = Boolean(
      (filters.type && filters.type !== 'all') ||
      filters.colors ||
      (filters.cmc !== null && filters.cmc !== undefined)
    );

    if (!trimmed && !hasActiveFilters) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const payload = {
          ...(trimmed ? { q: trimmed } : {}),
          ...(filters.type && filters.type !== 'all' ? { type: filters.type } : {}),
          ...(filters.colors ? { colors: filters.colors } : {}),
          ...(filters.cmc !== null && filters.cmc !== undefined ? { cmc: filters.cmc } : {}),
          limit: 30,
        };

        const data = await searchCardsApi(payload, { signal: controller.signal });
        
        // Soporte para respuestas en array plano o paginadas
        if (Array.isArray(data)) {
          setResults(data);
        } else if (data && Array.isArray(data.items)) {
          setResults(data.items);
        } else if (data && Array.isArray(data.data)) {
          setResults(data.data);
        } else {
          setResults([]);
        }
      } catch (err) {
        if (axios.isCancel(err) || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          return;
        }
        
        if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
          console.warn('La consulta de cartas tardó más de lo esperado (timeout).');
          setError('El servidor tardó en responder. Por favor reintenta la búsqueda.');
        } else {
          console.error('Error buscando cartas en catálogo:', err);
          setError('Error al consultar el catálogo. Intenta de nuevo.');
        }
        setResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, debounceDelay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
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