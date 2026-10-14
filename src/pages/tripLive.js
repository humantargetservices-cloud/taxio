/**
 * Passenger live trip page — /trip/:secureToken
 * Polls /api/trip-status every ~4s. Confirm/Cancel use existing Rescue RPCs.
 */
import { apiUrl } from '../lib/api.js'
import { passengerRescueConfirm, passengerRescueCancel } from '../lib/rescue.js'
import { formatDateTime } from '../lib/format.js'
import { escapeHtml } from '../lib/html.js'
import { taxioLogoImg } from '../lib/taxioLogo.js'
import { cleanTripPriceDisplay } from '../lib/rescuePrice.js'

const POLL_MS = 4000

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

function tripSummaryHtml(trip) {
  if (!trip) return ''
  const when = formatDateTime(trip.ride_datetime) || '—'
  const drop =
    trip.service_type === 'hourly'
      ? ''
      : `<p class="mt-1 text-sm text-gray-800"><span class="font-semibold text-gray-500">To:</span> ${escapeHtml(trip.dropoff || '—')}</p>`
  return `<div class="mt-4 rounded-xl border border-gray-100 bg-slate-50 px-4 py-3">
    <p class="text-sm font-semibold text-gray-900">${escapeHtml(trip.pickup || '—')} → ${escapeHtml(
      trip.service_type === 'hourly' ? 'Hourly' : trip.dropoff || '—'
    )}</p>
    <p class="mt-1 text-sm font-semibold text-amber-700">Estimated price: ${escapeHtml(priceLabel(trip))}</p>
    <p class="mt-1 text-xs text-gray-500">When: ${escapeHtml(when)}</p>
    <p class="mt-1 text-xs text-gray-500">Vehicle: ${escapeHtml(trip.vehicle || '—')}</p>
    ${
      trip.booking_reference
        ? `<p class="mt-1 text-xs text-gray-500">Ref: ${escapeHtml(trip.booking_reference)}</p>`
        : ''
    }
    ${drop && trip.service_type === 'hourly' ? drop : ''}
  </div>`
}

