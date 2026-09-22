import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Se DEBE incluir 'export default' antes de defineConfig
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permite conexiones externas a Docker
    port: 3000,
    strictPort: true
  }
});