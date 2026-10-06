// ---------------------------------------------------------
// SERVICIO API: MAZOS Y DECKS (MTG) - BLINDADO CONTRA BUCLES
// ---------------------------------------------------------
import apiClient from '@/api/client';

export const getUserDecksApi = async (userId, options = {}) => {
  const response = await apiClient.get(`/decks/users/${userId}`, options);
  return response.data;
};

export const getMyDecksApi = async (options = {}) => {
  const response = await apiClient.get('/decks/me', options);
  return response.data;
};

export const createDeckApi = async (deckData, options = {}) => {
  const response = await apiClient.post('/decks', deckData, options);
  return response.data;
};

export const updateDeckApi = async (deckId, deckData, options = {}) => {
  const response = await apiClient.patch(`/decks/${deckId}`, deckData, options);
  return response.data;
};

export const getPublicDecksApi = async (params = {}, options = {}) => {
  try {
    const response = await apiClient.get('/decks/public', { params, ...options });
    return response.data;
  } catch (err) {
    // Si la petición fue abortada intencionalmente, relanzar sin fallback
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

export const getPublicDeckDetailApi = async (deckId, options = {}) => {
  const response = await apiClient.get(`/decks/${deckId}/public`, options);
  return response.data;
};

export const forkDeckApi = async (deckId, options = {}) => {
  const response = await apiClient.post(`/decks/${deckId}/fork`, {}, options);
  return response.data;
};

export const addCardToDeckApi = async (deckId, payload, options = {}) => {
  const response = await apiClient.post(`/decks/${deckId}/cards`, payload, options);
  return response.data;
};

export const getDeckCardsWithStatusApi = async (deckId, options = {}) => {
  const response = await apiClient.get(`/decks/${deckId}/cards`, options);
  return response.data;
};

export const updateDeckCardApi = async (deckId, cardId, payload, options = {}) => {
  const response = await apiClient.patch(`/decks/${deckId}/cards/${cardId}`, payload, options);
  return response.data;
};

export const removeCardFromDeckApi = async (deckId, cardId, options = {}) => {
  const response = await apiClient.delete(`/decks/${deckId}/cards/${cardId}`, options);
  return response.data;
};

export const bulkAddCardsToDeckApi = async (deckId, cards, options = {}) => {
  const response = await apiClient.post(`/decks/${deckId}/cards/bulk`, { cards }, options);
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
  bulkAddCardsToDeckApi
};