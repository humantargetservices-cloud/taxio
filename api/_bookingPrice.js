/**
 * Authoritative point-to-point fare.
 * Same inputs as the booking page: merged company pricing + Distance Matrix km.
 * round2(start + max(0, distanceKm - initial_km) * per_km). Client price is never stored.
 */
import { getPricingForCarType } from '../src/lib/tripEstimate.js'
import { fetchDrivingDistanceKm } from './_drivingEta.js'

/** Matches src/lib/api.js DEFAULT_PRICING (booking page merge defaults). */
const DEFAULT_PRICING = {
  Standard: { start: '5.00', per_km: '2.00', initial_km: '3' },
  Van: { start: '8.00', per_km: '3.00', initial_km: '3' },
  Luxury: { start: '10.00', per_km: '4.00', initial_km: '3' },
}

function round2(n) {
  return Math.round(n * 100) / 100
}

function normalizeBookingCarTypeKey(raw) {
  const x = String(raw || '').trim().toLowerCase()
  if (x === 'luxury' || x.includes('lux')) return 'Luxury'
  if (x === 'van' || x.includes('van')) return 'Van'
  if (x === 'standard' || x.includes('standard')) return 'Standard'
  return null
}

function pricingObject(rawPricing) {
  if (!rawPricing || typeof rawPricing !== 'object' || Array.isArray(rawPricing)) return {}
  return rawPricing
}

/** Same row lookup as src/lib/bookingCarTypes.js pricingRowForType. */
function pricingRowForType(pricing, typeName) {
  const p = pricingObject(pricing)
  const direct = p[typeName]
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct
  const wanted = normalizeBookingCarTypeKey(typeName)
  for (const [key, row] of Object.entries(p)) {
    if (key === '__hourly') continue
    if (
      normalizeBookingCarTypeKey(key) === wanted &&
      row &&
      typeof row === 'object' &&
      !Array.isArray(row)
    ) {
      return row
    }
  }
  return null
}

function pricingFieldOrDefault(cur, field, fallback) {
  const v = cur?.[field]
  if (v != null && String(v).trim() !== '') return v
  return fallback
}

/** Booking-page mergeTypePricing for one vehicle type. */
export function mergedPricingRow(companyPricing, carType) {
  const typeName = normalizeBookingCarTypeKey(carType) || 'Standard'
  const def = DEFAULT_PRICING[typeName] || DEFAULT_PRICING.Standard
  const cur = pricingRowForType(companyPricing, typeName)
  return {
    typeName,
    start: pricingFieldOrDefault(cur, 'start', def.start),
    per_km: pricingFieldOrDefault(cur, 'per_km', def.per_km),
    initial_km: pricingFieldOrDefault(cur, 'initial_km', def.initial_km),
  }
}

/**
 * Fare from an already-rounded distance (km). Returns null when distance is unusable.
 * Does not read a client price.
 */
export function quoteFareEur(companyPricing, carType, distanceKm) {
  const km = Number(distanceKm)
  if (!Number.isFinite(km) || km < 0) return null
  const merged = mergedPricingRow(companyPricing, carType)
  const rate = getPricingForCarType({ [merged.typeName]: merged }, merged.typeName)
  const billableKm = Math.max(0, km - rate.initialKm)
  return round2(rate.baseFare + rate.perKm * billableKm)
}

function noteClientPrice(clientPriceEur, serverPriceEur) {
  const client = Number(clientPriceEur)
  if (!Number.isFinite(client)) return
  const clientRounded = round2(client)
  if (clientRounded !== serverPriceEur) {
    console.info('[public-booking:price-mismatch]', {
      client: clientRounded,
      server: serverPriceEur,
    })
  }
}

/**
 * Server fare for a standard booking. `distanceKm` skips the network call (tests).
 * `clientPriceEur` is logged only when it disagrees.
 */
export async function resolveStandardBookingPrice({
  companyPricing,
  carType,
  pickup,
  dropoff,
  clientPriceEur,
  distanceKm = null,
}) {
  let km = distanceKm
  if (km == null) {
    const route = await fetchDrivingDistanceKm(pickup, dropoff)
    if (!route.ok) return { ok: false, code: 'PRICE_UNAVAILABLE' }
    km = route.distanceKm
  }
  const estimatedPriceEur = quoteFareEur(companyPricing, carType, km)
  if (estimatedPriceEur == null) return { ok: false, code: 'PRICE_UNAVAILABLE' }
  noteClientPrice(clientPriceEur, estimatedPriceEur)
  return {
    ok: true,
    estimatedPriceEur,
    priceCurrency: 'EUR',
    distanceKm: Number(km),
  }
}

/**
 * Draft reuse: keep a stored fare. Fill only a null fare with the server quote.
 * Never writes a client-supplied price.
 */
export function draftPriceWrite(storedPriceEur, serverPriceEur) {
  if (storedPriceEur != null && storedPriceEur !== '' && Number.isFinite(Number(storedPriceEur))) {
    return { write: false, estimatedPriceEur: round2(Number(storedPriceEur)) }
  }
  const server = Number(serverPriceEur)
  if (!Number.isFinite(server)) return { write: false, estimatedPriceEur: null, missing: true }
  return { write: true, estimatedPriceEur: round2(server) }
}
