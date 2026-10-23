/**
 * Derive "Active trips" for the company dashboard from authoritative server state.
 * Does not invent a new state machine — maps booking_requests + won rescue_requests.
 *
 * Completion: booking_requests.completed_at is authoritative when set.
 * The 6h ride-time heuristic is ONLY a fallback for legacy rows with no completed_at.
 */
import { formatDateTime } from './format.js'
import { escapeHtml } from './html.js'
import { icon } from './icons.js'
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

function fillMessageTemplate(template, vars) {
  let s = String(template || '')
  for (const [k, v] of Object.entries(vars || {})) {
    s = s.split(`{${k}}`).join(String(v ?? ''))
  }
  return s
}

const DEFAULT_COMPANY_TO_PASSENGER_WA = `Hello {passenger_name},

This is {company_name} regarding your TAXIO booking {booking_reference}.

Your trip is confirmed.

Pickup: {pickup}
Destination: {destination}
Time: {trip_datetime}

If you need to update anything, you can reply to this message.`

export const DEFAULT_COMPANY_TO_PASSENGER_ON_WAY_WA = `Hello {passenger_name},

This is {company_name} regarding your TAXIO booking {booking_reference}.

I'm on my way to your pickup location.

Pickup: {pickup}
Destination: {destination}
Time: {trip_datetime}

If you need anything, you can reply to this message.`

/**
 * Professional prefilled WhatsApp from company/driver → passenger (confirmed trip).
 * Does not change when PII becomes available — caller supplies unlocked fields only.
 */
export function buildCompanyToPassengerWhatsappMessage({
  passengerName,
  companyName,
  bookingReference,
  pickup,
  destination,
  tripDatetime,
  template,
} = {}) {
  const name = String(passengerName || '').trim()
  const safeName = name && name !== 'Booking request' ? name : 'there'
  return fillMessageTemplate(template || DEFAULT_COMPANY_TO_PASSENGER_WA, {
    passenger_name: safeName,
    company_name: companyName || 'TAXIO',
    booking_reference: bookingReference || '—',
    pickup: pickup || '—',
    destination: destination || '—',
    trip_datetime: tripDatetime || '—',
  })
}

/** Normalize passenger phone digits for wa.me / tel: (BE-friendly). */
export function passengerContactLinks(
  phoneRaw,
  {
    companyName,
    pickup,
    dropoff,
    passengerName,
    bookingReference,
    tripDatetime,
    messageTemplate,
  } = {}
) {
  const phone = String(phoneRaw || '').trim()
  if (!phone) return { phone: '', waHref: '', telHref: '' }
  let waDigits = phone.replace(/\D/g, '')
  if (waDigits.startsWith('00')) waDigits = waDigits.slice(2)
  if (waDigits.startsWith('0')) waDigits = `32${waDigits.slice(1)}`
  const telHref = `tel:${phone.replace(/\s+/g, '')}`
  const prefill = buildCompanyToPassengerWhatsappMessage({
    passengerName,
    companyName,
    bookingReference,
    pickup,
    destination: dropoff,
    tripDatetime,
    template: messageTemplate,
  })
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
    const pickupStatus = String(b.driver_pickup_status || '')
      .trim()
      .toUpperCase()
    trips.push({
      id: `booking:${b.id}`,
      kind: 'company_a_confirmed',
      phase: 'confirmed',
      bookingId: b.id,
      bookingReference: b.booking_reference || null,
      rescueRequestId: null,
      pickup: preferRouteLabel(b.pickup_address),
      pickupAddress: String(b.pickup_address || '').trim() || null,
      pickupLat: Number.isFinite(Number(b.pickup_lat)) ? Number(b.pickup_lat) : null,
      pickupLng: Number.isFinite(Number(b.pickup_lng)) ? Number(b.pickup_lng) : null,
      dropoff: preferRouteLabel(b.dropoff_address),
      whenIso: b.ride_datetime || null,
      priceLabel: tripPriceLabelFromBooking(b) || null,
      passengerName: String(b.customer_name || '').trim() || null,
      passengerPhone: String(b.customer_phone || '').trim() || null,
      driverPickupStatus:
        pickupStatus === 'ON_THE_WAY' || pickupStatus === 'ARRIVED' ? pickupStatus : null,
      driverEtaMinutes: (() => {
        const n = Number(b.driver_eta_minutes)
        return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
      })(),
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
      bookingReference: r.preview_booking_reference || r.booking_reference || null,
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
        pickupAddress: null,
        pickupLat: null,
        pickupLng: null,
        driverPickupStatus: null,
        driverEtaMinutes: null,
        needsPii: true,
      })
    }
  }

  trips.sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0))
  return trips
}

