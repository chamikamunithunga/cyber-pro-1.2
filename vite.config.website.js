import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-website',
    rollupOptions: {
      input: './index.html',
    },
  },
  server: {
    port: 3000,
  },
})

