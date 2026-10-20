/**
 * Same-device passenger trip recovery (localStorage only).
 * Stores trip token + reference — no passenger PII.
 */
import { apiUrl } from './api.js'

const STORAGE_KEY = 'taxio_passenger_active_trip'
const RECENT_KEY = 'taxio_passenger_recent_trip'
const RECENT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

const ACTIVE_STATES = new Set([
  'REQUESTING_COMPANY_A',
  'COMPANY_A_ACCEPTED',
  'SEARCHING_RESCUE',
  'RESCUE_WINNER_FOUND',
  'CONFIRMED',
])

const TERMINAL_INACTIVE = new Set([
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
  'OFFER_EXPIRED',
  'NO_TAXI_AVAILABLE',
  'INVALID',
])

function safeParse(raw) {
  try {
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? o : null
  } catch {
    return null
  }
}

/**
 * @param {{
 *   token: string,
 *   bookingReference?: string | null,
 *   companySlug?: string | null,
 *   companyName?: string | null,
 * }} args
 */
export function savePassengerActiveTrip(args) {
  const token = String(args?.token || '').trim()
  if (token.length < 20) return
  const row = {
    token,
    bookingReference: String(args?.bookingReference || '').trim() || null,
    companySlug: String(args?.companySlug || '').trim() || null,
    companyName: String(args?.companyName || '').trim() || null,
    savedAt: Date.now(),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(row))
  } catch {
    /* private mode */
  }
}

export function readPassengerActiveTrip() {
  try {
    const row = safeParse(localStorage.getItem(STORAGE_KEY) || '')
    const token = String(row?.token || '').trim()
    if (token.length < 20) return null
    return {
      token,
      bookingReference: row.bookingReference || null,
      companySlug: row.companySlug || null,
      companyName: row.companyName || null,
      savedAt: Number(row.savedAt) || 0,
    }
  } catch {
    return null
  }
}

export function clearPassengerActiveTrip() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function saveRecentTrip(row) {
  try {
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify({
        token: row.token,
        bookingReference: row.bookingReference || null,
        companySlug: row.companySlug || null,
        companyName: row.companyName || null,
        state: row.state || null,
        savedAt: Date.now(),
      })
    )
  } catch {
    /* ignore */
  }
}

export function readPassengerRecentTrip() {
  try {
    const row = safeParse(localStorage.getItem(RECENT_KEY) || '')
    const token = String(row?.token || '').trim()
    if (token.length < 20) return null
    const savedAt = Number(row.savedAt) || 0
    if (savedAt && Date.now() - savedAt > RECENT_MAX_AGE_MS) {
      localStorage.removeItem(RECENT_KEY)
      return null
    }
    return {
      token,
      bookingReference: row.bookingReference || null,
      companySlug: row.companySlug || null,
      companyName: row.companyName || null,
      state: row.state || null,
      savedAt,
    }
  } catch {
    return null
  }
}

/** Confirm / refresh stored trip from authoritative trip-status payload. */
export function syncPassengerActiveTripFromStatus(token, body, extras = {}) {
  const tok = String(token || body?.trip_token || '').trim()
  if (tok.length < 20) return
  const state = String(body?.state || '').trim()
  const ref = String(body?.trip?.booking_reference || extras.bookingReference || '').trim() || null
  const companyName =
    String(body?.headline_company || body?.company_a_name || extras.companyName || '').trim() || null
  const companySlug = String(extras.companySlug || '').trim() || null

  if (ACTIVE_STATES.has(state)) {
    savePassengerActiveTrip({
      token: tok,
      bookingReference: ref,
      companySlug,
      companyName,
    })
    return
  }

  if (TERMINAL_INACTIVE.has(state)) {
    const prev = readPassengerActiveTrip()
    if (prev?.token === tok) clearPassengerActiveTrip()
    if (state === 'COMPLETED' || state === 'CANCELLED' || state === 'EXPIRED') {
      saveRecentTrip({
        token: tok,
        bookingReference: ref,
        companySlug: companySlug || prev?.companySlug,
        companyName: companyName || prev?.companyName,
        state,
      })
    }
  }
}

export function isPassengerTripStateActive(state) {
  return ACTIVE_STATES.has(String(state || '').trim())
}

/** Validate stored token via trip-status; returns { ok, active, body, token }. */
export async function validateStoredPassengerTrip(stored) {
  const token = String(stored?.token || '').trim()
  if (token.length < 20) return { ok: false, active: false, token: null, body: null }
  try {
    const res = await fetch(apiUrl(`/api/trip-status?token=${encodeURIComponent(token)}`), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    const body = await res.json().catch(() => ({}))
    if (!body?.state) return { ok: false, active: false, token, body: null }
    syncPassengerActiveTripFromStatus(token, body, {
      bookingReference: stored.bookingReference,
      companySlug: stored.companySlug,
      companyName: stored.companyName,
    })
    const active = isPassengerTripStateActive(body.state)
    return { ok: true, active, token, body }
  } catch {
    return { ok: false, active: false, token, body: null }
  }
}

export async function findBookingByReferenceAndPhone({ bookingReference, phone }) {
  const res = await fetch(apiUrl('/api/find-booking'), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      booking_reference: bookingReference,
      phone,
    }),
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok && body?.ok === true, status: res.status, body }
}

/**
 * Compact recovery banner HTML (escapeHtml required from caller context).
 * @param {{ escapeHtml: (s: string) => string, title: string, viewLabel: string, findLabel?: string, token: string, showFind?: boolean }} opts
 */
export function passengerActiveTripBannerHtml(opts) {
  const escapeHtml = opts.escapeHtml
  const token = String(opts.token || '').trim()
  if (!token) return ''
  const findLink = opts.showFind
    ? `<a href="/find-booking" class="mt-2 inline-flex text-xs font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-300">${escapeHtml(
        opts.findLabel || 'Find my booking'
      )}</a>`
    : ''
  return `<div class="mb-4 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-3 dark:border-amber-500/25 dark:bg-amber-950/30" data-active-trip-banner>
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-bold text-amber-950 dark:text-amber-100">${escapeHtml(
          opts.title || 'Your active trip'
        )}</p>
        ${findLink}
      </div>
      <a href="/trip/${encodeURIComponent(token)}" class="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-amber-400 dark:text-gray-900 dark:hover:bg-amber-300">${escapeHtml(
        opts.viewLabel || 'View trip'
      )}</a>
    </div>
  </div>`
}
