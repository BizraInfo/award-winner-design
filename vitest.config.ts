import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

const isRedisIntegration = process.env.TEST_WITH_REDIS === '1'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
    include: isRedisIntegration
      ? ['tests/integration/**/*.{test,spec}.{js,ts,tsx}']
      : ['tests/unit/**/*.{test,spec}.{js,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'store/**/*.ts',
        'lib/**/*.ts',
        'components/**/*.tsx',
        'app/**/*.ts',
        'app/**/*.tsx'
      ],
      exclude: [
        '**/*.d.ts',
        '**/index.ts',
        '**/*.stories.tsx',
        '**/node_modules/**',
        '**/tests/**'
      ],
      // Quality gate thresholds — ratcheted to current measured values.
      // Increase as test coverage grows. Current baseline (2026-03-05):
      // lines: 7.26%, functions: 18.88%, statements: 7.26%, branches: 46.25%
      thresholds: {
        lines: 5,
        functions: 15,
        branches: 40,
        statements: 5
      }
    },
    // Reporter configuration
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './coverage/test-results.json'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      ...(isRedisIntegration
        ? {}
        : {
            // Mock redis for unit tests — the production Redis client is
            // exercised only in TEST_WITH_REDIS integration runs.
            redis: path.resolve(__dirname, './tests/unit/mocks/redis.ts'),
          }),
    },
  },
})
