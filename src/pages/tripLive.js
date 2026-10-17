/**
 * Passenger live trip page — /trip/:secureToken
 * Polls /api/trip-status every ~4s. Confirm/Cancel use existing Rescue RPCs.
 */
import { apiUrl } from '../lib/api.js'
import { passengerRescueConfirm, passengerRescueCancel } from '../lib/rescue.js'
import { formatDateTime } from '../lib/format.js'
import { escapeHtml } from '../lib/html.js'
import { icon } from '../lib/icons.js'
import { taxioLogoImg } from '../lib/taxioLogo.js'
import { cleanTripPriceDisplay } from '../lib/rescuePrice.js'
import { tTripLive } from '../i18n.js'
import { getLocale } from '../lib/locale.js'
import { syncPassengerActiveTripFromStatus } from '../lib/passengerActiveTrip.js'

const POLL_MS = 4000

function fillTpl(template, vars) {
  let s = String(template || '')
  for (const [k, v] of Object.entries(vars || {})) {
    s = s.split(`{${k}}`).join(String(v ?? ''))
  }
  return s
}

function shell(inner) {
  return `<div class="min-h-screen bg-gradient-to-b from-slate-100 via-[#eef0f3] to-slate-200 px-4 py-8">
    <div class="mx-auto w-full max-w-md">
      <div class="mb-6 flex justify-center">${taxioLogoImg('h-12 w-12')}</div>
      ${inner}
    </div>
  </div>`
}

function card(html) {
  return `<div class="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-lg sm:p-6">${html}</div>`
}

function priceLabel(trip) {
  if (trip?.estimated_price_eur == null) return '—'
  const raw = `€${Number(trip.estimated_price_eur).toFixed(2)}`
  return cleanTripPriceDisplay(raw) || raw
}

function tripDetailBlock(label, valueHtml) {
  return `<div class="min-w-0">
    <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">${escapeHtml(label)}</p>
    <p class="mt-0.5 break-words text-sm font-semibold leading-snug text-slate-900">${valueHtml}</p>
  </div>`
}

function tripMetaRow(label, valueHtml) {
  return `<div class="flex items-baseline justify-between gap-3 py-1.5 text-sm">
    <span class="shrink-0 text-slate-500">${escapeHtml(label)}</span>
    <span class="min-w-0 text-right font-semibold text-slate-900">${valueHtml}</span>
  </div>`
}

function tripSummaryHtml(trip, tl) {
  if (!trip) return ''
  const when = formatDateTime(trip.ride_datetime) || '—'
  const destination =
    trip.service_type === 'hourly'
      ? tl.hourlyDestination || 'Hourly'
      : trip.dropoff || '—'
  const ref = String(trip.booking_reference || '').trim()
  return `<div class="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
    <div class="space-y-2.5">
      ${tripDetailBlock(tl.labelPickup || 'Pickup', escapeHtml(trip.pickup || '—'))}
      ${tripDetailBlock(tl.labelDestination || 'Destination', escapeHtml(destination))}
    </div>
    <div class="mt-3 border-t border-slate-200/80 pt-1.5">
      ${tripMetaRow(tl.estimatedPrice || 'Estimated price', `<span class="tabular-nums text-amber-700">${escapeHtml(priceLabel(trip))}</span>`)}
      ${tripMetaRow(tl.when || 'When', escapeHtml(when))}
      ${tripMetaRow(tl.vehicle || 'Vehicle', escapeHtml(trip.vehicle || '—'))}
      ${
        ref
          ? `<div class="flex items-center justify-between gap-2 py-1.5 text-sm">
        <span class="shrink-0 text-slate-500">${escapeHtml(tl.refLabel || 'Reference')}</span>
        <span class="inline-flex min-w-0 items-center gap-1.5">
          <span class="truncate font-semibold text-slate-900" data-booking-ref>${escapeHtml(ref)}</span>
          <button type="button" data-copy-ref class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="${escapeHtml(
            tl.copyRef || 'Copy reference'
          )}" title="${escapeHtml(tl.copyRef || 'Copy reference')}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5" aria-hidden="true"><path d="M8 2a1 1 0 0 0-1 1v1H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a1 1 0 0 0 1-1V6.414A2 2 0 0 0 14.414 5L12 2.586A2 2 0 0 0 10.586 2H8zm4 4V3.414L14.586 6H13a1 1 0 0 1-1-1zM5 6h3v1a1 1 0 0 0 1 1h4v7H5V6z"/></svg>
          </button>
          <span data-copy-feedback class="hidden text-[11px] font-semibold text-emerald-700">${escapeHtml(
            tl.copied || 'Copied'
          )}</span>
        </span>
      </div>`
          : ''
      }
    </div>
  </div>`
}

