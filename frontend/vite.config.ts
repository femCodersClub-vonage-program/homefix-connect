import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Un único .env en la raíz del monorepo para backend y frontend.
  envDir: '..',
  server: {
    port: 5173,
    // El backend corre en :3000. Así el frontend llama a /api sin CORS ni
    // variables de entorno en desarrollo.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
