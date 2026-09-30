import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/gatekeeper-verify': {
        target: 'https://zero-vip-gatekeeper-lyaxis.vercel.app',
        changeOrigin: true,
        rewrite: () => '/api/v1/keys/verify',
      },
    },
  },
})
