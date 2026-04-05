import { defineConfig, loadEnv, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const DEFAULT_VARIFLIGHT_URL = 'https://mcp.variflight.com/api/v1/mcp/data'

function variflightDevProxyPlugin(apiKey: string, apiUrl: string): Plugin {
  return {
    name: 'variflight-flight-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const raw = req.url || ''
        if (!raw.startsWith('/api/flight')) {
          next()
          return
        }
        if (req.method !== 'GET') {
          next()
          return
        }
        try {
          const q = new URL(raw, 'http://dev.local').searchParams
          const flightNo = (q.get('flightNo') || '').trim().toUpperCase()
          const flightDate = (q.get('flight_date') || '').trim()
          if (!flightNo || !/^\d{4}-\d{2}-\d{2}$/.test(flightDate)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ code: 400, message: 'flightNo and flight_date (YYYY-MM-DD) required', data: null }))
            return
          }
          const r = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-VARIFLIGHT-KEY': apiKey,
            },
            body: JSON.stringify({
              endpoint: 'flight',
              params: { fnum: flightNo, date: flightDate },
            }),
          })
          const text = await r.text()
          res.statusCode = r.status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(text)
        } catch {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ code: 502, message: 'proxy_failed', data: null }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const vfKey = env.VITE_VARIFLIGHT_API_KEY || ''
  const vfUrl = env.VITE_VARIFLIGHT_API_URL || DEFAULT_VARIFLIGHT_URL
  const asKey = env.VITE_AVIATIONSTACK_KEY || ''

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(vfKey ? [variflightDevProxyPlugin(vfKey, vfUrl)] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
    server: {
      // 监听 0.0.0.0，手机/同网设备可用「电脑 IP:端口」访问（勿用 localhost）
      host: true,
      port: 5173,
      strictPort: false,
      proxy:
        asKey && !vfKey
          ? {
              '/api/flight': {
                target: 'http://api.aviationstack.com',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path,
                configure: (proxy) => {
                  proxy.on('proxyReq', (proxyReq, req) => {
                    const url = req.url || ''
                    const flightNoMatch = url.match(/[?&]flightNo=([^&]+)/)
                    const dateMatch = url.match(/[?&]flight_date=([^&]+)/)
                    const flightNo = flightNoMatch ? decodeURIComponent(flightNoMatch[1]) : ''
                    const flightDate = dateMatch ? decodeURIComponent(dateMatch[1]) : ''
                    let path = `/v1/flights?access_key=${asKey}&flight_iata=${flightNo}`
                    if (flightDate && /^\d{4}-\d{2}-\d{2}$/.test(flightDate)) {
                      path += `&flight_date=${flightDate}`
                    }
                    proxyReq.path = path
                  })
                },
              },
            }
          : undefined,
    },
  }
})
