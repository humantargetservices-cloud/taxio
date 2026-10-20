/** Immutable trip-price display helpers for Rescue (never recalculates). */

/** Best-effort parse of estimate text already stored in booking notes (legacy only). */
export function estimateLabelFromBookingNotes(notes) {
  const s = String(notes || '')
  const m = s.match(/Estimate:[^\n]*€\s*([0-9]+(?:[.,][0-9]+)?)/i) || s.match(/€\s*([0-9]+(?:[.,][0-9]+)?)/)
  return m ? `€${String(m[1]).replace(',', '.')}` : null
}

/** Clean display labels like €35. → €35 without changing stored numerics. */
export function cleanTripPriceDisplay(label) {
  if (label == null || label === '') return null
  let s = String(label).trim()
  if (!s) return null
  s = s.replace(/â‚¬/g, '€').replace(/\u00e2\u20ac/g, '€')
  s = s.replace(/(€\s*\d+)\.(?!\d)/g, '$1')
  s = s.replace(/(\d+)\.\s*(EUR)\b/gi, '$1 $2')
  return s
}

/** Format structured booking trip price (immutable snapshot). */
export function formatTripPriceLabel(amount, currency = 'EUR') {
  if (amount == null || amount === '' || Number.isNaN(Number(amount))) return null
  const n = Number(amount)
  const amt = Number.isInteger(n) ? String(n) : String(n)
  const cur = String(currency || 'EUR').trim().toUpperCase() || 'EUR'
  if (cur === 'EUR') return `€${amt}`
  return `${amt} ${cur}`
}

/**
 * Trip price display for a booking/rescue row.
 * Prefer Rescue preview copy → booking.estimated_price_eur → legacy notes.
 */
export function tripPriceLabelFromBooking(booking, rescue) {
  if (rescue?.preview_estimated_price) {
    return cleanTripPriceDisplay(rescue.preview_estimated_price)
  }
  const structured = formatTripPriceLabel(booking?.estimated_price_eur, booking?.price_currency)
  if (structured) return structured
  return cleanTripPriceDisplay(estimateLabelFromBookingNotes(booking?.notes))
}
