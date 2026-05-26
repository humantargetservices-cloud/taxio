import {
  json,
  makeSupabaseServiceClient,
  slugFromCompanyName,
  validateSupabaseServiceEnv,
} from './_utils.js'

const ALLOWED_FIELDS = [
  'name',
  'slug',
  'email',
  'phone',
  'city',
  'country',
  'vat_number',
  'slogan',
  'availability_status',
  'pricing',
  'logo_url',
  'hourly_enabled',
  'hourly_rate_eur',
  'hourly_min_hours',
]

const AVAILABILITY_STATUSES = ['available', 'busy', 'offline']

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

function isValidBelgianVat(vatRaw) {
  const s = String(vatRaw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  const digits = s.startsWith('BE') ? s.slice(2).replace(/\D/g, '') : s.replace(/\D/g, '')
  return digits.length === 10
}

function normalizeBelgianVat(vatRaw) {
  const s = String(vatRaw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  let digits = s.startsWith('BE') ? s.slice(2).replace(/\D/g, '') : s.replace(/\D/g, '')
  if (digits.length > 10) digits = digits.slice(-10)
  return digits ? `BE${digits.padStart(10, '0')}` : null
}

function normalizeEditablePatch(rawPatch) {
  const data = {}
  for (const key of ALLOWED_FIELDS) {
    if (!(key in rawPatch)) continue
    let value = rawPatch[key]
    if (value === undefined) continue

    if (key === 'pricing') {
      if (value == null || value === '') {
        data[key] = {}
      } else if (typeof value === 'string') {
        try {
          data[key] = JSON.parse(value)
        } catch {
          return { error: 'Pricing must be valid JSON.' }
        }
      } else if (typeof value === 'object') {
        data[key] = value
      } else {
        return { error: 'Invalid pricing value.' }
      }
      continue
    }

    if (typeof value === 'string') value = value.trim()

    if (key === 'name') {
      if (!value) return { error: 'Company name cannot be empty.' }
      data[key] = value
      continue
    }
    if (key === 'slug') {
      const slug = slugFromCompanyName(value)
      if (!slug || slug.length < 2) return { error: 'Slug must be at least 2 letters or numbers.' }
      data[key] = slug
      continue
    }
    if (key === 'email') {
      const email = String(value || '').toLowerCase()
      if (!isValidEmail(email)) return { error: 'Please enter a valid company email.' }
      data[key] = email
      continue
    }
    if (key === 'vat_number') {
      if (!value) {
        data[key] = null
      } else {
        if (!isValidBelgianVat(value)) return { error: 'Please enter a valid Belgian VAT number.' }
        data[key] = normalizeBelgianVat(value)
      }
      continue
    }
    if (key === 'availability_status') {
      if (value && !AVAILABILITY_STATUSES.includes(value)) {
        return { error: 'Invalid availability status.' }
      }
      data[key] = value || 'available'
      continue
    }
    if (key === 'logo_url') {
      data[key] = value == null || value === '' ? null : String(value).trim()
      continue
    }
    if (key === 'hourly_enabled') {
      data[key] = value === true
      continue
    }
    if (key === 'hourly_rate_eur') {
      const n = Number(value)
      data[key] = Number.isFinite(n) && n > 0 ? n : 60
      continue
    }
    if (key === 'hourly_min_hours') {
      const n = parseInt(String(value), 10)
      data[key] = Number.isFinite(n) && n >= 1 ? n : 3
      continue
    }

    data[key] = value === '' ? null : value
  }
  return { data }
}

async function ensureAdminFromBearer(supabase, authHeader) {
  const token = String(authHeader || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, error: 'Missing bearer token.' }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) return { ok: false, error: 'Invalid auth token.' }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (profileErr || profile?.role !== 'platform_admin') {
    return { ok: false, error: 'Not authorized.' }
  }
  return { ok: true }
}

async function ensureUniqueCompanyValue(supabase, companyId, column, value, message) {
  if (value == null || value === '') return null
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq(column, value)
    .neq('id', companyId)
    .limit(1)
    .maybeSingle()
  if (error) return `Could not validate ${column}: ${error.message}`
  if (data?.id) return message
  return null
}

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
    const rawPatch = body.patch && typeof body.patch === 'object' ? body.patch : {}
    if (!companyId) return json(res, 400, { error: 'companyId is required.' })

    const { data: current, error: loadErr } = await supabase
      .from('companies')
      .select('id, name, slug, email, owner_user_id')
      .eq('id', companyId)
      .maybeSingle()
    if (loadErr) return json(res, 500, { error: `Could not load company: ${loadErr.message}` })
    if (!current) return json(res, 404, { error: 'Company not found.' })

    const normalized = normalizeEditablePatch(rawPatch)
    if (normalized.error) return json(res, 400, { error: normalized.error })

    const patch = normalized.data || {}
    if (Object.keys(patch).length === 0) return json(res, 200, { data: { updated: false } })

    const warnings = []

    if ('slug' in patch) {
      const msg = await ensureUniqueCompanyValue(
        supabase,
        companyId,
        'slug',
        patch.slug,
        'This slug/subdomain is already used by another company.'
      )
      if (msg) return json(res, 409, { error: msg })
    }
    if ('email' in patch) {
      const msg = await ensureUniqueCompanyValue(
        supabase,
        companyId,
        'email',
        patch.email,
        'This email is already used by another company.'
      )
      if (msg) return json(res, 409, { error: msg })
      if (
        current.owner_user_id &&
        String(patch.email || '').toLowerCase() !== String(current.email || '').toLowerCase()
      ) {
        warnings.push('Company email updated. Login email remains unchanged.')
      }
    }
    if ('vat_number' in patch) {
      const msg = await ensureUniqueCompanyValue(
        supabase,
        companyId,
        'vat_number',
        patch.vat_number,
        'This VAT number is already used by another company.'
      )
      if (msg) return json(res, 409, { error: msg })
    }

    const { data: updated, error: updateErr } = await supabase
      .from('companies')
      .update(patch)
      .eq('id', companyId)
      .select('id, name, slug, email, phone, city, vat_number, status')
      .maybeSingle()

    if (updateErr) {
      console.error('[admin-update-company:update]', updateErr)
      return json(res, 500, { error: `Could not update company: ${updateErr.message}` })
    }

    return json(res, 200, { data: { updated: true, company: updated, warnings } })
  } catch (err) {
    console.error('[admin-update-company]', err)
    const msg = err?.message || String(err)
    if (msg.includes('Server misconfiguration')) return json(res, 503, { error: msg })
    return json(res, 500, { error: msg || 'Internal server error.' })
  }
}
