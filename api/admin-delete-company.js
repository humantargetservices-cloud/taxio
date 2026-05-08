import { ensurePlatformAdminFromBearer } from './_adminAuth.js'
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'

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
    const auth = await ensurePlatformAdminFromBearer(supabase, req.headers.authorization)
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
