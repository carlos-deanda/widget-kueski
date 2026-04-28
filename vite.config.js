import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './public/manifest.json' // <--- Verifica esta ruta

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Esto evita los nombres con letras raras tipo -CnZPKKjU
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        entryFileNames: '[name].js',
      },
    },
  },
})