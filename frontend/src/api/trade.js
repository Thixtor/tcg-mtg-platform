// ============================================================================
// SERVICIO API: MERCADO DE TRADE Y PROPUESTAS P2P (BLACK MARKET)
// ============================================================================
// ARQUITECTURA & REGLAS:
// - getTradeMarketApi: Consulta el feed público mediante /trade/posts?scope=explore.
// - getMyTradePostsApi: Consulta las publicaciones propias mediante /trade/posts?scope=my-posts
//   resolviendo el problema de publicaciones que no aparecían en "Mis Ofertas".
// - createTradePostApi: Envía payload unificado de oferta/solicitud/venta.
// ============================================================================

import apiClient from './client';

/**
 * Consulta las ofertas públicas del mercado comunitario.
 */
export const getTradeMarketApi = async (params = {}, options = {}) => {
  try {
    const { data } = await apiClient.get('/trade/posts', {
      params: { scope: 'explore', ...params },
      ...options
    });
    return data;
  } catch (err) {
    // Fallback hacia el endpoint de mercado plano si no está disponible el feed social
    if (err.response?.status === 404) {
      const fallback = await apiClient.get('/trade/market', { params, ...options });
      return fallback.data;
    }
    throw err;
  }
};

/**
 * Publica una nueva oferta en el Trade Wall / Black Market.
 * @param {Object} payload - { title, content, offered_cards, wanted_cards, notes, location, preferred_usd_rate, accepts_cash, cash_amount }
 */
export const createTradePostApi = async (payload, options = {}) => {
  const { data } = await apiClient.post('/trade/posts', payload, options);
  return data;
};

/**
 * Obtiene las ofertas publicadas por el usuario actual.
 * Conectado con el endpoint de FastAPI: GET /trade/posts?scope=my-posts
 */
export const getMyTradePostsApi = async (options = {}) => {
  const { data } = await apiClient.get('/trade/posts', {
    params: { scope: 'my-posts' },
    ...options
  });
  return data;
};

/**
 * Envía una propuesta de intercambio a una publicación existente.
 * @param {Object} payload - { receiver_id, post_id, requested_cards, offered_card_ids, cash_amount, cash_currency, notes }
 */
export const createTradeProposalApi = async (payload, options = {}) => {
  const { data } = await apiClient.post('/trade/proposals', payload, options);
  return data;
};

/**
 * Obtiene las propuestas enviadas y recibidas del usuario autenticado.
 */
export const getMyTradeProposalsApi = async (options = {}) => {
  const { data } = await apiClient.get('/trade/proposals/me', options);
  return data;
};

/**
 * Responde a una propuesta (aceptar o rechazar).
 */
export const respondTradeProposalApi = async (proposalId, statusAction, options = {}) => {
  const actionPath = statusAction === 'ACCEPTED' ? 'accept' : 'reject';
  const { data } = await apiClient.post(`/trade/proposals/${proposalId}/${actionPath}`, {}, options);
  return data;
};

/**
 * Obtiene coincidencias automáticas de matching entre usuarios.
 */
export const getMyTradeMatchesApi = async (options = {}) => {
  const { data } = await apiClient.get('/matchmaking/me', options);
  return data;
};

export default {
  getTradeMarketApi,
  createTradePostApi,
  getMyTradePostsApi,
  createTradeProposalApi,
  getMyTradeProposalsApi,
  respondTradeProposalApi,
  getMyTradeMatchesApi
};