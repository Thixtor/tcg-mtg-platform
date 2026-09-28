// ---------------------------------------------------------
// SERVICIO API: MAZOS Y DECKS (MTG)
// ---------------------------------------------------------
import apiClient from './client';

/**
 * Obtiene los mazos de un usuario específico por su ID.
 */
export const getUserDecksApi = async (userId) => {
  const response = await apiClient.get(`/users/${userId}/decks`);
  return response.data;
};

/**
 * Obtiene los mazos del usuario actualmente autenticado vía JWT.
 */
export const getMyDecksApi = async () => {
  const response = await apiClient.get('/decks/me');
  return response.data;
};

/**
 * Crea un nuevo mazo.
 */
export const createDeckApi = async (deckData) => {
  const response = await apiClient.post('/decks/', deckData);
  return response.data;
};

/**
 * Agrega una carta a un mazo específico.
 */
export const addCardToDeckApi = async (deckId, payload) => {
  const response = await apiClient.post(`/decks/${deckId}/cards`, payload);
  return response.data;
};

/**
 * Obtiene las cartas de un mazo junto con su estado de posesión/inventario.
 * Resuelve la importación requerida en DecksPage.jsx
 */
export const getDeckCardsWithStatusApi = async (deckId) => {
  const response = await apiClient.get(`/decks/${deckId}/cards`);
  return response.data;
};

/**
 * Actualiza la información de una carta en un mazo (cantidad, categoría, etc.).
 */
export const updateDeckCardApi = async (deckId, cardId, payload) => {
  const response = await apiClient.patch(`/decks/${deckId}/cards/${cardId}`, payload);
  return response.data;
};

/**
 * Elimina una carta de un mazo.
 */
export const removeCardFromDeckApi = async (deckId, cardId) => {
  const response = await apiClient.delete(`/decks/${deckId}/cards/${cardId}`);
  return response.data;
};