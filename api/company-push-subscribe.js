/**
 * GET/POST/DELETE /api/company-push-subscribe
 * Authenticated company user — manage Web Push subscriptions.
 * Never returns VAPID private key. Never trusts client company_id.
 */
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import {
  extractBearerToken,
  getBearerUser,
  getVapidPublicKey,
  resolveCompanyIdForUser,
  validateVapidEnv,
} from './_companyPush.js'

function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

async function requireCompanyUser(req) {
  const envErr = validateSupabaseServiceEnv()
  if (envErr) return { error: envErr, status: 503 }
  const vapidErr = validateVapidEnv()
  if (vapidErr) return { error: vapidErr, status: 503 }

  const token = extractBearerToken(req)
  if (!token) return { error: 'Missing bearer token.', status: 401, code: 'NOT_AUTHENTICATED' }

  const user = await getBearerUser(token)
  if (!user) return { error: 'Invalid auth token.', status: 401, code: 'NOT_AUTHENTICATED' }

  const admin = makeSupabaseServiceClient()
  const companyId = await resolveCompanyIdForUser(admin, user.id)
  if (!companyId) {
    return { error: 'No company for this account.', status: 403, code: 'NO_COMPANY' }
  }
  return { user, companyId, admin }
}

export default async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end()
    res.statusCode = 204
    return res.end()
  }

  try {
    if (req.method === 'GET') {
      const auth = await requireCompanyUser(req)
      if (auth.error) return json(res, auth.status, { error: auth.error, code: auth.code })
      return json(res, 200, {
        ok: true,
        vapidPublicKey: getVapidPublicKey(),
        companyId: auth.companyId,
      })
    }

    if (req.method === 'POST') {
      const auth = await requireCompanyUser(req)
      if (auth.error) return json(res, auth.status, { error: auth.error, code: auth.code })

      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
      const endpoint = String(body.endpoint || '').trim()
      const p256dh = String(body.keys?.p256dh || body.p256dh || '').trim()
      const authKey = String(body.keys?.auth || body.auth || '').trim()
      const userAgent = String(body.user_agent || body.userAgent || req.headers['user-agent'] || '')
        .trim()
        .slice(0, 400)

      if (!endpoint || !/^https:\/\//i.test(endpoint)) {
        return json(res, 400, { error: 'Invalid push endpoint.', code: 'INVALID_ENDPOINT' })
      }
      if (!p256dh || !authKey) {
        return json(res, 400, { error: 'Missing subscription keys.', code: 'INVALID_KEYS' })
      }

      const now = new Date().toISOString()
      const row = {
        company_id: auth.companyId,
        endpoint,
        p256dh,
        auth: authKey,
        user_agent: userAgent || null,
        enabled: true,
        updated_at: now,
        last_error: null,
      }

      const { data, error } = await auth.admin
        .from('company_push_subscriptions')
        .upsert(row, { onConflict: 'endpoint' })
        .select('id, company_id, endpoint, enabled, updated_at')
        .maybeSingle()

      if (error) {
        console.error('[company-push-subscribe:post]', error.message)
        return json(res, 500, { error: 'Could not save subscription.', code: 'DB_ERROR' })
      }

      return json(res, 200, {
        ok: true,
        subscription: data,
        companyId: auth.companyId,
      })
    }

    if (req.method === 'DELETE') {
      const auth = await requireCompanyUser(req)
      if (auth.error) return json(res, auth.status, { error: auth.error, code: auth.code })

      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
      const endpoint = String(body.endpoint || '').trim()
      if (!endpoint) {
        return json(res, 400, { error: 'endpoint is required.', code: 'INVALID_ENDPOINT' })
      }

      const { data, error } = await auth.admin
        .from('company_push_subscriptions')
        .update({
          enabled: false,
          updated_at: new Date().toISOString(),
          last_error: 'unsubscribed_by_user',
        })
        .eq('company_id', auth.companyId)
        .eq('endpoint', endpoint)
        .select('id, enabled')
        .maybeSingle()

      if (error) {
        console.error('[company-push-subscribe:delete]', error.message)
        return json(res, 500, { error: 'Could not disable subscription.', code: 'DB_ERROR' })
      }

      return json(res, 200, { ok: true, disabled: !!data, subscription: data || null })
    }

    return json(res, 405, { error: 'Method not allowed' })
  } catch (err) {
    console.error('[company-push-subscribe]', err?.message || err)
    return json(res, 500, { error: err?.message || 'Subscribe failed.', code: 'SERVER_ERROR' })
  }
}
