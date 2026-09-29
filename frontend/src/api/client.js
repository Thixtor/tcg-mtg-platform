// ---------------------------------------------------------
// CLIENTE AXIOS CON INTERCEPTORES DE SESIÓN
// ---------------------------------------------------------
import axios from 'axios';
import { getAccessToken } from '@/services/session.service';

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

// Interceptor de respuesta resiliente
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn(`[Transporte HTTP] 401 Unauthorized en ${error.config?.url}. Sesión preservada localmente.`);
    }
    return Promise.reject(error);
  }
);

export default apiClient;