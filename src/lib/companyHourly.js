/** Placeholder drop-off for hourly bookings (DB requires non-empty dropoff_address). */
export const HOURLY_DROPOFF_PLACEHOLDER = 'By-hour service (no fixed drop-off)'

export function companyHourlyFromRecord(company) {
  const enabled = company?.hourly_enabled === true
  const rateRaw = Number(company?.hourly_rate_eur)
  const minRaw = parseInt(String(company?.hourly_min_hours ?? ''), 10)
  return {
    enabled,
    rateEur: Number.isFinite(rateRaw) && rateRaw > 0 ? rateRaw : 60,
    minHours: Number.isFinite(minRaw) && minRaw >= 1 ? minRaw : 3,
  }
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
