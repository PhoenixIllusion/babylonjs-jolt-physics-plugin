import { defineConfig } from 'vite'
import type { Page }from 'vite-plugin-virtual-mpa';
import { createMpaPlugin } from 'vite-plugin-virtual-mpa'
import fs from 'fs';

function genPages() {
  const files = fs.readdirSync('src/scene').filter(file => /.+\.ts$/.test(file)).map(js_file => js_file.replace('.ts',''));
  const pages: Page[] = [{
      name: "index",
      template: 'static/_index.html',
      data: {
        files
      }
  }, 
  ... files.map(file => ({
    name: file, 
    template: `static/_template.html` as any,
    data: {
      title: file,
      scene: file
    }
  }))];
  return pages;
}



const mapPlugin = createMpaPlugin({
  pages: genPages(),
  watchOptions: {
    events: ['add', 'unlink'],
    handler: (ctx) => {
      ctx.reloadPages(genPages());
    }
  }
});

const dir = 'gltf-extras';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        dir: '../.git-pages/'+dir+'/'
      },
      external: ['static']
    }
  },
  base: '/babylonjs-jolt-physics-plugin/'+dir,
  plugins: [
    mapPlugin as any
  ],
  server: {
    host: 'localhost',
    port: 8080
  }
})