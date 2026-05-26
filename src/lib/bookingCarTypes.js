import { DEFAULT_PRICING } from './api.js'

export const BOOKING_CAR_TYPE_ORDER = ['Standard', 'Van', 'Luxury']

export function normalizeFleetCarType(raw) {
  const x = String(raw || '').trim().toLowerCase()
  if (x.includes('lux')) return 'Luxury'
  if (x.includes('van')) return 'Van'
  return 'Standard'
}

function pricingObject(rawPricing) {
  return rawPricing && typeof rawPricing === 'object' ? rawPricing : {}
}

export function hasExplicitVehicleTypeConfig(rawPricing) {
  const pricing = pricingObject(rawPricing)
  return BOOKING_CAR_TYPE_ORDER.some((typeName) => {
    const cur = pricing[typeName]
    return cur && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(cur, 'enabled')
  })
}

/** True only when dashboard explicitly enabled this type (`enabled: true`). */
export function pricingTypeIsEnabled(pricing, typeName) {
  const cur = pricing?.[typeName]
  if (!cur || typeof cur !== 'object') return false
  return cur.enabled === true
}

/**
 * Car types on the booking page: explicit pricing-enabled types.
 * Legacy fallback: if no explicit vehicle config exists, use fleet types; if that is also empty,
 * show Standard temporarily for old companies.
 * @param {{ car_type?: string }[]} fleetRows
 * @param {Record<string, { enabled?: boolean, start?: string, per_km?: string, initial_km?: string }>|null} rawPricing
 */
export function resolveBookingCarTypes(fleetRows, rawPricing) {
  const pricing = pricingObject(rawPricing)

  if (hasExplicitVehicleTypeConfig(pricing)) {
    return BOOKING_CAR_TYPE_ORDER.filter((k) => pricingTypeIsEnabled(pricing, k))
  }

  const fromFleet = [...new Set((fleetRows || []).map((r) => normalizeFleetCarType(r.car_type)).filter(Boolean))].sort(
    (a, b) => BOOKING_CAR_TYPE_ORDER.indexOf(a) - BOOKING_CAR_TYPE_ORDER.indexOf(b)
  )
  if (fromFleet.length > 0) return fromFleet
  return ['Standard']
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
    const cur = pricing[typeName]
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