function buildPassengerToCompanyMessage(tl, { companyName, bookingReference, pickup, destination, tripDatetime }) {
  const tpl =
    tl.contactWaBody ||
    `Hello {company_name},\n\nI'm contacting you about my TAXIO booking {booking_reference}.\n\nPickup: {pickup}\nDestination: {destination}\nTime: {trip_datetime}\n\nPlease let me know if you need any additional information.\n\nThank you.`
  return fillTpl(tpl, {
    company_name: companyName || 'TAXIO',
    booking_reference: bookingReference || '—',
    pickup: pickup || '—',
    destination: destination || '—',
    trip_datetime: tripDatetime || '—',
  })
}

function contactButtonsHtml(contacts, companyName, trip, tl) {
  if (!contacts) return ''
  const phone = String(contacts.phone || '').trim()
  const email = String(contacts.email || '').trim()
  let waDigits = String(contacts.whatsapp_digits || phone.replace(/\D/g, '') || '')
  if (waDigits.startsWith('00')) waDigits = waDigits.slice(2)
  if (waDigits.startsWith('0')) waDigits = `32${waDigits.slice(1)}`
  const name = companyName || contacts.name || 'TAXIO'
  const destination =
    trip?.service_type === 'hourly'
      ? tl.hourlyDestination || 'Hourly'
      : trip?.dropoff || '—'
  const when = formatDateTime(trip?.ride_datetime) || '—'
  const prefill = buildPassengerToCompanyMessage(tl, {
    companyName: name,
    bookingReference: trip?.booking_reference,
    pickup: trip?.pickup,
    destination,
    tripDatetime: when,
  })
  const mailSubject = fillTpl(tl.contactEmailSubject || 'TAXIO booking {booking_reference} — {company_name}', {
    booking_reference: trip?.booking_reference || '—',
    company_name: name,
  })
  const mailBody = buildPassengerToCompanyMessage(tl, {
    companyName: name,
    bookingReference: trip?.booking_reference,
    pickup: trip?.pickup,
    destination,
    tripDatetime: when,
  })
  const secondaryBtn =
    'flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50'
  let waHtml = ''
  if (waDigits.length >= 8 && waDigits.length <= 15) {
    waHtml = `<a href="https://wa.me/${escapeHtml(waDigits)}?text=${encodeURIComponent(
      prefill
    )}" target="_blank" rel="noopener noreferrer" class="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#1ebe5d]">${icon.whatsapp(
      'h-4 w-4'
    )}<span>${escapeHtml(tl.whatsapp || 'WhatsApp')}</span></a>`
  }
  const secondary = []
  if (phone) {
    secondary.push(
      `<a href="tel:${escapeHtml(phone)}" class="${secondaryBtn}">${escapeHtml(tl.call || 'Call')}</a>`
    )
  }
  if (email) {
    const mailto = `mailto:${email}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(
      mailBody
    )}`
    secondary.push(
      `<a href="${escapeHtml(mailto)}" class="${secondaryBtn}">${escapeHtml(tl.email || 'Email')}</a>`
    )
  }
  if (!waHtml && !secondary.length) return ''
  const heading = fillTpl(tl.contactHeading || 'Contact {company_name}', { company_name: name })
  const secondaryRow =
    secondary.length === 2
      ? `<div class="mt-2 grid grid-cols-2 gap-2">${secondary.join('')}</div>`
      : secondary.length === 1
        ? `<div class="mt-2">${secondary[0]}</div>`
        : ''
  return `<div class="mt-5">
    <p class="mb-2 text-sm font-bold text-slate-800">${escapeHtml(heading)}</p>
    ${waHtml}
    ${secondaryRow}
  </div>`
}

