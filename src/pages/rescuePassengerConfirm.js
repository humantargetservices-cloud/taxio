import {
  passengerRescuePreview,
  passengerRescueConfirm,
  passengerRescueCancel,
} from '../lib/rescue.js'
import { cleanTripPriceDisplay } from '../lib/rescuePrice.js'
import { formatDateTime } from '../lib/format.js'
import { escapeHtml } from '../lib/html.js'
import { taxioLogoImg } from '../lib/taxioLogo.js'

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

/**
 * Minimal public passenger confirmation page (token link; no login).
 * Route: /rescue/confirm/:token
 */
export async function mountRescuePassengerConfirm(root, token) {
  document.title = 'TAXIO · Confirm ride'
  root.innerHTML = shell(card(`<p class="text-center text-sm text-gray-500">Loading…</p>`))

  const safeToken = String(token || '').trim()
  if (safeToken.length < 20) {
    root.innerHTML = shell(
      card(`<p class="text-center text-sm font-semibold text-red-600">This confirmation link is invalid.</p>`)
    )
    return
  }

  const preview = await passengerRescuePreview(safeToken)
  if (!preview?.ok) {
    const msg =
      preview?.code === 'INVALID_TOKEN'
        ? 'This confirmation link is invalid or has expired.'
        : 'This confirmation link is no longer available.'
    root.innerHTML = shell(card(`<p class="text-center text-sm font-semibold text-red-600">${escapeHtml(msg)}</p>`))
    return
  }

  const status = preview.passenger_confirm_status
  const companyName = preview.accepted_by_company_name || 'another TAXIO company'
  const pickup = preview.preview_pickup_label || '—'
  const dropoff = preview.preview_dropoff_label || '—'
  const price = cleanTripPriceDisplay(preview.preview_estimated_price) || '—'
  const when = formatDateTime(preview.preview_ride_datetime) || '—'

  if (status === 'CONFIRMED') {
    root.innerHTML = shell(
      card(`
        <p class="text-xs font-bold uppercase tracking-wide text-emerald-700">Confirmed</p>
        <h1 class="mt-2 text-xl font-bold text-gray-900">Your ride is confirmed</h1>
        <p class="mt-2 text-sm text-gray-600">${escapeHtml(companyName)} will serve your trip.</p>
        <p class="mt-4 text-sm font-medium text-gray-900">${escapeHtml(pickup)} → ${escapeHtml(dropoff)}</p>
        <p class="mt-1 text-sm text-amber-700">Trip price: ${escapeHtml(price)}</p>
      `)
    )
    return
  }

  if (status === 'CANCELLED_BY_PASSENGER') {
    root.innerHTML = shell(
      card(`
        <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Cancelled</p>
        <h1 class="mt-2 text-xl font-bold text-gray-900">Ride cancelled</h1>
        <p class="mt-2 text-sm text-gray-600">You cancelled this reassignment. No further action is needed.</p>
      `)
    )
    return
  }

  if (status !== 'WAITING_PASSENGER_CONFIRMATION') {
    root.innerHTML = shell(
      card(`<p class="text-center text-sm font-semibold text-gray-700">This confirmation is no longer active.</p>`)
    )
    return
  }

  root.innerHTML = shell(
    card(`
      <p class="text-xs font-bold uppercase tracking-wide text-amber-700">TAXIO</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">Please confirm your ride</h1>
      <p class="mt-2 text-sm leading-relaxed text-gray-600">Your selected taxi company is unavailable. <strong class="font-semibold text-gray-900">${escapeHtml(companyName)}</strong> can serve your trip.</p>
      <div class="mt-5 rounded-xl border border-gray-100 bg-slate-50 px-4 py-3">
        <p class="text-sm font-semibold text-gray-900">${escapeHtml(pickup)} → ${escapeHtml(dropoff)}</p>
        <p class="mt-1 text-sm font-semibold text-amber-700">Trip price: ${escapeHtml(price)}</p>
        <p class="mt-1 text-xs text-gray-500">Requested time: ${escapeHtml(when)}</p>
      </div>
      <div class="mt-5 grid gap-2">
        <button type="button" id="pc-confirm" class="min-h-[48px] w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500">CONFIRM RIDE</button>
        <button type="button" id="pc-cancel" class="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">CANCEL</button>
      </div>
      <p id="pc-msg" class="mt-3 hidden text-center text-sm font-medium text-red-600"></p>
    `)
  )

  const msgEl = root.querySelector('#pc-msg')
  const setBusy = (busy) => {
    const c = root.querySelector('#pc-confirm')
    const x = root.querySelector('#pc-cancel')
    if (c) c.disabled = busy
    if (x) x.disabled = busy
  }

  root.querySelector('#pc-confirm')?.addEventListener('click', async () => {
    setBusy(true)
    const result = await passengerRescueConfirm(safeToken)
    if (!result?.ok) {
      setBusy(false)
      if (msgEl) {
        msgEl.textContent =
          result?.code === 'ALREADY_CONFIRMED'
            ? 'Already confirmed.'
            : result?.code === 'ALREADY_CANCELLED'
              ? 'Already cancelled.'
              : 'Could not confirm this ride.'
        msgEl.classList.remove('hidden')
      }
      if (result?.code === 'ALREADY_CONFIRMED' || result?.code === 'ALREADY_CANCELLED') {
        setTimeout(() => mountRescuePassengerConfirm(root, safeToken), 800)
      }
      return
    }
    mountRescuePassengerConfirm(root, safeToken)
  })

  root.querySelector('#pc-cancel')?.addEventListener('click', async () => {
    setBusy(true)
    const result = await passengerRescueCancel(safeToken)
    if (!result?.ok) {
      setBusy(false)
      if (msgEl) {
        msgEl.textContent =
          result?.code === 'ALREADY_CANCELLED'
            ? 'Already cancelled.'
            : result?.code === 'ALREADY_CONFIRMED'
              ? 'Already confirmed.'
              : 'Could not cancel this ride.'
        msgEl.classList.remove('hidden')
      }
      if (result?.code === 'ALREADY_CONFIRMED' || result?.code === 'ALREADY_CANCELLED') {
        setTimeout(() => mountRescuePassengerConfirm(root, safeToken), 800)
      }
      return
    }
    mountRescuePassengerConfirm(root, safeToken)
  })
}
