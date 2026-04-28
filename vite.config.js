import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        content: 'src/content.js',
      },
      output: {
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        entryFileNames: 'assets/[name].js',
      },
    },
  },
})