function progressStepNode(kind, label) {
  // kind: done | current | todo
  let circle = ''
  if (kind === 'done') {
    circle = `<span class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">${icon.check(
      'h-3.5 w-3.5'
    )}</span>`
  } else if (kind === 'current') {
    circle = `<span class="relative flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white">
      <span class="absolute inset-0 animate-pulse rounded-full bg-sky-400/50" aria-hidden="true"></span>
      <span class="relative h-2 w-2 rounded-full bg-white"></span>
    </span>`
  } else {
    circle = `<span class="flex h-6 w-6 rounded-full border-2 border-slate-300 bg-white"></span>`
  }
  const labelClass =
    kind === 'todo' ? 'text-slate-400' : kind === 'current' ? 'text-sky-700' : 'text-emerald-700'
  return `<div class="flex min-w-0 flex-1 flex-col items-center gap-1.5">
    ${circle}
    <span class="max-w-full truncate text-center text-[10px] font-semibold leading-tight ${labelClass}">${escapeHtml(
      label
    )}</span>
  </div>`
}

function progressConnector(filled) {
  return `<div class="mb-5 h-0.5 w-6 shrink-0 self-start rounded-full sm:w-10 ${
    filled ? 'bg-emerald-400' : 'bg-slate-200'
  }" aria-hidden="true"></div>`
}

function pickupProgressRailHtml(status, tl) {
  const s = String(status || '').toUpperCase()
  const step = s === 'ARRIVED' ? 2 : s === 'ON_THE_WAY' ? 1 : 0
  const kinds = [
    step > 0 ? 'done' : 'current',
    step === 0 ? 'todo' : step === 1 ? 'current' : 'done',
    step === 2 ? 'current' : 'todo',
  ]
  return `<div class="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-3" role="list" aria-label="${escapeHtml(
    tl.progressLabel || 'Trip progress'
  )}">
    <div class="flex items-start justify-between gap-0.5">
      ${progressStepNode(kinds[0], tl.progressConfirmed || 'Confirmed')}
      ${progressConnector(step > 0)}
      ${progressStepNode(kinds[1], tl.progressOnTheWay || 'On the way')}
      ${progressConnector(step > 1)}
      ${progressStepNode(kinds[2], tl.progressArrived || tl.progressPickup || 'Arrived')}
    </div>
  </div>`
}

function confirmedCard(company, trip, contacts, tl) {
  const summary = tripSummaryHtml(trip, tl)
  const status = String(trip?.driver_pickup_status || '').toUpperCase()
  const eta = Number(trip?.driver_eta_minutes)
  const hasEta = status === 'ON_THE_WAY' && Number.isFinite(eta) && eta >= 0
  let badge = tl.bookingConfirmedBadge || 'BOOKING CONFIRMED'
  let heading = fillTpl(tl.confirmedHeading || 'Your trip with {company_name} is confirmed', {
    company_name: company,
  })
  let sub = tl.confirmedTaxiSub || tl.confirmedSub || 'Your taxi is confirmed.'
  let badgeClass = 'text-emerald-700'

  if (status === 'ON_THE_WAY') {
    badge = tl.driverOnWayBadge || 'DRIVER ON THE WAY'
    heading = tl.driverOnWayHeading || 'Your taxi is on the way'
    sub = hasEta
      ? fillTpl(tl.driverEtaApprox || 'Approx. {eta} min to pickup', { eta: String(Math.round(eta)) })
      : tl.driverOnWaySub || ''
    badgeClass = 'text-sky-700'
  } else if (status === 'ARRIVED') {
    badge = tl.driverArrivedBadge || 'DRIVER ARRIVED'
    heading = tl.driverArrivedHeading || 'Your driver has arrived at the pickup location.'
    sub = ''
    badgeClass = 'text-violet-700'
  }

  const subHtml = sub ? `<p class="mt-2 text-sm text-gray-600">${escapeHtml(sub)}</p>` : ''

  return card(`
      <p class="text-xs font-bold uppercase tracking-wide ${badgeClass}">${escapeHtml(badge)}</p>
      <h1 class="mt-2 text-xl font-bold leading-snug text-gray-900">${escapeHtml(heading)}</h1>
      ${subHtml}
      ${pickupProgressRailHtml(status, tl)}
      ${summary}
      ${contactButtonsHtml(contacts, company, trip, tl)}
    `)
}

