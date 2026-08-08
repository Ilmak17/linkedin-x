import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'node:path'

// The content script must be a classic script: MV3 content scripts are not
// ES modules, so everything has to end up in one self-executing bundle.
export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'chrome110',
    minify: false, // reviewable source is a Chrome Web Store requirement in practice
    lib: {
      entry: resolve(__dirname, 'src/content/main.tsx'),
      name: 'linkedinX',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        extend: true,
      },
    },
  },
})
