import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.VITE_AVIATIONSTACK_KEY || ''

  return {
    plugins: [
      react(),
      tailwindcss(),
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
      proxy: apiKey
        ? {
            '/api/flight': {
              target: 'http://api.aviationstack.com',
              changeOrigin: true,
              secure: false,
              rewrite: (path) => {
                // path is /api/flight; flightNo is passed as query by frontend
                return path
              },
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq, req) => {
                  const url = req.url || ''
                  const flightNoMatch = url.match(/[?&]flightNo=([^&]+)/)
                  const dateMatch = url.match(/[?&]flight_date=([^&]+)/)
                  const flightNo = flightNoMatch ? decodeURIComponent(flightNoMatch[1]) : ''
                  const flightDate = dateMatch ? decodeURIComponent(dateMatch[1]) : ''
                  let path = `/v1/flights?access_key=${apiKey}&flight_iata=${flightNo}`
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
