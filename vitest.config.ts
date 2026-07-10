import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  esbuild: {
    target: 'es2022',
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'src/index.ts',
        '**/*.d.ts',
        'dist/**',
        'build.js',
        'docs/**',
        'coverage/**',
        'vitest.config.ts',
        'eslint.config.mjs',
      ],
      thresholds: {
        // Measured under Vitest 4 with flat thresholds (Vitest 3 nested
        // thresholds.global was not enforced the same way).
        lines: 90,
        functions: 85,
        branches: 80,
        statements: 90,
      },
    },
  },
});
