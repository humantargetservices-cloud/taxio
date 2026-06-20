import { ensurePlatformAdminFromBearer } from './_adminAuth.js'
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'

function parseRange(raw) {
  const r = String(raw || '30d')
    .trim()
    .toLowerCase()
  if (r === '7d' || r === '7') return { key: '7d', since: daysAgo(7) }
  if (r === 'all' || r === 'alltime') return { key: 'all', since: null }
  return { key: '30d', since: daysAgo(30) }
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

function emptyCounts() {
  return {
    page_visit: 0,
    qr_scan: 0,
    share_visit: 0,
    whatsapp_click: 0,
    call_click: 0,
    email_click: 0,
  }
}

function aggregateEvents(events) {
  const byCompany = new Map()
  for (const row of events || []) {
    const cid = row.company_id
    if (!cid) continue
    if (!byCompany.has(cid)) {
      byCompany.set(cid, { counts: emptyCounts(), last_activity_at: null })
    }
    const bucket = byCompany.get(cid)
    const type = row.event_type
    if (bucket.counts[type] != null) bucket.counts[type] += 1
    const at = row.created_at
    if (at && (!bucket.last_activity_at || at > bucket.last_activity_at)) {
      bucket.last_activity_at = at
    }
  }
  return byCompany
}

function formatRate(clicks, visits) {
  if (!visits || visits <= 0) return 0
  return Math.round((clicks / visits) * 1000) / 10
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  const envErr = validateSupabaseServiceEnv()
  if (envErr) return json(res, 503, { error: envErr })

  try {
    const supabase = makeSupabaseServiceClient()
    const auth = await ensurePlatformAdminFromBearer(supabase, req.headers.authorization)
    if (!auth.ok) return json(res, 401, { error: auth.error })

    const query = req.query || {}
    const body =
      req.method === 'POST'
        ? typeof req.body === 'string' && req.body
          ? JSON.parse(req.body)
          : req.body || {}
        : {}
    const range = parseRange(query.range || body.range)

    let evQuery = supabase
      .from('company_analytics_events')
      .select('company_id, event_type, created_at')
    if (range.since) evQuery = evQuery.gte('created_at', range.since)

    const { data: events, error: evErr } = await evQuery
    if (evErr) {
      console.error('[admin-company-analytics]', evErr)
      return json(res, 500, { error: evErr.message || 'Failed to load events.' })
    }

    const { data: companies, error: coErr } = await supabase
      .from('companies')
      .select('id, name, slug, status')
      .order('name', { ascending: true })
    if (coErr) {
      console.error('[admin-company-analytics]', coErr)
      return json(res, 500, { error: coErr.message || 'Failed to load companies.' })
    }

    const agg = aggregateEvents(events)

    const rows = (companies || []).map((c) => {
      const bucket = agg.get(c.id) || { counts: emptyCounts(), last_activity_at: null }
      const counts = bucket.counts
      const totalVisits = counts.page_visit
      const whatsappClicks = counts.whatsapp_click
      return {
        company_id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        page_visits: totalVisits,
        qr_scans: counts.qr_scan,
        share_visits: counts.share_visit,
        whatsapp_clicks: whatsappClicks,
        call_clicks: counts.call_click,
        email_clicks: counts.email_click,
        booking_intent_rate: formatRate(whatsappClicks, totalVisits),
        last_activity_at: bucket.last_activity_at,
      }
    })

    rows.sort((a, b) => b.whatsapp_clicks - a.whatsapp_clicks || b.page_visits - a.page_visits)

    return json(res, 200, { ok: true, range: range.key, companies: rows })
  } catch (e) {
    console.error('[admin-company-analytics]', e)
    return json(res, 500, { error: e.message || 'Server error.' })
  }
}
