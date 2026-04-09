import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'

async function ensureAdminFromBearer(supabase, authHeader) {
  const token = String(authHeader || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, error: 'Missing bearer token.' }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) return { ok: false, error: 'Invalid auth token.' }

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (pErr || profile?.role !== 'platform_admin') {
    return { ok: false, error: 'Not authorized.' }
  }
  return { ok: true }
}

/**
 * Hard-delete a company row. FKs cascade to company_members, booking_requests, cars.
 * Auth users are not removed (same pattern as leaving owner accounts after data cleanup).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const envErr = validateSupabaseServiceEnv()
  if (envErr) return json(res, 503, { error: envErr })

  try {
    const supabase = makeSupabaseServiceClient()
    const auth = await ensureAdminFromBearer(supabase, req.headers.authorization)
    if (!auth.ok) return json(res, 401, { error: auth.error })

    const body =
      typeof req.body === 'string' && req.body ? JSON.parse(req.body) : req.body || {}
    const companyId = String(body.companyId || '').trim()
    if (!companyId) return json(res, 400, { error: 'companyId is required.' })

    const { error } = await supabase.from('companies').delete().eq('id', companyId)
    if (error) {
      console.error('[admin-delete-company]', error)
      return json(res, 500, { error: error.message || 'Delete failed.' })
    }
    return json(res, 200, { ok: true })
  } catch (e) {
    console.error('[admin-delete-company]', e)
    return json(res, 500, { error: e.message || 'Server error.' })
  }
}
