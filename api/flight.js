/**
 * Vercel serverless `/api/flight` — 优先飞常准 MCP 数据网关（与 @variflight-ai/variflight-mcp 相同协议），
 * 否则回退 AviationStack（需 AVIATIONSTACK_KEY）。
 *
 * 环境变量：
 * - VARIFLIGHT_API_KEY（或 X_VARIFLIGHT_KEY，与官方 MCP 一致）
 * - VARIFLIGHT_API_URL（可选，默认 https://mcp.variflight.com/api/v1/mcp/data）
 * - AVIATIONSTACK_KEY（无飞常准 Key 时使用）
 */
const DEFAULT_VARIFLIGHT_URL = 'https://mcp.variflight.com/api/v1/mcp/data'

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ data: [] }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const url = new URL(request.url)
    const flightNo = url.searchParams.get('flightNo') || ''
    const flightDate = url.searchParams.get('flight_date') || ''

    const vfKey = process.env.VARIFLIGHT_API_KEY || process.env.X_VARIFLIGHT_KEY
    const vfUrl = process.env.VARIFLIGHT_API_URL || DEFAULT_VARIFLIGHT_URL

    if (vfKey) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(flightDate)) {
        return Response.json({ code: 400, message: 'flight_date (YYYY-MM-DD) required', data: null })
      }
      try {
        const res = await fetch(vfUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-VARIFLIGHT-KEY': vfKey,
          },
          body: JSON.stringify({
            endpoint: 'flight',
            params: {
              fnum: flightNo.trim().toUpperCase(),
              date: flightDate,
            },
          }),
        })
        const data = await res.json()
        return Response.json(data)
      } catch {
        return Response.json({ code: 502, message: 'upstream_failed', data: null })
      }
    }

    const asKey = process.env.AVIATIONSTACK_KEY
    if (!asKey) {
      return Response.json({ data: [] })
    }
    const params = new URLSearchParams({
      access_key: asKey,
      flight_iata: flightNo,
    })
    if (/^\d{4}-\d{2}-\d{2}$/.test(flightDate)) {
      params.set('flight_date', flightDate)
    }
    try {
      const res = await fetch(`http://api.aviationstack.com/v1/flights?${params.toString()}`)
      const data = await res.json()
      return Response.json(data)
    } catch {
      return Response.json({ data: [] })
    }
  },
}
