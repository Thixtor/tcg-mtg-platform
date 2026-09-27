// ---------------------------------------------------------
// 5. HOOK CONTROLADOR DE BÚSQUEDA Y ESTADO
// ---------------------------------------------------------
import { useState, useEffect } from 'react';
import { searchCardsApi } from '../api/cards';
import { useDebounce } from './useDebounce';

export function useCardSearch(initialQuery = '', limit = 24) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const debouncedTerm = useDebounce(searchTerm, 350);

  useEffect(() => {
    let isCancelled = false;

    const executeSearch = async () => {
      if (debouncedTerm.trim().length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await searchCardsApi(debouncedTerm, limit);
        if (!isCancelled) {
          setResults(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.response?.data?.detail || 'Error al buscar cartas');
          setResults([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    executeSearch();

    return () => {
      isCancelled = true;
    };
  }, [debouncedTerm, limit]);

  return {
    searchTerm,
    setSearchTerm,
    results,
    loading,
    error,
  };
}