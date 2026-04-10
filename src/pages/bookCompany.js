import {
  fetchApprovedCompanyBySlug,
  createQuickBookingLog,
  fetchFleetCarTypesForBooking,
} from '../lib/api.js'
import { TERMS_VERSION_BOOKING_RIDER } from '../lib/legalVersions.js'
import { effectivePricingForTypes, resolveBookingCarTypes } from '../lib/bookingCarTypes.js'
import { escapeHtml } from '../lib/html.js'
import { icon } from '../lib/icons.js'
import { estimateTrip } from '../lib/tripEstimate.js'

const DEFAULT_SLOGAN = 'Your Ride, Your Way, Anytime!'
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

let googleMapsPlacesPromise = null
let bookingPacObserver = null
let bookingPacOutsideClose = null
/** Single active booking address field (Google shares one `.pac-container`). */
let taxioBookingPacActiveInput = null
let bookingPacFocusInHandler = null
let bookingPacPointerDownHandler = null
let bookingPacEventRoot = null
let bookingPacLayoutSync = null
/** Map booking inputs → Places Autocomplete (registry for teardown / future hooks). */
let taxioPlacesAcRegistry = new Map()

/** Clear inline hide so Google can show predictions again. */
function resetBookingPacContainers() {
  document.querySelectorAll('.pac-container').forEach((el) => {
    el.style.removeProperty('display')
    el.style.removeProperty('visibility')
  })
}

/** Force-close all Places dropdowns (shared .pac-container). */
function forceHideBookingPacContainers() {
  document.querySelectorAll('.pac-container').forEach((el) => {
    el.style.display = 'none'
  })
}

/** Remove rendered rows so the shared pac cannot show the previous field's predictions. */
function clearStalePacItems() {
  document.querySelectorAll('.pac-container').forEach((pac) => {
    pac.querySelectorAll(':scope > .pac-item').forEach((row) => row.remove())
  })
}

/** Fixed-position `.pac-container` often has `offsetParent === null` — use computed style only. */
function isBookingPacContainerVisible(pac) {
  if (!pac?.isConnected) return false
  const st = window.getComputedStyle(pac)
  return st.display !== 'none' && st.visibility !== 'hidden'
}

/**
 * One visible tagged panel to anchor under the input (avoids stacking the same rect on every node).
 * Prefers the container that actually holds suggestion rows.
 */
function pickVisibleBookingPacForSync() {
  const tagged = [...document.querySelectorAll('.pac-container.taxio-booking-pac')].filter(
    isBookingPacContainerVisible
  )
  if (!tagged.length) return null
  tagged.sort(
    (a, b) =>
      b.querySelectorAll(':scope > .pac-item').length -
      a.querySelectorAll(':scope > .pac-item').length
  )
  return tagged[0]
}

/**
 * Keep a single native Google footer inside each *visible* panel only:
 * - Multiple sibling `:scope > .pac-logo` (Maps sometimes injects two).
 * - `.pac-logo` on the container AND a child `.pac-logo` (two paint sources for the same strip).
 */
function dedupePacAttributionFooters() {
  document.querySelectorAll('.pac-container').forEach((pac) => {
    if (!isBookingPacContainerVisible(pac)) return
    if (pac.classList.contains('pac-logo')) {
      pac.querySelectorAll(':scope > .pac-logo').forEach((n) => n.remove())
      return
    }
    const logos = [...pac.querySelectorAll(':scope > .pac-logo')]
    if (logos.length <= 1) return
    logos.slice(0, -1).forEach((n) => n.remove())
  })
}

/** Dismiss Google's panel state for the field we are leaving (Escape + DOM clear + hide). */
function flushInactiveBookingFieldPac(prevInput) {
  if (!prevInput) return
  try {
    prevInput.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true,
        cancelable: true,
      })
    )
  } catch {
    /* ignore */
  }
  clearStalePacItems()
  dedupePacAttributionFooters()
  forceHideBookingPacContainers()
}

/**
 * Hide dropdown only if no booking autocomplete input is focused
 * (avoids closing drop-off suggestions right after moving focus from pick-up).
 */
function hideBookingPacIfNoAcFocused() {
  if (document.querySelector('.taxio-booking-ac-input:focus')) return
  forceHideBookingPacContainers()
}

