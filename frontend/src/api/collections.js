// ---------------------------------------------------------
// SERVICIO API: COLECCIONES Y BINDERS
// ---------------------------------------------------------
import apiClient from './client';

/**
 * Obtiene todas las colecciones/binders del usuario autenticado vía JWT.
 */
export const getMyCollectionsApi = async () => {
  const response = await apiClient.get('/collections/me');
  return response.data;
};

/**
 * Crea una nueva colección para el usuario autenticado (máximo 10 por usuario).
 * @param {Object} payload - { name: string, description?: string, is_public_trade?: boolean }
 */
export const createMyCollectionApi = async (payload) => {
  const response = await apiClient.post('/collections/me', payload);
  return response.data;
};

/**
 * Lista colecciones asociadas a un usuario específico (para perfiles públicos).
 * @param {string} userId - UUID del usuario.
 */
export const getUserCollectionsApi = async (userId) => {
  const response = await apiClient.get(`/users/${userId}/collections`);
  return response.data;
};

/**
 * Crea una colección indicando el ID de usuario explícito.
 * @param {string} userId - UUID del usuario.
 * @param {Object} payload - { name: string, description?: string }
 */
export const createCollectionApi = async (userId, payload) => {
  const response = await apiClient.post(`/users/${userId}/collections`, payload);
  return response.data;
};

/**
 * Obtiene todas las cartas físicas registradas en una colección dada.
 * @param {string} collectionId - UUID de la colección.
 */
export const getCollectionCardsApi = async (collectionId) => {
  const response = await apiClient.get(`/collections/${collectionId}/cards`);
  return response.data;
};

/**
 * Registra una copia física de una carta en una colección.
 * @param {string} collectionId - UUID de la colección.
 * @param {Object} payload - { scryfall_card_id, quantity, condition, language, is_foil, is_for_trade, trade_notes }
 */
export const addCardToCollectionApi = async (collectionId, payload) => {
  const response = await apiClient.post(`/collections/${collectionId}/cards`, payload);
  return response.data;
};

/**
 * Elimina una carta física de una colección.
 * @param {string} collectionId - UUID de la colección.
 * @param {string} cardId - UUID del registro físico (UserCard).
 */
export const removeCardFromCollectionApi = async (collectionId, cardId) => {
  const response = await apiClient.delete(`/collections/${collectionId}/cards/${cardId}`);
  return response.data;
};