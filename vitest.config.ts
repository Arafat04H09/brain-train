import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'research/**', 'tests/e2e/**']
  },
  resolve: {
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
    conditions: ['development', 'browser']
  }
});
