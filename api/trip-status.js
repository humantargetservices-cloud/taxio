/**
 * Passenger live trip status (Batch 1).
 * GET/POST with opaque passenger_trip_token — no auth.
 * Mapping only; Confirm/Cancel still use existing /api/rescue passenger_* RPCs.
 */
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import {
  loadTripByPassengerToken,
  mapPassengerTripState,
  resolveTripTokenFromConfirmToken,
} from './_passengerTrip.js'

function readToken(req, body) {
  const q = req.query || {}
  return String(
    body?.token ||
      body?.trip_token ||
      body?.passenger_trip_token ||
      q.token ||
      q.trip_token ||
      ''
  ).trim()
}

function readConfirmToken(req, body) {
  const q = req.query || {}
  return String(body?.confirm_token || q.confirm_token || '').trim()
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  const envErr = validateSupabaseServiceEnv()
  if (envErr) return json(res, 503, { ok: false, state: 'INVALID', error: envErr })

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
      tripToken = (await resolveTripTokenFromConfirmToken(supabase, confirmToken)) || ''
    }

    if (!tripToken || tripToken.length < 20) {
      return json(res, 404, { ok: false, state: 'INVALID', code: 'INVALID' })
    }

    const loaded = await loadTripByPassengerToken(supabase, tripToken)
    if (!loaded.booking) {
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
    return json(res, 500, { ok: false, state: 'INVALID', code: 'SERVER_ERROR' })
  }
}