/** Close panel repeatedly — Google may repopen on focus until the next frame. */
function pulseHideBookingPacContainers() {
  const h = () => forceHideBookingPacContainers()
  h()
  window.requestAnimationFrame(h)
  window.setTimeout(h, 0)
  window.setTimeout(h, 50)
  window.setTimeout(h, 120)
  window.setTimeout(h, 250)
}

function isBookingAddressConfirmedIdle(input, state) {
  const v = String(input.value || '').trim()
  const c = state.committed
  return typeof c === 'string' && c.length > 0 && v === c
}

/** Global Google Places dropdown (.pac-container is on document.body). */
function ensureBookingPacStyles() {
  let style = document.getElementById('taxio-booking-pac-styles')
  if (!style) {
    style = document.createElement('style')
    style.id = 'taxio-booking-pac-styles'
    document.head.appendChild(style)
  }
  style.textContent = `
    .pac-container.taxio-booking-pac {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif !important;
      border-radius: 0 0 12px 12px !important;
      margin-top: 0 !important;
      padding: 0 !important;
      box-shadow: 0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04) !important;
      background: #fff !important;
      border: 1px solid #e8e8ec !important;
      border-top: 1px solid #e8e8ec !important;
      margin-top: -1px !important;
      max-height: 220px !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      -webkit-overflow-scrolling: touch !important;
      z-index: 10050 !important;
      box-sizing: border-box !important;
      max-width: min(100vw - 24px, 100%) !important;
    }
    .pac-container.taxio-booking-pac .pac-item {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 7px 10px !important;
      margin: 0 !important;
      border: none !important;
      border-top: 1px solid #ececf0 !important;
      cursor: pointer !important;
      line-height: 1.25 !important;
      min-height: 0 !important;
    }
    .pac-container.taxio-booking-pac .pac-item:first-of-type {
      border-top: none !important;
    }
    .pac-container.taxio-booking-pac .pac-item:hover,
    .pac-container.taxio-booking-pac .pac-item-selected {
      background: #f5f6f8 !important;
    }
    .pac-container.taxio-booking-pac .pac-icon {
      display: block !important;
      flex-shrink: 0 !important;
      width: 15px !important;
      height: 18px !important;
      margin-top: 1px !important;
      opacity: 0.42 !important;
    }
    .pac-container.taxio-booking-pac .pac-item-query {
      font-size: 13px !important;
      font-weight: 700 !important;
      color: #111 !important;
      padding-right: 0 !important;
      display: inline !important;
    }
    .pac-container.taxio-booking-pac .pac-item .pac-item-query + span {
      font-size: 12px !important;
      font-weight: 400 !important;
      color: #6b7280 !important;
      display: inline !important;
      margin-left: 4px !important;
      margin-top: 0 !important;
    }
    .pac-container.taxio-booking-pac .pac-matched {
      font-weight: 700 !important;
      color: #111 !important;
    }
    /* One attribution only: Google often paints logo on BOTH the div and ::after → double row */
    .pac-container.taxio-booking-pac .pac-logo {
      margin: 0 !important;
      padding: 5px 10px 7px !important;
      height: 18px !important;
      min-height: 18px !important;
      text-align: right !important;
      background-image: none !important;
      background: transparent none !important;
      opacity: 0.48 !important;
    }
    .pac-container.taxio-booking-pac .pac-logo:after {
      opacity: 1 !important;
      background-position: right center !important;
      background-size: 64px auto !important;
    }
    .pac-container.taxio-booking-pac .pac-logo ~ .pac-logo {
      display: none !important;
    }
    /* Container carries .pac-logo AND a footer child → duplicate attribution; keep container strip */
    .pac-container.taxio-booking-pac.pac-logo > .pac-logo {
      display: none !important;
      height: 0 !important;
      min-height: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow: hidden !important;
      visibility: hidden !important;
    }
    .pac-container.taxio-booking-pac .pac-logo img {
      max-height: 16px !important;
      width: auto !important;
      margin-left: auto !important;
      display: block !important;
      opacity: 0.48 !important;
    }
    .pac-container.taxio-booking-pac .pac-logo:has(img)::after {
      display: none !important;
      content: none !important;
      background: none !important;
    }
  `
}

