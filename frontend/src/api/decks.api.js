// ---------------------------------------------------------
// SERVICIO API: MAZOS Y DECKS (MTG)
// ---------------------------------------------------------
import apiClient from '@/api/client';

/**
 * Obtiene los mazos públicos de un usuario específico por su ID.
 * @param {string|number} userId - Identificador del usuario.
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<Array<Object>>}
 */
export const getUserDecksApi = async (userId, options = {}) => {
  const response = await apiClient.get(`/decks/users/${userId}`, options);
  return response.data;
};

/**
 * Obtiene los mazos del usuario actualmente autenticado vía JWT.
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<Array<Object>>}
 */
export const getMyDecksApi = async (options = {}) => {
  const response = await apiClient.get('/decks/me', options);
  return response.data;
};

/**
 * Registra un nuevo mazo para el usuario en sesión.
 * @param {Object} deckData - Objeto con datos del mazo (name, format, description).
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<Object>}
 */
export const createDeckApi = async (deckData, options = {}) => {
  const response = await apiClient.post('/decks', deckData, options);
  return response.data;
};

/**
 * Agrega una carta a un mazo específico.
 * @param {string|number} deckId - ID del mazo destino.
 * @param {Object} payload - Objeto con scryfall_card_id, quantity y category.
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<Object>}
 */
export const addCardToDeckApi = async (deckId, payload, options = {}) => {
  const response = await apiClient.post(`/decks/${deckId}/cards`, payload, options);
  return response.data;
};

/**
 * Obtiene las cartas de un mazo auditadas contra el inventario físico en binders.
 * @param {string|number} deckId - ID del mazo a auditar.
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<Array<Object>>}
 */
export const getDeckCardsWithStatusApi = async (deckId, options = {}) => {
  const response = await apiClient.get(`/decks/${deckId}/cards`, options);
  return response.data;
};

/**
 * Actualiza los atributos de una carta dentro de un mazo (cantidad, categoría).
 * @param {string|number} deckId - ID del mazo.
 * @param {string|number} cardId - ID de la carta en el mazo.
 * @param {Object} payload - Datos actualizados.
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<Object>}
 */
export const updateDeckCardApi = async (deckId, cardId, payload, options = {}) => {
  const response = await apiClient.patch(`/decks/${deckId}/cards/${cardId}`, payload, options);
  return response.data;
};

/**
 * Elimina una carta asignada a un mazo.
 * @param {string|number} deckId - ID del mazo.
 * @param {string|number} cardId - ID de la carta en el mazo.
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<Object>}
 */
export const removeCardFromDeckApi = async (deckId, cardId, options = {}) => {
  const response = await apiClient.delete(`/decks/${deckId}/cards/${cardId}`, options);
  return response.data;
};

/**
 * Agrega un lote masivo de cartas a un mazo.
 * @param {string|number} deckId
 * @param {Array<{ scryfall_card_id: string, quantity: number, category: string }>} cards
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<{ message: string, added_count: number, failed_card_ids: string[] }>}
 */
export const bulkAddCardsToDeckApi = async (deckId, cards, options = {}) => {
  const response = await apiClient.post(`/decks/${deckId}/cards/bulk`, { cards }, options);
  return response.data;
};