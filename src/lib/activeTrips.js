/**
 * Derive "Active trips" for the company dashboard from authoritative server state.
 * Does not invent a new state machine — maps booking_requests + won rescue_requests.
 *
 * Completion: booking_requests.completed_at is authoritative when set.
 * The 6h ride-time heuristic is ONLY a fallback for legacy rows with no completed_at.
 */
import { formatDateTime } from './format.js'
import { escapeHtml } from './html.js'
import { tripPriceLabelFromBooking, cleanTripPriceDisplay } from './rescuePrice.js'
import { fetchRescueWinnerDetails } from './rescue.js'

const STARTED_GRACE_MS = 6 * 60 * 60 * 1000

/** Country-only trailing segments that should not become the whole route label. */
const COUNTRY_ONLY_LABEL =
  /^(belgium|belgique|belgi[eë]|belgie|france|netherlands|nederland|luxembourg|luxemburg|germany|deutschland|duitsland)$/i

/**
 * Prefer a useful place label: skip trailing country when a better segment exists.
 * Does not invent addresses — only reshapes an existing label/address string.
 */
export function improveRouteLabel(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  const parts = s.split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    let i = parts.length - 1
    while (i > 0 && COUNTRY_ONLY_LABEL.test(parts[i])) i -= 1
    return parts[i].slice(0, 120)
  }
  return s.slice(0, 120)
}

/**
 * Pick the best available pickup/dropoff label without collapsing to a bare country.
 * Prefer full booking addresses when present over preview country stubs.
 */
export function preferRouteLabel(...candidates) {
  const list = candidates.map((c) => String(c || '').trim()).filter(Boolean)
  for (const c of list) {
    const improved = improveRouteLabel(c)
    if (improved && !COUNTRY_ONLY_LABEL.test(improved)) return improved
  }
  for (const c of list) {
    const improved = improveRouteLabel(c)
    if (improved) return improved
  }
  return '—'
}

function startOfLocalDayMs(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Keep current/upcoming (and recently started) trips; drop old history. */
export function isOperationalRideTime(iso) {
  if (!iso) return true
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return true
  const now = Date.now()
  if (t >= startOfLocalDayMs()) return true
  if (t >= now - STARTED_GRACE_MS) return true
  return false
}

export function formatActiveTripWhen(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return formatDateTime(iso)
    const now = new Date()
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startTomorrow = new Date(startToday)
    startTomorrow.setDate(startTomorrow.getDate() + 1)
    const time = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
    if (d >= startToday && d < startTomorrow) return `Today · ${time}`
    const date = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(d)
    return `${date} · ${time}`
  } catch {
    return formatDateTime(iso)
  }
}

/** Normalize passenger phone digits for wa.me / tel: (BE-friendly). */
export function passengerContactLinks(phoneRaw, { companyName, pickup, dropoff } = {}) {
  const phone = String(phoneRaw || '').trim()
  if (!phone) return { phone: '', waHref: '', telHref: '' }
  let waDigits = phone.replace(/\D/g, '')
  if (waDigits.startsWith('00')) waDigits = waDigits.slice(2)
  if (waDigits.startsWith('0')) waDigits = `32${waDigits.slice(1)}`
  const telHref = `tel:${phone.replace(/\s+/g, '')}`
  const prefill = `Hello, this is ${companyName || 'TAXIO'}. Regarding your TAXIO trip from ${pickup || '—'} to ${dropoff || '—'}.`
  const waHref =
    waDigits.length >= 8 && waDigits.length <= 15
      ? `https://wa.me/${waDigits}?text=${encodeURIComponent(prefill)}`
      : ''
  return { phone, waHref, telHref }
}

/**
 * @param {{ companyId: string, bookings?: object[], opportunities?: object[] }} args
 * @returns {object[]}
 */
