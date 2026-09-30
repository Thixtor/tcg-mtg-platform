// ---------------------------------------------------------
// SERVICIO API: GESTIÓN DE WISHLIST / LISTA DE DESEOS P2P
// ---------------------------------------------------------
import apiClient from './client';

/**
 * Obtiene la lista de deseos del usuario autenticado vía JWT.
 * @param {Object} [options]
 * @returns {Promise<Array>}
 */
export const getMyWishlistApi = async (options = {}) => {
  const response = await apiClient.get('/wishlist/me', options);
  return response.data;
};

/**
 * Agrega una carta a la lista de deseos.
 * @param {Object} payload - { scryfall_card_id: string, preferred_finish?: string, max_price_usd?: number }
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export const addCardToWishlistApi = async (payload, options = {}) => {
  const response = await apiClient.post('/wishlist', payload, options);
  return response.data;
};

/**
 * Elimina una carta de la lista de deseos por su identificador.
 * @param {string|number} wishlistCardId
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export const removeCardFromWishlistApi = async (wishlistCardId, options = {}) => {
  const response = await apiClient.delete(`/wishlist/${wishlistCardId}`, options);
  return response.data;
};

export default {
  getMyWishlistApi,
  addCardToWishlistApi,
  removeCardFromWishlistApi,
};