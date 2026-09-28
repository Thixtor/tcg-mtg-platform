// ---------------------------------------------------------
// 1. CONFIGURACIÓN DEL CLIENTE HTTP (AXIOS)
// ---------------------------------------------------------
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptor de solicitud: Inyecta el JWT Bearer Token automáticamente
apiClient.interceptors.request.use(
  (config) => {
    try {
      // Buscar token en las claves estándar de la aplicación
      const token = 
        localStorage.getItem('mtg_access_token') || 
        localStorage.getItem('token') || 
        localStorage.getItem('access_token');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('No se pudo acceder a localStorage para recuperar el token:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta: Manejo centralizado de 401 y errores de red
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido: limpiar sesión local unificada
      localStorage.removeItem('mtg_access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('mtg_dev_user');
      localStorage.removeItem('user');
    }
    const message = error.response?.data?.detail || error.message || 'Error en la comunicación con el servidor';
    console.error('[API Error]:', message);
    return Promise.reject(error);
  }
);

export default apiClient;