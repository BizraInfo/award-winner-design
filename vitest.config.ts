import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{js,ts,tsx}'],
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
      // Quality gate thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
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
    },
  },
})
