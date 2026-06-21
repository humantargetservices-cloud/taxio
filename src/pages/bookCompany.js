import {
  fetchApprovedCompanyBySlug,
  createQuickBookingLog,
} from '../lib/api.js'
import { TERMS_VERSION_BOOKING_RIDER } from '../lib/legalVersions.js'
import { resolveBookingVehicleTypes } from '../lib/bookingCarTypes.js'
import { escapeHtml } from '../lib/html.js'
import { icon } from '../lib/icons.js'
import { estimateTrip } from '../lib/tripEstimate.js'
import { tBooking, tPwa } from '../i18n.js'
import { getLocale, setLocale, syncDocumentLang } from '../lib/locale.js'
import { isPublicDarkMode, setPublicDarkMode, syncPublicThemeClass } from '../lib/publicTheme.js'
import { getDemoBookingCompany, isDemoBookingSlug } from '../lib/demoBookingCompany.js'
import { absolutePublicBookingUrl } from '../lib/tenant.js'
import {
  companyHourlyFromRecord,
  formatHourlyPricingNote,
  HOURLY_DROPOFF_PLACEHOLDER,
  hourlyServiceLabelForLocale,
} from '../lib/companyHourly.js'
import { initPwaInstallPrompt } from '../lib/pwaInstallPrompt.js'
import { applyCompanyPwaIdentity, buildPwaPromptStrings, pickCompanyImageUrl, prefetchCompanyManifest, resolvePwaIconUrl } from '../lib/companyPwa.js'
import { parseBookingAnalyticsSource, trackCompanyAnalyticsEvent } from '../lib/companyAnalytics.js'
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const TURNSTILE_SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()
const TURNSTILE_FRONT_ENABLED =
  String(import.meta.env.VITE_TURNSTILE_ENABLED || '')
    .trim()
    .toLowerCase() === 'true'
const BOOK_MIN_SUBMIT_MS = 1000

function bookingCarTypeSeatsLabel(t) {
  const s = String(t).toLowerCase()
  if (s.includes('van')) return '1–7'
  if (s.includes('lux')) return '1–3'
  return '1–4'
}

function bookingCarTypeLabel(type, tb) {
  const s = String(type || '').toLowerCase()
  if (s.includes('van')) return tb.carTypeVan || 'Van'
  if (s.includes('lux')) return tb.carTypeLuxury || 'Luxury'
  return tb.carTypeStandard || 'Standard'
}

function fillWaTemplate(template, vars) {
  let s = String(template || '')
  for (const [key, val] of Object.entries(vars)) {
    s = s.split(`{${key}}`).join(String(val ?? ''))
  }
  return s
}

/** Icon for booking vehicle type row (HTML string). */
function bookingCarTypeIconHtml(t, sizeClass) {
  const s = String(t).toLowerCase()
  const c = `${sizeClass} shrink-0`
  if (s.includes('van')) return icon.users(`${c} text-amber-600 dark:text-amber-400`)
  if (s.includes('lux')) return icon.star(`${c} text-amber-600 dark:text-amber-400`)
  return icon.car(`${c} text-slate-600 dark:text-slate-200`)
}

let googleMapsPlacesPromise = null
/** Detach address controllers + doc listeners from the previous booking mount. */
let taxioBookCompanyAddressCleanup = null

function ensureBookingFieldSuggestStyles() {
  let style = document.getElementById('taxio-booking-field-suggest-styles')
  if (style) return
  style = document.createElement('style')
  style.id = 'taxio-booking-field-suggest-styles'
  style.textContent = `
    .taxio-booking-suggest-row:first-child { border-top-left-radius: 0.625rem; border-top-right-radius: 0.625rem; }
    .taxio-booking-suggest-row:last-of-type { border-bottom-left-radius: 0.625rem; border-bottom-right-radius: 0.625rem; }
  `
  document.head.appendChild(style)
}

function isBookingAddressConfirmedIdle(input, state) {
  const v = String(input.value || '').trim()
  const c = state.committed
  return typeof c === 'string' && c.length > 0 && v === c
}

/**
 * Commit a resolved address (Places details or Geocoder) so value, coords, and `committed`
 * stay in sync — required for trip estimate and “confirmed pick” rules.
 */
function commitBookingFieldPlace({ inputEl, state, formattedAddress, lat, lng, placeId, onUpdate }) {
  const addr = String(formattedAddress || '').trim()
  if (!addr || !inputEl || !state) return false
  state.__applyingCommit = true
  try {
    inputEl.value = addr
    state.committed = addr
    state.placeId = placeId != null && String(placeId).length ? String(placeId) : null
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      state.lat = lat
      state.lng = lng
    } else {
      state.lat = null
      state.lng = null
    }
    inputEl.dispatchEvent(new Event('input', { bubbles: true }))
    inputEl.dispatchEvent(new Event('change', { bubbles: true }))
  } finally {
    state.__applyingCommit = false
  }
  onUpdate?.()
  return true
}

/**
 * One booking address field: own DOM suggestion panel + AutocompleteService + PlacesService.getDetails.
 * No shared Google `.pac-container` (root cause of pickup/drop-off cross-talk).
 */
function attachBookingAddressController({ inputEl, panelEl, state, onUpdate, poweredByHtml }) {
  if (!inputEl || !panelEl || !GOOGLE_API_KEY) {
    return { detach: () => {} }
  }
  if (state.committed === undefined) state.committed = null
  if (state.lat === undefined) state.lat = null
  if (state.lng === undefined) state.lng = null
  if (state.placeId === undefined) state.placeId = null

  inputEl.classList.add('taxio-booking-ac-input')
  ensureBookingFieldSuggestStyles()

  let acService = null
  let placesService = null
  let predTimer = null
  let docPointerDown = null

  function ensureServices() {
    if (!window.google?.maps?.places) return
    if (!acService) acService = new google.maps.places.AutocompleteService()
    if (!placesService) placesService = new google.maps.places.PlacesService(document.createElement('div'))
  }

  function hidePanel() {
    panelEl.classList.add('hidden')
    panelEl.innerHTML = ''
  }

  function showPredictions(predictions) {
    if (!predictions?.length) {
      hidePanel()
      return
    }
    const rows = predictions.slice(0, 8).map((p) => {
      const main = escapeHtml(p.structured_formatting?.main_text || p.description || '')
      const secondary = escapeHtml(p.structured_formatting?.secondary_text || '')
      const pid = escapeHtml(p.place_id || '')
      return `<button type="button" class="taxio-booking-suggest-row w-full border-0 border-t border-slate-100 bg-white px-3.5 py-2.5 text-left transition-colors first:border-t-0 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:border-slate-700/90 dark:bg-slate-900 dark:hover:bg-slate-800/90 dark:focus:bg-slate-800/90" data-place-id="${pid}">
        <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">${main}</span>
        ${secondary ? `<span class="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">${secondary}</span>` : ''}
      </button>`
    })
    const attrib =
      poweredByHtml && predictions.length
        ? `<div class="taxio-booking-suggest-attrib border-t border-slate-200 bg-slate-50 px-3 py-2 text-center text-[10px] font-medium leading-tight text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-500">${poweredByHtml}</div>`
        : ''
    panelEl.innerHTML = rows.join('') + attrib
    panelEl.classList.remove('hidden')
  }

  function fetchPredictions() {
    ensureServices()
    if (!acService) return
    const q = String(inputEl.value || '').trim()
    if (q.length < 2) {
      hidePanel()
      return
    }
    if (isBookingAddressConfirmedIdle(inputEl, state)) {
      hidePanel()
      return
    }
    acService.getPlacePredictions({ input: q }, (predictions, status) => {
      if (
        status !== google.maps.places.PlacesServiceStatus.OK ||
        !predictions ||
        predictions.length === 0
      ) {
        hidePanel()
        return
      }
      showPredictions(predictions)
    })
  }

  function applyPlaceDetails(place) {
    const addr = String(place?.formatted_address || '').trim()
    const loc = place?.geometry?.location
    let lat = null
    let lng = null
    if (loc) {
      lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat)
      lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng)
    }
    if (!addr) return
    commitBookingFieldPlace({
      inputEl,
      state,
      formattedAddress: addr,
      lat,
      lng,
      placeId: place?.place_id,
      onUpdate,
    })
    hidePanel()
  }

  function selectPlaceId(placeId) {
    ensureServices()
    if (!placesService || !placeId) return
    placesService.getDetails(
      {
        placeId,
        fields: ['formatted_address', 'geometry', 'place_id'],
      },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return
        applyPlaceDetails(place)
      }
    )
  }

  function onInputOrEdit() {
    if (state.__applyingCommit) return
    const v = String(inputEl.value || '').trim()
    const c = state.committed
    if (typeof c === 'string' && c.length > 0 && v !== c) {
      state.committed = null
      state.lat = null
      state.lng = null
      state.placeId = null
    }
    onUpdate()
    if (predTimer) window.clearTimeout(predTimer)
    predTimer = window.setTimeout(fetchPredictions, 200)
  }

  function onFocusIn() {
    if (!isBookingAddressConfirmedIdle(inputEl, state)) fetchPredictions()
  }

  function onKeydown(e) {
    if (e.key === 'Escape') hidePanel()
  }

  function onBlur() {
    window.setTimeout(() => hidePanel(), 200)
  }

  function onPanelPointerDown(e) {
    const btn = e.target.closest?.('[data-place-id]')
    if (!btn) return
    const pid = btn.getAttribute('data-place-id')
    if (pid) {
      e.preventDefault()
      selectPlaceId(pid)
    }
  }

  inputEl.addEventListener('input', onInputOrEdit)
  inputEl.addEventListener('focus', onFocusIn)
  inputEl.addEventListener('keydown', onKeydown)
  inputEl.addEventListener('blur', onBlur)
  panelEl.addEventListener('pointerdown', onPanelPointerDown)

  docPointerDown = (e) => {
    const t = e.target
    if (panelEl.contains(t) || inputEl.contains(t)) return
    hidePanel()
  }
  document.addEventListener('pointerdown', docPointerDown, true)

  loadGoogleMapsPlaces().catch(() => {
    /* key missing */
  })

  return {
    detach() {
      if (predTimer) window.clearTimeout(predTimer)
      if (docPointerDown) document.removeEventListener('pointerdown', docPointerDown, true)
      inputEl.removeEventListener('input', onInputOrEdit)
      inputEl.removeEventListener('focus', onFocusIn)
      inputEl.removeEventListener('keydown', onKeydown)
      inputEl.removeEventListener('blur', onBlur)
      panelEl.removeEventListener('pointerdown', onPanelPointerDown)
      hidePanel()
      inputEl.classList.remove('taxio-booking-ac-input')
    },
  }
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

