// ---------------------------------------------------------
// 2. SERVICIOS DEL CATÁLOGO DE CARTAS
// ---------------------------------------------------------
import apiClient from './client';

/**
 * Busca cartas en el catálogo local sincronizado.
 * @param {string} query - Texto de búsqueda (mínimo 2 caracteres).
 * @param {number} limit - Cantidad máxima de registros.
 */
export const searchCardsApi = async (query, limit = 20) => {
  if (!query || query.trim().length < 2) return [];
  const response = await apiClient.get('/cards/search', {
    params: { q: query.trim(), limit },
  });
  return response.data;
};

/**
 * Obtiene los detalles completos de una carta por su UUID de Scryfall.
 * @param {string} cardId
 */
export const getCardByIdApi = async (cardId) => {
  const response = await apiClient.get(`/cards/${cardId}`);
  return response.data;
};