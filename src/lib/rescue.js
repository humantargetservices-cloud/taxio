import { supabase } from './supabase.js'
import { apiUrl } from './api.js'

/** Client UX defaults — server deadlines (pg_cron) are authoritative. */
export const ORIGINAL_COMPANY_DECISION_SECONDS = 25
export const RESCUE_OPPORTUNITY_SECONDS = 30

/** Refresh when access token expires within this window. */
const ACCESS_TOKEN_REFRESH_SKEW_MS = 60_000

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.'

/** @type {import('@supabase/supabase-js').RealtimeChannel | null} */
let rescueChannel = null
/** @type {ReturnType<typeof setInterval> | null} */
let rescueRefreshTimer = null

/** @param {{ access_token?: string, expires_at?: number } | null | undefined} session */
export function rescueAccessTokenNeedsRefresh(session, nowMs = Date.now(), skewMs = ACCESS_TOKEN_REFRESH_SKEW_MS) {
  if (!session?.access_token) return true
  const exp = Number(session.expires_at)
  if (!Number.isFinite(exp) || exp <= 0) return false
  return exp * 1000 <= nowMs + skewMs
}

/**
 * Current Supabase access token for Rescue dashboard API calls.
 * Refreshes when expired / near expiry. Never uses a stale dashboard-captured JWT.
 */
export async function getFreshRescueAccessToken() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data?.session?.access_token) {
      return { ok: false, code: 'SESSION_EXPIRED', error: SESSION_EXPIRED_MESSAGE }
    }
    let session = data.session
    if (rescueAccessTokenNeedsRefresh(session)) {
      const { data: refreshed, error: refErr } = await supabase.auth.refreshSession()
      if (refErr || !refreshed?.session?.access_token) {
        return { ok: false, code: 'SESSION_EXPIRED', error: SESSION_EXPIRED_MESSAGE }
      }
      session = refreshed.session
    }
    return { ok: true, accessToken: session.access_token, expiresAt: session.expires_at }
  } catch (e) {
    console.warn('[rescue] getFreshRescueAccessToken', e?.message || e)
    return { ok: false, code: 'SESSION_EXPIRED', error: SESSION_EXPIRED_MESSAGE }
  }
}

function isRescueAuthFailure(res, body) {
  if (res?.status === 401) return true
  const code = String(body?.code || '')
  if (code === 'NOT_AUTHENTICATED' || code === 'SESSION_EXPIRED') return true
  return /invalid auth token|missing bearer token/i.test(String(body?.error || ''))
}

/**
 * Authenticated POST /api/rescue with fresh token + one refresh retry on 401.
 * Same payload on retry — never duplicates Accept (DB atomic claim remains authoritative).
 */