/**
 * Unlock passenger PII for confirmed Rescue winners via existing winner_details.
 * @param {object[]} trips
 * @param {{ completedSink?: object[] }} [opts] — completed rescue trips appended here (out of Active)
 */
export async function enrichActiveTripsWithWinnerDetails(trips, opts = {}) {
  const list = Array.isArray(trips) ? trips : []
  const completedSink = Array.isArray(opts?.completedSink) ? opts.completedSink : null
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
          if (completedSink) {
            completedSink.push({
              id: `done:rescue:${t.rescueRequestId}`,
              bookingReference: b.booking_reference || t.bookingReference || null,
              pickup: preferRouteLabel(b.pickup_address, t.pickup),
              dropoff: preferRouteLabel(b.dropoff_address, t.dropoff),
              whenIso: b.ride_datetime || b.completed_at || t.whenIso || null,
              completedAt: b.completed_at,
              completionStatus: b.completion_confirmation_status || 'LEGACY_COMPLETED',
              priceLabel: tripPriceLabelFromBooking(b) || t.priceLabel || null,
              passengerName: String(b.customer_name || t.passengerName || '').trim() || null,
              sortAt: new Date(b.completed_at || 0).getTime() || 0,
            })
          }
          t.phase = 'drop'
          t.needsPii = false
          return
        }
        if (b.pickup_address) {
          t.pickup = preferRouteLabel(b.pickup_address, t.pickup)
          t.pickupAddress = String(b.pickup_address || '').trim() || t.pickupAddress
        }
        if (b.dropoff_address) t.dropoff = preferRouteLabel(b.dropoff_address, t.dropoff)
        if (b.ride_datetime) t.whenIso = b.ride_datetime
        if (b.id) t.bookingId = b.id
        if (b.booking_reference) t.bookingReference = b.booking_reference
        if (Number.isFinite(Number(b.pickup_lat))) t.pickupLat = Number(b.pickup_lat)
        if (Number.isFinite(Number(b.pickup_lng))) t.pickupLng = Number(b.pickup_lng)
        const ps = String(b.driver_pickup_status || '')
          .trim()
          .toUpperCase()
        t.driverPickupStatus = ps === 'ON_THE_WAY' || ps === 'ARRIVED' ? ps : null
        {
          const n = Number(b.driver_eta_minutes)
          t.driverEtaMinutes = Number.isFinite(n) && n >= 0 ? Math.round(n) : null
        }
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

function activeTripDetailRow(label, valueHtml) {
  return `<div class="min-w-0">
    <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">${escapeHtml(
      label
    )}</p>
    <p class="mt-0.5 break-words text-sm font-semibold leading-snug text-gray-900 dark:text-slate-50">${valueHtml}</p>
  </div>`
}

function tripBadgeMeta(trip, td) {
  const phase = trip.phase
  const pickupProgress = String(trip.driverPickupStatus || '').toUpperCase()
  let badgeClass =
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
  let badge = td.activeTripsConfirmed || 'Confirmed'
  if (phase === 'waiting') {
    badgeClass = 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300'
    badge = td.activeTripsAwaiting || 'Awaiting passenger'
  } else if (phase === 'cancelled') {
    badgeClass = 'bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300'
    badge = td.activeTripsCancelled || 'Cancelled'
  } else if (pickupProgress === 'ON_THE_WAY') {
    badgeClass = 'bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-300'
    badge = td.activeTripsOnTheWay || 'On the way'
  } else if (pickupProgress === 'ARRIVED') {
    badgeClass = 'bg-violet-100 text-violet-900 dark:bg-violet-500/15 dark:text-violet-300'
    badge = td.activeTripsArrived || 'Arrived'
  }
  return { badge, badgeClass, pickupProgress }
}

