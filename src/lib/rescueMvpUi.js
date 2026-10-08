import { escapeHtml } from './html.js'
import { formatDateTime } from './format.js'
import { cleanTripPriceDisplay, tripPriceLabelFromBooking } from './rescuePrice.js'
import { secondsRemaining } from './rescue.js'

export { cleanTripPriceDisplay, tripPriceLabelFromBooking } from './rescuePrice.js'

/**
 * Company A foreground decision overlay (25s UX countdown — display only).
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
 * Company B/C/D opportunity overlay (10s UX countdown — display only).
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
 * Pending Company A decision — only while deadline is still in the future.
 * Missing/expired deadlines never keep a blocking modal open (server owns Rescue).
 */
export function pickPendingDecisionBooking(bookings, excludeIds = null) {
  const now = Date.now()
  const excluded = excludeIds ? new Set(excludeIds) : null
  const pending = (bookings || []).filter((b) => {
    if (String(b.status || 'new') !== 'new') return false
    if (excluded?.has(b.id)) return false
    if (!b.decision_deadline_at) return false
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

/**
 * Most recent Rescue this company won (ACCEPTED opportunity + ACCEPTED request).
 */
export function pickWonRescue(opportunities, companyId) {
  const mine = (opportunities || []).filter(
    (o) =>
      o.company_id === companyId &&
      o.status === 'ACCEPTED' &&
      o.rescue?.status === 'ACCEPTED' &&
      o.rescue?.accepted_by_company_id === companyId
  )
  mine.sort((a, b) => {
    const ta = a.rescue?.accepted_at ? new Date(a.rescue.accepted_at).getTime() : 0
    const tb = b.rescue?.accepted_at ? new Date(b.rescue.accepted_at).getTime() : 0
    return tb - ta
  })
  return mine[0] || null
}

/** Non-blocking winner panel: waiting / confirmed / cancelled. */
export function renderWinnerStatusPanel(td, { phase, opportunity, details, companyName }) {
  const r = opportunity?.rescue || {}
  const pickup = r.preview_pickup_label || details?.booking?.pickup_address || '—'
  const dropoff = r.preview_dropoff_label || details?.booking?.dropoff_address || '—'
  const price =
    cleanTripPriceDisplay(r.preview_estimated_price) ||
    (details?.booking?.estimated_price_eur != null
      ? `€${Number(details.booking.estimated_price_eur).toFixed(2)}`
      : '—')
  const when = formatDateTime(r.preview_ride_datetime || details?.booking?.ride_datetime) || '—'
  const rescueId = opportunity?.rescue_request_id || r.id || ''

  if (phase === 'waiting') {
    return `<div id="rescue-winner-panel" class="pointer-events-none fixed inset-x-0 bottom-0 z-[65] flex justify-center p-4 sm:bottom-6">
      <div class="pointer-events-auto w-full max-w-md rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl dark:border-amber-500/30 dark:bg-slate-900">
        <p class="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">${escapeHtml(td.rescueReservedBadge || 'Trip reserved for you')}</p>
        <h3 class="mt-2 text-lg font-bold text-gray-900 dark:text-slate-50">${escapeHtml(pickup)} → ${escapeHtml(dropoff)}</h3>
        <p class="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">${escapeHtml(td.rescueTripPrice || 'Trip price')}: ${escapeHtml(price)}</p>
        <p class="mt-3 text-sm text-gray-600 dark:text-slate-300">${escapeHtml(td.rescueWaitingPassenger || 'Waiting for passenger confirmation…')}</p>
        <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">${escapeHtml(td.rescuePiiLockedHint || 'Passenger contact stays private until they confirm.')}</p>
      </div>
    </div>`
  }

  if (phase === 'cancelled') {
    return `<div id="rescue-winner-panel" class="pointer-events-none fixed inset-x-0 bottom-0 z-[65] flex justify-center p-4 sm:bottom-6">
      <div class="pointer-events-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-600 dark:bg-slate-900">
        <p class="text-xs font-bold uppercase tracking-wide text-slate-500">${escapeHtml(td.rescueCancelledBadge || 'Trip cancelled by passenger')}</p>
        <h3 class="mt-2 text-lg font-bold text-gray-900 dark:text-slate-50">${escapeHtml(pickup)} → ${escapeHtml(dropoff)}</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-slate-300">${escapeHtml(td.rescueCancelledBody || 'The passenger cancelled this reassignment. No passenger contact was shared.')}</p>
        <button type="button" data-mvp-dismiss-winner="${escapeHtml(rescueId)}" class="mt-4 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">${escapeHtml(td.rescueDismiss || 'Dismiss')}</button>
      </div>
    </div>`
  }

  if (phase === 'confirmed') {
    const b = details?.booking || {}
    const phone = String(b.customer_phone || '').trim()
    const name = String(b.customer_name || '').trim()
    const exactPickup = b.pickup_address || pickup
    const exactDrop = b.dropoff_address || dropoff
    let waDigits = phone.replace(/\D/g, '')
    if (waDigits.startsWith('00')) waDigits = waDigits.slice(2)
    if (waDigits.startsWith('0')) waDigits = `32${waDigits.slice(1)}`
    const prefill = `Hello, this is ${companyName || 'TAXIO'}. I accepted your TAXIO booking from ${exactPickup} to ${exactDrop}. I am contacting you regarding your confirmed ride.`
    const waHref =
      waDigits.length >= 8 && waDigits.length <= 15
        ? `https://wa.me/${waDigits}?text=${encodeURIComponent(prefill)}`
        : ''
    return `<div id="rescue-winner-panel" class="pointer-events-none fixed inset-x-0 bottom-0 z-[65] flex justify-center p-4 sm:bottom-6">
      <div class="pointer-events-auto w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-5 shadow-2xl dark:border-emerald-500/30 dark:bg-slate-900">
        <p class="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">${escapeHtml(td.rescuePassengerConfirmed || 'Passenger confirmed')}</p>
        <h3 class="mt-2 text-lg font-bold text-gray-900 dark:text-slate-50">${escapeHtml(exactPickup)} → ${escapeHtml(exactDrop)}</h3>
        <p class="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">${escapeHtml(td.rescueTripPrice || 'Trip price')}: ${escapeHtml(price)}</p>
        <p class="mt-1 text-sm text-gray-500 dark:text-slate-400">${escapeHtml(td.rescueWhen || 'When')}: ${escapeHtml(when)}</p>
        ${name && name !== 'Booking request' ? `<p class="mt-3 text-sm text-gray-800 dark:text-slate-200"><span class="font-semibold">${escapeHtml(td.rescuePassengerName || 'Passenger')}:</span> ${escapeHtml(name)}</p>` : ''}
        ${phone ? `<p class="mt-1 text-sm text-gray-800 dark:text-slate-200"><span class="font-semibold">${escapeHtml(td.rescuePassengerPhone || 'WhatsApp / mobile')}:</span> ${escapeHtml(phone)}</p>` : ''}
        ${
          waHref
            ? `<a href="${escapeHtml(waHref)}" target="_blank" rel="noopener noreferrer" class="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-emerald-500">${escapeHtml(td.rescueWhatsappPassenger || 'WHATSAPP PASSENGER')}</a>`
            : `<p class="mt-4 text-sm font-medium text-amber-800 dark:text-amber-200">${escapeHtml(td.rescueNoPassengerPhone || 'No passenger WhatsApp number on this booking.')}</p>`
        }
        <button type="button" data-mvp-dismiss-winner="${escapeHtml(rescueId)}" class="mt-2 w-full min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">${escapeHtml(td.rescueDismiss || 'Dismiss')}</button>
      </div>
    </div>`
  }

  return ''
}
