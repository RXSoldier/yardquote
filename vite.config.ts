import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // The browser can't call the Census geocoder directly (no CORS headers),
      // so during development Vite forwards /census/... to it on our behalf.
      // In production, vercel.json does the same job.
      '/census': {
        target: 'https://geocoding.geo.census.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/census/, ''),
      },
    },
  },
})
