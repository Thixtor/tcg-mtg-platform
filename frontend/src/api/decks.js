// ---------------------------------------------------------
// SERVICIO API: MAZOS Y DECKS (MTG)
// ---------------------------------------------------------
import apiClient from './client';

/**
 * Obtiene los mazos de un usuario específico por su ID.
 */
export const getUserDecksApi = async (userId, options = {}) => {
  const response = await apiClient.get(`/decks/users/${userId}`, options);
  return response.data;
};

/**
 * Obtiene los mazos del usuario actualmente autenticado vía JWT.
 */
export const getMyDecksApi = async (options = {}) => {
  const response = await apiClient.get('/decks/me', options);
  return response.data;
};

/**
 * Crea un nuevo mazo.
 */
export const createDeckApi = async (deckData, options = {}) => {
  const response = await apiClient.post('/decks', deckData, options);
  return response.data;
};

/**
 * Agrega una carta a un mazo específico.
 */
export const addCardToDeckApi = async (deckId, payload, options = {}) => {
  const response = await apiClient.post(`/decks/${deckId}/cards`, payload, options);
  return response.data;
};

/**
 * Obtiene las cartas de un mazo junto con su estado de posesión/inventario.
 */
export const getDeckCardsWithStatusApi = async (deckId, options = {}) => {
  const response = await apiClient.get(`/decks/${deckId}/cards`, options);
  return response.data;
};

/**
 * Actualiza la información de una carta en un mazo (cantidad, categoría).
 */
export const updateDeckCardApi = async (deckId, cardId, payload, options = {}) => {
  const response = await apiClient.patch(`/decks/${deckId}/cards/${cardId}`, payload, options);
  return response.data;
};

/**
 * Elimina una carta de un mazo.
 */
export const removeCardFromDeckApi = async (deckId, cardId, options = {}) => {
  const response = await apiClient.delete(`/decks/${deckId}/cards/${cardId}`, options);
  return response.data;
};