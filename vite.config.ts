import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 4096,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})
