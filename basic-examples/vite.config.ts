import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        "2d_funnel": "2d_funnel.html",
        "character_virtual": "character_virtual.html",
        "conveyor_belt": "conveyor_belt.html",
        "falling_shapes": "falling_shapes.html",
        "friction": "friction.html",
        "bounce_sphere": "index.html",
        "motor": "motor.html"
      },
    }
  },
  server: {
    host: 'localhost',
    port: 8080
  }
})