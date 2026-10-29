/**
 * POST /api/operator-push-test
 * Staging only. An approved company owner can send one alert to their own registered phones.
 * This does not create a booking, Rescue offer, or passenger notification.
 */
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import { assertStagingPushTarget, sendOperatorExpoPush } from './_operatorPush.js'

function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end()
    res.statusCode = 204
    return res.end()
  }
  if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'METHOD' })

  const gate = assertStagingPushTarget()
  if (!gate.ok) return json(res, 403, { ok: false, code: gate.code })
  const envErr = validateSupabaseServiceEnv()
  if (envErr) return json(res, 503, { ok: false, code: 'ENV' })

  const token = String(req.headers.authorization || req.headers.Authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json(res, 401, { ok: false, code: 'UNAUTHORIZED' })

  try {
    const admin = makeSupabaseServiceClient()
    const userResult = await admin.auth.getUser(token)
    const user = userResult.data?.user
    if (userResult.error || !user) return json(res, 401, { ok: false, code: 'UNAUTHORIZED' })

    const { data: companies, error: companyError } = await admin
      .from('companies')
      .select('id')
      .eq('owner_user_id', user.id)
      .eq('status', 'approved')
      .limit(1)
    if (companyError) return json(res, 500, { ok: false, code: 'DB_ERROR' })
    const company = companies?.[0]
    if (!company) return json(res, 403, { ok: false, code: 'NO_COMPANY' })

    const since = new Date(Date.now() - 60 * 1000).toISOString()
    const recent = await admin
      .from('operator_push_deliveries')
      .select('delivery_key')
      .eq('company_id', company.id)
      .like('test_key', 'test-%')
      .gte('updated_at', since)
      .limit(1)
    if (!recent.error && recent.data?.length) return json(res, 429, { ok: false, code: 'RATE_LIMITED' })

    const result = await sendOperatorExpoPush(admin, {
      companyId: company.id,
      testKey: 'test-' + company.id + '-' + Date.now(),
      eventType: 'operator_test',
      title: 'TAXIO test alert',
      body: 'Staging test. No trip was created.',
      data: { event_type: 'operator_test' },
    })
    return json(res, 200, {
      ok: result.ok === true && result.sent > 0,
      code: result.code,
      sent: result.sent || 0,
    })
  } catch (error) {
    console.error('[operator-push-test]', error?.message || error)
    return json(res, 500, { ok: false, code: 'SERVER_ERROR' })
  }
}
