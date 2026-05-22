/** Placeholder drop-off for hourly bookings (DB requires non-empty dropoff_address). */
export const HOURLY_DROPOFF_PLACEHOLDER = 'By-hour service (no fixed drop-off)'

/** Embedded in `companies.pricing.__hourly` when DB columns are unavailable or as backup. */
export const PRICING_HOURLY_KEY = '__hourly'

function coerceTruthy(value) {
  if (value === true || value === 1) return true
  const s = String(value ?? '')
    .trim()
    .toLowerCase()
  return s === 'true' || s === '1' || s === 'yes'
}

function hourlyEmbedFromPricing(pricing) {
  const p = pricing && typeof pricing === 'object' ? pricing : null
  const embed = p?.[PRICING_HOURLY_KEY]
  return embed && typeof embed === 'object' ? embed : null
}

export function companyHourlyFromRecord(company) {
  const embed = hourlyEmbedFromPricing(company?.pricing)
  const enabled = coerceTruthy(company?.hourly_enabled) || coerceTruthy(embed?.enabled)
  const rateRaw = Number(company?.hourly_rate_eur ?? embed?.rate_eur)
  const minRaw = parseInt(String(company?.hourly_min_hours ?? embed?.min_hours ?? ''), 10)
  return {
    enabled,
    rateEur: Number.isFinite(rateRaw) && rateRaw > 0 ? rateRaw : 60,
    minHours: Number.isFinite(minRaw) && minRaw >= 1 ? minRaw : 3,
  }
}

/** Build pricing patch with embedded hourly settings (dual-write with DB columns). */
export function pricingWithHourlyEmbed(existingPricing, hourly) {
  const base =
    existingPricing && typeof existingPricing === 'object' ? { ...existingPricing } : {}
  base[PRICING_HOURLY_KEY] = {
    enabled: !!hourly.enabled,
    rate_eur: hourly.rateEur,
    min_hours: hourly.minHours,
  }
  return base
}

/** Localized by-hour label for WhatsApp (matches booking UI locale). */
export function hourlyServiceLabelForLocale(locale) {
  const lc = String(locale || 'en').toLowerCase()
  if (lc === 'fr') return 'Mise à disposition'
  if (lc === 'nl') return 'Per uur'
  return 'By hour'
}

export function formatHourlyPricingNote(template, rateEur, minHours) {
  return String(template || '')
    .replace(/\{rate\}/g, String(Math.round(rateEur)))
    .replace(/\{min\}/g, String(minHours))
}
