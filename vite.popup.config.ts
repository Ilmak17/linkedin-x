import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'node:path'

// `root` is the popup directory so the built HTML lands at dist/popup/popup.html
// with asset paths relative to itself. `publicDir: false` keeps this build from
// copying public/ a second time; the top-level build script does that once.
export default defineConfig({
  plugins: [preact()],
  root: resolve(__dirname, 'src/settings'),
  base: './',
  publicDir: false,
  build: {
    outDir: resolve(__dirname, 'dist/popup'),
    emptyOutDir: true,
    target: 'chrome110',
    minify: false,
    rollupOptions: {
      // Without this Vite looks for index.html in `root`.
      input: resolve(__dirname, 'src/settings/popup.html'),
    },
  },
})
