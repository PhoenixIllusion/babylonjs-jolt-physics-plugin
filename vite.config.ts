import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['@babylonjs/core'],
      output: {
        paths: {
          '@babylonjs/core': 'https://unpkg.com/browse/@babylonjs/core@6.23.0/index.js'
        }
      }
    }
  },
  server: {
    host: 'localhost',
    port: 8080
  }
})