import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the Vite server proxies API calls to Express.
    proxy: { '/api': 'http://localhost:8080' },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    // No inline scripts/styles, so the strict CSP (script-src 'self') holds.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/test/**'],
      reporter: ['text', 'html'],
    },
  },
});