async function rescueAuthedPost(payload) {
  const fresh = await getFreshRescueAccessToken()
  if (!fresh.ok) {
    return {
      ok: false,
      status: 401,
      body: { ok: false, code: 'SESSION_EXPIRED', error: SESSION_EXPIRED_MESSAGE },
      authRetries: 0,
    }
  }

  const doFetch = async (accessToken) => {
    const res = await fetch(apiUrl('/api/rescue'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    return { res, body }
  }

  let { res, body } = await doFetch(fresh.accessToken)
  let authRetries = 0

  if (isRescueAuthFailure(res, body)) {
    const { data: refreshed, error: refErr } = await supabase.auth.refreshSession()
    if (refErr || !refreshed?.session?.access_token) {
      return {
        ok: false,
        status: 401,
        body: { ok: false, code: 'SESSION_EXPIRED', error: SESSION_EXPIRED_MESSAGE },
        authRetries: 0,
      }
    }
    authRetries = 1
    ;({ res, body } = await doFetch(refreshed.session.access_token))
  }

  return {
    ok: res.ok && body?.ok === true,
    status: res.status,
    body,
    authRetries,
  }
}

export async function fetchRescueGloballyEnabled() {
  try {
    const { data, error } = await supabase
      .from('taxio_platform_flags')
      .select('rescue_globally_enabled,original_company_decision_seconds,rescue_opportunity_seconds')
      .eq('id', 1)
      .maybeSingle()
    if (error) {
      console.warn('[rescue] flags', error.message)
      return {
        enabled: false,
        decisionSeconds: ORIGINAL_COMPANY_DECISION_SECONDS,
        opportunitySeconds: RESCUE_OPPORTUNITY_SECONDS,
      }
    }
    return {
      enabled: data?.rescue_globally_enabled === true,
      decisionSeconds: Number(data?.original_company_decision_seconds) || ORIGINAL_COMPANY_DECISION_SECONDS,
      opportunitySeconds: Number(data?.rescue_opportunity_seconds) || RESCUE_OPPORTUNITY_SECONDS,
    }
  } catch (e) {
    console.warn('[rescue] flags failed soft', e?.message || e)
    return {
      enabled: false,
      decisionSeconds: ORIGINAL_COMPANY_DECISION_SECONDS,
      opportunitySeconds: RESCUE_OPPORTUNITY_SECONDS,
    }
  }
}

/** Open opportunities offered to this company (inbound). Soft-fails to []. */
export async function listRescueOpportunitiesForCompany(companyId) {
  const embed = `
      id,
      company_id,
      status,
      created_at,
      responded_at,
      expires_at,
      rescue_request_id,
      rescue:rescue_requests (
        id,
        status,
        original_company_id,
        accepted_by_company_id,
        activated_at,
        accepted_at,
        preview_pickup_label,
        preview_dropoff_label,
        preview_ride_datetime,
        preview_car_type,
        preview_service_type,
        preview_estimated_price,
        passenger_confirm_status,
        passenger_confirmed_at,
        booking_request_id
      )
    `
  try {
    const { data, error } = await supabase
      .from('rescue_opportunities')
      .select(embed)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (error) {
      console.warn('[rescue] opportunities', error.message)
      return []
    }
    return data || []
  } catch (e) {
    console.warn('[rescue] opportunities failed soft', e?.message || e)
    return []
  }
}

/** Decline / activate Rescue for Company A (ONE activation path). */
export async function activateRescueRequest({ bookingRequestId, companyId }) {
  return rescueAuthedPost({ action: 'decline', bookingRequestId, companyId })
}

/** Atomic Rescue accept for Company B/C/D/E. Uses current session token (+ one 401 retry). */
export async function acceptRescueRequest({ rescueRequestId, companyId }) {
  return rescueAuthedPost({ action: 'accept', rescueRequestId, companyId })
}

/** Winner PII unlock details (only after passenger CONFIRMED). Soft-fails. */
export async function fetchRescueWinnerDetails({ rescueRequestId }) {
  try {
    return await rescueAuthedPost({ action: 'winner_details', rescueRequestId })
  } catch (e) {
    return { ok: false, status: 0, body: { code: 'NETWORK', error: e?.message || 'failed' } }
  }
}

export async function passengerRescuePreview(token) {
  const res = await fetch(apiUrl('/api/rescue'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'passenger_preview', token }),
  })
  return res.json().catch(() => ({ ok: false, code: 'EMPTY' }))
}

export async function passengerRescueConfirm(token) {
  const res = await fetch(apiUrl('/api/rescue'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'passenger_confirm', token }),
  })
  return res.json().catch(() => ({ ok: false, code: 'EMPTY' }))
}

export async function passengerRescueCancel(token) {
  const res = await fetch(apiUrl('/api/rescue'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'passenger_cancel', token }),
  })
  return res.json().catch(() => ({ ok: false, code: 'EMPTY' }))
}

export function secondsRemaining(deadlineIso) {
  if (!deadlineIso) return 0
  return Math.max(0, Math.ceil((new Date(deadlineIso).getTime() - Date.now()) / 1000))
}

/**
 * UI-only live subscription for Rescue notifications.
 * Does NOT call process_timeouts / tick — pg_cron owns deadlines.
 * Realtime is optional; interval poll is the reliable fallback.
 * @param {string} companyId
 * @param {() => void} onChange
 * @param {{ intervalMs?: number }} [opts]
 */
export function startRescueLiveUpdates(companyId, onChange, opts = {}) {
  stopRescueLiveUpdates()
  const intervalMs = Math.max(2000, Number(opts.intervalMs) || 4000)
  let scheduled = null
  const fire = () => {
    if (scheduled) return
    scheduled = setTimeout(() => {
      scheduled = null
      try {
        onChange()
      } catch (e) {
        console.warn('[rescue] live update handler', e)
      }
    }, 250)
  }

  try {
    rescueChannel = supabase
      .channel(`rescue-notify-${companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rescue_requests' }, fire)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rescue_opportunities' }, fire)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_requests' }, fire)
      .subscribe()
  } catch (e) {
    console.warn('[rescue] realtime', e)
  }

  // Reliable UI refresh — realtime may miss passenger_confirm_status updates
  rescueRefreshTimer = setInterval(fire, intervalMs)
}

export function stopRescueLiveUpdates() {
  if (rescueRefreshTimer) {
    clearInterval(rescueRefreshTimer)
    rescueRefreshTimer = null
  }
  if (rescueChannel) {
    try {
      supabase.removeChannel(rescueChannel)
    } catch {
      /* ignore */
    }
    rescueChannel = null
  }
}
