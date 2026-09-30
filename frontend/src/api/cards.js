// ---------------------------------------------------------
// SERVICIOS HTTP: CATÁLOGO Y CARTAS (SCRYFALL / LOCAL DB)
// ---------------------------------------------------------
import apiClient from './client';

// ---------------------------------------------------------
// 1. BÚSQUEDA REACTIVA Y MULTI-FILTRO DE CARTAS
// ---------------------------------------------------------
export const searchCardsApi = async (filters = {}, options = {}) => {
  // Soporta tanto string directo (legado) como objeto estructurado de filtros
  const params = typeof filters === 'string' ? { q: filters } : { ...filters };
  
  const response = await apiClient.get('/cards/search', {
    params,
    signal: options.signal,
  });
  return response.data;
};

// ---------------------------------------------------------
// 2. DETALLE ESPECÍFICO DE UNA CARTA POR ID
// ---------------------------------------------------------
export const getCardByIdApi = async (cardId, options = {}) => {
  const response = await apiClient.get(`/cards/${cardId}`, {
    signal: options.signal,
  });
  return response.data;
};

// ---------------------------------------------------------
// 3. OBTENER CARTAS FUNCIONALMENTE SIMILARES / SUSTITUTOS
// ---------------------------------------------------------
export const getSimilarCardsApi = async (cardId, limit = 6, options = {}) => {
  const response = await apiClient.get(`/cards/${cardId}/similar`, {
    params: { limit },
    signal: options.signal,
  });
  return response.data;
};

// ---------------------------------------------------------
// 4. AUTOCOMPLETADO Y SUGERENCIAS EN VIVO (BÚSQUEDA AVANZADA)
// ---------------------------------------------------------
export const getAutocompleteApi = async (field, query, signal) => {
  if (!query || query.trim().length < 1) return [];

  const response = await apiClient.get('/cards/autocomplete', {
    params: {
      field,
      q: query.trim(),
      limit: 8,
    },
    signal,
  });
  return response.data || [];
};