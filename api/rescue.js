/**
 * POST /api/rescue
 * Rescue activate / accept / tick / passenger confirm|cancel|preview
 * (Hobby plan: single serverless function.)
 *
 * Auth company actions: Bearer JWT
 * Passenger actions: token only (no login)
 */
import { createClient } from '@supabase/supabase-js'
import { json, validateSupabaseServiceEnv, makeSupabaseServiceClient } from './_utils.js'
import {
  notifyPendingRescuePassengerWhatsApps,
  notifyRescuePassengerConfirmWhatsApp,
} from './_rescuePassengerNotify.js'
import { fetchDrivingEtaMinutes, validateLatLng } from './_drivingEta.js'

function makeUserClient(token) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function makeAnonClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  return createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function getBearerUser(token) {
  const msg = validateSupabaseServiceEnv()
  if (msg) throw new Error(msg)
  const admin = makeSupabaseServiceClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (typeof res.status === 'function') return res.status(204).end()
    res.statusCode = 204
    return res.end()
  }

  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const action = String(body.action || body.op || '').trim().toLowerCase()

    // --- Passenger token actions (no company auth) ---
    if (action === 'passenger_preview' || action === 'passenger_confirm' || action === 'passenger_cancel') {
      const token = String(body.token || body.passenger_confirm_token || '').trim()
      if (token.length < 20) {
        return json(res, 400, { ok: false, code: 'INVALID_TOKEN', error: 'Invalid confirmation link.' })
      }
      const sb = makeAnonClient()
      const rpcName =
        action === 'passenger_preview'
          ? 'taxio_rescue_passenger_preview'
          : action === 'passenger_confirm'
            ? 'taxio_rescue_passenger_confirm'
            : 'taxio_rescue_passenger_cancel'
      const { data, error } = await sb.rpc(rpcName, { p_token: token })
      if (error) {
        console.error('[rescue:passenger]', error.message)
        return json(res, 500, { ok: false, code: 'RPC_ERROR', error: error.message })
      }
      const result = data && typeof data === 'object' ? data : { ok: false, code: 'EMPTY' }
      const http = result.ok ? 200 : result.code === 'INVALID_TOKEN' ? 404 : 409
      return json(res, http, result)
    }

    // Timeout authority is pg_cron (taxio-rescue-process-timeouts).
    // Optional diagnostic tick remains available but is not used by the dashboard.
    if (action === 'tick') {
      const authHeader = req.headers.authorization || ''
      const bearer = String(authHeader).replace(/^Bearer\s+/i, '').trim()
      if (!bearer) return json(res, 401, { error: 'Missing bearer token.', code: 'NOT_AUTHENTICATED' })
      const user = await getBearerUser(bearer)
      if (!user) return json(res, 401, { error: 'Invalid auth token.', code: 'NOT_AUTHENTICATED' })
      const userSb = makeUserClient(bearer)
      try {
        const { data, error } = await userSb.rpc('taxio_rescue_process_timeouts')
        if (error) {
          console.error('[rescue:tick]', error.message)
          return json(res, 500, { error: error.message, code: 'RPC_ERROR' })
        }
        // Retry any eligible winner→passenger WhatsApp (send-once claim is authoritative).
        try {
          const admin = makeSupabaseServiceClient()
          await notifyPendingRescuePassengerWhatsApps(admin, { dryRun: false, limit: 10 })
        } catch (notifyErr) {
          console.error('[rescue:tick:notify]', notifyErr?.message || notifyErr)
        }
        return json(res, 200, data && typeof data === 'object' ? data : { ok: true })
      } catch (err) {
        console.error('[rescue:tick]', err?.message || err)
        return json(res, 500, { error: err?.message || 'tick failed', code: 'RPC_ERROR' })
      }
    }

    const authHeader = req.headers.authorization || ''
    const token = String(authHeader).replace(/^Bearer\s+/i, '').trim()
    if (!token) return json(res, 401, { error: 'Missing bearer token.', code: 'NOT_AUTHENTICATED' })

    const user = await getBearerUser(token)
    if (!user) return json(res, 401, { error: 'Invalid auth token.', code: 'NOT_AUTHENTICATED' })

    const companyId = String(body.companyId || body.company_id || '').trim()
    const userSb = makeUserClient(token)

    if (action === 'activate' || action === 'decline') {
      const bookingRequestId = String(body.bookingRequestId || body.booking_request_id || '').trim()
      if (!bookingRequestId || !companyId) {
        return json(res, 400, {
          error: 'bookingRequestId and companyId are required.',
          code: 'INVALID_INPUT',
        })
      }
      const { data, error } = await userSb.rpc('activate_rescue_request', {
        p_booking_request_id: bookingRequestId,
        p_company_id: companyId,
      })
      if (error) {
        console.error('[rescue:activate]', error.message)
        return json(res, 500, { error: error.message, code: 'RPC_ERROR' })
      }
      const result = data && typeof data === 'object' ? data : { ok: false, code: 'EMPTY' }
      const http = result.ok
        ? 200
        : result.code === 'FORBIDDEN' || result.code === 'NOT_AUTHENTICATED'
          ? 403
          : 409
      return json(res, http, result)
    }

    if (action === 'accept') {
      const rescueRequestId = String(body.rescueRequestId || body.rescue_request_id || '').trim()
      if (!rescueRequestId || !companyId) {
        return json(res, 400, {
          error: 'rescueRequestId and companyId are required.',
          code: 'INVALID_INPUT',
        })
      }
      const { data, error } = await userSb.rpc('accept_rescue_request', {
        p_rescue_request_id: rescueRequestId,
        p_company_id: companyId,
      })
      if (error) {
        console.error('[rescue:accept]', error.message)
        return json(res, 500, { error: error.message, code: 'RPC_ERROR' })
      }
      const result = data && typeof data === 'object' ? data : { ok: false, code: 'EMPTY' }
      let http = 409
      if (result.ok) http = 200
      else if (
        result.code === 'ALREADY_TAKEN' ||
        result.code === 'ALREADY_ASSIGNED' ||
        result.code === 'OPPORTUNITY_EXPIRED'
      )
        http = 409
      else if (result.code === 'FORBIDDEN' || result.code === 'NOT_AUTHENTICATED') http = 403
      else if (result.code === 'NOT_FOUND') http = 404

      // Winner only: server-side passenger WhatsApp (never from browser; soft-fail).
      if (result.ok && result.rescue_request_id) {
        try {
          const admin = makeSupabaseServiceClient()
          const notify = await notifyRescuePassengerConfirmWhatsApp(admin, {
            rescueRequestId: result.rescue_request_id,
            dryRun: false,
          })
          result.passenger_whatsapp = {
            code: notify.code,
            ok: notify.ok === true,
            messageId: notify.messageId || null,
            error: notify.error || null,
            metaError: notify.metaError || null,
          }
        } catch (notifyErr) {
          console.error('[rescue:accept:notify]', notifyErr?.message || notifyErr)
          result.passenger_whatsapp = { ok: false, code: 'NOTIFY_ERROR' }
        }
      }

      return json(res, http, result)
    }

    if (action === 'winner_details') {
      const rescueRequestId = String(body.rescueRequestId || body.rescue_request_id || '').trim()
      if (!rescueRequestId) {
        return json(res, 400, { error: 'rescueRequestId is required.', code: 'INVALID_INPUT' })
      }
      const { data, error } = await userSb.rpc('get_rescue_booking_details', {
        p_rescue_request_id: rescueRequestId,
      })
      if (error) {
        console.error('[rescue:winner_details]', error.message)
        return json(res, 500, { ok: false, code: 'RPC_ERROR', error: error.message })
      }
      const result = data && typeof data === 'object' ? data : { ok: false, code: 'EMPTY' }
      const http = result.ok
        ? 200
        : result.code === 'PII_LOCKED_UNTIL_PASSENGER_CONFIRM'
          ? 403
          : result.code === 'FORBIDDEN' || result.code === 'NOT_AUTHENTICATED'
            ? 403
            : result.code === 'NOT_FOUND'
              ? 404
              : 409
      return json(res, http, result)
    }

    if (action === 'complete_trip') {
      const bookingRequestId = String(body.bookingRequestId || body.booking_request_id || '').trim()
      const rescueRequestId = String(body.rescueRequestId || body.rescue_request_id || '').trim()
      if (!companyId || (!bookingRequestId && !rescueRequestId)) {
        return json(res, 400, {
          error: 'companyId and bookingRequestId or rescueRequestId are required.',
          code: 'INVALID_INPUT',
        })
      }
      const { data, error } = await userSb.rpc('taxio_company_complete_trip', {
        p_company_id: companyId,
        p_booking_request_id: bookingRequestId || null,
        p_rescue_request_id: rescueRequestId || null,
      })
      if (error) {
        console.error('[rescue:complete_trip]', error.message)
        return json(res, 500, { ok: false, code: 'RPC_ERROR', error: error.message })
      }
      const result = data && typeof data === 'object' ? data : { ok: false, code: 'EMPTY' }
      const http = result.ok
        ? 200
        : result.code === 'FORBIDDEN' || result.code === 'NOT_AUTHENTICATED'
          ? 403
          : result.code === 'NOT_FOUND'
            ? 404
            : 409
      return json(res, http, result)
    }

    if (action === 'mark_on_way' || action === 'mark_arrived') {
      const bookingRequestId = String(body.bookingRequestId || body.booking_request_id || '').trim()
      const rescueRequestId = String(body.rescueRequestId || body.rescue_request_id || '').trim()
      if (!companyId || (!bookingRequestId && !rescueRequestId)) {
        return json(res, 400, {
          error: 'companyId and bookingRequestId or rescueRequestId are required.',
          code: 'INVALID_INPUT',
        })
      }

      let etaMinutes = null
      if (action === 'mark_on_way') {
        const driverLoc = validateLatLng({
          lat: body.driver_lat ?? body.driverLat,
          lng: body.driver_lng ?? body.driverLng,
        })
        // Optional one-shot ETA — never persist driver coordinates
        if (driverLoc) {
          try {
            const svc = makeSupabaseServiceClient()
            let bookingId = bookingRequestId || null
            if (!bookingId && rescueRequestId) {
              const { data: r } = await svc
                .from('rescue_requests')
                .select('booking_request_id')
                .eq('id', rescueRequestId)
                .maybeSingle()
              bookingId = r?.booking_request_id || null
            }
            if (bookingId) {
              const { data: b } = await svc
                .from('booking_requests')
                .select('pickup_lat, pickup_lng')
                .eq('id', bookingId)
                .maybeSingle()
              const pickup = validateLatLng({ lat: b?.pickup_lat, lng: b?.pickup_lng })
              if (pickup) {
                etaMinutes = await fetchDrivingEtaMinutes(driverLoc, pickup)
              }
            }
          } catch (etaErr) {
            console.warn('[rescue:mark_on_way:eta]', etaErr?.message || etaErr)
          }
        }
      }

      const rpcAction = action === 'mark_on_way' ? 'ON_THE_WAY' : 'ARRIVED'
      const { data, error } = await userSb.rpc('taxio_company_set_pickup_progress', {
        p_company_id: companyId,
        p_action: rpcAction,
        p_booking_request_id: bookingRequestId || null,
        p_rescue_request_id: rescueRequestId || null,
        p_eta_minutes: etaMinutes,
      })
      if (error) {
        console.error(`[rescue:${action}]`, error.message)
        // Column/RPC missing until migration applied
        if (/taxio_company_set_pickup_progress|driver_pickup_status|schema cache|function/i.test(error.message || '')) {
          return json(res, 503, {
            ok: false,
            code: 'PICKUP_PROGRESS_NOT_READY',
            error: 'Pickup progress is not ready on this environment yet.',
          })
        }
        return json(res, 500, { ok: false, code: 'RPC_ERROR', error: error.message })
      }
      const result = data && typeof data === 'object' ? data : { ok: false, code: 'EMPTY' }
      const http = result.ok
        ? 200
        : result.code === 'FORBIDDEN' || result.code === 'NOT_AUTHENTICATED'
          ? 403
          : result.code === 'NOT_FOUND'
            ? 404
            : 409
      return json(res, http, result)
    }

    return json(res, 400, {
      error:
        "action must be 'activate', 'decline', 'accept', 'tick', 'winner_details', 'complete_trip', 'mark_on_way', 'mark_arrived', or passenger_*",
      code: 'INVALID_INPUT',
    })
  } catch (err) {
    console.error('[rescue]', err?.message || err)
    return json(res, 500, { error: err?.message || 'Rescue request failed.', code: 'SERVER_ERROR' })
  }
}
