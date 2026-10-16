import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// In dev the browser talks to Vite, and Vite forwards /api to the .NET API, so no CORS setup is needed.
// docker compose publishes the API on 4001; override with API_URL=http://host:port npm run dev.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: env.API_URL || 'http://localhost:4001', changeOrigin: true },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test-setup.ts',
      css: false,
    },
  };
});
