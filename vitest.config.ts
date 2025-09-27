import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [],
    testTimeout: 10000,
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'frontend/dist/**',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        'docs/**',
        '**/*.test.{ts,js}',
        'scripts/**'
      ],
      thresholds: {
        global: {
          branches: 65,
          functions: 65,
          lines: 65,
          statements: 65
        }
      }
    },
    env: {
      NODE_ENV: 'test',
    },
  },
});