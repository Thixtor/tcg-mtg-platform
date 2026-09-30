// ---------------------------------------------------------
// SERVICIO API: COLECCIONES Y BINDERS
// ---------------------------------------------------------
import apiClient from './client';

/**
 * Obtiene todas las colecciones/binders del usuario autenticado vía JWT.
 */
export const getMyCollectionsApi = async (options = {}) => {
  const response = await apiClient.get('/collections/me', options);
  return response.data;
};

/**
 * Crea una nueva colección para el usuario autenticado (máximo 10 por usuario).
 * @param {Object} payload - { name: string, description?: string, is_public_trade?: boolean }
 */
export const createMyCollectionApi = async (payload, options = {}) => {
  const response = await apiClient.post('/collections', payload, options);
  return response.data;
};

/**
 * Lista colecciones asociadas a un usuario específico (para perfiles públicos).
 */
export const getUserCollectionsApi = async (userId, options = {}) => {
  const response = await apiClient.get(`/users/${userId}/collections`, options);
  return response.data;
};

/**
 * Obtiene todas las cartas físicas registradas en una colección dada.
 */
export const getCollectionCardsApi = async (collectionId, options = {}) => {
  const response = await apiClient.get(`/collections/${collectionId}/cards`, options);
  return response.data;
};

/**
 * Registra una copia física de una carta en una colección.
 */
export const addCardToCollectionApi = async (collectionId, payload, options = {}) => {
  const response = await apiClient.post(`/collections/${collectionId}/cards`, payload, options);
  return response.data;
};

/**
 * Actualiza atributos físicos o comerciales de una carta en una colección.
 * @param {string|number} collectionId
 * @param {string|number} cardId
 * @param {Object} payload - { quantity?: number, condition?: string, is_foil?: boolean, is_for_trade?: boolean, trade_notes?: string }
 */
export const updateCollectionCardApi = async (collectionId, cardId, payload, options = {}) => {
  const response = await apiClient.patch(`/collections/${collectionId}/cards/${cardId}`, payload, options);
  return response.data;
};

/**
 * Elimina una carta física de una colección.
 */
export const removeCardFromCollectionApi = async (collectionId, cardId, options = {}) => {
  const response = await apiClient.delete(`/collections/${collectionId}/cards/${cardId}`, options);
  return response.data;
};

/**
 * Elimina una colección o binder completo.
 */
export const deleteCollectionApi = async (collectionId, options = {}) => {
  const response = await apiClient.delete(`/collections/${collectionId}`, options);
  return response.data;
};

export default {
  getMyCollectionsApi,
  createMyCollectionApi,
  getUserCollectionsApi,
  getCollectionCardsApi,
  addCardToCollectionApi,
  updateCollectionCardApi,
  removeCardFromCollectionApi,
  deleteCollectionApi
};