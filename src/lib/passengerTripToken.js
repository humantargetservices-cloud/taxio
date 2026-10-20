/**
 * Client-side trip token cleanup (keep in sync with api/_passengerTrip.js).
 * Pure — no Node APIs. Does not accept confirm tokens or rewrite arbitrary URLs.
 */

/** @param {unknown} raw */
export function normalizePassengerTripTokenInput(raw) {
  let t = String(raw || '').trim()
  if (!t) return ''
  t = t.replace(/^['"]+|['"]+$/g, '').trim()
  try {
    t = decodeURIComponent(t)
  } catch {
    /* keep undecoded */
  }
  return String(t || '')
    .trim()
    .split('?')[0]
    .split('#')[0]
    .trim()
}

/**
 * Meta left {{1}} unsubstituted → path /trip/%7B%7B1%7D%7D.
 * Never treat as a real token (and never fall back to another booking).
 * @param {unknown} token
 */
export function isUnresolvedWhatsappUrlPlaceholder(token) {
  const t = String(token || '').trim()
  if (!t) return true
  if (/^\{\{?\d+\}\}?$/.test(t)) return true
  if (/%7b/i.test(t) && /%7d/i.test(t)) return true
  return false
}