export function deriveActiveTrips({ companyId, bookings, opportunities }) {
  const trips = []
  if (!companyId) return trips

  // Bookings this company owns that were taken over by a confirmed Rescue winner
  // must not also appear as Company A active trips.
  const rescueTakenBookingIds = new Set()
  for (const o of opportunities || []) {
    const r = o?.rescue
    if (
      o?.status === 'ACCEPTED' &&
      r?.status === 'ACCEPTED' &&
      String(r.passenger_confirm_status || '') === 'CONFIRMED' &&
      r.accepted_by_company_id &&
      r.accepted_by_company_id !== companyId &&
      r.booking_request_id
    ) {
      rescueTakenBookingIds.add(String(r.booking_request_id))
    }
  }

  for (const b of bookings || []) {
    if (String(b.status || '') !== 'accepted') continue
    if (b.completed_at) continue
    if (rescueTakenBookingIds.has(String(b.id))) continue
    // Legacy fallback only when completed_at is absent
    if (!isOperationalRideTime(b.ride_datetime)) continue
    trips.push({
      id: `booking:${b.id}`,
      kind: 'company_a_confirmed',
      phase: 'confirmed',
      bookingId: b.id,
      rescueRequestId: null,
      pickup: preferRouteLabel(b.pickup_address),
      dropoff: preferRouteLabel(b.dropoff_address),
      whenIso: b.ride_datetime || null,
      priceLabel: tripPriceLabelFromBooking(b) || null,
      passengerName: String(b.customer_name || '').trim() || null,
      passengerPhone: String(b.customer_phone || '').trim() || null,
      needsPii: false,
      sortAt: new Date(b.ride_datetime || b.created_at || 0).getTime() || 0,
    })
  }

  const seenRescue = new Set()
  for (const o of opportunities || []) {
    if (o?.status !== 'ACCEPTED') continue
    const r = o.rescue
    if (!r || r.status !== 'ACCEPTED') continue
    if (r.accepted_by_company_id !== companyId) continue
    if (o.company_id != null && o.company_id !== companyId) continue
    const rid = String(o.rescue_request_id || r.id || '').trim()
    if (!rid || seenRescue.has(rid)) continue
    seenRescue.add(rid)

    const pcs = String(r.passenger_confirm_status || '').trim()
    // Expired / cancelled are not active
    if (pcs === 'EXPIRED' || pcs === 'CANCELLED_BY_PASSENGER') continue

    const base = {
      id: `rescue:${rid}`,
      rescueRequestId: rid,
      bookingId: r.booking_request_id || null,
      pickup: preferRouteLabel(r.preview_pickup_label),
      dropoff: preferRouteLabel(r.preview_dropoff_label),
      whenIso: r.preview_ride_datetime || null,
      priceLabel: cleanTripPriceDisplay(r.preview_estimated_price) || null,
      sortAt: new Date(r.accepted_at || o.created_at || 0).getTime() || 0,
    }

    if (pcs === 'WAITING_PASSENGER_CONFIRMATION') {
      // Soft-hide when server deadline already passed (cron may lag a few seconds)
      const deadlineMs = r.passenger_confirm_deadline_at
        ? new Date(r.passenger_confirm_deadline_at).getTime()
        : NaN
      if (Number.isFinite(deadlineMs) && deadlineMs <= Date.now()) continue
      trips.push({
        ...base,
        kind: 'rescue_waiting',
        phase: 'waiting',
        passengerName: null,
        passengerPhone: null,
        needsPii: false,
      })
      continue
    }

    if (pcs === 'CONFIRMED') {
      trips.push({
        ...base,
        kind: 'rescue_confirmed',
        phase: 'confirmed',
        passengerName: null,
        passengerPhone: null,
        needsPii: true,
      })
    }
  }

  trips.sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0))
  return trips
}

/** Unlock passenger PII for confirmed Rescue winners via existing winner_details. */
export async function enrichActiveTripsWithWinnerDetails(trips) {
  const list = Array.isArray(trips) ? trips : []
  const need = list.filter((t) => t.needsPii && t.rescueRequestId)
  if (!need.length) return list

  await Promise.all(
    need.map(async (t) => {
      try {
        const det = await fetchRescueWinnerDetails({ rescueRequestId: t.rescueRequestId })
        const body = det?.body
        if (!det?.ok || !body?.ok) {
          // Locked / cancelled / expired — drop from active if no longer confirmed
          const pcs = String(body?.passenger_confirm_status || '')
          if (pcs === 'CANCELLED_BY_PASSENGER' || pcs === 'EXPIRED') {
            t.phase = 'drop'
          }
          return
        }
        const b = body.booking || {}
        if (b.completed_at) {
          t.phase = 'drop'
          t.needsPii = false
          return
        }
        if (b.pickup_address) t.pickup = preferRouteLabel(b.pickup_address, t.pickup)
        if (b.dropoff_address) t.dropoff = preferRouteLabel(b.dropoff_address, t.dropoff)
        if (b.ride_datetime) t.whenIso = b.ride_datetime
        if (b.id) t.bookingId = b.id
        if (b.customer_name) t.passengerName = String(b.customer_name).trim() || null
        if (b.customer_phone) t.passengerPhone = String(b.customer_phone).trim() || null
        if (body.passenger_confirm_status === 'CANCELLED_BY_PASSENGER') {
          t.phase = 'drop'
          t.passengerName = null
          t.passengerPhone = null
        } else if (body.passenger_confirm_status === 'EXPIRED') {
          t.phase = 'drop'
          t.passengerName = null
          t.passengerPhone = null
        } else if (!isOperationalRideTime(t.whenIso)) {
          // Legacy heuristic only when not completed
          t.phase = 'drop'
        }
        t.needsPii = false
      } catch {
        /* keep preview-only row */
      }
    })
  )
  return list.filter((t) => t.phase !== 'drop')
}

