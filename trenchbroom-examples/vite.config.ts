import { defineConfig, splitVendorChunkPlugin } from 'vite'

export default defineConfig({
  build: {
    minify: 'terser',
    rollupOptions: {
      input: {
        'character_intro': 'character-intro.html',
        'hello_world': 'hello-world.html',
        'rigged_character': 'rigged-character.html'
      }
    }
  },
  plugins: [splitVendorChunkPlugin()],
  server: {
    host: 'localhost',
    port: 8080
  }
})