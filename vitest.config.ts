/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  esbuild: {
    target: 'es2022',
  },
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    include: ['tests/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90
        }
      },
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'tests/',
        'vitest.config.ts',
        'build.js',
        'eslint.config.mjs'
      ],
    },
  },
})