/** Action controls for Current Trip sheet (and shared hierarchy). */
export function renderActiveTripActionsHtml(trip, td, opts = {}) {
  if (trip.phase !== 'confirmed') return ''
  const pickupProgress = String(trip.driverPickupStatus || '').toUpperCase()
  const name = String(trip.passengerName || '').trim()
  const waTemplate =
    pickupProgress === 'ON_THE_WAY' || pickupProgress === 'ARRIVED'
      ? td.waPassengerOnWayMessage || td.waPassengerConfirmedMessage
      : td.waPassengerConfirmedMessage
  const { phone, waHref, telHref } = passengerContactLinks(trip.passengerPhone, {
    companyName: opts.companyName,
    pickup: trip.pickup,
    dropoff: trip.dropoff,
    passengerName: name,
    bookingReference: trip.bookingReference,
    tripDatetime: formatDateTime(trip.whenIso),
    messageTemplate: waTemplate,
  })
  const bookingAttr = trip.bookingId
    ? ` data-complete-booking="${escapeHtml(String(trip.bookingId))}"`
    : ''
  const rescueAttr = trip.rescueRequestId
    ? ` data-complete-rescue="${escapeHtml(String(trip.rescueRequestId))}"`
    : ''
  const progressAttrs = `${bookingAttr}${rescueAttr}`
  const navDest =
    Number.isFinite(trip.pickupLat) && Number.isFinite(trip.pickupLng)
      ? `${trip.pickupLat},${trip.pickupLng}`
      : String(trip.pickupAddress || trip.pickup || '').trim()
  const navEncoded = encodeURIComponent(navDest || '')
  const gmapsHref = navDest
    ? `https://www.google.com/maps/dir/?api=1&destination=${navEncoded}&travelmode=driving`
    : ''
  const wazeHref = navDest
    ? Number.isFinite(trip.pickupLat) && Number.isFinite(trip.pickupLng)
      ? `https://waze.com/ul?ll=${trip.pickupLat}%2C${trip.pickupLng}&navigate=yes`
      : `https://waze.com/ul?q=${navEncoded}&navigate=yes`
    : ''

  const btn =
    'inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-2.5 py-2.5 text-xs font-bold leading-tight'
  const btnPrimarySky = `${btn} bg-sky-600 text-white hover:bg-sky-500`
  const btnPrimaryViolet = `${btn} bg-violet-600 text-white hover:bg-violet-500`
  const btnPrimaryComplete = `${btn} bg-emerald-600 text-white hover:bg-emerald-500`
  const btnOutline = `${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700`
  const btnWa = `${btn} bg-emerald-600 text-white hover:bg-emerald-500`
  const btnCall = btnOutline
  const btnEta = `${btn} border border-sky-300/80 bg-sky-50 text-sky-900 hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200`

  const navigateBtn = navDest
    ? `<button type="button" data-open-nav data-gmaps="${escapeHtml(gmapsHref)}" data-waze="${escapeHtml(
        wazeHref
      )}" class="${btnOutline}">${escapeHtml(td.activeTripsNavigate || 'Navigate')}</button>`
    : ''
  const onWayBtn = `<button type="button"${progressAttrs} data-mark-on-way class="${btnPrimarySky}">${escapeHtml(
    td.activeTripsOnWay || "I'm on my way"
  )}</button>`
  const arrivedBtn = `<button type="button"${progressAttrs} data-mark-arrived class="${btnPrimaryViolet}">${escapeHtml(
    td.activeTripsIveArrived || "I've arrived"
  )}</button>`
  const completeBtn = `<button type="button"${progressAttrs} data-complete-trip class="${btnPrimaryComplete}">${escapeHtml(
    td.activeTripsComplete || 'Complete trip'
  )}</button>`
  const waBtn = waHref
    ? `<a href="${escapeHtml(waHref)}" target="_blank" rel="noopener noreferrer" class="${btnWa}">${escapeHtml(
        td.wa || 'WhatsApp'
      )}</a>`
    : ''
  const callBtn = telHref
    ? `<a href="${escapeHtml(telHref)}" class="${btnCall}">${escapeHtml(td.call || 'Call')}</a>`
    : phone
      ? `<span class="flex min-h-[44px] items-center justify-center text-xs text-gray-500">${escapeHtml(
          phone
        )}</span>`
      : ''

  const secondary =
    waBtn || callBtn
      ? `<div class="grid grid-cols-2 gap-2">${waBtn || '<span></span>'}${callBtn || '<span></span>'}</div>`
      : ''

  let etaLine = ''
  let etaAction = ''
  if (pickupProgress === 'ON_THE_WAY') {
    if (Number.isFinite(Number(trip.driverEtaMinutes))) {
      const etaText = (td.activeTripsEtaApprox || 'Approx. {eta} min to pickup').replace(
        '{eta}',
        String(Math.round(Number(trip.driverEtaMinutes)))
      )
      etaLine = `<p class="flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-300">${icon.mapPin(
        'h-3.5 w-3.5 shrink-0'
      )}<span>${escapeHtml(etaText)}</span></p>`
      etaAction = `<button type="button"${progressAttrs} data-update-eta class="${btnEta}">${escapeHtml(
        td.activeTripsUpdateEta || 'Update ETA'
      )}</button>`
    } else {
      etaLine = `<p class="text-xs font-medium text-slate-500 dark:text-slate-400">${escapeHtml(
        td.activeTripsOnWayNoEta || 'On the way · ETA unavailable'
      )}</p>`
      etaAction = `<button type="button"${progressAttrs} data-update-eta class="${btnEta}">${escapeHtml(
        td.activeTripsAddEta || 'Add ETA'
      )}</button>`
    }
  }

  let arrivedHint = ''
  if (pickupProgress === 'ARRIVED') {
    arrivedHint = `<p class="text-sm font-semibold text-violet-800 dark:text-violet-200">${escapeHtml(
      td.activeTripsPassengerPickup || 'Passenger pickup'
    )}</p>
    <p class="text-xs leading-snug text-violet-800/90 dark:text-violet-200/90">${escapeHtml(
      td.activeTripsArrivedHint || 'Driver has arrived at pickup.'
    )}</p>`
  }

  const completeBtnLarge = `<button type="button"${progressAttrs} data-complete-trip class="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white hover:bg-emerald-500">${escapeHtml(
    td.activeTripsComplete || 'Complete trip'
  )}</button>`

  let primary = ''
  if (!pickupProgress) {
    primary = navigateBtn
      ? `<div class="grid grid-cols-2 gap-2">${navigateBtn}${onWayBtn}</div>`
      : onWayBtn
  } else if (pickupProgress === 'ON_THE_WAY') {
    primary = navigateBtn
      ? `<div class="grid grid-cols-2 gap-2">${navigateBtn}${arrivedBtn}</div>`
      : arrivedBtn
  } else {
    primary = completeBtnLarge
  }

  return `<div class="space-y-2.5">
    ${etaLine}
    ${arrivedHint}
    ${primary}
    ${etaAction}
    ${secondary}
  </div>`
}

