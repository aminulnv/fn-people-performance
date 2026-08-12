import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { getThemeBootstrapScript } from './src/lib/brand'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const pkg = require('./package.json') as { version: string }

export default defineConfig(({ command }) => ({
  // Production (EC2): https://performance.nextventures.io/platform/
  // Local `vite`/`vite preview` stay at `/` unless VITE_BASE_PATH is set.
  base:
    process.env.VITE_BASE_PATH ??
    (command === 'build' ? '/platform/' : '/'),
  plugins: [
    react(),
    {
      name: 'inject-theme-bootstrap',
      transformIndexHtml(html) {
        return html.replace(
          '<!--app-theme-bootstrap-->',
          `<script>${getThemeBootstrapScript()}</script>`,
        )
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@tanstack/react-query')) return 'query'
          if (id.includes('@tanstack/react-virtual')) return 'virtual'
          if (id.includes('react-router')) return 'router'
          if (id.includes('lucide-react')) return 'icons'
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/')
          ) {
            return 'react-vendor'
          }
        },
      },
    },
  },
  server: {
    host: true,
    port: 8001,
    strictPort: true,
    // Same-origin /api in local dev → live Express on EC2 (or tunneled :3001).
    // secure:false — many corp networks MITM HTTPS (self-signed in chain); Node
    // would otherwise reject the proxy TLS handshake and login returns 500.
    proxy: {
      '/api': {
        target:
          process.env.VITE_API_PROXY_TARGET ??
          'https://performance.nextventures.io',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}))