/**
 * Pin the shared Google `.pac-container` under the active input (viewport coords).
 * Prevents the dropdown from staying under the previous field after focus switch.
 */
function syncPacContainerToInput(inputEl) {
  if (!inputEl || typeof document === 'undefined') return
  const pac = pickVisibleBookingPacForSync()
  if (!pac) return
  const rect = inputEl.getBoundingClientRect()
  const w = Math.min(Math.max(rect.width, 160), window.innerWidth - 16)
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8))
  const top = rect.bottom
  pac.style.position = 'fixed'
  pac.style.left = `${left}px`
  pac.style.top = `${top}px`
  pac.style.width = `${w}px`
  pac.style.minWidth = `${w}px`
  pac.style.maxWidth = `${w}px`
  pac.style.boxSizing = 'border-box'
}

function schedulePacAnchorSync(inputEl) {
  if (!inputEl) return
  const run = () => {
    if (taxioBookingPacActiveInput !== inputEl) return
    syncPacContainerToInput(inputEl)
  }
  window.requestAnimationFrame(run)
  window.setTimeout(run, 0)
  window.setTimeout(run, 32)
  window.setTimeout(run, 80)
}

function detachBookingPacChrome() {
  if (bookingPacObserver) {
    bookingPacObserver.disconnect()
    bookingPacObserver = null
  }
  const prevResize = window.__taxioBookingPacResize
  if (prevResize) {
    window.removeEventListener('resize', prevResize)
    window.__taxioBookingPacResize = null
  }
  if (bookingPacOutsideClose) {
    document.removeEventListener('mousedown', bookingPacOutsideClose, true)
    document.removeEventListener('touchstart', bookingPacOutsideClose, true)
    bookingPacOutsideClose = null
  }
  if (bookingPacEventRoot) {
    if (bookingPacFocusInHandler) {
      bookingPacEventRoot.removeEventListener('focusin', bookingPacFocusInHandler, true)
      bookingPacFocusInHandler = null
    }
    if (bookingPacPointerDownHandler) {
      bookingPacEventRoot.removeEventListener('pointerdown', bookingPacPointerDownHandler, true)
      bookingPacPointerDownHandler = null
    }
    bookingPacEventRoot = null
  }
  if (bookingPacLayoutSync) {
    window.removeEventListener('resize', bookingPacLayoutSync)
    window.removeEventListener('scroll', bookingPacLayoutSync, true)
    bookingPacLayoutSync = null
  }
  taxioBookingPacActiveInput = null
  taxioPlacesAcRegistry.clear()
}

function attachBookingPacObserver(root, inputs) {
  if (typeof MutationObserver === 'undefined') return
  detachBookingPacChrome()

  bookingPacEventRoot = root

  bookingPacPointerDownHandler = (e) => {
    const t = e.target
    if (!t?.classList?.contains('taxio-booking-ac-input')) return
    if (!inputs.includes(t)) return
    const prev = taxioBookingPacActiveInput
    if (prev && prev !== t) {
      flushInactiveBookingFieldPac(prev)
      resetBookingPacContainers()
    }
  }
  root.addEventListener('pointerdown', bookingPacPointerDownHandler, true)

  bookingPacFocusInHandler = (e) => {
    const t = e.target
    if (!t?.classList?.contains('taxio-booking-ac-input')) return
    if (!inputs.includes(t)) return
    const prev = taxioBookingPacActiveInput
    if (prev && prev !== t) {
      flushInactiveBookingFieldPac(prev)
      resetBookingPacContainers()
    }
    taxioBookingPacActiveInput = t
    schedulePacAnchorSync(t)
  }
  root.addEventListener('focusin', bookingPacFocusInHandler, true)

  bookingPacObserver = new MutationObserver(() => {
    dedupePacAttributionFooters()
    const pac = pickVisibleBookingPacForSync()
    if (!pac) return
    const inp =
      taxioBookingPacActiveInput ||
      inputs.find((el) => root.contains(el) && el === document.activeElement)
    if (inp && root.contains(inp)) {
      syncPacContainerToInput(inp)
    }
  })
  bookingPacObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class'],
  })

  bookingPacLayoutSync = () => {
    const inp =
      taxioBookingPacActiveInput ||
      inputs.find((el) => root.contains(el) && el === document.activeElement)
    if (inp && root.contains(inp)) {
      dedupePacAttributionFooters()
      syncPacContainerToInput(inp)
    }
  }
  window.__taxioBookingPacResize = bookingPacLayoutSync
  window.addEventListener('resize', bookingPacLayoutSync)
  window.addEventListener('scroll', bookingPacLayoutSync, true)

  bookingPacOutsideClose = (e) => {
    const t = e.target
    if (typeof t?.closest === 'function' && t.closest('.pac-container')) return
    for (const inp of inputs) {
      if (t === inp || (typeof inp.contains === 'function' && inp.contains(t))) return
    }
    hideBookingPacIfNoAcFocused()
  }
  document.addEventListener('mousedown', bookingPacOutsideClose, true)
  document.addEventListener('touchstart', bookingPacOutsideClose, { capture: true, passive: true })
}

