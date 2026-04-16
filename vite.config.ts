import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

// COOP/COEP required for: OPFS SyncAccessHandle, OffscreenCanvas in Worker, high-res timers
const coopHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp'
};

export default defineConfig({
  plugins: [solid()],
  server: { headers: coopHeaders },
  preview: { headers: coopHeaders },
  resolve: { alias: { '~': '/src' } },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] }
});
