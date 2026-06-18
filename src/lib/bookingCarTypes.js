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
  if (!rawPricing || typeof rawPricing !== 'object' || Array.isArray(rawPricing)) return {}
  return rawPricing
}

function coerceTruthy(value) {
  if (value === true || value === 1) return true
  const s = String(value ?? '')
    .trim()
    .toLowerCase()
  return s === 'true' || s === '1' || s === 'yes'
}

function pricingFieldOrDefault(cur, field, fallback) {
  const v = cur?.[field]
  if (v != null && String(v).trim() !== '') return String(v)
  return fallback
}

export function pricingRowForType(pricing, typeName) {
  const direct = pricing?.[typeName]
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct
  const wanted = normalizeBookingCarTypeKey(typeName)
  for (const [key, row] of Object.entries(pricingObject(pricing))) {
    if (key === '__hourly') continue
    if (normalizeBookingCarTypeKey(key) === wanted && row && typeof row === 'object' && !Array.isArray(row)) {
      return row
    }
  }
  return null
}

export function hasExplicitVehicleTypeConfig(rawPricing) {
  const pricing = pricingObject(rawPricing)
  return BOOKING_CAR_TYPE_ORDER.some((typeName) => {
    const row = pricingRowForType(pricing, typeName)
    return row && typeof row === 'object' && Object.prototype.hasOwnProperty.call(row, 'enabled')
  })
}

/** True when dashboard (or onboarding) explicitly enabled this type. */
export function pricingTypeIsEnabled(pricing, typeName) {
  const cur = pricingRowForType(pricing, typeName)
  if (!cur || typeof cur !== 'object') return false
  return coerceTruthy(cur.enabled)
}

function mergeTypePricing(typeName, rawPricing) {
  const def = DEFAULT_PRICING[typeName] || DEFAULT_PRICING.Standard
  const cur = pricingRowForType(rawPricing, typeName)
  return {
    start: pricingFieldOrDefault(cur, 'start', def.start),
    per_km: pricingFieldOrDefault(cur, 'per_km', def.per_km),
    initial_km: pricingFieldOrDefault(cur, 'initial_km', def.initial_km),
  }
}

/**
 * Booking page source of truth for vehicle types + merged pricing.
 * Always returns at least Standard.
 */
export function resolveBookingVehicleTypes(company) {
  const rawPricing = pricingObject(company?.pricing ?? company)
  const hasExplicit = hasExplicitVehicleTypeConfig(rawPricing)

  let types
  if (!hasExplicit) {
    types = ['Standard']
  } else {
    types = BOOKING_CAR_TYPE_ORDER.filter((typeName) => pricingTypeIsEnabled(rawPricing, typeName))
    if (types.length === 0) types = ['Standard']
  }

  return types.map((type) => ({
    type,
    enabled: true,
    pricing: mergeTypePricing(type, rawPricing),
  }))
}

/**
 * @returns {string[]} e.g. ['Standard'] or ['Standard', 'Van']
 */
export function resolveEnabledBookingCarTypes(company) {
  return resolveBookingVehicleTypes(company).map((row) => row.type)
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
    out[typeName] = mergeTypePricing(typeName, pricing)
  }
  return out
}