function loadGoogleMapsPlaces() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no_window'))
  if (window.google?.maps?.places) return Promise.resolve()
  if (googleMapsPlacesPromise) return googleMapsPlacesPromise
  googleMapsPlacesPromise = new Promise((resolve, reject) => {
    const cb = '__taxioGmapsCb'
    window[cb] = () => {
      try {
        delete window[cb]
      } catch {
        window[cb] = undefined
      }
      resolve()
    }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_API_KEY)}&libraries=places&callback=${cb}`
    s.async = true
    s.defer = true
    s.onerror = () => {
      googleMapsPlacesPromise = null
      try {
        delete window[cb]
      } catch {
        window[cb] = undefined
      }
      reject(new Error('maps_script_failed'))
    }
    document.head.appendChild(s)
  })
  return googleMapsPlacesPromise
}

/**
 * @param {HTMLInputElement} input
 * @param {{ committed: string | null, __applyingCommit?: boolean }} state
 *        `committed` = last Maps-selected formatted address; null = no confirmed pick yet or user edited away.
 */
function bindPlacesAutocomplete(input, state) {
  if (!input || !GOOGLE_API_KEY) return
  if (!state || typeof state !== 'object') state = { committed: null }
  if (state.committed === undefined) state.committed = null

  loadGoogleMapsPlaces()
    .then(() => {
      if (!window.google?.maps?.places?.Autocomplete) return
      ensureBookingPacStyles()
      input.classList.add('taxio-booking-ac-input')
      const ac = new google.maps.places.Autocomplete(input, {
        fields: ['formatted_address'],
        types: ['address'],
      })
      taxioPlacesAcRegistry.set(input, ac)
      const tagPac = () => {
        requestAnimationFrame(() => {
          document.querySelectorAll('.pac-container').forEach((el) => {
            el.classList.add('taxio-booking-pac')
          })
          dedupePacAttributionFooters()
          const anchor =
            document.activeElement === input ? input : taxioBookingPacActiveInput || input
          syncPacContainerToInput(anchor)
        })
      }
      const onFocus = () => {
        if (isBookingAddressConfirmedIdle(input, state)) {
          pulseHideBookingPacContainers()
          return
        }
        resetBookingPacContainers()
        tagPac()
      }
      const onInput = () => {
        if (state.__applyingCommit) return
        const v = String(input.value || '').trim()
        const c = state.committed
        if (typeof c === 'string' && c.length > 0 && v !== c) {
          state.committed = null
        }
        resetBookingPacContainers()
        tagPac()
      }
      const onKeydown = () => {
        if (isBookingAddressConfirmedIdle(input, state)) {
          pulseHideBookingPacContainers()
          return
        }
        tagPac()
      }
      input.addEventListener('focus', onFocus)
      input.addEventListener('input', onInput)
      input.addEventListener('keydown', onKeydown)
      input.addEventListener('blur', () => {
        window.setTimeout(() => {
          if (!document.querySelector('.taxio-booking-ac-input:focus')) {
            taxioBookingPacActiveInput = null
          }
          hideBookingPacIfNoAcFocused()
        }, 200)
      })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        const addr = String(place?.formatted_address || '').trim()
        if (addr) {
          state.__applyingCommit = true
          try {
            input.value = addr
            state.committed = addr
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
          } finally {
            state.__applyingCommit = false
          }
        }
        dedupePacAttributionFooters()
        pulseHideBookingPacContainers()
      })
    })
    .catch(() => {
      /* key missing or APIs disabled — fields stay plain text */
    })
}

function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '')
}

function waLink(phone, body) {
  const n = digitsOnly(phone)
  if (!n) return null
  return `https://wa.me/${n}?text=${encodeURIComponent(body)}`
}

