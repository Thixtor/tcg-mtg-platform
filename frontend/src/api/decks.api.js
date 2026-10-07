// ============================================================================
// SERVICIO API: GESTIÓN DE MAZOS, DECKS Y WISHLIST ASOCIADA (MTG)
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Provee comunicación HTTP con los endpoints RESTful de FastAPI (/decks).
// - Soporta auditoría de cartas con estados de inventario físico (DISPONIBLE, EN_OTRO_MAZO, FALTANTE).
// - Expone syncDeckMissingToWishlistApi para transferir en lote las cartas faltantes
//   hacia la Wishlist activa del usuario para matching de intercambio en el Trade Wall.
// ============================================================================

import apiClient from './client';

/**
 * Obtiene los mazos de un usuario específico.
 */
export const getUserDecksApi = async (userId, options = {}) => {
  const response = await apiClient.get(`/decks/users/${userId}`, options);
  return response.data;
};

/**
 * Obtiene todos los mazos del usuario autenticado.
 */
export const getMyDecksApi = async (options = {}) => {
  const response = await apiClient.get('/decks/me', options);
  return response.data;
};

/**
 * Crea un nuevo mazo para el usuario autenticado.
 */
export const createDeckApi = async (deckData, options = {}) => {
  const response = await apiClient.post('/decks', deckData, options);
  return response.data;
};

/**
 * Actualiza los metadatos de un mazo existente.
 */
export const updateDeckApi = async (deckId, deckData, options = {}) => {
  const response = await apiClient.patch(`/decks/${deckId}`, deckData, options);
  return response.data;
};

/**
 * Consulta la lista de mazos públicos comunitarios.
 */
export const getPublicDecksApi = async (params = {}, options = {}) => {
  try {
    const response = await apiClient.get('/decks/public', { params, ...options });
    return response.data;
  } catch (err) {
    if (err.name === 'CanceledError' || err.name === 'AbortError' || options?.signal?.aborted) {
      throw err;
    }
    if (err.response?.status === 404 || err.response?.status === 405) {
      const fallback = await apiClient.get('/decks', {
        params: { is_public: true, ...params },
        ...options
      });
      return fallback.data;
    }
    throw err;
  }
};

/**
 * Obtiene el detalle de un mazo público comunitario.
 */
export const getPublicDeckDetailApi = async (deckId, options = {}) => {
  const response = await apiClient.get(`/decks/${deckId}/public`, options);
  return response.data;
};

/**
 * Clona (Fork) un mazo comunitario a la cuenta del usuario autenticado.
 */
export const forkDeckApi = async (deckId, options = {}) => {
  const response = await apiClient.post(`/decks/${deckId}/fork`, {}, options);
  return response.data;
};

/**
 * Añade una carta individual a un mazo.
 */
export const addCardToDeckApi = async (deckId, payload, options = {}) => {
  const response = await apiClient.post(`/decks/${deckId}/cards`, payload, options);
  return response.data;
};

/**
 * Obtiene las cartas de un mazo auditadas contra el inventario físico (DISPONIBLE, EN_OTRO_MAZO, FALTANTE).
 */
export const getDeckCardsWithStatusApi = async (deckId, options = {}) => {
  const response = await apiClient.get(`/decks/${deckId}/cards`, options);
  return response.data;
};

/**
 * Actualiza cantidad o zona (mainboard, commander, sideboard) de una carta en el mazo.
 */
export const updateDeckCardApi = async (deckId, cardId, payload, options = {}) => {
  const response = await apiClient.patch(`/decks/${deckId}/cards/${cardId}`, payload, options);
  return response.data;
};

/**
 * Elimina una carta del mazo.
 */
export const removeCardFromDeckApi = async (deckId, cardId, options = {}) => {
  const response = await apiClient.delete(`/decks/${deckId}/cards/${cardId}`, options);
  return response.data;
};

/**
 * Importa o añade cartas de forma masiva a un mazo.
 */
export const bulkAddCardsToDeckApi = async (deckId, cards, options = {}) => {
  const response = await apiClient.post(`/decks/${deckId}/cards/bulk`, { cards }, options);
  return response.data;
};

/**
 * Sincroniza todas las cartas en estado FALTANTE del mazo hacia la Wishlist activa del usuario.
 */
export const syncDeckMissingToWishlistApi = async (deckId, options = {}) => {
  const response = await apiClient.post(`/decks/${deckId}/sync-wishlist`, {}, options);
  return response.data;
};

export default {
  getUserDecksApi,
  getMyDecksApi,
  createDeckApi,
  updateDeckApi,
  getPublicDecksApi,
  getPublicDeckDetailApi,
  forkDeckApi,
  addCardToDeckApi,
  getDeckCardsWithStatusApi,
  updateDeckCardApi,
  removeCardFromDeckApi,
  bulkAddCardsToDeckApi,
  syncDeckMissingToWishlistApi
};