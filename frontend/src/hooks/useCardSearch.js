// src/hooks/useCardSearch.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { searchCardsApi } from '../api/cards';

const INITIAL_FILTERS = {
  type: null,
  colors: null,
  cmc: null,
};

export function useCardSearch(initialQuery = '', debounceDelay = 320) {
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
    const trimmed = searchTerm.trim();
    const hasQuery = trimmed.length >= 2;
    const hasActiveFilters = Boolean(
      filters.type || filters.colors || filters.cmc !== null
    );

    if (!hasQuery && !hasActiveFilters) {
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
          ...(hasQuery ? { q: trimmed } : {}),
          ...(filters.type && filters.type !== 'all' ? { type: filters.type } : {}),
          ...(filters.colors ? { colors: filters.colors } : {}),
          ...(filters.cmc !== null ? { cmc: filters.cmc } : {}),
          limit: 30,
        };

        const data = await searchCardsApi(payload, { signal: controller.signal });
        setResults(data || []);
      } catch (err) {
        if (axios.isCancel(err) || err.name === 'CanceledError') {
          return;
        }
        console.error('Error buscando cartas:', err);
        setError('Error al consultar el catálogo. Intenta de nuevo.');
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