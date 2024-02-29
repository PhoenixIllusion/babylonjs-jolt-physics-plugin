import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        "index": "index.html",
        "2d_funnel": "2d_funnel.html",
        "2d_funnel_instanced": "2d_funnel_instanced.html",
        "add_remove_bodies": "add_remove_bodies.html",
        "bounce_sphere": "bounce_sphere.html",
        "character_virtual": "character_virtual.html",
        "constraints": "constraints.html",
        "conveyor_belt": "conveyor_belt.html",
        "falling_shapes": "falling_shapes.html",
        "heightfield": "heightfield.html",
        "friction": "friction.html",
        "motor": "motor.html",
        "ray_cast": "ray_cast.html",
        "vehicle_wheeled": "vehicle_wheeled.html",
        "vehicle_motorcycle": "vehicle_motorcycle.html"
      },
      output: {
        dir: '../.git-pages/basic-examples/'
      }
    }
  },
  base: '/babylonjs-jolt-physics-plugin/basic-examples',
  server: {
    host: 'localhost',
    port: 8080
  }
})