async function fetchTripStatus(token) {
  const res = await fetch(apiUrl(`/api/trip-status?token=${encodeURIComponent(token)}`), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

function renderState(data) {
  const tl = tTripLive(getLocale())
  const state = String(data?.state || 'INVALID')
  const trip = data?.trip || null
  const company = data?.headline_company || data?.company_a_name || tl.fallbackCompany || 'your taxi company'
  const summary = tripSummaryHtml(trip, tl)

  if (state === 'INVALID') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-slate-500">TAXIO</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(tl.linkUnavailableTitle || 'Link unavailable')}</h1>
      <p class="mt-2 text-sm text-gray-600">${escapeHtml(
        tl.linkUnavailableBody || 'This trip link is invalid or no longer available.'
      )}</p>
    `)
  }

  if (state === 'LOAD_ERROR') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-amber-700">TAXIO</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(
        tl.loadErrorTitle || 'Could not load trip'
      )}</h1>
      <p class="mt-2 text-sm text-gray-600">${escapeHtml(
        tl.loadErrorBody || 'Check your connection and try again.'
      )}</p>
    `)
  }

  if (state === 'EXPIRED') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-slate-500">${escapeHtml(
        tl.expiredBadge || 'Expired'
      )}</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(
        tl.tripExpiredTitle || 'This trip is no longer active.'
      )}</h1>
      <p class="mt-2 text-sm text-gray-600">${escapeHtml(
        tl.tripExpiredBody || 'The trip link is still valid, but this booking has ended.'
      )}</p>
      ${summary}
    `)
  }

  if (state === 'COMPLETED') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-emerald-700">${escapeHtml(
        tl.completedBadge || 'TRIP COMPLETED'
      )}</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(
        tl.completedHeading || 'Trip completed'
      )}</h1>
      <p class="mt-2 text-sm text-gray-600">${escapeHtml(
        fillTpl(tl.completedBody || 'Thank you for riding with {company_name}.', {
          company_name: company,
        })
      )}</p>
      ${summary}
      ${contactButtonsHtml(data.contacts, company, trip, tl)}
    `)
  }

  if (state === 'OFFER_EXPIRED') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-slate-500">${escapeHtml(
        tl.expiredBadge || 'Expired'
      )}</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(
        tl.offerExpiredTitle || 'This taxi offer has expired.'
      )}</h1>
      <p class="mt-2 text-sm text-gray-600">${escapeHtml(
        tl.offerExpiredBody || 'The confirmation window ended. No further action is needed on this page.'
      )}</p>
      ${summary}
    `)
  }

  if (state === 'REQUESTING_COMPANY_A') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-amber-700">${escapeHtml(
        tl.waitingBadge || 'Waiting'
      )}</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(
        fillTpl(tl.waitingHeading || 'Waiting for {company_name}', { company_name: company })
      )}</h1>
      <p class="mt-2 text-sm text-gray-600">${escapeHtml(
        tl.waitingBody || 'Please wait while we confirm your taxi.'
      )}</p>
      ${summary}
      <p class="mt-4 text-center text-xs font-medium text-slate-500">${escapeHtml(
        tl.autoUpdateHint || 'This page updates automatically…'
      )}</p>
    `)
  }

  if (state === 'COMPANY_A_ACCEPTED') {
    return confirmedCard(company, trip, data.contacts, tl)
  }

  if (state === 'SEARCHING_RESCUE') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-amber-700">${escapeHtml(
        tl.findingBadge || 'Finding a taxi'
      )}</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(
        fillTpl(tl.unavailableHeading || '{company_name} is unavailable', { company_name: company })
      )}</h1>
      <p class="mt-2 text-sm text-gray-600">${escapeHtml(
        tl.findingBody || 'We’re finding another available taxi for you…'
      )}</p>
      ${summary}
      <p class="mt-4 text-center text-xs font-medium text-slate-500">${escapeHtml(
        tl.autoUpdateHint || 'This page updates automatically…'
      )}</p>
    `)
  }

  if (state === 'RESCUE_WINNER_FOUND') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-amber-700">${escapeHtml(
        tl.taxiFoundBadge || 'Taxi found'
      )}</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(
        fillTpl(tl.taxiFoundHeading || '{company_name} can take your trip', { company_name: company })
      )}</h1>
      <p class="mt-2 text-sm text-gray-600">${escapeHtml(
        tl.taxiFoundBody || 'Same trip. Same estimated price.'
      )}</p>
      <p class="mt-1 text-sm font-medium text-amber-800">${escapeHtml(
        tl.confirmWithin || 'Please confirm within 30 minutes.'
      )}</p>
      ${summary}
      <div class="mt-5 grid gap-2">
        <button type="button" id="trip-confirm" class="min-h-[48px] w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500">${escapeHtml(
          tl.confirmTrip || 'CONFIRM TRIP'
        )}</button>
        <button type="button" id="trip-cancel" class="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">${escapeHtml(
          tl.cancelTrip || 'CANCEL'
        )}</button>
      </div>
      <p id="trip-msg" class="mt-3 hidden text-center text-sm font-medium text-red-600"></p>
    `)
  }

  if (state === 'CONFIRMED') {
    return confirmedCard(company, trip, data.contacts, tl)
  }

  if (state === 'CANCELLED') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-slate-500">${escapeHtml(
        tl.cancelledBadge || 'Cancelled'
      )}</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(
        tl.cancelledTitle || 'Trip cancelled'
      )}</h1>
      <p class="mt-2 text-sm text-gray-600">${escapeHtml(
        tl.cancelledBody || 'This reassignment was cancelled. No further action is needed.'
      )}</p>
      ${summary}
    `)
  }

  if (state === 'NO_TAXI_AVAILABLE') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-slate-500">${escapeHtml(
        tl.unavailableBadge || 'Unavailable'
      )}</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(
        tl.noTaxiTitle || 'No taxi is currently available for this trip.'
      )}</h1>
      <p class="mt-2 text-sm text-gray-600">${escapeHtml(
        tl.noTaxiBody || 'Please try booking again later.'
      )}</p>
      ${summary}
    `)
  }

  return card(`
    <p class="text-center text-sm font-semibold text-gray-700">${escapeHtml(
      tl.linkInactive || 'This trip link is no longer active.'
    )}</p>
  `)
}

