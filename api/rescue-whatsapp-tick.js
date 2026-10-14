/**
 * GET|POST /api/rescue-whatsapp-tick
 * Server-to-server only — first offer retries + 20-minute reminders.
 * Vercel Cron invokes GET with Authorization: Bearer <CRON_SECRET>.
 *
 * Auth header (required — any one):
 *   x-taxio-rescue-wa-secret: <RESCUE_WHATSAPP_TICK_SECRET>
 *   Authorization: Bearer <RESCUE_WHATSAPP_TICK_SECRET>
 *   Authorization: Bearer <CRON_SECRET>   (Vercel Cron automatic)
 *
 * Also runs taxio_rescue_process_timeouts() so expiry stays authoritative
 * even when this tick is the only Node cron.
 */
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import { notifyPendingRescuePassengerWhatsApps } from './_rescuePassengerNotify.js'

function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Taxio-Rescue-Wa-Secret'
  )
}

function secretsEqual(a, b) {
  const x = String(a || '')
  const y = String(b || '')
  if (!x || !y || x.length !== y.length) return false
  let out = 0
  for (let i = 0; i < x.length; i += 1) out |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return out === 0
}

function extractSecret(req) {
  const header = String(req.headers['x-taxio-rescue-wa-secret'] || '').trim()
  if (header) return header
  const auth = String(req.headers.authorization || '').trim()
  const m = auth.match(/^Bearer\s+(.+)$/i)
  return m ? String(m[1] || '').trim() : ''
}

function rejectQuerySecret(req) {
  try {
    const url = new URL(req.url || '/', 'http://local')
    if (url.searchParams.has('secret') || url.searchParams.has('token')) return true
  } catch {
    /* ignore */
  }
  return false
}

export default async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end()
    res.statusCode = 204
    return res.end()
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  if (rejectQuerySecret(req)) {
    return json(res, 400, { ok: false, code: 'SECRET_IN_QUERY_FORBIDDEN' })
  }

  const got = extractSecret(req)
  const tickSecret = String(process.env.RESCUE_WHATSAPP_TICK_SECRET || '').trim()
  const cronSecret = String(process.env.CRON_SECRET || '').trim()
  const authorized =
    (tickSecret && secretsEqual(got, tickSecret)) || (cronSecret && secretsEqual(got, cronSecret))
  if (!tickSecret && !cronSecret) {
    return json(res, 503, { ok: false, code: 'TICK_SECRET_NOT_CONFIGURED' })
  }
  if (!authorized) {
    return json(res, 401, { ok: false, code: 'UNAUTHORIZED' })
  }

  const envMsg = validateSupabaseServiceEnv()
  if (envMsg) return json(res, 500, { ok: false, code: 'ENV', error: envMsg })

  try {
    const admin = makeSupabaseServiceClient()
    let timeouts = null
    try {
      const { data, error } = await admin.rpc('taxio_rescue_process_timeouts')
      if (error) console.error('[rescue-whatsapp-tick:timeouts]', error.message)
      else timeouts = data
    } catch (e) {
      console.error('[rescue-whatsapp-tick:timeouts]', e?.message || e)
    }

    const notify = await notifyPendingRescuePassengerWhatsApps(admin, {
      dryRun: false,
      limit: 20,
    })

    return json(res, 200, {
      ok: true,
      timeouts,
      notify,
    })
  } catch (e) {
    console.error('[rescue-whatsapp-tick]', e?.message || e)
    return json(res, 500, { ok: false, code: 'SERVER_ERROR', error: e?.message || 'tick failed' })
  }
}
