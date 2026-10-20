/** Belgium trip-local time helpers (Europe/Brussels). */

export const BELGIUM_TZ = 'Europe/Brussels'

/** Allow tiny clock skew between browser and server. */
export const PAST_RIDE_SKEW_MS = 60_000

/**
 * Format an instant as `YYYY-MM-DDTHH:mm` in Europe/Brussels (for datetime-local min/value).
 */
export function toBelgiumDatetimeLocalValue(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: BELGIUM_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = {}
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== 'literal') parts[p.type] = p.value
  }
  if (!parts.year || !parts.month || !parts.day || !parts.hour || !parts.minute) return ''
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function defaultFutureBelgiumDatetimeLocal(minutesAhead = 15) {
  return toBelgiumDatetimeLocalValue(new Date(Date.now() + Math.max(1, minutesAhead) * 60_000))
}

/** True when ISO / Date is already in the past (with skew). */
export function isRideInstantInPast(isoOrDate, skewMs = PAST_RIDE_SKEW_MS) {
  const t = isoOrDate instanceof Date ? isoOrDate.getTime() : new Date(isoOrDate).getTime()
  if (!Number.isFinite(t)) return true
  return t < Date.now() - Math.max(0, skewMs)
}

/**
 * datetime-local wall value — parsed as browser local (BE users ≈ Brussels).
 * Also reject empty/invalid.
 */
export function isDatetimeLocalInPast(localValue, skewMs = PAST_RIDE_SKEW_MS) {
  const raw = String(localValue || '').trim()
  if (!raw) return true
  return isRideInstantInPast(raw, skewMs)
}
