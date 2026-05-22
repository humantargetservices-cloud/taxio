import { DEFAULT_PRICING } from './api.js'

const ORDER = ['Standard', 'Van', 'Luxury']

export function normalizeFleetCarType(raw) {
  const x = String(raw || '').trim().toLowerCase()
  if (x.includes('lux')) return 'Luxury'
  if (x.includes('van')) return 'Van'
  return 'Standard'
}

function pricingRowDiffersFromDefault(pricing, typeName) {
  const def = DEFAULT_PRICING[typeName]
  const cur = pricing?.[typeName]
  if (!def) return false
  if (!cur || typeof cur !== 'object') return false
  return (
    String(cur.start ?? '') !== String(def.start) ||
    String(cur.per_km ?? '') !== String(def.per_km) ||
    String(cur.initial_km ?? '') !== String(def.initial_km)
  )
}

/** True when dashboard/onboarding saved a pricing row for this vehicle type. */
function pricingTypeIsConfigured(pricing, typeName) {
  const cur = pricing?.[typeName]
  if (!cur || typeof cur !== 'object') return false
  return (
    String(cur.start ?? '').trim() !== '' ||
    String(cur.per_km ?? '').trim() !== '' ||
    String(cur.initial_km ?? '').trim() !== ''
  )
}

/**
 * Car types shown on the booking page, ordered Standard → Van → Luxury.
 * Merges fleet rows with pricing keys (onboarding enables types via pricing).
 * @param {{ car_type?: string }[]} fleetRows
 * @param {Record<string, { start?: string, per_km?: string, initial_km?: string }>|null} rawPricing
 */
export function resolveBookingCarTypes(fleetRows, rawPricing) {
  const pricing = rawPricing && typeof rawPricing === 'object' ? rawPricing : {}

  const fromFleet = (fleetRows || [])
    .map((r) => normalizeFleetCarType(r.car_type))
    .filter(Boolean)
  const fromPricingKeys = ORDER.filter((k) => pricingTypeIsConfigured(pricing, k))

  const merged = [...new Set([...fromFleet, ...fromPricingKeys])].sort(
    (a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)
  )
  if (merged.length > 0) return merged

  const fromCustomPricing = ORDER.filter((k) => pricingRowDiffersFromDefault(pricing, k))
  if (fromCustomPricing.length > 0) return fromCustomPricing

  return ['Standard']
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
