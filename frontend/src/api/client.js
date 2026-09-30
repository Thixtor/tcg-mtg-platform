// ---------------------------------------------------------
// CLIENTE AXIOS CON INTERCEPTORES DE SESIÓN
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

// Interceptor de respuesta con invalidación real ante 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn(`[Transporte HTTP] 401 Unauthorized en ${error.config?.url}. Invalidando sesión del cliente.`);
      
      // Limpia credenciales de sesión en storage
      if (typeof clearSession === 'function') {
        clearSession();
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('mtg_dev_user');
      }

      // Emite evento para que App.jsx y los componentes sincronicen su estado
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mtg:logout', {
          detail: { reason: 'session_expired' }
        }));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;