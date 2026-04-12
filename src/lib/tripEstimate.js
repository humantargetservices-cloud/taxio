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

function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa))
  return R * c
}

function fallbackDistanceFromText(pickup, dropoff) {
  const a = String(pickup || '').trim().length
  const b = String(dropoff || '').trim().length
  const spread = Math.abs(a - b)
  const km = Math.max(3, Math.min(35, 5 + spread * 0.3))
  const minutes = Math.max(8, Math.round((km / 30) * 60))
  return { distanceKm: round2(km), durationMin: minutes, source: 'fallback' }
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

async function geocode(apiKey, address) {
  const url =
    'https://maps.googleapis.com/maps/api/geocode/json' +
    `?address=${encodeURIComponent(address)}` +
    `&key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('geocode_http_error')
  const data = await res.json()
  const loc = data?.results?.[0]?.geometry?.location
  if (!loc) throw new Error('geocode_no_result')
  return { lat: Number(loc.lat), lng: Number(loc.lng) }
}

async function googleGeocodeEstimate(apiKey, pickup, dropoff) {
  const [a, b] = await Promise.all([geocode(apiKey, pickup), geocode(apiKey, dropoff)])
  const km = Math.max(1, haversineKm(a, b) * 1.2)
  const min = Math.max(5, Math.round((km / 32) * 60))
  return { distanceKm: round2(km), durationMin: min, source: 'google_geocode' }
}

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

  let trip
  if (apiKey) {
    try {
      trip = await googleDistanceMatrixEstimate(apiKey, pickup, dropoff)
    } catch {
      try {
        trip = await googleGeocodeEstimate(apiKey, pickup, dropoff)
      } catch {
        trip = fallbackDistanceFromText(pickup, dropoff)
      }
    }
  } else {
    trip = fallbackDistanceFromText(pickup, dropoff)
  }

  const rate = getPricingForCarType(pricing, carType)
  // Dashboard model: round2(start + max(0, distanceKm - initial_km) * per_km) — no surge/time extras.
  const billableKm = Math.max(0, trip.distanceKm - rate.initialKm)
  const estimatedPrice = round2(rate.baseFare + rate.perKm * billableKm)

  return {
    ...trip,
    estimatedPrice,
  }
}
