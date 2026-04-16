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
      // Scoped to directories with actual test coverage.
      // Vitest 4 instruments ALL files matching coverage.include (no coverage.all).
      // Including untested dirs (app/, components/) inflates the denominator
      // and hides real regression signals. Add dirs here as tests are written.
      include: [
        'store/**/*.ts',
        'lib/invites/**/*.ts',
        'lib/members/**/*.ts',
        'lib/redis/**/*.ts',
        'lib/security/**/*.ts',
        'lib/crypto/**/*.ts',
      ],
      exclude: [
        '**/*.d.ts',
        '**/index.ts',
        '**/*.stories.tsx',
        '**/node_modules/**',
        '**/tests/**'
      ],
      // Quality gate thresholds — ratcheted to measured values on the
      // narrowed include set. Increase as coverage grows.
      // Baseline (2026-04-16, narrowed scope):
      //   store: ~33% | lib/invites: ~65% | lib/members: ~64%
      //   lib/redis: ~63% | lib/security: ~30%
      thresholds: {
        lines: 30,
        functions: 25,
        branches: 20,
        statements: 30
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
