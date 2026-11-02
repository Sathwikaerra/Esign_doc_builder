import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // VITE_API_URL is the one backend address (see .env.example). When it is a full URL, /api is also forwarded there
  // in development; when it is empty the backend is assumed on http://localhost:4000.
  const apiOrigin = /^https?:\/\//.test(env.VITE_API_URL || '') ? new URL(env.VITE_API_URL).origin : 'http://localhost:4000'
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': apiOrigin,
      },
    },
  }
})
