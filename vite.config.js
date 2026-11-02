import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Forward API calls to the backend in /backend (npm run dev there); VITE_DEV_API_PROXY overrides the address
      proxy: {
        '/api': env.VITE_DEV_API_PROXY || 'http://localhost:4000',
      },
    },
  }
})
