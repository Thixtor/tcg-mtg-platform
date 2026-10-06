// ---------------------------------------------------------
// CLIENTE AXIOS CON INTERCEPTORES DE SESIÓN PROTEGIDOS
// ---------------------------------------------------------
import axios from 'axios';
import { getAccessToken, clearSession } from '@/services/session.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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