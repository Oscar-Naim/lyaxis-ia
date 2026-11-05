import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('html2pdf') || id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('katex') || id.includes('rehype-katex') || id.includes('remark-math')) {
              return 'vendor-math';
            }
            if (id.includes('react-markdown') || id.includes('remark-') || id.includes('micromark') || id.includes('mdast')) {
              return 'vendor-markdown';
            }
            if (id.includes('highlight.js')) {
              return 'vendor-hljs';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
  },
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
