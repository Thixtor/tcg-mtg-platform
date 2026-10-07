// src/api/trade.js
// ---------------------------------------------------------
// SERVICIO API: MERCADO DE TRADE Y PROPUESTAS P2P
// ---------------------------------------------------------
import apiClient from './client';

/**
 * Consulta las ofertas públicas del mercado comunitario.
 */
export const getTradeMarketApi = async (params = {}, options = {}) => {
  const { data } = await apiClient.get('/trade/market', {
    params,
    ...options
  });
  return data;
};

/**
 * Publica una nueva oferta en el Trade Wall.
 * @param {Object} payload - { offered_cards, wanted_cards, notes, location, preferred_usd_rate, accepts_cash }
 */
export const createTradePostApi = async (payload, options = {}) => {
  const { data } = await apiClient.post('/trade/posts', payload, options);
  return data;
};

/**
 * Obtiene las ofertas publicadas por el usuario actual.
 */
export const getMyTradePostsApi = async (options = {}) => {
  const { data } = await apiClient.get('/trade/my-posts', options);
  return data;
};

/**
 * Envía una propuesta de intercambio a una publicación existente.
 * @param {Object} payload - { receiver_id, offered_card_ids, requested_cards, cash_amount, cash_currency, notes }
 */
export const createTradeProposalApi = async (payload, options = {}) => {
  const { data } = await apiClient.post('/trade/proposals', payload, options);
  return data;
};

/**
 * Obtiene las propuestas enviadas y recibidas del usuario autenticado.
 */
export const getMyTradeProposalsApi = async (options = {}) => {
  const { data } = await apiClient.get('/trade/proposals', options);
  return data;
};

/**
 * Responde a una propuesta (aceptar o rechazar).
 */
export const respondTradeProposalApi = async (proposalId, statusAction, options = {}) => {
  const { data } = await apiClient.patch(`/trade/proposals/${proposalId}`, { status: statusAction }, options);
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