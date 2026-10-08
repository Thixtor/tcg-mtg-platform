// src/api/cards.js
// ============================================================================
// SERVICIOS HTTP: CATÁLOGO Y CARTAS (SCRYFALL / LOCAL DB)
// ============================================================================
import apiClient from './client';

/**
 * @typedef {Object} SearchFilters
 * @property {string} [q] - Texto de búsqueda o sintaxis Scryfall.
 * @property {string} [type] - Tipo de carta (e.g. Creature, Instant).
 * @property {string} [colors] - Colores en formato MTG (e.g. WUBRG o C).
 * @property {string} [rarity] - Rareza (common, uncommon, rare, mythic).
 * @property {number} [cmc] - Coste de maná convertido exacto.
 * @property {number} [limit] - Límite de cartas a retornar (default 24/30).
 */

/**
 * @typedef {Object} RequestOptions
 * @property {AbortSignal} [signal] - Señal para cancelar peticiones en vuelo.
 */

// ---------------------------------------------------------
// 1. BÚSQUEDA REACTIVA Y MULTI-FILTRO DE CARTAS
// ---------------------------------------------------------
/**
 * Realiza una búsqueda de cartas limpiando parámetros vacíos o nulos.
 * @param {SearchFilters|string} [filters={}]
 * @param {RequestOptions} [options={}]
 * @returns {Promise<Array<Object>>}
 */
export const searchCardsApi = async (filters = {}, options = {}) => {
  const rawParams = typeof filters === 'string' ? { q: filters } : { ...filters };

  // Limpiar parámetros para no enviar undefined, null o cadenas vacías que confundan a FastAPI
  const cleanParams = {};
  Object.entries(rawParams).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '' && value !== 'all') {
      cleanParams[key] = typeof value === 'string' ? value.trim() : value;
    }
  });

  const response = await apiClient.get('/cards/search', {
    params: cleanParams,
    signal: options.signal,
  });

  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

// ---------------------------------------------------------
// 2. DETALLE ESPECÍFICO DE UNA CARTA POR ID
// ---------------------------------------------------------
/**
 * Obtiene la información detallada de una carta por su UUID de Scryfall.
 * @param {string} cardId
 * @param {RequestOptions} [options={}]
 * @returns {Promise<Object>}
 */
export const getCardByIdApi = async (cardId, options = {}) => {
  if (!cardId) {
    throw new Error('El ID de la carta es obligatorio.');
  }

  const response = await apiClient.get(`/cards/${encodeURIComponent(cardId)}`, {
    signal: options.signal,
  });
  return response.data;
};

// ---------------------------------------------------------
// 3. OBTENER CARTAS FUNCIONALMENTE SIMILARES / SUSTITUTOS
// ---------------------------------------------------------
/**
 * Recupera cartas con similitud algorítmica funcional o de sinergia de mazo.
 * @param {string} cardId
 * @param {number} [limit=6]
 * @param {RequestOptions} [options={}]
 * @returns {Promise<Object>}
 */
export const getSimilarCardsApi = async (cardId, limit = 6, options = {}) => {
  if (!cardId) {
    throw new Error('El ID de la carta es obligatorio para buscar similares.');
  }

  const response = await apiClient.get(`/cards/${encodeURIComponent(cardId)}/similar`, {
    params: { limit },
    signal: options.signal,
  });
  return response.data;
};

// ---------------------------------------------------------
// 4. AUTOCOMPLETADO Y SUGERENCIAS EN VIVO (BÚSQUEDA AVANZADA)
// ---------------------------------------------------------
/**
 * Consulta sugerencias de autocompletado para términos MTG en tiempo real.
 * @param {string} field - Campo a consultar ('name', 'artist', 'oracle', 'keyword').
 * @param {string} query - Cadena de texto parcial.
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<string>>}
 */
export const getAutocompleteApi = async (field = 'name', query = '', signal = undefined) => {
  const cleanQuery = query ? query.trim() : '';
  if (cleanQuery.length < 1) return [];

  const response = await apiClient.get('/cards/autocomplete', {
    params: {
      field,
      q: cleanQuery,
      limit: 8,
    },
    signal,
  });

  return Array.isArray(response?.data) ? response.data : [];
};