function contactButtonsHtml(contacts, companyName) {
  if (!contacts) return ''
  const phone = String(contacts.phone || '').trim()
  const email = String(contacts.email || '').trim()
  let waDigits = String(contacts.whatsapp_digits || phone.replace(/\D/g, '') || '')
  if (waDigits.startsWith('00')) waDigits = waDigits.slice(2)
  if (waDigits.startsWith('0')) waDigits = `32${waDigits.slice(1)}`
  const name = companyName || contacts.name || 'TAXIO'
  const prefill = `Hello, this is regarding my TAXIO booking with ${name}.`
  const parts = []
  if (waDigits.length >= 8 && waDigits.length <= 15) {
    parts.push(
      `<a href="https://wa.me/${escapeHtml(waDigits)}?text=${encodeURIComponent(
        prefill
      )}" target="_blank" rel="noopener noreferrer" class="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#25D366] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#1ebe5d]">WhatsApp</a>`
    )
  }
  if (phone) {
    parts.push(
      `<a href="tel:${escapeHtml(phone)}" class="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">Call</a>`
    )
  }
  if (email) {
    parts.push(
      `<a href="mailto:${escapeHtml(email)}" class="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">Email</a>`
    )
  }
  if (!parts.length) return ''
  return `<div class="mt-5 grid gap-2">${parts.join('')}</div>`
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
  const state = String(data?.state || 'INVALID')
  const trip = data?.trip || null
  const company = data?.headline_company || data?.company_a_name || 'your taxi company'
  const summary = tripSummaryHtml(trip)

  if (state === 'INVALID' || state === 'EXPIRED') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-slate-500">TAXIO</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">Link unavailable</h1>
      <p class="mt-2 text-sm text-gray-600">This trip link is invalid or no longer available.</p>
    `)
  }

  if (state === 'REQUESTING_COMPANY_A') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-amber-700">Waiting</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">Waiting for ${escapeHtml(company)}</h1>
      <p class="mt-2 text-sm text-gray-600">Please wait while we confirm your taxi.</p>
      ${summary}
      <p class="mt-4 text-center text-xs font-medium text-slate-500">This page updates automatically…</p>
    `)
  }

  if (state === 'COMPANY_A_ACCEPTED') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-emerald-700">Accepted</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(company)} accepted your trip</h1>
      <p class="mt-2 text-sm text-gray-600">You can contact them directly about this ride.</p>
      ${summary}
      ${contactButtonsHtml(data.contacts, company)}
    `)
  }

  if (state === 'SEARCHING_RESCUE') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-amber-700">Finding a taxi</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(company)} is unavailable</h1>
      <p class="mt-2 text-sm text-gray-600">We’re finding another available taxi for you…</p>
      ${summary}
      <p class="mt-4 text-center text-xs font-medium text-slate-500">This page updates automatically…</p>
    `)
  }

  if (state === 'RESCUE_WINNER_FOUND') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-amber-700">Taxi found</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(company)} can take your trip</h1>
      <p class="mt-2 text-sm text-gray-600">Same trip. Same estimated price. Please confirm to share your contact details.</p>
      ${summary}
      <div class="mt-5 grid gap-2">
        <button type="button" id="trip-confirm" class="min-h-[48px] w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500">CONFIRM TRIP</button>
        <button type="button" id="trip-cancel" class="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">CANCEL</button>
      </div>
      <p id="trip-msg" class="mt-3 hidden text-center text-sm font-medium text-red-600"></p>
    `)
  }

  if (state === 'CONFIRMED') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-emerald-700">Confirmed</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">Trip confirmed with ${escapeHtml(company)}</h1>
      <p class="mt-2 text-sm text-gray-600">You can contact them about your ride.</p>
      ${summary}
      ${contactButtonsHtml(data.contacts, company)}
    `)
  }

  if (state === 'CANCELLED') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Cancelled</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">Trip cancelled</h1>
      <p class="mt-2 text-sm text-gray-600">This reassignment was cancelled. No further action is needed.</p>
      ${summary}
    `)
  }

  if (state === 'NO_TAXI_AVAILABLE') {
    return card(`
      <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Unavailable</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">No taxi is currently available for this trip.</h1>
      <p class="mt-2 text-sm text-gray-600">Please try booking again later.</p>
      ${summary}
    `)
  }

  return card(`
    <p class="text-center text-sm font-semibold text-gray-700">This trip link is no longer active.</p>
  `)
}

export async function mountTripLive(root, secureToken) {
  document.title = 'TAXIO · Your trip'
  const token = String(secureToken || '').trim()
  if (token.length < 20) {
    root.innerHTML = shell(
      card(`<p class="text-center text-sm font-semibold text-red-600">This trip link is invalid.</p>`)
    )
    return
  }

  let pollTimer = null
  let lastState = ''
  let busy = false
  let latest = null

  const stopPoll = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  const bindActions = () => {
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
          msgEl.textContent = 'Confirmation is not available yet. Please wait a moment.'
          msgEl.classList.remove('hidden')
        }
        return
      }
      setBusy(true)
      const result = await passengerRescueConfirm(confirmToken)
      if (!result?.ok) {
        setBusy(false)
        if (msgEl) {
          msgEl.textContent = 'Could not confirm. Please try again.'
          msgEl.classList.remove('hidden')
        }
        return
      }
      lastState = ''
      await refresh()
    })

    root.querySelector('#trip-cancel')?.addEventListener('click', async () => {
      if (busy) return
      const confirmToken = latest?.confirm_token
      if (!confirmToken) return
      setBusy(true)
      const result = await passengerRescueCancel(confirmToken)
      if (!result?.ok) {
        setBusy(false)
        if (msgEl) {
          msgEl.textContent = 'Could not cancel. Please try again.'
          msgEl.classList.remove('hidden')
        }
        return
      }
      lastState = ''
      await refresh()
    })
  }

  const paint = (data) => {
    latest = data
    const state = String(data?.state || 'INVALID')
    const terminal = ['CANCELLED', 'NO_TAXI_AVAILABLE', 'INVALID', 'EXPIRED'].includes(state)
    const acceptedDone = state === 'COMPANY_A_ACCEPTED' || state === 'CONFIRMED'
    if (terminal || acceptedDone) stopPoll()

    if (state === lastState && root.querySelector('#trip-confirm, #trip-cancel, a[href^="tel:"], a[href^="https://wa.me"]')) {
      // Keep contacts/actions; still re-bind if needed after confirm paint
      if (state === 'RESCUE_WINNER_FOUND') return
    }
    lastState = state
    root.innerHTML = shell(renderState(data))
    bindActions()
  }

  const refresh = async () => {
    try {
      const { body } = await fetchTripStatus(token)
      paint(body?.state ? body : { state: 'INVALID' })
    } catch {
      if (!lastState) {
        paint({ state: 'INVALID' })
      }
    }
  }

  root.innerHTML = shell(card(`<p class="text-center text-sm text-gray-500">Loading your trip…</p>`))
  await refresh()

  const startPoll = () => {
    stopPoll()
    const state = String(latest?.state || '')
    if (['CANCELLED', 'NO_TAXI_AVAILABLE', 'INVALID', 'EXPIRED', 'COMPANY_A_ACCEPTED', 'CONFIRMED'].includes(state)) {
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

  // Soft cleanup when router remounts — best-effort
  root._taxioTripCleanup = () => {
    stopPoll()
    document.removeEventListener('visibilitychange', onVis)
  }
}