/**
 * Compact Active Trip list card — opens Current Trip sheet for controls.
 * @param {object} trip
 * @param {object} td dashboard i18n
 * @param {{ companyName?: string }} opts
 */
export function renderActiveTripItemHtml(trip, td, opts = {}) {
  const pickup = escapeHtml(trip.pickup || '—')
  const dropoff = escapeHtml(trip.dropoff || '—')
  const when = escapeHtml(formatActiveTripWhen(trip.whenIso))
  const price = trip.priceLabel ? escapeHtml(trip.priceLabel) : ''
  const { badge, badgeClass } = tripBadgeMeta(trip, td)
  const name = String(trip.passengerName || '').trim()
  const showName = name && name !== 'Booking request'

  const header = `<div class="flex items-start justify-between gap-3">
    <p class="inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}">${escapeHtml(
      badge
    )}</p>
    ${price ? `<p class="shrink-0 text-sm font-bold tabular-nums text-amber-700 dark:text-amber-300">${price}</p>` : ''}
  </div>`

  const routeLine = `<p class="mt-2 break-words text-sm font-semibold leading-snug text-gray-900 dark:text-slate-50">${pickup} <span class="font-normal text-gray-400 dark:text-slate-500">→</span> ${dropoff}</p>`
  const meta = `<div class="mt-1.5 space-y-0.5 text-xs text-gray-500 dark:text-slate-400">
    ${showName ? `<p class="font-medium text-gray-700 dark:text-slate-300">${escapeHtml(name)}</p>` : ''}
    <p>${when}</p>
  </div>`

  let foot = ''
  if (trip.phase === 'waiting') {
    foot = `<p class="mt-2 text-xs leading-snug text-amber-800/90 dark:text-amber-200/90">${escapeHtml(
      td.activeTripsWaitingHint || 'Waiting for passenger confirmation'
    )}</p>`
  } else if (trip.phase === 'confirmed') {
    foot = `<button type="button" data-open-trip="${escapeHtml(
      String(trip.id)
    )}" class="mt-3 inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20">${escapeHtml(
      td.activeTripsOpenTrip || 'Open trip'
    )}</button>`
  }

  return `<article class="rounded-xl border border-gray-100/90 bg-white px-3.5 py-3 dark:border-slate-700/50 dark:bg-slate-900/60" data-active-trip="${escapeHtml(
    trip.id
  )}">
    ${header}
    ${routeLine}
    ${meta}
    ${foot}
  </article>`
}

/**
 * Recent completed trips for Home (read-only). Company A bookings + Rescue wins.
 * @param {{ companyId: string, bookings?: object[], opportunities?: object[] }} args
 */
