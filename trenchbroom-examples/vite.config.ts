import { defineConfig, splitVendorChunkPlugin } from 'vite'

export default defineConfig({
  build: {
    minify: 'terser',
    rollupOptions: {
      input: {
        'character_intro': 'character_intro.html',
        'hello_world': 'hello_world.html',
        'rigged_character': 'rigged_character.html'
      },
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