import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: []
  },
  resolve: {
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
    conditions: ['development', 'browser']
  }
});
