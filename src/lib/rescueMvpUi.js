import { escapeHtml } from './html.js'
import { formatDateTime } from './format.js'
import { cleanTripPriceDisplay, tripPriceLabelFromBooking } from './rescueUi.js'
import { secondsRemaining } from './rescue.js'

export { cleanTripPriceDisplay, tripPriceLabelFromBooking, estimateLabelFromBookingNotes } from './rescueUi.js'

/**
 * Company A foreground decision overlay (25s UX countdown).
 */
export function renderNewTripDecisionOverlay(td, booking, remainingSec, totalSec) {
  if (!booking) return ''
  const total = Math.max(1, Number(totalSec) || 25)
  const left = Math.max(0, Number(remainingSec) || 0)
  const pct = Math.max(0, Math.min(100, (left / total) * 100))
  const price = tripPriceLabelFromBooking(booking) || '—'
  const when = formatDateTime(booking.ride_datetime) || '—'
  return `<div id="rescue-a-overlay" class="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="rescue-a-title">
    <div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6">
      <p class="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">${escapeHtml(td.rescueNewTripTitle || 'NEW TRIP REQUEST')}</p>
      <h3 id="rescue-a-title" class="mt-2 text-lg font-bold text-gray-900 dark:text-slate-50">${escapeHtml(booking.pickup_address || '—')} → ${escapeHtml(booking.dropoff_address || '—')}</h3>
      <p class="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">${escapeHtml(td.rescueTripPrice || 'Trip price')}: ${escapeHtml(price)}</p>
      <p class="mt-1 text-sm text-gray-500 dark:text-slate-400">${escapeHtml(td.rescueWhen || 'When')}: ${escapeHtml(when)}</p>
      <div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        <div data-mvp-progress class="h-full rounded-full bg-amber-400 transition-[width] duration-1000 ease-linear" style="width:${pct}%"></div>
      </div>
      <p data-mvp-countdown class="mt-2 text-center text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">${left}s</p>
      <div class="mt-5 grid grid-cols-2 gap-2">
        <button type="button" data-mvp-accept-booking="${escapeHtml(booking.id)}" class="min-h-[48px] rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-emerald-500">${escapeHtml(td.bookingAccept || 'ACCEPT')}</button>
        <button type="button" data-mvp-decline-booking="${escapeHtml(booking.id)}" class="min-h-[48px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">${escapeHtml(td.bookingRefuse || 'DECLINE')}</button>
      </div>
      <p id="rescue-a-msg" class="mt-3 hidden text-sm font-medium text-red-600 dark:text-red-400"></p>
    </div>
  </div>`
}

/**
 * Company B/C/D opportunity overlay (10s UX countdown).
 */
export function renderRescueOpportunityOverlay(td, opportunity, remainingSec, totalSec) {
  if (!opportunity) return ''
  const r = opportunity.rescue || {}
  const total = Math.max(1, Number(totalSec) || 10)
  const left = Math.max(0, Number(remainingSec) || 0)
  const pct = Math.max(0, Math.min(100, (left / total) * 100))
  const price = cleanTripPriceDisplay(r.preview_estimated_price) || '—'
  const when = formatDateTime(r.preview_ride_datetime) || '—'
  return `<div id="rescue-b-overlay" class="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="rescue-b-title">
    <div class="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl dark:border-amber-500/30 dark:bg-slate-900 sm:p-6">
      <p class="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">${escapeHtml(td.rescueOppBadge || 'NEW TAXIO TRIP')}</p>
      <h3 id="rescue-b-title" class="mt-2 text-lg font-bold text-gray-900 dark:text-slate-50">${escapeHtml(r.preview_pickup_label || '—')} → ${escapeHtml(r.preview_dropoff_label || '—')}</h3>
      <p class="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">${escapeHtml(td.rescueTripPrice || 'Trip price')}: ${escapeHtml(price)}</p>
      <p class="mt-1 text-sm text-gray-500 dark:text-slate-400">${escapeHtml(td.rescueWhen || 'When')}: ${escapeHtml(when)}</p>
      <div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        <div data-mvp-progress class="h-full rounded-full bg-amber-400 transition-[width] duration-1000 ease-linear" style="width:${pct}%"></div>
      </div>
      <p data-mvp-countdown class="mt-2 text-center text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">${left}s</p>
      <button type="button" data-mvp-accept-rescue="${escapeHtml(opportunity.rescue_request_id)}" class="mt-5 w-full min-h-[48px] rounded-xl bg-amber-400 px-3 py-2.5 text-sm font-black text-slate-900 hover:bg-amber-300">${escapeHtml(td.rescueAccept || 'ACCEPT')}</button>
      <p id="rescue-b-msg" class="mt-3 hidden text-center text-sm font-medium text-amber-800 dark:text-amber-200"></p>
    </div>
  </div>`
}

/**
 * Pending Company A decision overlay candidate.
 * Expired deadlines never keep the blocking modal open (server activates Rescue).
 * @param {object[]} bookings
 * @param {Iterable<string>|Set<string>|null} [excludeIds] locally dismissed / expired booking ids
 */
export function pickPendingDecisionBooking(bookings, excludeIds = null) {
  const now = Date.now()
  const excluded = excludeIds ? new Set(excludeIds) : null
  const pending = (bookings || []).filter((b) => {
    if (String(b.status || 'new') !== 'new') return false
    if (excluded?.has(b.id)) return false
    if (!b.decision_deadline_at) return true
    return new Date(b.decision_deadline_at).getTime() > now
  })
  pending.sort((a, b) => {
    const ta = a.decision_deadline_at ? new Date(a.decision_deadline_at).getTime() : 0
    const tb = b.decision_deadline_at ? new Date(b.decision_deadline_at).getTime() : 0
    return ta - tb
  })
  return pending[0] || null
}

export function pickOpenOpportunity(opportunities) {
  const now = Date.now()
  const open = (opportunities || []).filter((o) => {
    if (o.status !== 'OFFERED' || o.rescue?.status !== 'OPEN') return false
    if (o.expires_at && new Date(o.expires_at).getTime() <= now) return false
    return true
  })
  open.sort((a, b) => {
    const ta = a.expires_at ? new Date(a.expires_at).getTime() : Number.MAX_SAFE_INTEGER
    const tb = b.expires_at ? new Date(b.expires_at).getTime() : Number.MAX_SAFE_INTEGER
    return ta - tb
  })
  return open[0] || null
}

export function overlayRemaining(deadlineIso, fallbackSec) {
  if (deadlineIso) return secondsRemaining(deadlineIso)
  return Math.max(0, Number(fallbackSec) || 0)
}