/**
 * Compact HTML for one active trip row (no outer card).
 * @param {object} trip
 * @param {object} td dashboard i18n
 * @param {{ companyName?: string }} opts
 */
export function renderActiveTripItemHtml(trip, td, opts = {}) {
  const phase = trip.phase
  const pickup = escapeHtml(trip.pickup || '—')
  const dropoff = escapeHtml(trip.dropoff || '—')
  const when = escapeHtml(formatActiveTripWhen(trip.whenIso))
  const price = trip.priceLabel ? escapeHtml(trip.priceLabel) : ''

  let badgeClass =
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
  let badge = td.activeTripsConfirmed || 'Confirmed'
  if (phase === 'waiting') {
    badgeClass = 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300'
    badge = td.activeTripsAwaiting || 'Awaiting passenger'
  } else if (phase === 'cancelled') {
    badgeClass = 'bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300'
    badge = td.activeTripsCancelled || 'Cancelled'
  }

  const metaRow = `<div class="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
    <p class="text-xs ${price ? 'text-gray-500 dark:text-slate-400' : 'text-gray-500 dark:text-slate-400'}">${when}</p>
    ${price ? `<p class="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-300">${price}</p>` : ''}
  </div>`

  let foot = ''
  if (phase === 'waiting') {
    foot = `<p class="mt-1.5 text-xs leading-snug text-amber-800/90 dark:text-amber-200/90">${escapeHtml(
      td.activeTripsWaitingHint || 'Waiting for passenger confirmation'
    )}</p>`
  } else if (phase === 'confirmed') {
    const name = String(trip.passengerName || '').trim()
    const { phone, waHref, telHref } = passengerContactLinks(trip.passengerPhone, {
      companyName: opts.companyName,
      pickup: trip.pickup,
      dropoff: trip.dropoff,
    })
    const nameHtml =
      name && name !== 'Booking request'
        ? `<p class="mt-1.5 text-sm font-medium text-gray-800 dark:text-slate-200">${escapeHtml(name)}</p>`
        : ''
    const bookingAttr = trip.bookingId
      ? ` data-complete-booking="${escapeHtml(String(trip.bookingId))}"`
      : ''
    const rescueAttr = trip.rescueRequestId
      ? ` data-complete-rescue="${escapeHtml(String(trip.rescueRequestId))}"`
      : ''
    const completeBtn = `<button type="button"${bookingAttr}${rescueAttr} data-complete-trip class="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-xl border border-emerald-600/40 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20 sm:flex-none">${escapeHtml(
      td.activeTripsComplete || 'Complete trip'
    )}</button>`
    const actions = `<div class="mt-2 flex flex-wrap gap-2">
        ${
          waHref
            ? `<a href="${escapeHtml(waHref)}" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 sm:flex-none">${escapeHtml(
                td.wa || 'WhatsApp'
              )}</a>`
            : ''
        }
        ${
          telHref
            ? `<a href="${escapeHtml(telHref)}" class="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:flex-none">${escapeHtml(
                td.call || 'Call'
              )}</a>`
            : phone
              ? `<span class="text-xs text-gray-500">${escapeHtml(phone)}</span>`
              : ''
        }
        ${completeBtn}
      </div>`
    foot = `${nameHtml}${actions}`
  }

  return `<article class="rounded-xl border border-gray-100/90 bg-gradient-to-b from-white to-gray-50/60 px-3.5 py-3 dark:border-slate-700/50 dark:from-slate-900/50 dark:to-slate-950/40" data-active-trip="${escapeHtml(trip.id)}">
    <p class="inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}">${escapeHtml(badge)}</p>
    <p class="mt-1.5 text-sm font-semibold leading-snug text-gray-900 dark:text-slate-50">${pickup} <span class="font-normal text-gray-400 dark:text-slate-500">→</span> ${dropoff}</p>
    ${metaRow}
    ${foot}
  </article>`
}