export async function mountBookCompany(root, slug) {
  root.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center bg-[#f3f4f6] px-4 py-8">
      <div class="h-10 w-10 animate-pulse rounded-full border-2 border-gray-300 border-t-yellow-500"></div>
      <p class="mt-3 text-sm text-gray-500">Loading…</p>
    </div>`

  let company
  try {
    company = await fetchApprovedCompanyBySlug(slug)
  } catch {
    company = null
  }

  if (!company) {
    root.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center bg-[#f3f4f6] px-4 py-12">
        <p class="text-lg font-bold text-gray-900">Company not found</p>
        <p class="mt-2 text-center text-sm text-gray-600">This booking link is invalid or the company is not approved.</p>
        <a href="/" class="mt-6 text-sm font-semibold text-yellow-600 hover:underline">TAXIO home</a>
      </div>`
    return
  }

  const fleetRows = await fetchFleetCarTypesForBooking(company.id)
  const carTypes = resolveBookingCarTypes(fleetRows, company.pricing)
  const effectivePricing = effectivePricingForTypes(carTypes, company.pricing)
  const showCarSelector = carTypes.length > 1

  const slogan = (company.slogan || DEFAULT_SLOGAN).trim()
  const vat = company.vat_number ? `BTW: ${company.vat_number}` : ''
  const phone = company.phone || ''
  const avail = company.availability_status === 'busy' ? 'Busy' : company.availability_status === 'offline' ? 'Offline' : 'Available'
  const availDot = company.availability_status === 'available' ? 'bg-green-500' : 'bg-amber-500'

  const carCardsHtml = showCarSelector
    ? carTypes
        .map((t, idx) => {
          const selectedCls =
            idx === 0
              ? 'border-yellow-400 bg-yellow-400 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300'
          const iconHtml =
            String(t).toLowerCase().includes('van')
              ? icon.users('h-6 w-6 text-amber-600')
              : String(t).toLowerCase().includes('lux')
                ? icon.star('h-6 w-6 text-amber-600')
                : icon.car('h-6 w-6 text-gray-900')
          const seats = String(t).toLowerCase().includes('van')
            ? '1-7'
            : String(t).toLowerCase().includes('lux')
              ? '1-3'
              : '1-4'
          return `<button type="button" data-car="${escapeHtml(t)}" class="book-car flex flex-col items-center rounded-xl border-2 ${selectedCls} p-3 text-center transition-all">
              ${iconHtml}
              <span class="mt-1 text-xs font-bold text-gray-900">${escapeHtml(t)}</span>
              <span class="text-[10px] text-gray-700">${seats}</span>
            </button>`
        })
        .join('')
    : ''

  root.innerHTML = `
    <div class="min-h-screen bg-[#f0f2f5] px-4 py-8 pb-16">
      <div class="mx-auto max-w-md space-y-5">
        <div class="relative overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-5 shadow-md ring-1 ring-black/[0.04]">
          <div class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400"></div>
          <button type="button" id="book-qr-hint" class="absolute right-4 top-5 rounded-lg p-2 text-amber-600 transition-colors hover:bg-amber-50" title="QR code" aria-label="QR code">
            ${icon.sparkles('h-5 w-5')}
          </button>
          <div class="flex gap-4 pr-10 pt-0.5">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-400 shadow-md ring-2 ring-white/80">
              ${icon.car('h-8 w-8 text-gray-900')}
            </div>
            <div class="min-w-0 flex-1">
              <h1 class="text-xl font-bold leading-tight tracking-tight text-gray-900">${escapeHtml(company.name)}</h1>
              <p class="mt-1 text-sm font-medium italic leading-snug text-amber-700">${escapeHtml(slogan)}</p>
              ${vat ? `<p class="mt-2 text-xs leading-relaxed text-gray-600">${escapeHtml(vat)}</p>` : ''}
              ${phone ? `<p class="text-xs leading-relaxed text-gray-600">${escapeHtml(phone)}</p>` : ''}
            </div>
          </div>
          <div class="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
            <span class="h-2 w-2 shrink-0 rounded-full ${availDot} ring-2 ring-white shadow-sm"></span>
            <span class="text-sm font-semibold text-gray-800">${avail}</span>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-md">
          <div class="space-y-4">
            <div class="taxio-ac-field">
              <label class="text-sm font-bold text-gray-900">Pick-up Location</label>
              <div class="relative z-10 mt-2">
                <span class="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-green-600">${icon.mapPin('h-4 w-4')}</span>
                <input id="bk-pickup" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Enter pick-up address" class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25" />
              </div>
            </div>
            <div class="taxio-ac-field">
              <label class="text-sm font-bold text-gray-900">Drop-off Location</label>
              <div class="relative z-10 mt-2">
                <span class="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-red-500">${icon.mapPin('h-4 w-4')}</span>
                <input id="bk-dropoff" type="text" placeholder="Enter drop-off address" class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25" />
              </div>
            </div>

            ${showCarSelector ? `<div>
              <p class="text-sm font-bold text-gray-900">Select Car Type</p>
              <div class="mt-2 grid grid-cols-3 gap-2">
                ${carCardsHtml}
              </div>
            </div>` : ''}

            <div>
              <p class="text-sm font-bold text-gray-900">When do you need the ride?</p>
              <div class="mt-2 grid grid-cols-2 gap-2">
                <button type="button" id="bk-ride-now" class="rounded-lg border-2 border-yellow-400 bg-yellow-400 px-3 py-2 text-sm font-semibold text-gray-900">Ride Now</button>
                <button type="button" id="bk-ride-schedule" class="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">Schedule</button>
              </div>
              <div id="bk-schedule-wrap" class="mt-3 hidden">
                <input id="bk-schedule-at" type="datetime-local" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500" />
              </div>
            </div>

            <div id="bk-estimate" class="hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
              <p class="text-sm font-bold text-gray-900">Trip Estimate</p>
              <div id="bk-estimate-loading" class="mt-2 text-xs text-gray-500">Calculating...</div>
              <div id="bk-estimate-body" class="mt-2 hidden text-sm text-gray-700">
                <p>Distance: <span id="bk-est-dist" class="font-semibold"></span></p>
                <p>Duration: <span id="bk-est-dur" class="font-semibold"></span></p>
                <p>Estimated price: <span id="bk-est-price" class="font-semibold text-gray-900"></span></p>
              </div>
            </div>

            <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
              <label class="flex cursor-pointer items-start gap-2">
                <input type="checkbox" id="bk-terms" class="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500" />
                <span class="text-sm text-gray-700">I agree to the <a href="/terms" class="font-semibold text-blue-600 hover:underline">Terms of Use</a>, <a href="/company-terms" class="font-semibold text-blue-600 hover:underline">Company Terms</a>, and <a href="/privacy" class="font-semibold text-blue-600 hover:underline">Privacy Policy</a></span>
              </label>
              <p class="mt-2 text-xs leading-relaxed text-gray-600">By submitting this request, you acknowledge that TAXIO acts only as a platform connecting you with independent taxi companies. The transport service is provided solely by the selected taxi company, which is fully responsible for the ride.</p>
              <p class="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500">
                <a href="/terms/riders" class="hover:text-gray-700 hover:underline">Booking terms</a>
                <span aria-hidden="true">·</span>
                <a href="/legal-notice" class="hover:text-gray-700 hover:underline">Legal notice</a>
                <span aria-hidden="true">·</span>
                <a href="/contact" class="hover:text-gray-700 hover:underline">Contact</a>
              </p>
            </div>

            <p id="bk-err" class="hidden text-sm text-red-600"></p>

            <button type="button" id="bk-wa" disabled class="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-300 py-3.5 text-sm font-bold text-gray-500 shadow-sm disabled:cursor-not-allowed enabled:bg-green-600 enabled:text-white enabled:hover:bg-green-700">
              ${icon.messageCircle('h-5 w-5')}
              Book with WhatsApp
            </button>

            <div class="grid grid-cols-2 gap-3">
              <a id="bk-mail" href="#" class="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                ${icon.mail('h-4 w-4')}
                Email
              </a>
              <a id="bk-call" href="#" class="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                ${icon.phone('h-4 w-4')}
                Call
              </a>
            </div>
          </div>
        </div>

        <footer class="pt-4 text-center text-xs text-gray-500">
          <p>© 2026 TAXIO. All rights reserved.</p>
          <p class="mt-1 font-medium text-amber-600">Powered by TAXIO</p>
        </footer>
      </div>
    </div>`

  let selectedCar = carTypes[0]
  let rideMode = 'now'
  let estimateTimer = null
  const pickupEl = root.querySelector('#bk-pickup')
  const dropEl = root.querySelector('#bk-dropoff')
  const termsEl = root.querySelector('#bk-terms')
  const waBtn = root.querySelector('#bk-wa')
  const errEl = root.querySelector('#bk-err')
  const estWrap = root.querySelector('#bk-estimate')
  const estLoading = root.querySelector('#bk-estimate-loading')
  const estBody = root.querySelector('#bk-estimate-body')
  const estDist = root.querySelector('#bk-est-dist')
  const estDur = root.querySelector('#bk-est-dur')
  const estPrice = root.querySelector('#bk-est-price')
  const rideNowBtn = root.querySelector('#bk-ride-now')
  const rideScheduleBtn = root.querySelector('#bk-ride-schedule')
  const scheduleWrap = root.querySelector('#bk-schedule-wrap')
  const scheduleInput = root.querySelector('#bk-schedule-at')
  let latestEstimate = null

  const mailA = root.querySelector('#bk-mail')
  const callA = root.querySelector('#bk-call')
  if (company.email) {
    mailA.href = `mailto:${encodeURIComponent(company.email)}?subject=${encodeURIComponent('Taxi booking request')}`
  } else {
    mailA.classList.add('pointer-events-none', 'opacity-40')
  }
  if (phone) {
    callA.href = `tel:${digitsOnly(phone)}`
  } else {
    callA.classList.add('pointer-events-none', 'opacity-40')
  }

  function syncCarUi() {
    if (!showCarSelector) return
    root.querySelectorAll('.book-car').forEach((btn) => {
      const t = btn.getAttribute('data-car')
      const on = t === selectedCar
      btn.className =
        'book-car flex flex-col items-center rounded-xl border-2 p-3 text-center transition-all ' +
        (on
          ? 'border-yellow-400 bg-yellow-400 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300')
    })
  }

  function buildMessage() {
    const pu = pickupEl.value.trim()
    const doff = dropEl.value.trim()
    return `Hello ${company.name}, I would like to book a ride.

Pick-up: ${pu}
Drop-off: ${doff}
Car type: ${selectedCar}`
  }

  function refreshWaState() {
    const ok =
      termsEl.checked &&
      pickupEl.value.trim() &&
      dropEl.value.trim() &&
      digitsOnly(phone).length > 0
    waBtn.disabled = !ok
    errEl.classList.add('hidden')
  }

  function syncRideTimingUi() {
    const isNow = rideMode === 'now'
    if (rideNowBtn) {
      rideNowBtn.className =
        'rounded-lg border-2 px-3 py-2 text-sm font-semibold ' +
        (isNow
          ? 'border-yellow-400 bg-yellow-400 text-gray-900'
          : 'border-gray-200 bg-white text-gray-700')
    }
    if (rideScheduleBtn) {
      rideScheduleBtn.className =
        'rounded-lg border-2 px-3 py-2 text-sm font-semibold ' +
        (!isNow
          ? 'border-yellow-400 bg-yellow-400 text-gray-900'
          : 'border-gray-200 bg-white text-gray-700')
    }
    if (scheduleWrap) scheduleWrap.classList.toggle('hidden', isNow)
  }

  async function refreshEstimate() {
    const pickup = pickupEl.value.trim()
    const dropoff = dropEl.value.trim()
    if (!pickup || !dropoff) {
      latestEstimate = null
      estWrap?.classList.add('hidden')
      return
    }
    estWrap?.classList.remove('hidden')
    estLoading?.classList.remove('hidden')
    estBody?.classList.add('hidden')

    const trip = await estimateTrip({
      pickupAddress: pickup,
      dropoffAddress: dropoff,
      pricing: effectivePricing,
      carType: selectedCar || 'Standard',
      apiKey: GOOGLE_API_KEY,
    })

    latestEstimate = trip
    if (estDist) estDist.textContent = `${trip.distanceKm} km`
    if (estDur) estDur.textContent = `${trip.durationMin} min`
    if (estPrice) estPrice.textContent = `€${trip.estimatedPrice}`
    estLoading?.classList.add('hidden')
    estBody?.classList.remove('hidden')
  }

  function queueEstimate() {
    if (estimateTimer) window.clearTimeout(estimateTimer)
    estimateTimer = window.setTimeout(() => {
      refreshEstimate().catch(() => {
        estWrap?.classList.add('hidden')
      })
    }, 350)
  }

  root.querySelectorAll('.book-car').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCar = btn.getAttribute('data-car')
      syncCarUi()
      queueEstimate()
    })
  })
  syncCarUi()
  syncRideTimingUi()

  rideNowBtn?.addEventListener('click', () => {
    rideMode = 'now'
    syncRideTimingUi()
  })
  rideScheduleBtn?.addEventListener('click', () => {
    rideMode = 'schedule'
    syncRideTimingUi()
  })

  ;[pickupEl, dropEl, termsEl].forEach((el) => {
    el.addEventListener('input', refreshWaState)
    el.addEventListener('change', refreshWaState)
  })
  pickupEl.addEventListener('input', queueEstimate)
  dropEl.addEventListener('input', queueEstimate)
  refreshWaState()

  const pickupPlacesState = { committed: null }
  const dropoffPlacesState = { committed: null }
  bindPlacesAutocomplete(pickupEl, pickupPlacesState)
  bindPlacesAutocomplete(dropEl, dropoffPlacesState)
  attachBookingPacObserver(root, [pickupEl, dropEl])

  root.querySelector('#book-qr-hint')?.addEventListener('click', () => {
    window.alert(
      'Share your booking page: ' + window.location.href + '\n(QR generation can be added in a future release.)'
    )
  })

  waBtn.addEventListener('click', async () => {
    errEl.classList.add('hidden')
    if (!termsEl.checked) {
      errEl.textContent =
        'Please agree to the Terms of Use, Company Terms, and Privacy Policy to continue.'
      errEl.classList.remove('hidden')
      return
    }
    const pu = pickupEl.value.trim()
    const doff = dropEl.value.trim()
    if (!pu || !doff) {
      errEl.textContent = 'Please enter pick-up and drop-off.'
      errEl.classList.remove('hidden')
      return
    }
    const n = digitsOnly(phone)
    if (!n) {
      errEl.textContent = 'This company has no phone number for WhatsApp.'
      errEl.classList.remove('hidden')
      return
    }
    let whenLine = 'When: Ride now'
    let rideDateIso = null
    if (rideMode === 'schedule') {
      const raw = scheduleInput?.value || ''
      if (!raw) {
        errEl.textContent = 'Please select date and time for scheduled ride.'
        errEl.classList.remove('hidden')
        return
      }
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) {
        errEl.textContent = 'Please enter a valid schedule date and time.'
        errEl.classList.remove('hidden')
        return
      }
      rideDateIso = d.toISOString()
      whenLine = `When: Scheduled at ${raw}`
    }
    const estimateLine = latestEstimate
      ? `\nEstimate: ${latestEstimate.distanceKm} km, ${latestEstimate.durationMin} min, €${latestEstimate.estimatedPrice}`
      : ''
    const text = `${buildMessage()}\n${whenLine}${estimateLine}`
    const url = waLink(phone, text)
    await createQuickBookingLog({
      company_id: company.id,
      pickup_address: pu,
      dropoff_address: doff,
      car_type: selectedCar,
      customer_phone: phone,
      ride_datetime: rideDateIso,
      notes: `WhatsApp quick book · ${selectedCar} · ${rideMode}${estimateLine}`,
      termsAcceptance: {
        terms_accepted: true,
        accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION_BOOKING_RIDER,
      },
    })
    window.open(url, '_blank', 'noopener,noreferrer')
  })
}
