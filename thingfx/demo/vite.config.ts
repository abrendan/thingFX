import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Browser demo build of the desktop renderer, used only for screenshots.
export default defineConfig({
  root: __dirname,
  base: '/__mockup/thingfx-desktop/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src/renderer/src')
    }
  },
  build: {
    outDir: '/home/runner/workspace/artifacts/mockup-sandbox/public/thingfx-desktop',
    emptyOutDir: true
  }
})
