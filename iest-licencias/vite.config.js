import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/logo.jpg'],
      manifest: {
        name: 'IEST Licencias Docentes',
        short_name: 'IEST Licencias',
        description: 'Sistema de gestión de licencias docentes — IEST Tinogasta',
        theme_color: '#C0202A',
        background_color: '#F5F5F5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/logo.jpg', sizes: '192x192', type: 'image/jpeg' },
          { src: 'icons/logo.jpg', sizes: '512x512', type: 'image/jpeg' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg}']
      }
    })
  ]
})
