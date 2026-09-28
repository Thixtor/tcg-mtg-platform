// ---------------------------------------------------------
// SERVICIOS HTTP: CATÁLOGO Y CARTAS (SCRYFALL / LOCAL DB)
// ---------------------------------------------------------
import apiClient from './client';

export const searchCardsApi = async (query, limit = 20) => {
  const response = await apiClient.get('/cards/search', {
    params: { q: query, limit },
  });
  return response.data;
};

export const getCardByIdApi = async (cardId) => {
  const response = await apiClient.get(`/cards/${cardId}`);
  return response.data;
};

// ---------------------------------------------------------
// OBTENER CARTAS FUNCIONALMENTE SIMILARES / SUSTITUTOS
// ---------------------------------------------------------
export const getSimilarCardsApi = async (cardId, limit = 6) => {
  const response = await apiClient.get(`/cards/${cardId}/similar`, {
    params: { limit },
  });
  return response.data;
};