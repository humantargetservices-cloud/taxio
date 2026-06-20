import { DEFAULT_PRICING } from './api.js'

export const BOOKING_CAR_TYPE_ORDER = ['Standard', 'Van', 'Luxury']

const PRICE_FIELDS = ['start', 'per_km', 'initial_km']

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

function coerceEnabledFlag(value) {
  if (value === true || value === 1) return true
  if (value === false || value === 0 || value == null) return false
  const s = String(value).trim().toLowerCase()
  if (s === 'true' || s === '1' || s === 'yes') return true
  if (s === 'false' || s === '0' || s === 'no' || s === '') return false
  return false
}

function rowHasPriceValues(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false
  return PRICE_FIELDS.some((field) => {
    const v = row[field]
    return v != null && String(v).trim() !== ''
  })
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

/**
 * True when company saved pricing with an enabled flag on any vehicle type row.
 * Also true for legacy rows that only contain price values (no enabled key).
 */
export function hasExplicitVehicleTypeConfig(rawPricing) {
  const pricing = pricingObject(rawPricing)
  const keys = Object.keys(pricing).filter((k) => k !== '__hourly')
  if (keys.length === 0) return false
  return BOOKING_CAR_TYPE_ORDER.some((typeName) => isPricingTypeConfigured(pricing, typeName))
}

/**
 * Whether this vehicle type is offered on the public booking page.
 * Uses enabled flag when present; legacy rows with price values count as enabled.
 */
export function isPricingTypeConfigured(pricing, typeName) {
  const row = pricingRowForType(pricing, typeName)
  if (!row || typeof row !== 'object') return false
  if (Object.prototype.hasOwnProperty.call(row, 'enabled')) {
    return coerceEnabledFlag(row.enabled)
  }
  return rowHasPriceValues(row)
}

/** @deprecated Prefer isPricingTypeConfigured */
export function pricingTypeIsEnabled(pricing, typeName) {
  return isPricingTypeConfigured(pricing, typeName)
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

function isPricingObjectEmpty(rawPricing) {
  const pricing = pricingObject(rawPricing)
  return Object.keys(pricing).filter((k) => k !== '__hourly').length === 0
}

/**
 * Booking page source of truth for vehicle types + merged pricing.
 * Fleet cars are never used here — only company.pricing configuration.
 * Always returns at least one type (Standard default when nothing configured).
 */
export function resolveBookingVehicleTypes(company) {
  const rawPricing = pricingObject(company?.pricing)

  if (isPricingObjectEmpty(rawPricing)) {
    return [
      {
        type: 'Standard',
        enabled: true,
        pricing: mergeTypePricing('Standard', rawPricing),
      },
    ]
  }

  const types = BOOKING_CAR_TYPE_ORDER.filter((typeName) => isPricingTypeConfigured(rawPricing, typeName))
  const resolved = types.length > 0 ? types : ['Standard']

  return resolved.map((type) => ({
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
