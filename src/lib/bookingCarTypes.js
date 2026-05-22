import { DEFAULT_PRICING } from './api.js'

export const BOOKING_CAR_TYPE_ORDER = ['Standard', 'Van', 'Luxury']

export function normalizeFleetCarType(raw) {
  const x = String(raw || '').trim().toLowerCase()
  if (x.includes('lux')) return 'Luxury'
  if (x.includes('van')) return 'Van'
  return 'Standard'
}

/** True only when dashboard explicitly enabled this type (`enabled: true`). */
export function pricingTypeIsEnabled(pricing, typeName) {
  const cur = pricing?.[typeName]
  if (!cur || typeof cur !== 'object') return false
  return cur.enabled === true
}

/**
 * Car types on the booking page: fleet types ∪ pricing-enabled types; else Standard only.
 * @param {{ car_type?: string }[]} fleetRows
 * @param {Record<string, { enabled?: boolean, start?: string, per_km?: string, initial_km?: string }>|null} rawPricing
 */
export function resolveBookingCarTypes(fleetRows, rawPricing) {
  const pricing = rawPricing && typeof rawPricing === 'object' ? rawPricing : {}

  const fromFleet = (fleetRows || [])
    .map((r) => normalizeFleetCarType(r.car_type))
    .filter(Boolean)
  const fromPricingEnabled = BOOKING_CAR_TYPE_ORDER.filter((k) => pricingTypeIsEnabled(pricing, k))

  const merged = [...new Set([...fromFleet, ...fromPricingEnabled])].sort(
    (a, b) => BOOKING_CAR_TYPE_ORDER.indexOf(a) - BOOKING_CAR_TYPE_ORDER.indexOf(b)
  )
  if (merged.length > 0) return merged
  return ['Standard']
}

/** Default pricing blob for new companies / empty state (Standard only). */
export function defaultCompanyPricing() {
  return {
    Standard: { enabled: true, ...DEFAULT_PRICING.Standard },
  }
}

/** Merge company pricing with defaults for estimate + display. */
export function effectivePricingForTypes(displayTypes, rawPricing) {
  const pricing = rawPricing && typeof rawPricing === 'object' ? rawPricing : {}
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
