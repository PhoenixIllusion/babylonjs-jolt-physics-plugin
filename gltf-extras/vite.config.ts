import { defineConfig, splitVendorChunkPlugin } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        'index': 'index.html',
        'intro': 'intro.html'
      },
      output: {
        dir: '../.git-pages/gltf-extras/'
      }
    }
  },
  base: '/babylonjs-jolt-physics-plugin/gltf-extras',
  plugins: [splitVendorChunkPlugin()],
  server: {
    host: 'localhost',
    port: 8080
  }
})