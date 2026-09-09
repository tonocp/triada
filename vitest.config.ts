import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'src/domain/entities/BudgetAllocation.ts',
        'src/domain/entities/BudgetMonth.ts',
        'src/domain/entities/BudgetYear.ts',
        'src/domain/entities/index.ts',
        'src/shared/i18n/locales/en.ts',
        'src/shared/i18n/locales/es.ts',
      ],
      thresholds: {
        lines: 100,
      },
    },
  },
});
