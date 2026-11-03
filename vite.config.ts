import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // three.js lives in a lazily-loaded chunk that only downloads when a 3D scene mounts.
    chunkSizeWarningLimit: 1000,
  },
})
