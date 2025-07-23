import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
)

export default defineConfig({
  plugins: [react()],
  base: '/fjell-registry/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3004
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  }
})