/** `'granted' | 'denied' | 'prompt'` or `null` if unsupported / error (caller uses normal geolocation flow). */
async function getBookingGeolocationPermissionState() {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return null
    const status = await navigator.permissions.query({ name: 'geolocation' })
    const s = status?.state
    if (s === 'granted' || s === 'denied' || s === 'prompt') return s
    return null
  } catch {
    return null
  }
}

function reverseGeocodeLatLng(lat, lng) {
  return new Promise((resolve, reject) => {
    const g = window.google?.maps
    if (!g?.Geocoder) {
      reject(new Error('no_geocoder'))
      return
    }
    const geocoder = new g.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === g.GeocoderStatus.OK && results?.[0]) {
        resolve(results[0])
      } else {
        reject(new Error('geocode_failed'))
      }
    })
  })
}

function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '')
}

function normalizeContactPhone(phone) {
  const clean = String(phone || '').trim()
  if (!clean) return ''
  const withoutJunk = clean.replace(/[\s().-]/g, '')
  if (withoutJunk.startsWith('+')) {
    return `+${withoutJunk.slice(1).replace(/\D/g, '')}`
  }
  if (withoutJunk.startsWith('00')) {
    return `+${withoutJunk.slice(2).replace(/\D/g, '')}`
  }
  const digits = withoutJunk.replace(/\D/g, '')
  if (digits.startsWith('0')) return `+32${digits.slice(1)}`
  return `+${digits}`
}

/** Digits-only international number for https://wa.me/<digits> (no +). */
function whatsappDigitsForWaMe(rawPhone) {
  const normalized = normalizeContactPhone(rawPhone)
  const d = digitsOnly(normalized)
  if (!d || d.startsWith('0')) return null
  if (d.length < 8 || d.length > 15) return null
  return d
}

