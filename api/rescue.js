/**
 * POST /api/rescue
 * Combined Rescue activate + accept (Hobby plan ≤12 serverless functions).
 *
 * Body:
 *   { action: 'activate', bookingRequestId, companyId }
 *   { action: 'accept', rescueRequestId, companyId }
 * Auth: Bearer company user JWT.
 */
import { createClient } from '@supabase/supabase-js'
import { json, validateSupabaseServiceEnv } from './_utils.js'

function makeUserClient(token) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function getBearerUser(token) {
  const msg = validateSupabaseServiceEnv()
  if (msg) throw new Error(msg)
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
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
    const authHeader = req.headers.authorization || ''
    const token = String(authHeader).replace(/^Bearer\s+/i, '').trim()
    if (!token) return json(res, 401, { error: 'Missing bearer token.', code: 'NOT_AUTHENTICATED' })

    const user = await getBearerUser(token)
    if (!user) return json(res, 401, { error: 'Invalid auth token.', code: 'NOT_AUTHENTICATED' })

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const action = String(body.action || body.op || '').trim().toLowerCase()
    const companyId = String(body.companyId || body.company_id || '').trim()
    const userSb = makeUserClient(token)

    if (action === 'activate') {
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
      else if (result.code === 'ALREADY_TAKEN') http = 409
      else if (result.code === 'FORBIDDEN' || result.code === 'NOT_AUTHENTICATED') http = 403
      else if (result.code === 'NOT_FOUND') http = 404
      return json(res, http, result)
    }

    return json(res, 400, {
      error: "action must be 'activate' or 'accept'.",
      code: 'INVALID_INPUT',
    })
  } catch (err) {
    console.error('[rescue]', err?.message || err)
    return json(res, 500, { error: err?.message || 'Rescue request failed.', code: 'SERVER_ERROR' })
  }
}
