import { defineConfig, splitVendorChunkPlugin } from 'vite'
import fs from 'fs';

const files = fs.readdirSync('.').filter(file => /.+\.html$/.test(file));
export default defineConfig({
  build: {
    rollupOptions: {
      input: files,
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