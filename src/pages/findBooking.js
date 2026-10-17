/**
 * Passenger recovery: booking reference + phone → existing /trip/:token
 */
import { escapeHtml } from '../lib/html.js'
import { taxioLogoImg } from '../lib/taxioLogo.js'
import { tFindBooking } from '../i18n.js'
import { getLocale } from '../lib/locale.js'
import {
  findBookingByReferenceAndPhone,
  savePassengerActiveTrip,
} from '../lib/passengerActiveTrip.js'

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

export function mountFindBooking(root) {
  document.title = 'TAXIO · Find booking'
  const tl = tFindBooking(getLocale())

  const paint = () => {
    root.innerHTML = shell(
      card(`
      <p class="text-xs font-bold uppercase tracking-wide text-amber-700">${escapeHtml(
        tl.badge || 'Find my booking'
      )}</p>
      <h1 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(
        tl.title || 'Find my booking'
      )}</h1>
      <p class="mt-2 text-sm text-gray-600">${escapeHtml(
        tl.body ||
          'Enter your TAXIO booking reference and the phone number used for the booking.'
      )}</p>
      <form id="find-booking-form" class="mt-5 space-y-3" novalidate>
        <div>
          <label for="find-ref" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">${escapeHtml(
            tl.refLabel || 'Booking reference'
          )}</label>
          <input id="find-ref" name="booking_reference" autocomplete="off" inputmode="text" class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none ring-amber-400/40 focus:ring-2" placeholder="${escapeHtml(
            tl.refPlaceholder || 'TX-XXXXXX'
          )}" />
        </div>
        <div>
          <label for="find-phone" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">${escapeHtml(
            tl.phoneLabel || 'Phone number'
          )}</label>
          <input id="find-phone" name="phone" type="tel" autocomplete="tel" class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none ring-amber-400/40 focus:ring-2" placeholder="${escapeHtml(
            tl.phonePlaceholder || '+32...'
          )}" />
        </div>
        <p id="find-msg" class="hidden text-sm font-medium text-red-600"></p>
        <button type="submit" id="find-submit" class="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">${escapeHtml(
          tl.submit || 'Find booking'
        )}</button>
      </form>
      <p class="mt-4 text-center text-xs text-slate-500">
        <a href="/" class="font-semibold text-amber-800 hover:underline">${escapeHtml(
          tl.backHome || 'Back home'
        )}</a>
      </p>
    `)
    )

    const form = root.querySelector('#find-booking-form')
    const msg = root.querySelector('#find-msg')
    const submit = root.querySelector('#find-submit')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      if (!form || !submit) return
      const ref = String(form.booking_reference?.value || '').trim()
      const phone = String(form.phone?.value || '').trim()
      if (msg) {
        msg.classList.add('hidden')
        msg.textContent = ''
      }
      const label = submit.textContent
      submit.disabled = true
      submit.textContent = tl.busy || 'Searching…'
      try {
        const result = await findBookingByReferenceAndPhone({
          bookingReference: ref,
          phone,
        })
        if (!result.ok) {
          if (msg) {
            msg.textContent =
              result.body?.error ||
              tl.notFound ||
              'We could not find that booking. Check the reference and phone number.'
            msg.classList.remove('hidden')
          }
          return
        }
        const token = String(result.body?.trip_token || '').trim()
        if (token.length < 20) {
          if (msg) {
            msg.textContent = tl.notFound || 'We could not find that booking.'
            msg.classList.remove('hidden')
          }
          return
        }
        savePassengerActiveTrip({
          token,
          bookingReference: result.body?.booking_reference || ref,
        })
        const url = String(result.body?.trip_url || '').trim()
        window.location.assign(url && url.includes('/trip/') ? url : `/trip/${encodeURIComponent(token)}`)
      } catch {
        if (msg) {
          msg.textContent = tl.notFound || 'We could not find that booking.'
          msg.classList.remove('hidden')
        }
      } finally {
        submit.disabled = false
        submit.textContent = label
      }
    })
  }

  paint()
}
