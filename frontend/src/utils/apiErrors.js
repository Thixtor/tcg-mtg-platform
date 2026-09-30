// src/utils/apiErrors.js
/**
 * Extrae y formatea mensajes de error de respuestas de FastAPI / Axios.
 * Previene el crash de React al renderizar arrays de errores 422 de Pydantic.
 * 
 * @param {any} error - Objeto de error capturado en el bloque catch
 * @param {string} fallbackMessage - Mensaje por defecto si no se puede extraer un detalle
 * @returns {string} Mensaje plano listo para renderizar en la UI
 */
export function parseApiError(error, fallbackMessage = 'Ha ocurrido un error inesperado.') {
  if (!error) return fallbackMessage;

  // Si ya es un string directo
  if (typeof error === 'string') return error;

  const detail = error.response?.data?.detail;

  if (!detail) {
    return error.response?.data?.message || error.message || fallbackMessage;
  }

  // Si detail ya es un string
  if (typeof detail === 'string') {
    return detail;
  }

  // Si detail es un array de errores de validación de Pydantic (422)
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
          const msg = item.msg || 'Dato inválido';
          return field ? `${field}: ${msg}` : msg;
        }
        return 'Entrada inválida';
      })
      .filter(Boolean)
      .join(' | ');
  }

  // Si detail es un objeto único
  if (typeof detail === 'object') {
    return detail.msg || JSON.stringify(detail);
  }

  return fallbackMessage;
}