export function deriveCompletedTrips({ companyId, bookings, opportunities }) {
  const trips = []
  if (!companyId) return trips

  const rescueTaken = new Set()
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
      rescueTaken.add(String(r.booking_request_id))
    }
  }

  for (const b of bookings || []) {
    if (!b.completed_at) continue
    if (String(b.status || '') !== 'accepted') continue
    if (rescueTaken.has(String(b.id))) continue
    trips.push({
      id: `done:booking:${b.id}`,
      bookingReference: b.booking_reference || null,
      pickup: preferRouteLabel(b.pickup_address),
      dropoff: preferRouteLabel(b.dropoff_address),
      whenIso: b.ride_datetime || b.completed_at || null,
      completedAt: b.completed_at,
              completionStatus: b.completion_confirmation_status || 'LEGACY_COMPLETED',
      priceLabel: tripPriceLabelFromBooking(b) || null,
      passengerName: String(b.customer_name || '').trim() || null,
      sortAt: new Date(b.completed_at || 0).getTime() || 0,
    })
  }

  trips.sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0))
  return trips.slice(0, 20)
}

export function renderCompletedTripItemHtml(trip, td) {
  const pickup = escapeHtml(trip.pickup || '—')
  const dropoff = escapeHtml(trip.dropoff || '—')
  const when = escapeHtml(formatActiveTripWhen(trip.whenIso || trip.completedAt))
  const price = trip.priceLabel ? escapeHtml(trip.priceLabel) : ''
  const rawStatus = String(trip.completionStatus || 'LEGACY_COMPLETED')
  const effectiveStatus = rawStatus === 'AWAITING_PASSENGER' && trip.completedAt &&
    Date.now() - new Date(trip.completedAt).getTime() >= 86400000 ? 'CLOSED_UNCONFIRMED' : rawStatus
  const label = ({AWAITING_PASSENGER:'Awaiting passenger',PASSENGER_CONFIRMED:'Passenger confirmed',
    ISSUE_REPORTED:'Issue reported',CLOSED_UNCONFIRMED:'Closed — unconfirmed',
    LEGACY_COMPLETED:'Completed'})[effectiveStatus] || 'Completed'
  const name = String(trip.passengerName || '').trim()
  const ref = String(trip.bookingReference || '').trim()
  return `<article class="rounded-xl border border-gray-100/80 bg-white/80 px-3 py-2.5 dark:border-slate-700/40 dark:bg-slate-900/40">
    <div class="flex items-start justify-between gap-2">
      <p class="min-w-0 break-words text-sm font-semibold leading-snug text-gray-900 dark:text-slate-50">${pickup} <span class="font-normal text-gray-400">→</span> ${dropoff}</p>
      ${price ? `<p class="shrink-0 text-xs font-bold tabular-nums text-amber-700 dark:text-amber-300">${price}</p>` : ''}
    </div>
    <div class="mt-1 space-y-0.5 text-[11px] text-gray-500 dark:text-slate-400">
      ${name ? `<p class="font-medium text-gray-700 dark:text-slate-300">${escapeHtml(name)}</p>` : ''}
      <p>${when} · <span class="font-semibold">${escapeHtml(label)}</span></p>
      ${ref ? `<p>${escapeHtml(td.refLabel || 'Reference')}: ${escapeHtml(ref)}</p>` : ''}
    </div>
  </article>`
}

/**
 * Inner content for Current Trip bottom sheet.
 * @param {object} trip
 * @param {object} td
 * @param {{ companyName?: string }} opts
 */
export function renderCurrentTripSheetBodyHtml(trip, td, opts = {}) {
  const pickup = escapeHtml(trip.pickup || '—')
  const dropoff = escapeHtml(trip.dropoff || '—')
  const when = escapeHtml(formatActiveTripWhen(trip.whenIso))
  const price = trip.priceLabel ? escapeHtml(trip.priceLabel) : ''
  const { badge, badgeClass } = tripBadgeMeta(trip, td)
  const name = String(trip.passengerName || '').trim()
  const showName = name && name !== 'Booking request'

  return `<div class="flex items-start justify-between gap-3">
      <p class="inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}">${escapeHtml(
        badge
      )}</p>
      ${price ? `<p class="shrink-0 text-base font-bold tabular-nums text-amber-700 dark:text-amber-300">${price}</p>` : ''}
    </div>
    <div class="mt-3 space-y-2.5">
      ${activeTripDetailRow(td.activeTripsPickupLabel || 'Pickup', pickup)}
      ${activeTripDetailRow(td.activeTripsDestinationLabel || 'Destination', dropoff)}
      ${activeTripDetailRow(td.activeTripsTimeLabel || 'Time', when)}
      ${
        showName
          ? activeTripDetailRow(td.activeTripsPassengerLabel || 'Passenger', escapeHtml(name))
          : ''
      }
    </div>
    <div class="mt-4">${renderActiveTripActionsHtml(trip, td, opts)}</div>`
}
