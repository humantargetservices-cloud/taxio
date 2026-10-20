/**
 * Passenger live trip status (Batch 1).
 * GET/POST with opaque passenger_trip_token — no auth.
 * Mapping only; Confirm/Cancel still use existing /api/rescue passenger_* RPCs.
 *
 * INVALID = unknown/malformed token only (404).
 * LOAD_ERROR = server/DB/env/internal failures (5xx) — never masquerade as INVALID.
 */
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import {
  isUnresolvedWhatsappUrlPlaceholder,
  loadTripByPassengerToken,
  mapPassengerTripState,
  normalizePassengerTripTokenInput,
  resolveTripTokenFromConfirmToken,
} from './_passengerTrip.js'

function readToken(req, body) {
  const q = req.query || {}
  return normalizePassengerTripTokenInput(
    body?.token ||
      body?.trip_token ||
      body?.passenger_trip_token ||
      q.token ||
      q.trip_token ||
      ''
  )
}

function readConfirmToken(req, body) {
  const q = req.query || {}
  return normalizePassengerTripTokenInput(body?.confirm_token || q.confirm_token || '')
}

function loadError(res, status, code, error) {
  return json(res, status, {
    ok: false,
    state: 'LOAD_ERROR',
    code: code || 'SERVER_ERROR',
    error: error || 'Trip status temporarily unavailable.',
  })
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  const envErr = validateSupabaseServiceEnv()
  if (envErr) return loadError(res, 503, 'ENV_ERROR', envErr)

  try {
    const body =
      typeof req.body === 'string' && req.body
        ? JSON.parse(req.body)
        : req.body && typeof req.body === 'object'
          ? req.body
          : {}

    const supabase = makeSupabaseServiceClient()
    let tripToken = readToken(req, body)
    const confirmToken = readConfirmToken(req, body)

    if (!tripToken && confirmToken) {
      try {
        tripToken = (await resolveTripTokenFromConfirmToken(supabase, confirmToken)) || ''
      } catch (resolveErr) {
        console.error('[trip-status:resolve]', resolveErr?.message || resolveErr)
        return loadError(res, 500, 'SERVER_ERROR', 'Could not resolve trip token.')
      }
    }

    // Opaque passenger_trip_token only — never phone/company/latest-activity fallback.
    if (
      !tripToken ||
      tripToken.length < 20 ||
      isUnresolvedWhatsappUrlPlaceholder(tripToken)
    ) {
      return json(res, 404, { ok: false, state: 'INVALID', code: 'INVALID' })
    }

    let loaded
    try {
      loaded = await loadTripByPassengerToken(supabase, tripToken)
    } catch (loadErr) {
      console.error('[trip-status:load]', loadErr?.message || loadErr)
      return loadError(res, 500, 'DB_ERROR', 'Could not load trip.')
    }

    // DB query error (not "row missing") — technical failure
    if (loaded?.error && !loaded.booking) {
      console.error('[trip-status:load-error]', loaded.error?.message || loaded.error)
      return loadError(res, 500, 'DB_ERROR', 'Could not load trip.')
    }

    if (!loaded?.booking) {
      return json(res, 404, { ok: false, state: 'INVALID', code: 'INVALID' })
    }

    const mapped = mapPassengerTripState(loaded)
    // Never leak booking UUID or internal ids to passenger client
    return json(res, 200, {
      ok: mapped.ok !== false,
      state: mapped.state,
      trip_token: mapped.trip_token,
      trip: mapped.trip,
      company_a_name: mapped.company_a_name,
      headline_company: mapped.headline_company,
      contacts: mapped.contacts,
      confirm_token: mapped.confirm_token,
      actions: mapped.actions,
      decision_deadline_at: mapped.decision_deadline_at || null,
      poll_ms: 4000,
    })
  } catch (err) {
    console.error('[trip-status]', err?.message || err)
    return loadError(res, 500, 'SERVER_ERROR', 'Trip status temporarily unavailable.')
  }
}
