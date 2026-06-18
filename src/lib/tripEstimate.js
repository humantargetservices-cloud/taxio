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

async function googleDistanceMatrixEstimate(apiKey, pickup, dropoff) {
  const url =
    'https://maps.googleapis.com/maps/api/distancematrix/json' +
    `?origins=${encodeURIComponent(pickup)}` +
    `&destinations=${encodeURIComponent(dropoff)}` +
    '&mode=driving' +
    `&key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url)
  if (!res.ok) throw new Error('distance_matrix_http_error')
  const data = await res.json()
  const el = data?.rows?.[0]?.elements?.[0]
  if (!el || el.status !== 'OK') throw new Error('distance_matrix_no_route')
  const meters = Number(el.distance?.value || 0)
  const sec = Number(el.duration?.value || 0)
  if (!meters || !sec) throw new Error('distance_matrix_empty')
  return {
    distanceKm: round2(meters / 1000),
    durationMin: Math.max(1, Math.round(sec / 60)),
    source: 'google_distance_matrix',
  }
}

/**
 * Driving-route estimate via Google Distance Matrix only.
 * Throws when the route cannot be resolved — no geocode/haversine/text fallbacks.
 */
export async function estimateTrip({ pickupAddress, dropoffAddress, pricing, carType, apiKey }) {
  const pickup = String(pickupAddress || '').trim()
  const dropoff = String(dropoffAddress || '').trim()
  if (!pickup || !dropoff) {
    return {
      distanceKm: null,
      durationMin: null,
      estimatedPrice: null,
      source: 'insufficient_input',
    }
  }

  if (!apiKey) {
    throw new Error('distance_matrix_no_api_key')
  }

  const trip = await googleDistanceMatrixEstimate(apiKey, pickup, dropoff)

  const rate = getPricingForCarType(pricing, carType)
  // Dashboard model: round2(start + max(0, distanceKm - initial_km) * per_km) — no surge/time extras.
  const billableKm = Math.max(0, trip.distanceKm - rate.initialKm)
  const estimatedPrice = round2(rate.baseFare + rate.perKm * billableKm)

  return {
    ...trip,
    estimatedPrice,
  }
}
