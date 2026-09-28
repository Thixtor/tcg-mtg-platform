// ---------------------------------------------------------
// SERVICIO API: GESTIÓN DE MAZOS (DECKS) & INVENTARIO
// ---------------------------------------------------------
import apiClient from './client';

/**
 * Lista todos los mazos creados por un usuario (máximo 10).
 * @param {string} userId - UUID del usuario.
 */
export const getUserDecksApi = async (userId) => {
  const response = await apiClient.get(`/decks/users/${userId}`);
  return response.data;
};

/**
 * Registra un nuevo mazo para el usuario.
 * @param {string} userId - UUID del usuario.
 * @param {Object} payload - { name: string, format: string, description?: string }
 */
export const createDeckApi = async (userId, payload) => {
  const response = await apiClient.post(`/decks/users/${userId}`, payload);
  return response.data;
};

/**
 * Agrega una carta al mazo especificado.
 * @param {string} deckId - UUID del mazo.
 * @param {Object} payload - { scryfall_card_id, quantity, category }
 */
export const addCardToDeckApi = async (deckId, payload) => {
  const response = await apiClient.post(`/decks/${deckId}/cards`, payload);
  return response.data;
};

/**
 * Consulta la lista de cartas de un mazo junto con el análisis de posesión física:
 * DISPONIBLE, EN_OTRO_MAZO o FALTANTE.
 * @param {string} deckId - UUID del mazo.
 */
export const getDeckInventoryStatusApi = async (deckId) => {
  const response = await apiClient.get(`/decks/${deckId}/cards`);
  return response.data;
};