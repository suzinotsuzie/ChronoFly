/**
 * Vercel serverless proxy for AviationStack API.
 * Set AVIATIONSTACK_KEY in Vercel project Environment Variables.
 */
export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ data: [] }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const key = process.env.AVIATIONSTACK_KEY;
    if (!key) {
      return Response.json({ data: [] });
    }
    const url = new URL(request.url);
    const flightNo = url.searchParams.get('flightNo') || '';
    const flightDate = url.searchParams.get('flight_date') || '';
    const params = new URLSearchParams({
      access_key: key,
      flight_iata: flightNo,
    });
    if (/^\d{4}-\d{2}-\d{2}$/.test(flightDate)) {
      params.set('flight_date', flightDate);
    }
    try {
      // Free plan of AviationStack does not support HTTPS for some endpoints.
      // Use HTTP here; the request still goes server-to-server from Vercel.
      const res = await fetch(
        `http://api.aviationstack.com/v1/flights?${params.toString()}`
      );
      const data = await res.json();
      return Response.json(data);
    } catch (e) {
      return Response.json({ data: [] });
    }
  },
};
