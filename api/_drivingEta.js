/**
 * One-shot driving ETA via Google Distance Matrix (minutes).
 * Used for driver "I'm on my way" — does not persist driver location.
 */

function parseCoord(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function validateLatLng(point) {
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
  const env = String(process.env.VERCEL_ENV || process.env.NODE_ENV || '')
    .trim()
    .toLowerCase()
  if (env !== 'production') {
    return String(process.env.VITE_GOOGLE_MAPS_API_KEY || '').trim() || null
  }
  return null
}

/**
 * @returns {Promise<number|null>} duration minutes or null on failure
 */
export async function fetchDrivingEtaMinutes(origin, destination) {
  const from = validateLatLng(origin)
  const to = validateLatLng(destination)
  if (!from || !to) return null
  const key = resolveGoogleMapsApiKey()
  if (!key) return null
  try {
    const params = new URLSearchParams({
      origins: `${from.lat},${from.lng}`,
      destinations: `${to.lat},${to.lng}`,
      mode: 'driving',
      units: 'metric',
      key,
    })
    const googleRes = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`
    )
    const data = await googleRes.json().catch(() => ({}))
    if (!googleRes.ok || data?.status !== 'OK') return null
    const el = data?.rows?.[0]?.elements?.[0]
    if (!el || el.status !== 'OK') return null
    const sec = Number(el.duration?.value)
    if (!Number.isFinite(sec) || sec <= 0) return null
    return Math.max(1, Math.round(sec / 60))
  } catch {
    return null
  }
}
