// ---------------------------------------------------------
// 3. SERVICIOS DE ANALÍTICA Y PRECIOS HISTÓRICOS
// ---------------------------------------------------------
import apiClient from './client';

/**
 * Obtiene las cotizaciones más recientes de Card Kingdom y TCGplayer.
 * @param {string} cardId
 */
export const getCurrentPricesApi = async (cardId) => {
  const response = await apiClient.get(`/cards/${cardId}/prices/current`);
  return response.data;
};

/**
 * Obtiene la serie temporal cronológica para graficar cotizaciones.
 * @param {string} cardId
 * @param {string} store - 'cardkingdom' o 'tcgplayer'
 * @param {string} type - 'normal' o 'foil'
 * @param {number} days - Ventana de tiempo (ej. 30, 90, 180, 365)
 */
export const getPriceHistoryApi = async (cardId, store = 'cardkingdom', type = 'normal', days = 90) => {
  const response = await apiClient.get(`/cards/${cardId}/prices/history`, {
    params: { tienda: store, tipo: type, days },
  });
  return response.data;
};