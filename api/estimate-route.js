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

function isProduction() {
  return String(process.env.VERCEL_ENV || process.env.NODE_ENV || '')
    .trim()
    .toLowerCase() === 'production'
}

function resolveGoogleMapsApiKey() {
  const server = String(process.env.GOOGLE_MAPS_SERVER_API_KEY || '').trim()
  if (server) return server
  if (!isProduction()) {
    const vite = String(process.env.VITE_GOOGLE_MAPS_API_KEY || '').trim()
    if (vite) {
      console.warn(
        '[estimate-route] GOOGLE_MAPS_SERVER_API_KEY missing; using VITE_GOOGLE_MAPS_API_KEY fallback (dev only)'
      )
      return vite
    }
  }
  return null
}

function isAllowedOrigin(origin) {
  if (!origin) return false
  if (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173') return true
  if (origin === 'https://taxio.be' || origin === 'https://www.taxio.be') return true
  try {
    const u = new URL(origin)
    return u.protocol === 'https:' && u.hostname.endsWith('.taxio.be')
  } catch {
    return false
  }
}

function setCorsHeaders(req, res) {
  const origin = String(req.headers?.origin || req.headers?.Origin || '').trim()
  if (isAllowedOrigin(origin)) {
    if (typeof res.setHeader === 'function') {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      res.setHeader('Vary', 'Origin')
    }
  }
}

function jsonCors(req, res, status, body) {
  setCorsHeaders(req, res)
  return json(res, status, body)
}

function routeUnavailable(req, res, statusCode, googleStatus) {
  return jsonCors(req, res, statusCode, {
    error: 'ROUTE_ESTIMATE_UNAVAILABLE',
    status: googleStatus,
  })
}

export default async function handler(req, res) {
  setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      return res.status(204).end()
    }
    res.statusCode = 204
    return res.end()
  }

  if (req.method !== 'POST') {
    return jsonCors(req, res, 405, { error: 'Method not allowed' })
  }

  try {
    const body =
      typeof req.body === 'string' && req.body ? JSON.parse(req.body) : req.body || {}
    const pickup = validateLatLng(body.pickup)
    const dropoff = validateLatLng(body.dropoff)
    if (!pickup || !dropoff) {
      return jsonCors(req, res, 400, {
        error: 'ROUTE_ESTIMATE_UNAVAILABLE',
        status: 'INVALID_COORDINATES',
      })
    }

    const key = resolveGoogleMapsApiKey()
    if (!key) {
      console.warn('[estimate-route] No Google Maps server API key configured')
      return routeUnavailable(req, res, 500, 'MISSING_GOOGLE_SERVER_KEY')
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

    const topStatus = String(data?.status || '').trim() || `HTTP_${googleRes.status}`
    if (!googleRes.ok || data?.status !== 'OK') {
      console.warn('[estimate-route] Google Distance Matrix failed:', topStatus)
      return routeUnavailable(req, res, 502, topStatus)
    }

    const el = data?.rows?.[0]?.elements?.[0]
    if (!el || el.status !== 'OK') {
      const elementStatus = String(el?.status || 'UNKNOWN').trim()
      console.warn('[estimate-route] Google element status:', elementStatus)
      return routeUnavailable(req, res, 502, elementStatus)
    }

    const meters = Number(el.distance?.value)
    const sec = Number(el.duration?.value)
    if (!Number.isFinite(meters) || meters <= 0 || !Number.isFinite(sec) || sec <= 0) {
      return routeUnavailable(req, res, 502, 'EMPTY_RESULT')
    }

    return jsonCors(req, res, 200, {
      distanceKm: round2(meters / 1000),
      durationMin: Math.max(1, Math.round(sec / 60)),
      source: 'google_distance_matrix',
    })
  } catch (err) {
    console.error('[estimate-route]', err)
    return routeUnavailable(req, res, 502, 'INTERNAL_ERROR')
  }
}
