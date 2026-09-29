// ---------------------------------------------------------
// CONFIGURACIÓN DE VITE PARA ENTORNO DOCKER CON ALIAS
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
    host: '0.0.0.0', // Esencial para exponer el puerto fuera del contenedor[cite: 1]
    port: 3000,
    watch: {
      usePolling: true, // Vital en Docker para detectar cambios de archivos en sistemas host
    },
  },
});