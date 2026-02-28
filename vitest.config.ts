// vitest.config.ts
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@Shared': fileURLToPath(new URL('./src/modules/shared', import.meta.url)),
      '@src': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'e2e/**'],
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    deps: {
      inline: ['@vitejs/plugin-vue'],
    },
  },
});
