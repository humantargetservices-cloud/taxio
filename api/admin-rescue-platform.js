/**
 * POST /api/admin-rescue-platform
 * Platform admin only. Updates taxio_platform_flags.rescue_globally_enabled.
 * Does not insert a row and does not change company or booking rows.
 */
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import { ensurePlatformAdminFromBearer } from './_adminAuth.js'

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
    if (typeof body.enabled !== 'boolean') {
      return json(res, 400, { error: 'enabled must be true or false.' })
    }

    const { data, error } = await supabase
      .from('taxio_platform_flags')
      .update({ rescue_globally_enabled: body.enabled })
      .eq('id', 1)
      .select('rescue_globally_enabled')
      .maybeSingle()

    if (error) {
      console.error('[admin-rescue-platform]', error.message)
      return json(res, 500, { error: 'Could not update Platform Rescue.' })
    }
    if (!data || data.rescue_globally_enabled !== body.enabled) {
      return json(res, 409, { error: 'Platform Rescue flag is not available.' })
    }

    return json(res, 200, {
      data: { rescue_globally_enabled: data.rescue_globally_enabled === true },
    })
  } catch (err) {
    console.error('[admin-rescue-platform]', err?.message || err)
    return json(res, 500, { error: 'Could not update Platform Rescue.' })
  }
}
