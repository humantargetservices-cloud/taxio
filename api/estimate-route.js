import { json } from './_utils.js'

function round2(n) {
  return Math.round(n * 100) / 100
}

function parseCoord(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function validateLatLng(point) {
  if (!point || typeof point !== 'object') return null
  const lat = parseCoord(point.lat)
  const lng = parseCoord(point.lng)
  if (lat == null || lng == null) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

function resolveGoogleMapsApiKey() {
  const server = String(process.env.GOOGLE_MAPS_SERVER_API_KEY || '').trim()
  if (server) return server
  const vite = String(process.env.VITE_GOOGLE_MAPS_API_KEY || '').trim()
  if (vite) {
    console.warn(
      '[estimate-route] GOOGLE_MAPS_SERVER_API_KEY missing; using VITE_GOOGLE_MAPS_API_KEY fallback'
    )
    return vite
  }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  try {
    const body =
      typeof req.body === 'string' && req.body ? JSON.parse(req.body) : req.body || {}
    const pickup = validateLatLng(body.pickup)
    const dropoff = validateLatLng(body.dropoff)
    if (!pickup || !dropoff) {
      return json(res, 400, { error: 'Invalid pickup or dropoff coordinates.' })
    }

    const key = resolveGoogleMapsApiKey()
    if (!key) {
      console.warn('[estimate-route] No Google Maps API key configured')
      return json(res, 502, { error: 'ROUTE_ESTIMATE_UNAVAILABLE' })
    }

    const params = new URLSearchParams({
      origins: `${pickup.lat},${pickup.lng}`,
      destinations: `${dropoff.lat},${dropoff.lng}`,
      mode: 'driving',
      units: 'metric',
      key,
    })

    const googleRes = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`
    )
    const data = await googleRes.json().catch(() => ({}))

    if (!googleRes.ok || data?.status !== 'OK') {
      console.warn('[estimate-route] Google Distance Matrix failed:', data?.status || googleRes.status)
      return json(res, 502, { error: 'ROUTE_ESTIMATE_UNAVAILABLE' })
    }

    const el = data?.rows?.[0]?.elements?.[0]
    if (!el || el.status !== 'OK') {
      console.warn('[estimate-route] Google element status:', el?.status || 'UNKNOWN')
      return json(res, 502, { error: 'ROUTE_ESTIMATE_UNAVAILABLE' })
    }

    const meters = Number(el.distance?.value)
    const sec = Number(el.duration?.value)
    if (!Number.isFinite(meters) || meters <= 0 || !Number.isFinite(sec) || sec <= 0) {
      return json(res, 502, { error: 'ROUTE_ESTIMATE_UNAVAILABLE' })
    }

    return json(res, 200, {
      distanceKm: round2(meters / 1000),
      durationMin: Math.max(1, Math.round(sec / 60)),
      source: 'google_distance_matrix',
    })
  } catch (err) {
    console.error('[estimate-route]', err)
    return json(res, 502, { error: 'ROUTE_ESTIMATE_UNAVAILABLE' })
  }
}
