// ---------------------------------------------------------
// SERVICIO API: COLECCIONES Y BINDERS
// ---------------------------------------------------------
import apiClient from './client';

/**
 * Lista todas las colecciones asociadas a un usuario.
 * @param {string} userId - UUID del usuario.
 */
export const getUserCollectionsApi = async (userId) => {
  // Ajuste: si el backend espera /api/users/... asegúrate que apiClient lo maneje.
  const response = await apiClient.get(`/users/${userId}/collections`);
  return response.data;
};

/**
 * Crea una nueva colección respetando la regla de negocio de hasta 10 por usuario.
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