export async function mountTripLive(root, secureToken) {
  document.title = 'TAXIO · Your trip'
  // Strip accidental query/hash fragments if a caller passed a raw path segment
  const token = String(secureToken || '')
    .trim()
    .split('?')[0]
    .split('#')[0]
    .trim()
  const tl = tTripLive(getLocale())
  if (token.length < 20) {
    root.innerHTML = shell(
      card(
        `<p class="text-center text-sm font-semibold text-red-600">${escapeHtml(
          tl.invalidLink || 'This trip link is invalid.'
        )}</p>`
      )
    )
    return
  }

  let pollTimer = null
  let lastState = ''
  let busy = false
  let latest = null
  let copyTimer = null

  const stopPoll = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  const bindCopyRef = () => {
    const btn = root.querySelector('[data-copy-ref]')
    const feedback = root.querySelector('[data-copy-feedback]')
    const refEl = root.querySelector('[data-booking-ref]')
    if (!btn || !refEl) return
    btn.addEventListener('click', async () => {
      const text = String(refEl.textContent || '').trim()
      if (!text) return
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        return
      }
      if (feedback) {
        feedback.classList.remove('hidden')
        if (copyTimer) window.clearTimeout(copyTimer)
        copyTimer = window.setTimeout(() => feedback.classList.add('hidden'), 1600)
      }
    })
  }

  const bindActions = () => {
    bindCopyRef()
    const msgEl = root.querySelector('#trip-msg')
    const setBusy = (v) => {
      busy = v
      const c = root.querySelector('#trip-confirm')
      const x = root.querySelector('#trip-cancel')
      if (c) c.disabled = v
      if (x) x.disabled = v
    }

    root.querySelector('#trip-confirm')?.addEventListener('click', async () => {
      if (busy) return
      const confirmToken = latest?.confirm_token
      if (!confirmToken) {
        if (msgEl) {
          msgEl.textContent =
            tl.confirmNotReady || 'Confirmation is not available yet. Please wait a moment.'
          msgEl.classList.remove('hidden')
        }
        return
      }
      setBusy(true)
      try {
        const result = await passengerRescueConfirm(confirmToken)
        if (!result?.ok) {
          if (msgEl) {
            msgEl.textContent =
              result?.code === 'EXPIRED'
                ? tl.offerExpiredTitle || 'This taxi offer has expired.'
                : tl.confirmFailed || 'Could not confirm. Please try again.'
            msgEl.classList.remove('hidden')
          }
          if (result?.code === 'EXPIRED') {
            lastState = ''
            await refresh()
          }
          return
        }
        lastState = ''
        await refresh()
      } catch {
        if (msgEl) {
          msgEl.textContent = tl.confirmFailed || 'Could not confirm. Please try again.'
          msgEl.classList.remove('hidden')
        }
      } finally {
        setBusy(false)
      }
    })

    root.querySelector('#trip-cancel')?.addEventListener('click', async () => {
      if (busy) return
      const confirmToken = latest?.confirm_token
      if (!confirmToken) return
      setBusy(true)
      try {
        const result = await passengerRescueCancel(confirmToken)
        if (!result?.ok) {
          if (msgEl) {
            msgEl.textContent = tl.cancelFailed || 'Could not cancel. Please try again.'
            msgEl.classList.remove('hidden')
          }
          return
        }
        lastState = ''
        await refresh()
      } catch {
        if (msgEl) {
          msgEl.textContent = tl.cancelFailed || 'Could not cancel. Please try again.'
          msgEl.classList.remove('hidden')
        }
      } finally {
        setBusy(false)
      }
    })
  }

  const paint = (data) => {
    latest = data
    const state = String(data?.state || 'INVALID')
    syncPassengerActiveTripFromStatus(token, data)
    const pickupStatus = String(data?.trip?.driver_pickup_status || '').toUpperCase()
    const eta = data?.trip?.driver_eta_minutes
    const progressKey = `${state}:${pickupStatus}:${eta ?? ''}`
    const terminal = [
      'CANCELLED',
      'NO_TAXI_AVAILABLE',
      'INVALID',
      'EXPIRED',
      'OFFER_EXPIRED',
      'COMPLETED',
    ].includes(state)
    // Keep polling through ON_THE_WAY / ARRIVED until COMPLETED
    if (terminal) stopPoll()
    else if (
      state === 'COMPANY_A_ACCEPTED' ||
      state === 'CONFIRMED' ||
      state === 'REQUESTING_COMPANY_A' ||
      state === 'SEARCHING_RESCUE' ||
      state === 'RESCUE_WINNER_FOUND'
    ) {
      startPoll()
    }

    if (
      progressKey === lastState &&
      root.querySelector('#trip-confirm, #trip-cancel, a[href^="tel:"], a[href^="https://wa.me"]')
    ) {
      if (state === 'RESCUE_WINNER_FOUND') return
      if (state === 'COMPANY_A_ACCEPTED' || state === 'CONFIRMED') return
    }
    lastState = progressKey
    root.innerHTML = shell(renderState(data))
    bindActions()
  }

  const refresh = async () => {
    try {
      const { status, body } = await fetchTripStatus(token)
      if (body?.state) {
        paint(body)
        return
      }
      // Missing state (e.g. HTML error page) — never invent INVALID for a known prior trip
      if (!lastState) {
        paint({ state: status === 404 ? 'INVALID' : 'LOAD_ERROR' })
      }
    } catch {
      if (!lastState) {
        paint({ state: 'LOAD_ERROR' })
      }
    }
  }

  root.innerHTML = shell(
    card(
      `<p class="text-center text-sm text-gray-500">${escapeHtml(tl.loading || 'Loading your trip…')}</p>`
    )
  )
  await refresh()

  const startPoll = () => {
    if (pollTimer) return
    const state = String(latest?.state || '')
    if (
      ['CANCELLED', 'NO_TAXI_AVAILABLE', 'INVALID', 'EXPIRED', 'OFFER_EXPIRED', 'COMPLETED'].includes(
        state
      )
    ) {
      return
    }
    pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void refresh()
    }, Number(latest?.poll_ms) || POLL_MS)
  }

  startPoll()

  const onVis = () => {
    if (document.visibilityState === 'visible') void refresh()
  }
  document.addEventListener('visibilitychange', onVis)

  root._taxioTripCleanup = () => {
    stopPoll()
    if (copyTimer) window.clearTimeout(copyTimer)
    document.removeEventListener('visibilitychange', onVis)
  }
}
