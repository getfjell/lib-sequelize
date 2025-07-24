import { build, context } from 'esbuild';
import { readFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const isWatchMode = process.argv.includes('--watch');

// Read dependencies from package.json to mark them as external
const { dependencies, peerDependencies } = JSON.parse(readFileSync('./package.json', 'utf-8'));
const external = [
  ...Object.keys(dependencies || {}),
  ...Object.keys(peerDependencies || {}),
  // Keep Node.js built-ins external
  'util', 'path', 'fs', 'os', 'crypto', 'stream', 'buffer', 'events', 'url',
  'querystring', 'http', 'https', 'zlib', 'net', 'tls', 'cluster', 'child_process'
];

const baseConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  target: 'es2022',
  sourcemap: true,
  minify: false,
  external,
  platform: 'neutral',
  mainFields: ['module', 'main'],
  conditions: ['import', 'module', 'default'],
  alias: {
    '@': './src'
  }
};

async function buildESM() {
  const config = {
    ...baseConfig,
    format: 'esm',
    outfile: 'dist/index.js',
    splitting: false,
  };

  if (isWatchMode) {
    const ctx = await context(config);
    await ctx.watch();
    return ctx;
  } else {
    await build(config);
  }
}

async function generateTypes() {
  console.log('Generating TypeScript declarations...');
  try {
    await execAsync('npx tsc --emitDeclarationOnly --declaration --declarationDir dist --rootDir src src/index.ts');
    console.log('TypeScript declarations generated successfully.');
  } catch (error) {
    console.warn('Warning: Failed to generate TypeScript declarations due to type errors:', error.message);
    console.warn('The JavaScript build completed successfully. Fix TypeScript errors to generate declarations.');
  }
}

async function buildAll() {
  try {
    if (isWatchMode) {
      console.log('Starting watch mode...');
      await buildESM();
      await generateTypes();
      console.log('Watch mode active. Press Ctrl+C to stop.');
    } else {
      console.log('Building ES2022...');
      await buildESM();
      console.log('Generating TypeScript declarations...');
      await generateTypes();
      console.log('Build complete!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildAll();
