export function normalizePricingValue(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function normalizeCarTypeName(name) {
  return String(name || '').trim().toLowerCase()
}

export function getPricingForCarType(pricing, carType) {
  const fallback = { baseFare: 5, perKm: 2, initialKm: 3 }
  if (!pricing || typeof pricing !== 'object') return fallback

  const wanted = normalizeCarTypeName(carType)
  const entries = Object.entries(pricing)
  if (entries.length === 0) return fallback

  const match = entries.find(([k]) => normalizeCarTypeName(k) === wanted) || entries[0]
  const row = match?.[1] || {}
  return {
    baseFare: normalizePricingValue(row.start, fallback.baseFare),
    perKm: normalizePricingValue(row.per_km, fallback.perKm),
    initialKm: normalizePricingValue(row.initial_km, fallback.initialKm),
  }
}

function round2(n) {
  return Math.round(n * 100) / 100
}

const apiBase = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function estimateRouteApiUrl() {
  return `${apiBase}/api/estimate-route`
}

function validateCoords(point) {
  const lat = Number(point?.lat)
  const lng = Number(point?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

/**
 * Driving distance/duration via TAXIO /api/estimate-route (server-side Google Distance Matrix).
 * Never calls maps.googleapis.com from the browser.
 */
async function fetchRouteEstimate({ pickup, dropoff }) {
  const response = await fetch(estimateRouteApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pickup, dropoff }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const reason = data?.error || `http_${response.status}`
    console.warn('[taxio-booking] Route estimate unavailable:', reason)
    throw new Error(reason === 'ROUTE_ESTIMATE_UNAVAILABLE' ? reason : 'ROUTE_ESTIMATE_UNAVAILABLE')
  }

  if (
    data?.source !== 'google_distance_matrix' ||
    !Number.isFinite(data.distanceKm) ||
    !Number.isFinite(data.durationMin)
  ) {
    console.warn('[taxio-booking] Route estimate unavailable: INVALID_RESPONSE')
    throw new Error('ROUTE_ESTIMATE_UNAVAILABLE')
  }

  return {
    distanceKm: data.distanceKm,
    durationMin: data.durationMin,
    source: 'google_distance_matrix',
  }
}

/**
 * Driving-route estimate via TAXIO backend only.
 * Throws when the route cannot be resolved — no geocode/haversine/text fallbacks.
 */
export async function estimateTrip({ pickup, dropoff, pricing, carType }) {
  const pickupCoords = validateCoords(pickup)
  const dropoffCoords = validateCoords(dropoff)
  if (!pickupCoords || !dropoffCoords) {
    return {
      distanceKm: null,
      durationMin: null,
      estimatedPrice: null,
      source: 'insufficient_input',
    }
  }

  const trip = await fetchRouteEstimate({
    pickup: pickupCoords,
    dropoff: dropoffCoords,
  })

  const rate = getPricingForCarType(pricing, carType)
  // Dashboard model: round2(start + max(0, distanceKm - initial_km) * per_km) — no surge/time extras.
  const billableKm = Math.max(0, trip.distanceKm - rate.initialKm)
  const estimatedPrice = round2(rate.baseFare + rate.perKm * billableKm)

  return {
    ...trip,
    estimatedPrice,
  }
}
