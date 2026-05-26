import { DEFAULT_PRICING } from './api.js'

export const BOOKING_CAR_TYPE_ORDER = ['Standard', 'Van', 'Luxury']

function normalizeBookingCarTypeKey(raw) {
  const x = String(raw || '').trim().toLowerCase()
  if (x === 'luxury' || x.includes('lux')) return 'Luxury'
  if (x === 'van' || x.includes('van')) return 'Van'
  if (x === 'standard' || x.includes('standard')) return 'Standard'
  return null
}

export function normalizeFleetCarType(raw) {
  return normalizeBookingCarTypeKey(raw) || 'Standard'
}

function pricingObject(rawPricing) {
  return rawPricing && typeof rawPricing === 'object' ? rawPricing : {}
}

export function pricingRowForType(pricing, typeName) {
  const direct = pricing?.[typeName]
  if (direct && typeof direct === 'object') return direct
  const wanted = normalizeBookingCarTypeKey(typeName)
  for (const [key, row] of Object.entries(pricingObject(pricing))) {
    if (normalizeBookingCarTypeKey(key) === wanted && row && typeof row === 'object') {
      return row
    }
  }
  return null
}

export function hasExplicitVehicleTypeConfig(rawPricing) {
  const pricing = pricingObject(rawPricing)
  return BOOKING_CAR_TYPE_ORDER.some((typeName) =>
    Object.prototype.hasOwnProperty.call(pricingRowForType(pricing, typeName) || {}, 'enabled')
  )
}

/** True only when dashboard explicitly enabled this type (`enabled: true`). */
export function pricingTypeIsEnabled(pricing, typeName) {
  const cur = pricingRowForType(pricing, typeName)
  if (!cur || typeof cur !== 'object') return false
  return cur.enabled === true
}

/**
 * Dashboard Pricing is the source of truth for booking car types.
 * Examples:
 * - { luxury: { enabled: true } } => ['Luxury']
 * - { van: { enabled: true }, luxury: { enabled: true } } => ['Van', 'Luxury']
 * - {} or missing pricing => ['Standard'] legacy fallback
 */
export function resolveEnabledBookingCarTypes(company) {
  const pricing = pricingObject(company?.pricing ?? company)
  if (!hasExplicitVehicleTypeConfig(pricing)) return ['Standard']
  return BOOKING_CAR_TYPE_ORDER.filter((typeName) => pricingTypeIsEnabled(pricing, typeName))
}

/** Default pricing blob for new companies / empty state. Nothing is auto-enabled. */
export function defaultCompanyPricing() {
  return {}
}

/** Merge company pricing with defaults for estimate + display. */
export function effectivePricingForTypes(displayTypes, rawPricing) {
  const pricing = pricingObject(rawPricing)
  const out = {}
  for (const typeName of displayTypes) {
    const def = DEFAULT_PRICING[typeName] || DEFAULT_PRICING.Standard
    const cur = pricingRowForType(pricing, typeName)
    out[typeName] = {
      start: cur?.start != null && String(cur.start).trim() !== '' ? String(cur.start) : def.start,
      per_km:
        cur?.per_km != null && String(cur.per_km).trim() !== '' ? String(cur.per_km) : def.per_km,
      initial_km:
        cur?.initial_km != null && String(cur.initial_km).trim() !== ''
          ? String(cur.initial_km)
          : def.initial_km,
    }
  }
  return out
}
