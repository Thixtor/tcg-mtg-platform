// src/api/client.js
// ============================================================================
// CLIENTE AXIOS CON SANEAMIENTO DE URL Y CONTROL DE SESIÓN
// ============================================================================
import axios from 'axios';
import { getAccessToken, clearSession } from '@/services/session.service';

/**
 * Normaliza y sanea la URL base de la API eliminando corchetes accidentales,
 * comillas o barras finales, garantizando el prefijo /api.
 * @param {string | undefined} rawUrl
 * @returns {string}
 */
function normalizeApiBaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return 'http://localhost:8000/api';
  }

  // Eliminar espacios, corchetes literales [ ] y comillas accidentales de variables de entorno
  let cleaned = rawUrl
    .trim()
    .replace(/^[\[\(\{"']+\vert{}[\]\)\}"']+$/g, '')
    .trim();

  // Remover slash final si existe
  cleaned = cleaned.replace(/\/+$/, '');

  // Asegurar que termine en /api si no lo incluye ya
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }

  return cleaned;
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

/** @type {import('axios').AxiosInstance} */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Inyección del token Bearer en cada petición saliente
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta con freno para evitar bucle de re-render
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const activeToken = getAccessToken();

      // FRENO DE BUCLE: Solo disparamos el evento de logout si el cliente
      // tenía credenciales en sesión. Si era anónimo, se ignora la invalidación.
      if (activeToken) {
        console.warn(`[Transporte HTTP] 401 Unauthorized en ${error.config?.url}. Invalidando sesión del cliente.`);

        if (typeof clearSession === 'function') {
          clearSession();
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('mtg_dev_user');
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mtg:logout', {
            detail: { reason: 'session_expired' }
          }));
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;