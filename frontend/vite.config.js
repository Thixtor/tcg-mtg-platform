// ---------------------------------------------------------
// CONFIGURACIÓN DE VITE PARA ENTORNO DOCKER Y DESPLIEGUE EN RAILWAY
// ---------------------------------------------------------
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0', // Esencial para exponer el puerto fuera del contenedor
    port: 3000,
    // Permite el dominio asignado por Railway y cualquier subdominio .up.railway.app
    allowedHosts: [
      'independent-truth-production-b036.up.railway.app',
      '.up.railway.app',
    ],
    watch: {
      usePolling: true, // Vital en Docker para detectar cambios de archivos en sistemas host
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      'independent-truth-production-b036.up.railway.app',
      '.up.railway.app',
    ],
  },
});