import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// During development, /api requests are forwarded to the scanner backend.
// Change BACKEND_URL if your backend runs somewhere else.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: BACKEND_URL, changeOrigin: true },
    },
  },
})
