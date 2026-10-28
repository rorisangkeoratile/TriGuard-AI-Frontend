import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// In development, /api is forwarded to the backend so the session cookie stays same-origin.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_URL || 'http://localhost:8000'
  let warned = false
  return {
    plugins: [react()],
    server: {
      // Listen on IPv4 too: on some Windows machines "localhost" only bound to IPv6 (::1),
      // so browsers that use 127.0.0.1 couldn't open the app.
      host: '127.0.0.1',
      port: 5173,
      open: true,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          // When the backend isn't running: one clear line in the terminal instead of a stack trace per request,
          // and a 503 the app shows as "can't reach the server".
          configure: proxy => {
            proxy.on('error', (err, _req, res) => {
              if (!warned) {
                console.warn(`\n  TriGuard backend not reachable at ${target} (${err.code || err.message}). Start it, or set VITE_API_URL in .env.\n`)
                warned = true
              }
              if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(503, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ detail: 'backend_unreachable' }))
              }
            })
            proxy.on('proxyRes', () => { warned = false })
          },
        },
      },
    },
    test: { environment: 'node' },
  }
})
