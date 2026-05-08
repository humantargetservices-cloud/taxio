import { ensurePlatformAdminFromBearer } from './_adminAuth.js'
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'

const REQUIRED_CONFIRMATION = 'DELETE TEST COMPANIES'
const COMPANY_LOGOS_BUCKET = 'company-logos'

/**
 * Safe dev/test fixtures only — never real production companies.
 * - Slug prefix `test` (lowercase alphanum subdomains from registration), or
 * - companies.dev_fixture = true (optional migration; ignored if column missing).
 */
function isDevCleanupEligibleCompany(row) {
  if (!row?.slug) return false
  const slug = String(row.slug).toLowerCase()
  if (!/^[a-z0-9]+$/.test(slug)) return false
  if (row.dev_fixture === true) return true
  return slug.startsWith('test')
}

async function listEligibleCompanies(supabase) {
  const map = new Map()

  const { data: bySlug, error: e1 } = await supabase
    .from('companies')
    .select('id, slug, name, owner_user_id')
    .like('slug', 'test%')
  if (e1) throw e1
  for (const r of bySlug || []) {
    if (isDevCleanupEligibleCompany(r)) map.set(r.id, r)
  }

  const { data: byFixture, error: e2 } = await supabase
    .from('companies')
    .select('id, slug, name, owner_user_id')
    .eq('dev_fixture', true)
  if (!e2) {
    for (const r of byFixture || []) {
      const enriched = { ...r, dev_fixture: true }
      if (isDevCleanupEligibleCompany(enriched)) map.set(r.id, enriched)
    }
  } else {
    const em = String(e2.message || '').toLowerCase()
    if (!em.includes('dev_fixture') && !em.includes('column')) {
      console.warn('[admin-dev-cleanup-test-companies] dev_fixture query:', e2.message)
    }
  }

  return [...map.values()]
}

async function removeLogoBestEffort(supabase, companyId) {
  try {
    await supabase.storage.from(COMPANY_LOGOS_BUCKET).remove([`${companyId}/logo.jpg`])
  } catch (err) {
    console.warn('[admin-dev-cleanup-test-companies:storage]', companyId, err?.message || err)
  }
}

async function ownerStillLinked(supabase, userId) {
  const { data: own } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_user_id', userId)
    .limit(1)
    .maybeSingle()
  if (own) return true
  const { data: mem } = await supabase
    .from('company_members')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  return !!mem
}

/**
 * POST body:
 * - { action: 'preview' }
 * - { action: 'delete', confirmation: 'DELETE TEST COMPANIES', companyIds?: string[] }
 *
 * Requires env TAXIO_DEV_CLEANUP_ENABLED=true (otherwise 404). Platform admin bearer only.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  if (String(process.env.TAXIO_DEV_CLEANUP_ENABLED || '').trim() !== 'true') {
    return json(res, 404, { error: 'Not found.' })
  }

  const envErr = validateSupabaseServiceEnv()
  if (envErr) return json(res, 503, { error: envErr })

  try {
    const supabase = makeSupabaseServiceClient()
    const auth = await ensurePlatformAdminFromBearer(supabase, req.headers.authorization)
    if (!auth.ok) return json(res, 401, { error: auth.error })

    const body =
      typeof req.body === 'string' && req.body ? JSON.parse(req.body) : req.body || {}
    const action = String(body.action || '').trim()

    if (action === 'preview') {
      const companies = await listEligibleCompanies(supabase)
      return json(res, 200, {
        ok: true,
        companies: companies.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          owner_user_id: c.owner_user_id || null,
        })),
      })
    }

    if (action === 'delete') {
      if (String(body.confirmation || '') !== REQUIRED_CONFIRMATION) {
        return json(res, 400, {
          error: `Confirmation must be exactly: ${REQUIRED_CONFIRMATION}`,
        })
      }

      let eligible = await listEligibleCompanies(supabase)
      const requestedIds = Array.isArray(body.companyIds)
        ? body.companyIds.map((x) => String(x || '').trim()).filter(Boolean)
        : []
      if (requestedIds.length) {
        const set = new Set(eligible.map((c) => c.id))
        for (const id of requestedIds) {
          if (!set.has(id)) {
            return json(res, 400, {
              error: 'One or more company IDs are not eligible for dev cleanup.',
            })
          }
        }
        eligible = eligible.filter((c) => requestedIds.includes(c.id))
      }

      const ownersBefore = new Set()
      for (const c of eligible) {
        if (c.owner_user_id) ownersBefore.add(c.owner_user_id)
      }

      const deletedIds = []
      for (const c of eligible) {
        await removeLogoBestEffort(supabase, c.id)
        const { error: delErr } = await supabase.from('companies').delete().eq('id', c.id)
        if (delErr) {
          console.error('[admin-dev-cleanup-test-companies:delete]', c.id, delErr)
          return json(res, 500, { error: delErr.message || 'Delete failed.' })
        }
        deletedIds.push(c.id)
      }

      const authDeleted = []
      const deleteAuth = String(process.env.TAXIO_DEV_CLEANUP_DELETE_AUTH || '').trim() === 'true'
      if (deleteAuth && ownersBefore.size) {
        for (const userId of ownersBefore) {
          const still = await ownerStillLinked(supabase, userId)
          if (still) continue
          try {
            const { error: auErr } = await supabase.auth.admin.deleteUser(userId)
            if (auErr) {
              console.error('[admin-dev-cleanup-test-companies:auth-delete]', userId, auErr)
            } else {
              authDeleted.push(userId)
            }
          } catch (err) {
            console.error('[admin-dev-cleanup-test-companies:auth-delete]', userId, err)
          }
        }
      } else if (!deleteAuth && ownersBefore.size) {
        for (const userId of ownersBefore) {
          const still = await ownerStillLinked(supabase, userId)
          if (still) continue
          const { error: pErr } = await supabase
            .from('profiles')
            .update({
              first_login_required: false,
              company_onboarding_completed: true,
            })
            .eq('id', userId)
          if (pErr) {
            console.warn('[admin-dev-cleanup-test-companies:profile-reset]', userId, pErr.message)
          }
        }
      }

      console.error('[admin-dev-cleanup-test-companies] completed', {
        deletedCount: deletedIds.length,
        deletedIds,
        authDeletedCount: authDeleted.length,
        authDeleted,
      })

      return json(res, 200, {
        ok: true,
        deletedIds,
        authUsersDeleted: authDeleted,
      })
    }

    return json(res, 400, { error: 'Invalid action.' })
  } catch (e) {
    console.error('[admin-dev-cleanup-test-companies]', e)
    return json(res, 500, { error: e.message || 'Server error.' })
  }
}
