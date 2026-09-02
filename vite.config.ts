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
    // secure:false - many corp networks MITM HTTPS (self-signed in chain); Node
    // would otherwise reject the proxy TLS handshake and login returns 500.
    proxy: {
      '/api': {
        target:
          process.env.VITE_API_PROXY_TARGET ??
          'https://performance.nextventures.io',
        changeOrigin: true,
        secure: false,
        timeout: 0,
        proxyTimeout: 0,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq) => {
            // Always advertise the Console-registered local origin, even if the
            // browser opened Vite via 127.0.0.1 or a LAN IP (host: true).
            proxyReq.setHeader('X-Forwarded-Host', 'localhost:8001')
            proxyReq.setHeader('X-Forwarded-Proto', 'http')
          })
          proxy.on('proxyRes', (proxyRes) => {
            const raw = proxyRes.headers['set-cookie']
            if (raw) {
              const cookies = Array.isArray(raw) ? raw : [raw]
              proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
                cookie
                  .replace(/;\s*Secure/gi, '')
                  .replace(/;\s*Domain=[^;]*/gi, ''),
              )
            }
            const location = proxyRes.headers.location
            if (
              typeof location === 'string' &&
              /^https?:\/\/performance\.nextventures\.io(\/|$)/i.test(location)
            ) {
              proxyRes.headers.location = location.replace(
                /^https?:\/\/performance\.nextventures\.io/i,
                'http://localhost:8001',
              )
            }
          })
        },
      },
    },
  },
}))
