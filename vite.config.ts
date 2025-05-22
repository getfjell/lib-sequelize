import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig({
  server: {
    port: 3000
  },
  plugins: [
    ...VitePluginNode({
      adapter: 'express',
      appPath: './src/index.ts',
      exportName: 'viteNodeApp',
      tsCompiler: 'swc',
    }),
    // visualizer({
    //     template: 'network',
    //     filename: 'network.html',
    //     projectRoot: process.cwd(),
    // }),
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      exclude: ['./tests/**/*.ts'],
      include: ['./src/**/*.ts'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    lib: {
      entry: './src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      output: [
        {
          format: 'esm',
          entryFileNames: '[name].js',
          preserveModules: true,
          exports: 'named',
          sourcemap: 'inline',
        },
        {
          format: 'cjs',
          entryFileNames: '[name].cjs',
          preserveModules: true,
          exports: 'named',
          sourcemap: 'inline',
        },
      ],
    },
    modulePreload: false,
    minify: false,
    sourcemap: true
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      all: true,
      exclude: ['**/node_modules/**', '**/dist/**'],
      // Vitest does not support per-type coverage thresholds directly in config as of v3.1.4
      // Thresholds: branches: 66, functions: 71, lines: 75, statements: 75
    },
    root: '.',
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@vite/': path.resolve(__dirname, './src'),
    },
    testTimeout: 30000,
    silent: false,
    maxConcurrency: 4,
    watch: false,
    reporters: 'default',
    sequence: {
      concurrent: false,
    },
  },
});