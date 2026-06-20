import { json, makeSupabaseServiceClient, slugFromCompanyName, validateSupabaseServiceEnv } from './_utils.js'

const VALID_EVENT_TYPES = new Set([
  'page_visit',
  'qr_scan',
  'share_visit',
  'whatsapp_click',
  'call_click',
  'email_click',
])

const MAX_PATH_LEN = 512
const MAX_METADATA_KEYS = 8
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX_PER_COMPANY = 500

function sanitizeSource(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
  if (s === 'qr') return 'qr'
  if (s === 'share') return 'share'
  if (!s || s === 'direct') return 'direct'
  return 'direct'
}

function sanitizeMetadata(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [key, val] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_METADATA_KEYS) break
    const k = String(key || '')
      .trim()
      .slice(0, 40)
    if (!k || k.includes('phone') || k.includes('email') || k.includes('name')) continue
    if (typeof val === 'string') out[k] = val.slice(0, 120)
    else if (typeof val === 'number' && Number.isFinite(val)) out[k] = val
    else if (typeof val === 'boolean') out[k] = val
  }
  return out
}

async function resolveApprovedCompany(supabase, { companyId, slug }) {
  const id = String(companyId || '').trim()
  if (id) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, status, slug')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!data || data.status !== 'approved') return null
    return data
  }
  const normalized = slugFromCompanyName(slug)
  if (!normalized) return null
  const { data, error } = await supabase
    .from('companies')
    .select('id, status, slug')
    .eq('slug', normalized)
    .eq('status', 'approved')
    .maybeSingle()
  if (error) throw error
  return data || null
}

async function isRateLimited(supabase, companyId) {
  const sinceIso = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count, error } = await supabase
    .from('company_analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', sinceIso)
  if (error) return false
  return (count || 0) >= RATE_LIMIT_MAX_PER_COMPANY
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const envErr = validateSupabaseServiceEnv()
  if (envErr) return json(res, 503, { ok: false })

  try {
    const body =
      typeof req.body === 'string' && req.body ? JSON.parse(req.body) : req.body || {}

    const eventType = String(body.event_type || body.eventType || '')
      .trim()
      .toLowerCase()
    if (!VALID_EVENT_TYPES.has(eventType)) {
      return json(res, 400, { ok: false, error: 'Invalid event_type.' })
    }

    const supabase = makeSupabaseServiceClient()
    const company = await resolveApprovedCompany(supabase, {
      companyId: body.company_id || body.companyId,
      slug: body.slug,
    })
    if (!company) return json(res, 404, { ok: false, error: 'Company not found.' })

    if (await isRateLimited(supabase, company.id)) {
      return json(res, 429, { ok: false, error: 'Rate limited.' })
    }

    const sourceRaw = body.source
    const source =
      sourceRaw == null || sourceRaw === ''
        ? null
        : sanitizeSource(sourceRaw)

    const path = String(body.path || '')
      .trim()
      .slice(0, MAX_PATH_LEN) || null

    const metadata = sanitizeMetadata(body.metadata)

    const row = {
      company_id: company.id,
      event_type: eventType,
      source: source === 'direct' ? null : source,
      path,
      metadata,
    }

    const { error } = await supabase.from('company_analytics_events').insert(row)
    if (error) {
      console.error('[track-company-analytics]', error)
      return json(res, 500, { ok: false })
    }

    return json(res, 200, { ok: true })
  } catch (e) {
    console.error('[track-company-analytics]', e)
    return json(res, 500, { ok: false })
  }
}
