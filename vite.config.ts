import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { fileURLToPath, URL } from 'node:url';

const coopHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp'
};

export default defineConfig({
  plugins: [solid()],
  server: { headers: coopHeaders },
  preview: { headers: coopHeaders },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
      'numeric_es6': 'numeric'
    }
  },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] }
});
