import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'rename-admin-to-index',
      closeBundle() {
        const distDir = 'dist-admin'
        const adminHtml = resolve(distDir, 'admin.html')
        const indexHtml = resolve(distDir, 'index.html')
        
        if (fs.existsSync(adminHtml)) {
          fs.copyFileSync(adminHtml, indexHtml)
          fs.unlinkSync(adminHtml) // Remove admin.html
          console.log('✅ Renamed admin.html to index.html for Vercel')
        }
      },
    },
  ],
  build: {
    outDir: 'dist-admin',
    rollupOptions: {
      input: resolve(__dirname, 'admin.html'),
    },
    emptyOutDir: true,
  },
  server: {
    port: 3001,
  },
})

