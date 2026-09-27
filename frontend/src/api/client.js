// ---------------------------------------------------------
// 1. CONFIGURACIÓN DEL CLIENTE HTTP (AXIOS)
// ---------------------------------------------------------
import axios from 'axios';

// Toma la URL del backend desde variables de entorno de Vite o usa el fallback local
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor global para capturar errores de forma estructurada
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'Error en la comunicación con el servidor';
    console.error('[API Error]:', message);
    return Promise.reject(error);
  }
);

export default apiClient;