function waMeBookingUrl(digits, message) {
  if (!digits || !/^\d{8,15}$/.test(digits)) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

/** Open `https://wa.me/...` in a new tab when allowed; otherwise same-tab (no about:blank). */
function openWaMeUrl(url) {
  if (!url) return
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  if (win) return
  window.location.assign(url)
}

/** Standard WhatsApp brand icon for the booking CTA. */
function whatsappBookingIcon(className = 'h-5 w-5') {
  return `<svg class="${className} shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>`
}

const BK_WA_DISABLED_CLASSES = [
  'pointer-events-none',
  'bg-slate-200',
  'text-slate-500',
  'ring-slate-300',
  'dark:bg-slate-800',
  'dark:text-slate-400',
  'dark:ring-slate-700',
]
const BK_WA_ENABLED_CLASSES = [
  'bg-[#25D366]',
  'text-white',
  'ring-[#1fb855]/50',
  'hover:bg-[#1ebe5d]',
  'shadow-[0_12px_40px_rgba(37,211,102,0.25)]',
]

/** Optional company logo (if column / field exists). Safe fallback when missing or broken. */
function bookingCompanyPhotoHtml(company) {
  const src = pickCompanyImageUrl(company) || ''
  if (!src) {
    return `<div class="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 shadow-[0_12px_40px_rgba(251,191,36,0.25)] ring-2 ring-amber-400/35 sm:h-32 sm:w-32">${icon.image('h-14 w-14 text-slate-900/80 sm:h-16 sm:w-16')}</div>`
  }
  return `<div class="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-2 ring-amber-400/25 ring-offset-2 ring-offset-slate-100 dark:ring-offset-[#0c0e12] sm:h-32 sm:w-32">
    <img src="${escapeHtml(src)}" alt="" class="bk-company-photo-img h-full w-full object-cover" loading="lazy" decoding="async" />
    <div class="bk-company-photo-fallback absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500">${icon.image('h-14 w-14 text-slate-900/80 sm:h-16 sm:w-16')}</div>
  </div>`
}

export async function mountBookCompany(root, slug) {
  if (taxioBookCompanyAddressCleanup) {
    taxioBookCompanyAddressCleanup()
    taxioBookCompanyAddressCleanup = null
  }
  syncDocumentLang(getLocale())
  syncPublicThemeClass()
  const tbLoad = tBooking(getLocale())
  root.innerHTML = `
    <div class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-8 dark:from-[#0c0e12] dark:via-[#12151c] dark:to-[#0a0b0f]">
      <div class="h-11 w-11 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500 dark:border-slate-700 dark:border-t-amber-400"></div>
      <p class="mt-4 text-sm font-medium tracking-tight text-slate-500 dark:text-slate-400">${escapeHtml(tbLoad.loading)}</p>
    </div>`

  const isDemo = isDemoBookingSlug(slug)
  const formStartedAt = Date.now()

  let company
  try {
    company = isDemo ? getDemoBookingCompany() : await fetchApprovedCompanyBySlug(slug)
  } catch {
    company = null
  }

  if (!company) {
    const tb = tBooking(getLocale())
    root.innerHTML = `
      <div class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-12 dark:from-[#0c0e12] dark:via-[#12151c] dark:to-[#0a0b0f]">
        <p class="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">${escapeHtml(tb.notFoundTitle)}</p>
        <p class="mt-3 max-w-sm text-center text-sm leading-relaxed text-slate-600 dark:text-slate-400">${escapeHtml(tb.notFoundBody)}</p>
        <a href="/" class="mt-10 inline-flex items-center rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-slate-900 shadow-[0_8px_30px_rgba(251,191,36,0.25)] transition hover:bg-amber-300">${escapeHtml(tb.homeCta)}</a>
      </div>`
    return
  }

  if (!isDemo) {
    const visitSource = parseBookingAnalyticsSource(window.location.search)
    trackCompanyAnalyticsEvent({
      companyId: company.id,
      slug,
      eventType: 'page_visit',
      source: visitSource,
      path: window.location.pathname,
    })
  }

  const pwaIdentity = applyCompanyPwaIdentity({ context: 'booking', company, slug })
  await prefetchCompanyManifest(pwaIdentity.manifestHref, pwaIdentity.companyName || slug)

  initPwaInstallPrompt({
    context: 'booking',
    slug,
    variant: 'booking',
    iconUrl: resolvePwaIconUrl(company),
    strings: buildPwaPromptStrings(tPwa(getLocale()), 'booking', company.name),
    requireManifestReady: true,
  })

  const bookingVehicles = resolveBookingVehicleTypes(company)
  const carTypes = bookingVehicles.map((v) => v.type)
  const effectivePricing = Object.fromEntries(bookingVehicles.map((v) => [v.type, v.pricing]))
  if (import.meta.env.DEV && typeof console !== 'undefined') {
    console.log('[taxio-booking] vehicle types resolved:', carTypes.join(', ') || 'Standard')
  }
  const showCarTypeChooser = carTypes.length > 1
  const tb = tBooking(getLocale())
  const hourlyCfg = companyHourlyFromRecord(company)
  const hourlyOffered = hourlyCfg.enabled && !isDemo
  const hourlyPricingNoteText = formatHourlyPricingNote(
    tBooking(getLocale()).hourlyPricingNote,
    hourlyCfg.rateEur,
    hourlyCfg.minHours
  )
  const byHourLabel = tBooking(getLocale()).byHour

  const defaultSelectedCar = carTypes.includes('Standard') ? 'Standard' : carTypes[0]

  const bkCarOptBase =
    'bk-car-opt flex w-full items-center gap-3 border-0 border-t border-slate-100 px-4 py-3.5 text-left transition first:border-t-0 dark:border-slate-700/80 '
  const bkCarOptOn = 'bg-amber-50 ring-1 ring-inset ring-amber-400/25 dark:bg-amber-400/15 dark:ring-amber-400/20'
  const bkCarOptOff =
    'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80'

  const pickupLocateBtnHtml = GOOGLE_API_KEY
    ? `<button type="button" id="bk-locate-pickup" class="absolute right-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-emerald-600 transition hover:bg-emerald-50 active:bg-emerald-100/90 dark:text-emerald-400 dark:hover:bg-emerald-400/10 dark:active:bg-emerald-400/15" title="${escapeHtml(tb.locateMeTitle)}" aria-label="${escapeHtml(tb.locateMeAria)}">${icon.crosshair('h-[19px] w-[19px]')}</button>`
    : ''

  const bkCarOptsHtml = !showCarTypeChooser
    ? ''
    : carTypes
        .map((t) => {
          const seats = bookingCarTypeSeatsLabel(t)
          const iconH = bookingCarTypeIconHtml(t, 'h-6 w-6')
          const on = t === defaultSelectedCar
          return `<button type="button" role="option" data-car="${escapeHtml(t)}" aria-selected="${on ? 'true' : 'false'}" class="${bkCarOptBase}${on ? bkCarOptOn : bkCarOptOff}"><span class="flex shrink-0">${iconH}</span><span class="min-w-0 flex-1"><span class="block text-sm font-bold text-slate-900 dark:text-slate-100">${escapeHtml(bookingCarTypeLabel(t, tb))}</span><span class="mt-0.5 block text-xs font-medium text-slate-500 dark:text-slate-400">${escapeHtml(seats)}</span></span></button>`
        })
        .join('')

  const serviceSectionHtml = hourlyOffered
    ? `<div id="bk-service-wrap" class="rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-4 ring-1 ring-slate-900/[0.03] dark:border-slate-700/60 dark:bg-slate-800/30 dark:ring-white/[0.04] sm:px-5">
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">${escapeHtml(tb.serviceType)}</p>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <button type="button" id="bk-service-standard" class="min-h-12 rounded-2xl border-2 border-amber-400/80 bg-amber-400/15 px-3 py-3 text-sm font-bold text-amber-900 shadow-sm ring-1 ring-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/25">${escapeHtml(tb.standardRide)}</button>
            <button type="button" id="bk-service-hourly" class="min-h-12 rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-300">${escapeHtml(byHourLabel)}</button>
          </div>
        </div>`
    : ''

  const vehicleSectionHtml = showCarTypeChooser
    ? `<div id="bk-car-wrap" class="relative z-[45]">
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">${escapeHtml(tb.chooseCarType)}</p>
          <button type="button" id="bk-car-trigger" class="mt-2 flex min-h-[3.5rem] w-full items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-amber-300/80 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 dark:border-slate-600 dark:bg-slate-800/90 dark:hover:border-amber-400/40 dark:focus:ring-amber-400/25" aria-expanded="false" aria-haspopup="listbox" aria-controls="bk-car-panel">
            <span id="bk-car-trigger-icon" class="flex shrink-0">${bookingCarTypeIconHtml(defaultSelectedCar, 'h-7 w-7')}</span>
            <span class="min-w-0 flex-1">
              <span id="bk-car-trigger-name" class="block text-sm font-bold text-slate-900 dark:text-slate-100">${escapeHtml(bookingCarTypeLabel(defaultSelectedCar, tb))}</span>
              <span id="bk-car-trigger-seats" class="mt-0.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">${escapeHtml(bookingCarTypeSeatsLabel(defaultSelectedCar))}</span>
            </span>
            <span id="bk-car-chevron" class="shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500">${icon.chevronDown('h-5 w-5')}</span>
          </button>
          <div id="bk-car-panel" class="pointer-events-auto absolute left-0 right-0 top-full z-[80] mt-1.5 hidden max-h-[min(22rem,55vh)] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white py-0.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/[0.06] dark:border-slate-600 dark:bg-slate-900 dark:shadow-black/40 dark:ring-white/10" role="listbox" aria-label="${escapeHtml(tb.carTypesListAria)}">
            ${bkCarOptsHtml}
          </div>
        </div>`
    : ''
  const bookingPageUrl =
    typeof window !== 'undefined' && company?.slug
      ? absolutePublicBookingUrl(company.slug)
      : typeof window !== 'undefined'
        ? window.location.href
        : ''
  const bookingQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=16&data=${encodeURIComponent(bookingPageUrl)}`

  const slogan = (company.slogan || tb.defaultSlogan).trim()
  const vat = company.vat_number ? `${tb.vatPrefix}: ${company.vat_number}` : ''
  const phone = company.phone || ''
  const avail =
    company.availability_status === 'busy'
      ? tb.availBusy
      : company.availability_status === 'offline'
        ? tb.availOffline
        : tb.availAvailable
  const availDot =
    company.availability_status === 'available' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]' : 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]'

  root.innerHTML = `
    <div class="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 pb-24 pt-6 text-slate-900 dark:bg-[#0c0e12] dark:from-[#0c0e12] dark:via-[#12151c] dark:to-[#0a0b0f] dark:text-slate-100 sm:pb-28 sm:pt-8">
      <div class="mx-auto max-w-lg space-y-5 sm:space-y-6">
        <div class="flex flex-wrap items-center justify-end gap-2">
          <button type="button" id="bk-toggle-dark" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/50 dark:bg-slate-900/80 dark:text-amber-200/90 dark:hover:bg-slate-800" title="${escapeHtml(tb.themeToggle)}" aria-label="${escapeHtml(tb.themeToggle)}">
            ${isPublicDarkMode() ? icon.moon('h-4 w-4') : icon.sun('h-4 w-4')}
          </button>
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">${escapeHtml(tb.langLabel)}</span>
          <div class="flex rounded-full border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-600/50 dark:bg-slate-900/80 dark:shadow-inner dark:shadow-black/20">
            ${['nl', 'fr', 'en']
              .map(
                (lc) =>
                  `<button type="button" data-taxio-locale="${lc}" class="rounded-full px-3 py-1 text-xs font-bold transition ${getLocale() === lc ? 'bg-amber-400 text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}">${lc.toUpperCase()}</button>`
              )
              .join('')}
          </div>
        </div>

        <div class="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.04] backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] dark:ring-white/[0.06] sm:p-6">
          <div class="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl"></div>
          <button type="button" id="book-qr-hint" class="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-700 shadow-md ring-1 ring-amber-400/40 transition hover:bg-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300 dark:shadow-lg dark:shadow-black/20 dark:ring-amber-400/30 dark:hover:bg-amber-400/25 dark:hover:text-amber-200" title="${escapeHtml(tb.qrTitle)}" aria-label="${escapeHtml(tb.qrTitle)}">
            ${icon.qrCode('h-5 w-5')}
          </button>
          <div class="relative flex gap-4 pr-14 sm:gap-5 sm:pr-16">
            ${bookingCompanyPhotoHtml(company)}
            <div class="min-w-0 flex-1 pt-0.5">
              <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700/90 dark:text-amber-400/80">${escapeHtml(tb.bookingEyebrow)}</p>
              <h1 class="mt-1.5 text-[1.4rem] font-bold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-2xl">${escapeHtml(company.name)}</h1>
              <p class="mt-2 text-sm font-semibold leading-snug text-amber-700 dark:text-amber-300/95">${escapeHtml(slogan)}</p>
              <div class="mt-3 space-y-1 text-xs">
                ${vat ? `<p class="leading-relaxed text-slate-500 dark:text-slate-400">${escapeHtml(vat)}</p>` : ''}
                ${phone ? `<p class="font-semibold text-slate-700 dark:text-slate-300">${escapeHtml(phone)}</p>` : ''}
              </div>
            </div>
          </div>
          <div class="relative mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/90 pt-4 dark:border-slate-700/50">
            <div class="flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2 ring-1 ring-slate-200/80 dark:bg-slate-800/90 dark:ring-slate-600/40">
              <span class="h-2 w-2 shrink-0 rounded-full ${availDot} ring-2 ring-white dark:ring-slate-900"></span>
              <span class="text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">${escapeHtml(avail)}</span>
            </div>
            <p class="max-w-[11rem] text-right text-[10px] font-medium leading-snug text-slate-500 sm:max-w-none">${escapeHtml(isDemo ? tb.demoDirectHint : tb.directToCompany)}</p>
          </div>
        </div>

        <div class="relative z-0 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.04] backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] dark:ring-white/[0.05] sm:p-6">
          <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600/90 dark:text-amber-400/75">${escapeHtml(tb.tripEyebrow)}</p>
          ${isDemo ? `<div class="mb-1 rounded-xl border border-amber-400/35 bg-amber-50 px-3 py-2.5 text-xs font-medium leading-snug text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-50">${escapeHtml(tb.demoRibbon)}</div>` : ''}
          <div class="mt-5 space-y-6">
            ${serviceSectionHtml}
            <div class="taxio-ac-field relative z-50 focus-within:z-[120]">
              <label class="text-sm font-bold text-slate-800 dark:text-slate-100">${escapeHtml(tb.pickupLabel)}</label>
              <div class="relative mt-2">
                <span class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-emerald-500 dark:text-emerald-400">${icon.mapPin('h-[18px] w-[18px]')}</span>
                <input id="bk-pickup" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="${escapeHtml(tb.pickupPh)}" class="h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm font-medium text-slate-900 shadow-inner shadow-slate-900/5 transition placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-100 dark:shadow-black/20 dark:placeholder:text-slate-500 dark:focus:border-amber-400 dark:focus:bg-slate-800 dark:focus:ring-amber-400/25" />
                ${pickupLocateBtnHtml}
                <div id="bk-pickup-suggest" class="taxio-booking-field-suggest pointer-events-auto absolute left-0 right-0 top-full z-[130] mt-1.5 hidden max-h-56 overflow-x-hidden overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/[0.06] dark:border-slate-600 dark:bg-slate-900 dark:shadow-black/40 dark:ring-white/10" role="listbox" aria-label="Pick-up suggestions"></div>
              </div>
              <p id="bk-pickup-locate-msg" class="hidden mt-1.5 px-0.5 text-xs font-medium leading-snug text-slate-600 dark:text-slate-400" role="status" aria-live="polite"></p>
            </div>
            <div id="bk-dropoff-wrap" class="taxio-ac-field relative z-50 focus-within:z-[120]">
              <label class="text-sm font-bold text-slate-800 dark:text-slate-100">${escapeHtml(tb.dropLabel)}</label>
              <div class="relative mt-2">
                <span class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-rose-500 dark:text-rose-400">${icon.mapPin('h-[18px] w-[18px]')}</span>
                <input id="bk-dropoff" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="${escapeHtml(tb.dropPh)}" class="h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-inner shadow-slate-900/5 transition placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-100 dark:shadow-black/20 dark:placeholder:text-slate-500 dark:focus:border-amber-400 dark:focus:bg-slate-800 dark:focus:ring-amber-400/25" />
                <div id="bk-dropoff-suggest" class="taxio-booking-field-suggest pointer-events-auto absolute left-0 right-0 top-full z-[130] mt-1.5 hidden max-h-56 overflow-x-hidden overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/[0.06] dark:border-slate-600 dark:bg-slate-900 dark:shadow-black/40 dark:ring-white/10" role="listbox" aria-label="Drop-off suggestions"></div>
              </div>
            </div>

            ${vehicleSectionHtml}

            <div id="bk-when-wrap">
              <p class="text-sm font-bold text-slate-800 dark:text-slate-100">${escapeHtml(tb.when)}</p>
              <div class="mt-3 grid grid-cols-2 gap-3">
                <button type="button" id="bk-ride-now" class="min-h-12 rounded-2xl border-2 border-amber-400/80 bg-amber-400/15 px-3 py-3 text-sm font-bold text-amber-900 shadow-sm ring-1 ring-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/25">${escapeHtml(tb.rideNow)}</button>
                <button type="button" id="bk-ride-schedule" class="min-h-12 rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-300">${escapeHtml(tb.schedule)}</button>
              </div>
              <div id="bk-schedule-wrap" class="mt-3 hidden">
                <input id="bk-schedule-at" type="datetime-local" class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-inner shadow-slate-900/5 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-100 dark:shadow-black/20 dark:focus:border-amber-400 dark:focus:ring-amber-400/25" />
              </div>
            </div>

            <div id="bk-hourly-wrap" class="hidden space-y-4">
              <div>
                <label class="text-sm font-bold text-slate-800 dark:text-slate-100" for="bk-hourly-start">${escapeHtml(tb.hourlyStartLabel)}</label>
                <input id="bk-hourly-start" type="datetime-local" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-inner shadow-slate-900/5 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-100 dark:shadow-black/20 dark:focus:border-amber-400 dark:focus:ring-amber-400/25" />
              </div>
              <div>
                <label class="text-sm font-bold text-slate-800 dark:text-slate-100" for="bk-hourly-hours">${escapeHtml(tb.hourlyDurationLabel)}</label>
                <input id="bk-hourly-hours" type="number" min="${hourlyCfg.minHours}" step="1" value="${hourlyCfg.minHours}" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-inner shadow-slate-900/5 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-100 dark:shadow-black/20 dark:focus:border-amber-400 dark:focus:ring-amber-400/25" />
              </div>
              <div>
                <label class="text-sm font-bold text-slate-800 dark:text-slate-100" for="bk-hourly-notes">${escapeHtml(tb.hourlyNotesLabel)}</label>
                <textarea id="bk-hourly-notes" rows="3" maxlength="500" placeholder="${escapeHtml(tb.hourlyNotesPh)}" class="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-inner shadow-slate-900/5 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-amber-400 dark:focus:ring-amber-400/25"></textarea>
              </div>
            </div>

            <div id="bk-hourly-ref" class="hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-amber-50/40 px-4 py-4 shadow-md ring-1 ring-slate-200/80 dark:border-slate-600/60 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-amber-400/5 dark:ring-white/[0.06]">
              <p class="text-sm font-bold text-slate-800 dark:text-slate-100">${escapeHtml(tb.hourlyRefTitle)}</p>
              <p class="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">${escapeHtml(hourlyPricingNoteText)}</p>
              <p class="mt-2 text-[0.6875rem] leading-snug text-slate-500 dark:text-slate-400">${escapeHtml(tb.hourlyRefDisclaimer)}</p>
            </div>

            <div id="bk-estimate-hint" class="hidden items-start gap-2.5 rounded-2xl border border-amber-200/70 bg-amber-50/90 px-3.5 py-3 ring-1 ring-amber-100/80 dark:border-amber-400/20 dark:bg-amber-400/10 dark:ring-amber-400/10">
              <span class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400">${icon.helpCircle('h-4 w-4')}</span>
              <p class="text-xs leading-relaxed text-amber-950/90 dark:text-amber-50/95">${escapeHtml(tb.estimateSelectHint)}</p>
            </div>

            <div id="bk-estimate-unavail" class="hidden items-start gap-2.5 rounded-2xl border border-slate-200/90 bg-slate-50/95 px-3.5 py-3 ring-1 ring-slate-200/70 dark:border-slate-600/60 dark:bg-slate-800/50 dark:ring-white/[0.04]">
              <span class="mt-0.5 shrink-0 text-slate-500 dark:text-slate-400">${icon.mapPin('h-4 w-4')}</span>
              <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300">${escapeHtml(tb.estimateUnavailable)}</p>
            </div>

            <div id="bk-estimate" class="hidden rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-50 via-white to-slate-50 px-4 py-4 shadow-md ring-1 ring-amber-200/50 dark:border-amber-400/20 dark:from-amber-400/10 dark:via-slate-900/40 dark:to-slate-900/80 dark:shadow-lg dark:shadow-black/20 dark:ring-amber-400/15">
              <p class="text-xs font-bold uppercase tracking-[0.12em] text-amber-800/80 dark:text-amber-300/90">${escapeHtml(tb.estimateTitle)}</p>
              <div id="bk-estimate-loading" class="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">${escapeHtml(tb.calculating)}</div>
              <div id="bk-estimate-body" class="mt-3 hidden">
                <p id="bk-estimate-price" class="text-3xl font-bold tracking-tight text-amber-700 dark:text-amber-300"></p>
                <div class="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <p><span class="text-slate-500 dark:text-slate-400">${escapeHtml(tb.distance)}</span> <span id="bk-estimate-distance" class="font-semibold text-slate-900 dark:text-white"></span></p>
                  <p><span class="text-slate-500 dark:text-slate-400">${escapeHtml(tb.duration)}</span> <span id="bk-estimate-duration" class="font-semibold text-slate-900 dark:text-white"></span></p>
                </div>
                <p class="mt-3 text-[0.6875rem] leading-snug text-slate-500 dark:text-slate-400">${escapeHtml(tb.taximeterNote)}</p>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-4 ring-1 ring-slate-900/[0.04] dark:border-slate-700/60 dark:bg-slate-800/40 dark:ring-white/[0.04] sm:px-5 sm:py-5">
              <label class="flex cursor-pointer items-start gap-3">
                <input type="checkbox" id="bk-terms" class="mt-0.5 h-[18px] w-[18px] shrink-0 rounded border-slate-300 bg-white text-amber-500 focus:ring-amber-400/40 focus:ring-offset-0 dark:border-slate-500 dark:bg-slate-800 dark:text-amber-400" />
                <span class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">${escapeHtml(tb.acceptRiderLead)}<a href="/terms" class="font-bold text-amber-700 underline decoration-amber-400/50 underline-offset-2 hover:text-amber-800 dark:text-amber-200/95 dark:hover:text-amber-100">${escapeHtml(tb.acceptRiderTerms)}</a>${escapeHtml(tb.acceptRiderAnd)}<a href="/privacy" class="font-bold text-amber-700 underline decoration-amber-400/50 underline-offset-2 hover:text-amber-800 dark:text-amber-200/95 dark:hover:text-amber-100">${escapeHtml(tb.acceptRiderPrivacy)}</a></span>
              </label>
            </div>

            <p id="bk-err" class="hidden rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800 ring-1 ring-red-200 dark:bg-red-950/60 dark:text-red-200 dark:ring-red-500/30"></p>
            <div id="bk-turnstile-wrap" class="hidden">
              <div id="bk-turnstile-widget"></div>
            </div>

            <input type="text" id="bk-hp" name="website" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true" />

            <a id="bk-wa" href="#" rel="noopener noreferrer" aria-disabled="true" class="pointer-events-none flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-slate-200 text-sm font-bold text-slate-500 shadow-md ring-1 ring-slate-300 transition dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700 dark:shadow-black/20">
              ${whatsappBookingIcon('h-5 w-5')}
              ${escapeHtml(tb.bookWhatsapp)}
            </a>

            <div class="grid grid-cols-2 gap-3">
              <a id="bk-mail" href="#" class="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-800 shadow-sm transition hover:border-amber-300/60 hover:bg-slate-50 dark:border-slate-600/80 dark:bg-slate-800/60 dark:text-slate-100 dark:shadow-md dark:shadow-black/15 dark:hover:border-amber-400/35 dark:hover:bg-slate-800">
                ${icon.mail('h-[18px] w-[18px] text-amber-600 dark:text-amber-400/90')}
                ${escapeHtml(tb.email)}
              </a>
              <a id="bk-call" href="#" class="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-800 shadow-sm transition hover:border-amber-300/60 hover:bg-slate-50 dark:border-slate-600/80 dark:bg-slate-800/60 dark:text-slate-100 dark:shadow-md dark:shadow-black/15 dark:hover:border-amber-400/35 dark:hover:bg-slate-800">
                ${icon.phone('h-[18px] w-[18px] text-amber-600 dark:text-amber-400/90')}
                ${escapeHtml(tb.call)}
              </a>
            </div>
          </div>
        </div>

        <footer class="px-1 pb-2 pt-2 text-center text-xs text-slate-500 dark:text-slate-500">
          <p>${escapeHtml(tb.footerCopyright)}</p>
          <p class="mt-2 font-bold tracking-tight text-amber-600 dark:text-amber-400/90">${escapeHtml(tb.footerPowered)}</p>
          <p class="mt-2.5"><a href="/contact" class="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-amber-700 dark:text-slate-400 dark:decoration-slate-600 dark:hover:text-amber-200/90">${escapeHtml(tb.footerContact)}</a></p>
        </footer>
      </div>

      <div id="bk-qr-modal" class="fixed inset-0 z-[300] hidden items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] dark:bg-black/70 sm:items-center sm:p-4" aria-hidden="true">
        <button type="button" class="absolute inset-0 cursor-default border-0 bg-transparent" tabindex="-1" aria-label="${escapeHtml(tb.qrClose)}" data-bk-qr-backdrop></button>
        <div class="relative z-10 w-full max-w-sm rounded-t-3xl border border-slate-200/90 bg-white p-6 shadow-2xl ring-1 ring-slate-900/[0.06] dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-black/50 dark:ring-white/[0.06] sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="bk-qr-heading">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 pr-2">
              <h2 id="bk-qr-heading" class="text-lg font-bold tracking-tight text-slate-900 dark:text-white">${escapeHtml(tb.qrModalTitle)}</h2>
              <p class="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">${escapeHtml(tb.qrModalHint)}</p>
            </div>
            <button type="button" data-bk-qr-close class="shrink-0 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-amber-700 dark:hover:bg-slate-800 dark:hover:text-amber-200" aria-label="${escapeHtml(tb.qrClose)}">${icon.x('h-5 w-5')}</button>
          </div>
          <div class="mt-5 flex justify-center rounded-2xl border border-slate-200/90 bg-slate-50 p-5 ring-1 ring-slate-900/[0.04] dark:border-slate-700/50 dark:bg-slate-950/80 dark:ring-white/[0.04]">
            <img src="${escapeHtml(bookingQrSrc)}" alt="" width="220" height="220" class="h-[220px] w-[220px] rounded-xl bg-white object-contain shadow-lg shadow-slate-900/15 dark:shadow-black/30" />
          </div>
          <p class="mt-3 text-center text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200">${escapeHtml(company.name)}</p>
          <div class="mt-5 grid grid-cols-3 gap-2">
            <button type="button" id="bk-qr-download" class="rounded-xl border border-slate-200 bg-white py-2.5 text-center text-xs font-bold text-slate-800 shadow-sm transition hover:border-amber-300/60 hover:bg-slate-50 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-amber-400/40 dark:hover:bg-slate-800">${escapeHtml(tb.qrDownload)}</button>
            <button type="button" id="bk-qr-share" class="rounded-xl border border-slate-200 bg-white py-2.5 text-center text-xs font-bold text-slate-800 shadow-sm transition hover:border-amber-300/60 hover:bg-slate-50 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-amber-400/40 dark:hover:bg-slate-800">${escapeHtml(tb.qrShare)}</button>
            <button type="button" id="bk-qr-print" class="rounded-xl border border-slate-200 bg-white py-2.5 text-center text-xs font-bold text-slate-800 shadow-sm transition hover:border-amber-300/60 hover:bg-slate-50 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-amber-400/40 dark:hover:bg-slate-800">${escapeHtml(tb.qrPrint)}</button>
          </div>
        </div>
      </div>
    </div>`

  root.querySelectorAll('[data-taxio-locale]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lc = btn.getAttribute('data-taxio-locale')
      if (lc) {
        setLocale(lc)
        mountBookCompany(root, slug)
      }
    })
  })

  root.querySelector('#bk-toggle-dark')?.addEventListener('click', () => {
    setPublicDarkMode(!isPublicDarkMode())
    syncPublicThemeClass()
    mountBookCompany(root, slug)
  })

  let selectedCar = defaultSelectedCar
  let rideMode = 'now'
  let serviceMode = 'standard'
  let estimateTimer = null
  const pickupEl = root.querySelector('#bk-pickup')
  const dropEl = root.querySelector('#bk-dropoff')
  const pickupPlacesState = { committed: null, lat: null, lng: null, placeId: null }
  const dropoffPlacesState = { committed: null, lat: null, lng: null, placeId: null }
  const dropoffWrap = root.querySelector('#bk-dropoff-wrap')
  const whenWrap = root.querySelector('#bk-when-wrap')
  const hourlyWrap = root.querySelector('#bk-hourly-wrap')
  const hourlyRefWrap = root.querySelector('#bk-hourly-ref')
  const hourlyStartEl = root.querySelector('#bk-hourly-start')
  const hourlyHoursEl = root.querySelector('#bk-hourly-hours')
  const hourlyNotesEl = root.querySelector('#bk-hourly-notes')
  const serviceStandardBtn = root.querySelector('#bk-service-standard')
  const serviceHourlyBtn = root.querySelector('#bk-service-hourly')
  const bkSegOn =
    'min-h-12 rounded-2xl border-2 border-amber-400/80 bg-amber-400/15 px-3 py-3 text-sm font-bold text-amber-900 shadow-sm ring-1 ring-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/25'
  const bkSegOff =
    'min-h-12 rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-300'

  function isHourlyMode() {
    return hourlyOffered && serviceMode === 'hourly'
  }
  const termsEl = root.querySelector('#bk-terms')
  const waBtn = root.querySelector('#bk-wa')
  const errEl = root.querySelector('#bk-err')
  const estWrap = root.querySelector('#bk-estimate')
  const estHint = root.querySelector('#bk-estimate-hint')
  const estUnavail = root.querySelector('#bk-estimate-unavail')
  const estLoading = root.querySelector('#bk-estimate-loading')
  const estBody = root.querySelector('#bk-estimate-body')
  const estDist = root.querySelector('#bk-estimate-distance')
  const estDur = root.querySelector('#bk-estimate-duration')
  const estPrice = root.querySelector('#bk-estimate-price')
  const rideNowBtn = root.querySelector('#bk-ride-now')
  const rideScheduleBtn = root.querySelector('#bk-ride-schedule')
  const scheduleWrap = root.querySelector('#bk-schedule-wrap')
  const scheduleInput = root.querySelector('#bk-schedule-at')
  let latestEstimate = null
  const estimateSessionCache = new Map()
  let estimateRequestId = 0

  const mailA = root.querySelector('#bk-mail')
  const callA = root.querySelector('#bk-call')
  const normalizedCompanyPhone = normalizeContactPhone(phone)
  const companyWhatsAppDigits = whatsappDigitsForWaMe(company.phone || '')
  let turnstileToken = ''

  const carWrapEl = root.querySelector('#bk-car-wrap')
  const carTriggerEl = showCarTypeChooser ? root.querySelector('#bk-car-trigger') : null
  const carPanelEl = showCarTypeChooser ? root.querySelector('#bk-car-panel') : null
  const carChevronEl = showCarTypeChooser ? root.querySelector('#bk-car-chevron') : null
  let bkCarOutsideHandler = null

  function closeCarPanel() {
    if (!showCarTypeChooser || !carPanelEl) return
    carPanelEl.classList.add('hidden')
    carTriggerEl?.setAttribute('aria-expanded', 'false')
    carChevronEl?.classList.remove('rotate-180')
    if (bkCarOutsideHandler) {
      document.removeEventListener('pointerdown', bkCarOutsideHandler, true)
      bkCarOutsideHandler = null
    }
  }

  function openCarPanel() {
    if (!showCarTypeChooser || !carPanelEl || !carTriggerEl) return
    if (bkCarOutsideHandler) {
      document.removeEventListener('pointerdown', bkCarOutsideHandler, true)
      bkCarOutsideHandler = null
    }
    carPanelEl.classList.remove('hidden')
    carTriggerEl.setAttribute('aria-expanded', 'true')
    carChevronEl?.classList.add('rotate-180')
    bkCarOutsideHandler = (e) => {
      const t = e.target
      if (carWrapEl?.contains(t)) return
      closeCarPanel()
    }
    window.setTimeout(() => {
      document.addEventListener('pointerdown', bkCarOutsideHandler, true)
    }, 0)
  }

  function toggleCarPanel() {
    if (!carPanelEl) return
    if (carPanelEl.classList.contains('hidden')) openCarPanel()
    else closeCarPanel()
  }

  function syncCarUi() {
    if (!showCarTypeChooser) return
    const nameEl = root.querySelector('#bk-car-trigger-name')
    const seatsEl = root.querySelector('#bk-car-trigger-seats')
    const iconEl = root.querySelector('#bk-car-trigger-icon')
    if (nameEl) nameEl.textContent = bookingCarTypeLabel(selectedCar, tBooking(getLocale()))
    if (seatsEl) seatsEl.textContent = bookingCarTypeSeatsLabel(selectedCar)
    if (iconEl) iconEl.innerHTML = bookingCarTypeIconHtml(selectedCar, 'h-7 w-7')
    root.querySelectorAll('.bk-car-opt').forEach((btn) => {
      const t = btn.getAttribute('data-car')
      const on = t === selectedCar
      btn.setAttribute('aria-selected', on ? 'true' : 'false')
      btn.className = `${bkCarOptBase}${on ? bkCarOptOn : bkCarOptOff}`
    })
  }

  function buildWhatsappBookingMessage() {
    const msgs = tBooking(getLocale())
    const pu = pickupEl.value.trim()
    const carLabel = bookingCarTypeLabel(selectedCar, msgs)

    if (isHourlyMode()) {
      const startRaw = hourlyStartEl?.value || ''
      const hours = Number(hourlyHoursEl?.value)
      const notes = String(hourlyNotesEl?.value || '').trim()
      const lines = [msgs.waHourlyIntro]
      lines.push(fillWaTemplate(msgs.waLineCompany, { company: company.name }))
      lines.push(fillWaTemplate(msgs.waLinePickup, { pickup: pu }))
      lines.push(fillWaTemplate(msgs.waLineStartTime, { startTime: startRaw }))
      const durationVal = fillWaTemplate(msgs.waDurationHours, {
        hours: String(Number.isFinite(hours) ? hours : hourlyCfg.minHours),
      })
      lines.push(fillWaTemplate(msgs.waLineDuration, { duration: durationVal }))
      lines.push(fillWaTemplate(msgs.waLineService, { serviceLabel: msgs.byHour }))
      if (notes) lines.push(fillWaTemplate(msgs.waLineNotes, { notes }))
      const refPrice = fillWaTemplate(msgs.waHourlyRefPriceValue, {
        rate: String(hourlyCfg.rateEur),
        min: String(hourlyCfg.minHours),
      })
      if (refPrice) lines.push(fillWaTemplate(msgs.waLineRefPrice, { estimate: refPrice }))
      return lines.join('\n')
    }

    const doff = dropEl.value.trim()
    const whenText =
      rideMode === 'schedule'
        ? scheduleInput?.value
          ? `${msgs.waWhenScheduled}: ${scheduleInput.value}`
          : msgs.waWhenScheduled
        : msgs.waWhenRideNow

    const lines = [msgs.waStandardIntro]
    lines.push(fillWaTemplate(msgs.waLineCompany, { company: company.name }))
    lines.push(fillWaTemplate(msgs.waLinePickup, { pickup: pu }))
    lines.push(fillWaTemplate(msgs.waLineDropoff, { dropoff: doff }))
    lines.push(fillWaTemplate(msgs.waLineWhen, { when: whenText }))
    lines.push(fillWaTemplate(msgs.waLineCarType, { carType: carLabel }))
    if (latestEstimate?.estimatedPrice != null) {
      lines.push(
        fillWaTemplate(msgs.waLineEstimatedPrice, {
          estimate: `€${latestEstimate.estimatedPrice}`,
        })
      )
    }
    return lines.join('\n')
  }

  function buildMailtoHref() {
    if (!company.email) return '#'
    const pu = pickupEl.value.trim() || 'Not provided'
    if (isHourlyMode()) {
      const startRaw = hourlyStartEl?.value || 'Not provided'
      const hours = Number(hourlyHoursEl?.value) || hourlyCfg.minHours
      const notes = String(hourlyNotesEl?.value || '').trim() || '—'
      const svcLabel = hourlyServiceLabelForLocale(getLocale())
      const subject = `By-hour taxi request - ${company.name}`
      const body = `Hello ${company.name},

I would like to request a by-hour taxi service.

Service: By hour / ${svcLabel}
Pickup: ${pu}
Start time: ${startRaw}
Duration: ${hours} hours
Car type: ${selectedCar}
Reference price: from €${hourlyCfg.rateEur}/hour, minimum ${hourlyCfg.minHours} hours
Notes: ${notes}

Final price to be confirmed with the taxi company.`
      return `mailto:${encodeURIComponent(company.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    }
    const doff = dropEl.value.trim() || 'Not provided'
    const whenLine =
      rideMode === 'schedule'
        ? scheduleInput?.value
          ? `Scheduled at ${scheduleInput.value}`
          : 'Scheduled'
        : 'Ride now'
    const estimateDistance = latestEstimate ? `${latestEstimate.distanceKm} km` : 'N/A'
    const estimateDuration = latestEstimate ? `${latestEstimate.durationMin} min` : 'N/A'
    const estimatePrice = latestEstimate ? `€${latestEstimate.estimatedPrice}` : 'N/A'
    const subject = `Taxi booking request - ${company.name}`
    const body = `Hello ${company.name},

I would like to request a taxi booking.

Company: ${company.name}
Pickup: ${pu}
Drop-off: ${doff}
Date/Time: ${whenLine}
Car type: ${selectedCar}
Estimate distance: ${estimateDistance}
Estimate duration: ${estimateDuration}
Estimate price: ${estimatePrice}`
    return `mailto:${encodeURIComponent(company.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  function refreshContactLinks() {
    if (company.email) {
      mailA.href = buildMailtoHref()
      mailA.classList.remove('pointer-events-none', 'opacity-40')
    } else {
      mailA.href = '#'
      mailA.classList.add('pointer-events-none', 'opacity-40')
    }
    if (normalizedCompanyPhone) {
      callA.href = `tel:${normalizedCompanyPhone}`
      callA.classList.remove('pointer-events-none', 'opacity-40')
    } else {
      callA.href = '#'
      callA.classList.add('pointer-events-none', 'opacity-40')
    }
  }

  function bookingContactGate(requireTripFields) {
    const msgs = tBooking(getLocale())
    errEl.classList.add('hidden')
    if (!termsEl.checked) {
      errEl.textContent = msgs.errTerms
      errEl.classList.remove('hidden')
      return false
    }
    if (Date.now() - formStartedAt < BOOK_MIN_SUBMIT_MS) {
      errEl.textContent = msgs.errWaitSubmit
      errEl.classList.remove('hidden')
      return false
    }
    const honeypotGate = String(root.querySelector('#bk-hp')?.value || '').trim()
    if (honeypotGate) {
      errEl.textContent = msgs.errSecurityRetry
      errEl.classList.remove('hidden')
      return false
    }
    if (TURNSTILE_FRONT_ENABLED && TURNSTILE_SITE_KEY && !turnstileToken) {
      errEl.textContent = msgs.errTurnstileBooking
      errEl.classList.remove('hidden')
      return false
    }
    if (requireTripFields) {
      const pu = pickupEl.value.trim()
      if (!pu) {
        errEl.textContent = isHourlyMode() ? msgs.errPickupOnly : msgs.errAddresses
        errEl.classList.remove('hidden')
        return false
      }
      if (isHourlyMode()) {
        const startRaw = hourlyStartEl?.value || ''
        if (!startRaw) {
          errEl.textContent = msgs.errHourlyStart
          errEl.classList.remove('hidden')
          return false
        }
        const hours = Number(hourlyHoursEl?.value)
        if (!Number.isFinite(hours) || hours < hourlyCfg.minHours) {
          errEl.textContent = String(msgs.errHourlyDuration).replace(
            '{min}',
            String(hourlyCfg.minHours)
          )
          errEl.classList.remove('hidden')
          return false
        }
      } else {
        const doff = dropEl.value.trim()
        if (!doff) {
          errEl.textContent = msgs.errAddresses
          errEl.classList.remove('hidden')
          return false
        }
      }
    }
    return true
  }

  function syncServiceModeUi() {
    const hourly = isHourlyMode()
    dropoffWrap?.classList.toggle('hidden', hourly)
    whenWrap?.classList.toggle('hidden', hourly)
    hourlyWrap?.classList.toggle('hidden', !hourly)
    hourlyRefWrap?.classList.toggle('hidden', !hourly)
    if (hourly) {
      latestEstimate = null
      cancelPendingEstimate()
      estWrap?.classList.add('hidden')
      syncEstimateDisplay()
    }
    if (serviceStandardBtn && serviceHourlyBtn) {
      serviceStandardBtn.className = hourly ? bkSegOff : bkSegOn
      serviceHourlyBtn.className = hourly ? bkSegOn : bkSegOff
    }
    refreshWaState()
  }

  function refreshWaState() {
    const puOk = !!pickupEl.value.trim()
    const tripOk = isHourlyMode()
      ? puOk &&
        !!hourlyStartEl?.value &&
        Number(hourlyHoursEl?.value) >= hourlyCfg.minHours
      : puOk && !!dropEl.value.trim()
    const ok =
      termsEl.checked &&
      tripOk &&
      !!companyWhatsAppDigits
    waBtn.setAttribute('aria-disabled', ok ? 'false' : 'true')
    BK_WA_DISABLED_CLASSES.forEach((cls) => waBtn.classList.toggle(cls, !ok))
    BK_WA_ENABLED_CLASSES.forEach((cls) => waBtn.classList.toggle(cls, ok))
    errEl.classList.add('hidden')
    refreshContactLinks()
  }

  function syncRideTimingUi() {
    const isNow = rideMode === 'now'
    if (rideNowBtn) {
      rideNowBtn.className =
        'min-h-12 rounded-2xl border-2 px-3 py-3 text-sm transition ' +
        (isNow
          ? 'border-amber-400/80 bg-amber-400/15 font-bold text-amber-900 shadow-sm ring-1 ring-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/25'
          : 'border-slate-200 bg-slate-50 font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-300')
    }
    if (rideScheduleBtn) {
      rideScheduleBtn.className =
        'min-h-12 rounded-2xl border-2 px-3 py-3 text-sm transition ' +
        (!isNow
          ? 'border-amber-400/80 bg-amber-400/15 font-bold text-amber-900 shadow-sm ring-1 ring-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/25'
          : 'border-slate-200 bg-slate-50 font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-300')
    }
    if (scheduleWrap) scheduleWrap.classList.toggle('hidden', isNow)
  }

  function bookingFieldHasConfirmedPlace(state, inputEl) {
    const v = String(inputEl?.value || '').trim()
    const c = state?.committed
    return typeof c === 'string' && c.length > 0 && v === c
  }

  function syncEstimateDisplay() {
    if (isHourlyMode()) {
      estHint?.classList.add('hidden')
      estHint?.classList.remove('flex')
      estUnavail?.classList.add('hidden')
      estUnavail?.classList.remove('flex')
      estWrap?.classList.add('hidden')
      latestEstimate = null
      return
    }

    const puText = pickupEl.value.trim()
    const doText = dropEl.value.trim()
    const pickupOk = bookingFieldHasConfirmedPlace(pickupPlacesState, pickupEl)
    const dropoffOk = bookingFieldHasConfirmedPlace(dropoffPlacesState, dropEl)

    estUnavail?.classList.add('hidden')
    estUnavail?.classList.remove('flex')

    if (!puText && !doText) {
      estHint?.classList.add('hidden')
      estHint?.classList.remove('flex')
      estWrap?.classList.add('hidden')
      latestEstimate = null
      return
    }

    if (!puText || !doText) {
      estHint?.classList.add('hidden')
      estHint?.classList.remove('flex')
      estWrap?.classList.add('hidden')
      latestEstimate = null
      return
    }

    if (!pickupOk || !dropoffOk) {
      estHint?.classList.remove('hidden')
      estHint?.classList.add('flex')
      estWrap?.classList.add('hidden')
      latestEstimate = null
      return
    }

    estHint?.classList.add('hidden')
    estHint?.classList.remove('flex')
  }

  function showEstimateUnavailable(reason, detail) {
    latestEstimate = null
    estWrap?.classList.add('hidden')
    estUnavail?.classList.remove('hidden')
    estUnavail?.classList.add('flex')
    estHint?.classList.add('hidden')
    estHint?.classList.remove('flex')
    console.warn('[taxio-booking] Route estimate unavailable:', reason || 'unknown', detail || '')
  }

  function estimateCacheKey() {
    const pickup = String(pickupPlacesState.committed || pickupEl.value.trim())
    const dropoff = String(dropoffPlacesState.committed || dropEl.value.trim())
    return `${pickup}\0${dropoff}\0${selectedCar}`
  }

  function applyEstimateToUi(trip) {
    latestEstimate = trip
    if (estPrice) estPrice.textContent = `€${trip.estimatedPrice}`
    if (estDist) estDist.textContent = `${trip.distanceKm} km`
    if (estDur) estDur.textContent = `${trip.durationMin} min`
    estWrap?.classList.remove('hidden')
    estUnavail?.classList.add('hidden')
    estUnavail?.classList.remove('flex')
    estLoading?.classList.add('hidden')
    estBody?.classList.remove('hidden')
  }

  function cancelPendingEstimate() {
    estimateRequestId += 1
    if (estimateTimer) {
      window.clearTimeout(estimateTimer)
      estimateTimer = null
    }
  }

  async function refreshEstimate() {
    syncEstimateDisplay()
    if (isHourlyMode()) return

    const pickupOk = bookingFieldHasConfirmedPlace(pickupPlacesState, pickupEl)
    const dropoffOk = bookingFieldHasConfirmedPlace(dropoffPlacesState, dropEl)
    if (!pickupOk || !dropoffOk) return

    const cacheKey = estimateCacheKey()
    const cached = estimateSessionCache.get(cacheKey)
    if (cached) {
      applyEstimateToUi(cached)
      return
    }

    const reqId = ++estimateRequestId
    estWrap?.classList.remove('hidden')
    estUnavail?.classList.add('hidden')
    estUnavail?.classList.remove('flex')
    estLoading?.classList.remove('hidden')
    estBody?.classList.add('hidden')

    const useCoords =
      Number.isFinite(pickupPlacesState.lat) &&
      Number.isFinite(pickupPlacesState.lng) &&
      Number.isFinite(dropoffPlacesState.lat) &&
      Number.isFinite(dropoffPlacesState.lng)
    try {
      if (!useCoords) {
        showEstimateUnavailable('missing_coordinates')
        return
      }

      const trip = await estimateTrip({
        pickup: { lat: pickupPlacesState.lat, lng: pickupPlacesState.lng },
        dropoff: { lat: dropoffPlacesState.lat, lng: dropoffPlacesState.lng },
        pricing: effectivePricing,
        carType: selectedCar,
      })

      if (reqId !== estimateRequestId) return

      if (
        trip?.source !== 'google_distance_matrix' ||
        trip?.estimatedPrice == null ||
        trip?.distanceKm == null ||
        trip?.durationMin == null
      ) {
        showEstimateUnavailable('invalid_trip_response', { source: trip?.source })
        return
      }

      estimateSessionCache.set(cacheKey, trip)
      applyEstimateToUi(trip)
    } catch (err) {
      if (reqId !== estimateRequestId) return
      showEstimateUnavailable(err?.message || 'estimate_failed', err)
    }
  }

  function queueEstimate() {
    if (isHourlyMode()) return
    const pickupOk = bookingFieldHasConfirmedPlace(pickupPlacesState, pickupEl)
    const dropoffOk = bookingFieldHasConfirmedPlace(dropoffPlacesState, dropEl)
    if (!pickupOk || !dropoffOk) return
    if (estimateTimer) window.clearTimeout(estimateTimer)
    estimateTimer = window.setTimeout(() => {
      estimateTimer = null
      refreshEstimate().catch((err) => {
        showEstimateUnavailable(err?.message || 'estimate_refresh_failed', err)
      })
    }, 350)
  }

  function requestEstimateIfReady() {
    syncEstimateDisplay()
    if (isHourlyMode()) return
    const pickupOk = bookingFieldHasConfirmedPlace(pickupPlacesState, pickupEl)
    const dropoffOk = bookingFieldHasConfirmedPlace(dropoffPlacesState, dropEl)
    if (!pickupOk || !dropoffOk) {
      cancelPendingEstimate()
      return
    }
    queueEstimate()
  }

  if (showCarTypeChooser && carTriggerEl) {
    carTriggerEl.addEventListener('click', (e) => {
      e.preventDefault()
      toggleCarPanel()
    })
    carTriggerEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeCarPanel()
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggleCarPanel()
      }
    })
  }
  root.querySelectorAll('.bk-car-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCar = btn.getAttribute('data-car') || selectedCar
      syncCarUi()
      closeCarPanel()
      requestEstimateIfReady()
    })
  })
  syncCarUi()
  syncRideTimingUi()
  syncServiceModeUi()

  serviceStandardBtn?.addEventListener('click', () => {
    serviceMode = 'standard'
    syncServiceModeUi()
    requestEstimateIfReady()
  })
  serviceHourlyBtn?.addEventListener('click', () => {
    serviceMode = 'hourly'
    syncServiceModeUi()
  })

  rideNowBtn?.addEventListener('click', () => {
    rideMode = 'now'
    syncRideTimingUi()
  })
  rideScheduleBtn?.addEventListener('click', () => {
    rideMode = 'schedule'
    syncRideTimingUi()
  })

  ;[pickupEl, dropEl, termsEl, scheduleInput, hourlyStartEl, hourlyHoursEl, hourlyNotesEl].forEach(
    (el) => {
      if (!el) return
      el.addEventListener('input', refreshWaState)
      el.addEventListener('change', refreshWaState)
    }
  )
  refreshWaState()

  if (TURNSTILE_FRONT_ENABLED && TURNSTILE_SITE_KEY) {
    const wrap = root.querySelector('#bk-turnstile-wrap')
    const widgetEl = root.querySelector('#bk-turnstile-widget')
    wrap?.classList.remove('hidden')
    if (!document.querySelector('script[data-taxio-turnstile]')) {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.defer = true
      s.setAttribute('data-taxio-turnstile', 'true')
      document.head.appendChild(s)
    }
    const render = () => {
      if (!window.turnstile || !widgetEl || widgetEl.dataset.ready === '1') return
      window.turnstile.render(widgetEl, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => {
          turnstileToken = String(token || '')
        },
        'expired-callback': () => {
          turnstileToken = ''
        },
        'error-callback': () => {
          turnstileToken = ''
        },
      })
      widgetEl.dataset.ready = '1'
    }
    let tries = 0
    const timer = window.setInterval(() => {
      tries += 1
      render()
      if (widgetEl?.dataset.ready === '1' || tries > 25) window.clearInterval(timer)
    }, 200)
  }

  function onAddressFieldsUpdated() {
    refreshWaState()
    const pickupOk = bookingFieldHasConfirmedPlace(pickupPlacesState, pickupEl)
    const dropoffOk = bookingFieldHasConfirmedPlace(dropoffPlacesState, dropEl)
    if (!pickupOk || !dropoffOk) {
      cancelPendingEstimate()
      latestEstimate = null
    }
    syncEstimateDisplay()
    if (pickupOk && dropoffOk && !isHourlyMode()) {
      queueEstimate()
    }
  }

  const pickupSuggestEl = root.querySelector('#bk-pickup-suggest')
  const dropoffSuggestEl = root.querySelector('#bk-dropoff-suggest')
  const poweredByEsc = escapeHtml(tb.poweredByGoogle || 'Powered by Google')
  const detachPickupCtrl = attachBookingAddressController({
    inputEl: pickupEl,
    panelEl: pickupSuggestEl,
    state: pickupPlacesState,
    onUpdate: onAddressFieldsUpdated,
    poweredByHtml: poweredByEsc,
  })
  const detachDropoffCtrl = attachBookingAddressController({
    inputEl: dropEl,
    panelEl: dropoffSuggestEl,
    state: dropoffPlacesState,
    onUpdate: onAddressFieldsUpdated,
    poweredByHtml: poweredByEsc,
  })
  taxioBookCompanyAddressCleanup = () => {
    closeCarPanel()
    detachPickupCtrl.detach()
    detachDropoffCtrl.detach()
  }
  syncEstimateDisplay()

  function setPickupLocateMessage(text) {
    const el = root.querySelector('#bk-pickup-locate-msg')
    if (!el) return
    const t = String(text || '').trim()
    if (!t) {
      el.textContent = ''
      el.classList.add('hidden')
      return
    }
    el.textContent = t
    el.classList.remove('hidden')
  }

  pickupEl.addEventListener('input', () => {
    const m = root.querySelector('#bk-pickup-locate-msg')
    if (m?.textContent) {
      m.textContent = ''
      m.classList.add('hidden')
    }
  })

  const locatePickupBtn = root.querySelector('#bk-locate-pickup')
  if (locatePickupBtn && GOOGLE_API_KEY) {
    const locateIconHtml = icon.crosshair('h-[19px] w-[19px]')
    let locating = false
    locatePickupBtn.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (locating) return
      const msgs = tBooking(getLocale())
      setPickupLocateMessage('')
      if (!window.isSecureContext) {
        setPickupLocateMessage(msgs.locateUnavailable)
        return
      }
      if (!navigator.geolocation) {
        setPickupLocateMessage(msgs.locateUnavailable)
        return
      }

      let permState = null
      try {
        permState = await getBookingGeolocationPermissionState()
      } catch {
        permState = null
      }

      if (permState === 'denied') {
        setPickupLocateMessage(msgs.locateDenied)
        return
      }

      if (permState === 'prompt') {
        const hint = String(msgs.locatePromptHint || '').trim()
        if (hint) setPickupLocateMessage(hint)
      }

      const geoOptions =
        permState === 'granted'
          ? { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
          : { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }

      locating = true
      locatePickupBtn.setAttribute('aria-busy', 'true')
      locatePickupBtn.disabled = true
      locatePickupBtn.innerHTML = `<span class="inline-block h-[18px] w-[18px] animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-600 dark:border-emerald-400/25 dark:border-t-emerald-300" aria-hidden="true"></span>`
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, geoOptions)
        })
        const rawLat = pos.coords.latitude
        const rawLng = pos.coords.longitude
        await loadGoogleMapsPlaces()
        const result = await reverseGeocodeLatLng(rawLat, rawLng)
        const addr = String(result.formatted_address || '').trim()
        const loc = result.geometry?.location
        let lat = rawLat
        let lng = rawLng
        if (loc) {
          const glat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat)
          const glng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng)
          if (Number.isFinite(glat) && Number.isFinite(glng)) {
            lat = glat
            lng = glng
          }
        }
        if (!addr) {
          setPickupLocateMessage(msgs.locateAddressFailed)
          return
        }
        commitBookingFieldPlace({
          inputEl: pickupEl,
          state: pickupPlacesState,
          formattedAddress: addr,
          lat,
          lng,
          placeId: result.place_id,
          onUpdate: onAddressFieldsUpdated,
        })
        setPickupLocateMessage('')
        if (pickupSuggestEl) {
          pickupSuggestEl.classList.add('hidden')
          pickupSuggestEl.innerHTML = ''
        }
      } catch (err) {
        const msg = String(err?.message || '')
        const geoCode = err && typeof err === 'object' && 'code' in err ? Number(err.code) : NaN
        if (geoCode === 1) {
          setPickupLocateMessage(msgs.locateDenied)
        } else if (geoCode === 2 || geoCode === 3) {
          setPickupLocateMessage(msgs.locateFailed)
        } else if (msg.includes('geocode_failed') || msg.includes('no_geocoder')) {
          setPickupLocateMessage(msgs.locateAddressFailed)
        } else {
          setPickupLocateMessage(msgs.locateFailed)
        }
      } finally {
        locating = false
        locatePickupBtn.removeAttribute('aria-busy')
        locatePickupBtn.disabled = false
        locatePickupBtn.innerHTML = locateIconHtml
      }
    })
  }

  root.querySelectorAll('.bk-company-photo-img').forEach((img) => {
    img.addEventListener('error', () => {
      img.classList.add('hidden')
      const fb = img.nextElementSibling
      if (fb?.classList.contains('bk-company-photo-fallback')) {
        fb.classList.remove('hidden')
        fb.classList.add('flex')
      }
    })
  })

  const qrModal = root.querySelector('#bk-qr-modal')
  const openQrModal = () => {
    if (!qrModal) return
    qrModal.classList.remove('hidden')
    qrModal.classList.add('flex')
    document.body.style.overflow = 'hidden'
    qrModal.setAttribute('aria-hidden', 'false')
  }
  const closeQrModal = () => {
    if (!qrModal) return
    qrModal.classList.add('hidden')
    qrModal.classList.remove('flex')
    document.body.style.overflow = ''
    qrModal.setAttribute('aria-hidden', 'true')
  }
  root.querySelector('#book-qr-hint')?.addEventListener('click', openQrModal)
  qrModal?.querySelectorAll('[data-bk-qr-close], [data-bk-qr-backdrop]').forEach((el) => {
    el.addEventListener('click', closeQrModal)
  })

  root.querySelector('#bk-qr-download')?.addEventListener('click', async (e) => {
    e.preventDefault()
    try {
      const r = await fetch(bookingQrSrc)
      const blob = await r.blob()
      const u = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = u
      a.download = 'taxio-booking-qr.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(u)
    } catch {
      window.open(bookingQrSrc, '_blank', 'noopener,noreferrer')
    }
  })

  root.querySelector('#bk-qr-share')?.addEventListener('click', async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: company.name, text: tb.qrModalTitle, url: bookingPageUrl })
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(bookingPageUrl)
      }
    } catch {
      /* user cancelled or blocked */
    }
  })

  root.querySelector('#bk-qr-print')?.addEventListener('click', () => {
    const w = window.open('', '_blank', 'noopener,noreferrer')
    if (!w) return
    const srcEsc = bookingQrSrc.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>QR</title></head><body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#fff"><img src="${srcEsc}" alt="" style="max-width:90vmin;height:auto" onload="window.focus();window.print()"/></body></html>`
    )
    w.document.close()
  })

  mailA.addEventListener('click', (e) => {
    if (!company.email || mailA.classList.contains('pointer-events-none')) return
    if (!bookingContactGate(false)) {
      e.preventDefault()
      return
    }
    if (!isDemo) {
      trackCompanyAnalyticsEvent({
        companyId: company.id,
        slug,
        eventType: 'email_click',
        source: parseBookingAnalyticsSource(window.location.search),
      })
    }
  })

  callA.addEventListener('click', (e) => {
    if (!normalizedCompanyPhone || callA.classList.contains('pointer-events-none')) return
    if (!bookingContactGate(false)) {
      e.preventDefault()
      return
    }
    if (!isDemo) {
      trackCompanyAnalyticsEvent({
        companyId: company.id,
        slug,
        eventType: 'call_click',
        source: parseBookingAnalyticsSource(window.location.search),
      })
    }
  })

  waBtn.addEventListener('click', (e) => {
    e.preventDefault()
    const msgs = tBooking(getLocale())
    const waDisabled = waBtn.getAttribute('aria-disabled') === 'true'
    if (waDisabled) return
    if (isDemo) {
      errEl.textContent = msgs.demoNoWhatsapp
      errEl.classList.remove('hidden')
      return
    }
    if (!bookingContactGate(true)) return

    const pu = pickupEl.value.trim()
    const hourlyActive = isHourlyMode()
    const doff = hourlyActive ? HOURLY_DROPOFF_PLACEHOLDER : dropEl.value.trim()
    const honeypot = String(root.querySelector('#bk-hp')?.value || '').trim()

    if (!companyWhatsAppDigits) {
      errEl.textContent = msgs.errNoPhone
      errEl.classList.remove('hidden')
      return
    }
    let rideDateIso = null
    if (hourlyActive) {
      const raw = hourlyStartEl?.value || ''
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) {
        errEl.textContent = msgs.errHourlyStart
        errEl.classList.remove('hidden')
        return
      }
      rideDateIso = d.toISOString()
    } else if (rideMode === 'schedule') {
      const raw = scheduleInput?.value || ''
      if (!raw) {
        errEl.textContent = msgs.errSchedule
        errEl.classList.remove('hidden')
        return
      }
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) {
        errEl.textContent = msgs.errScheduleBad
        errEl.classList.remove('hidden')
        return
      }
      rideDateIso = d.toISOString()
    }
    const estimateLineForNotes = latestEstimate
      ? `\nEstimate: ${latestEstimate.distanceKm} km, ${latestEstimate.durationMin} min, €${latestEstimate.estimatedPrice}`
      : ''
    const hourlyUserNotes = String(hourlyNotesEl?.value || '').trim()
    const fingerprint = [
      company.id,
      hourlyActive ? 'hourly' : 'standard',
      pu.toLowerCase(),
      hourlyActive ? '' : doff.toLowerCase(),
      String(selectedCar || ''),
      hourlyActive ? String(hourlyHoursEl?.value || '') : '',
      String(rideDateIso || 'ride_now'),
    ].join('|')
    const bookingMessageText = buildWhatsappBookingMessage()
    const url = waMeBookingUrl(companyWhatsAppDigits, bookingMessageText)
    if (!url) {
      errEl.textContent = msgs.errNoPhone
      errEl.classList.remove('hidden')
      return
    }

    const waSource = parseBookingAnalyticsSource(window.location.search)
    trackCompanyAnalyticsEvent({
      companyId: company.id,
      slug,
      eventType: 'whatsapp_click',
      source: waSource,
    })

    openWaMeUrl(url)

    const logNotes = hourlyActive
      ? `WhatsApp by-hour · ${selectedCar} · ${hourlyUserNotes || '—'}`
      : `WhatsApp quick book · ${selectedCar} · ${rideMode}${estimateLineForNotes}`

    void createQuickBookingLog({
      company_id: company.id,
      pickup_address: pu,
      dropoff_address: doff,
      car_type: selectedCar,
      service_type: hourlyActive ? 'hourly' : 'standard',
      duration_hours: hourlyActive ? Number(hourlyHoursEl?.value) : null,
      hourly_rate_eur: hourlyActive ? hourlyCfg.rateEur : null,
      hourly_min_hours: hourlyActive ? hourlyCfg.minHours : null,
      customer_name: 'Booking request',
      customer_phone: '',
      customer_email: null,
      ride_datetime: rideDateIso,
      notes: logNotes,
      termsAcceptance: {
        terms_accepted: true,
        accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION_BOOKING_RIDER,
      },
      turnstileToken,
      website: honeypot,
      formStartedAt,
      submissionFingerprint: fingerprint,
      humanConfirmed: true,
    }).then(({ error: bookingErr }) => {
      if (bookingErr) {
        console.warn('[createQuickBookingLog]', bookingErr.message || bookingErr)
      }
    })
  })
}
