import { defineConfig, splitVendorChunkPlugin } from 'vite'
import fs from 'fs';

const files = fs.readdirSync('.').filter(file => /.+\.html$/.test(file));
export default defineConfig({
  build: {
    rollupOptions: {
      input: files,
      output: {
        dir: '../.git-pages/trenchbroom-examples/'
      }
    }
  },
  base: '/babylonjs-jolt-physics-plugin/trenchbroom-examples',
  plugins: [splitVendorChunkPlugin()],
  server: {
    host: 'localhost',
    port: 8080
  }
})