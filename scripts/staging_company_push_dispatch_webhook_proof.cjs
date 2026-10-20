/**
 * STAGING ONLY — prove company-push-dispatch accepts Supabase webhook envelope.
 *
 * Env:
 *   COMPANY_PUSH_WEBHOOK_SECRET
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (find a PENDING outbox)
 *   STAGING_APP_ORIGIN (default https://staging.taxio.be)
 *
 * Usage:
 *   node scripts/staging_company_push_dispatch_webhook_proof.cjs
 *   node scripts/staging_company_push_dispatch_webhook_proof.cjs <outbox_id>
 */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnvFile(name) {
  try {
    const p = path.resolve(process.cwd(), name)
    const raw = fs.readFileSync(p, 'utf8')
    for (const line of raw.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq < 1) continue
      const key = t.slice(0, eq).trim()
      let val = t.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (key && process.env[key] == null) process.env[key] = val
    }
  } catch {
    /* ok */
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')
// Optional: vercel pull output
loadEnvFile('.env.vercel.staging')

async function main() {
  const secret = String(process.env.COMPANY_PUSH_WEBHOOK_SECRET || '').trim()
  if (!secret) {
    console.error(JSON.stringify({ fatal: 'COMPANY_PUSH_WEBHOOK_SECRET missing locally' }))
    process.exit(1)
  }

  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url.includes('lyjicuuyrvblbsqlduqg') || !key) {
    console.error(JSON.stringify({ fatal: 'staging supabase env required' }))
    process.exit(1)
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const forcedId = String(process.argv[2] || '').trim()
  let row = null
  if (forcedId) {
    const { data, error } = await admin
      .from('company_push_outbox')
      .select('*')
      .eq('id', forcedId)
      .maybeSingle()
    if (error) throw error
    row = data
  } else {
    const { data, error } = await admin
      .from('company_push_outbox')
      .select('*')
      .eq('event_type', 'COMPANY_BOOKING_NEW')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) throw error
    row = (data || [])[0] || null
  }

  if (!row) {
    console.error(JSON.stringify({ fatal: 'no PENDING COMPANY_BOOKING_NEW outbox row' }))
    process.exit(1)
  }

  const before = {
    id: row.id,
    status: row.status,
    event_type: row.event_type,
    dedupe_key: row.dedupe_key,
    attempt_count: row.attempt_count,
  }

  const { count: subCount } = await admin
    .from('company_push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', row.company_id)
    .eq('enabled', true)

  const origin = String(
    process.env.STAGING_APP_ORIGIN || process.env.PUBLIC_APP_ORIGIN || 'https://staging.taxio.be'
  )
    .trim()
    .replace(/\/$/, '')

  // Supabase Database Webhook INSERT envelope shape
  const envelope = {
    type: 'INSERT',
    table: 'company_push_outbox',
    schema: 'public',
    record: {
      id: row.id,
      company_id: 'SHOULD_BE_IGNORED',
      event_type: 'SHOULD_BE_IGNORED',
      dedupe_key: row.dedupe_key,
      status: 'PENDING',
    },
    old_record: null,
  }

  const res = await fetch(`${origin}/api/company-push-dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-taxio-push-secret': secret,
    },
    body: JSON.stringify(envelope),
  })
  const text = await res.text()
  let jsonBody = {}
  try {
    jsonBody = JSON.parse(text)
  } catch {
    jsonBody = { raw: text.slice(0, 200) }
  }

  const { data: afterRow } = await admin
    .from('company_push_outbox')
    .select('id,status,attempt_count,sent_at,last_error')
    .eq('id', row.id)
    .maybeSingle()

  console.log(
    JSON.stringify(
      {
        origin,
        before,
        enabled_subscriptions_for_company: subCount ?? 0,
        http: res.status,
        dispatch: jsonBody,
        after: afterRow,
      },
      null,
      2
    )
  )

  const ok =
    res.status === 200 &&
    (jsonBody.code === 'SENT' || jsonBody.code === 'ALREADY_SENT') &&
    afterRow?.status === 'SENT'
  process.exit(ok ? 0 : 2)
}

main().catch((e) => {
  console.error(JSON.stringify({ fatal: String(e.message || e) }))
  process.exit(1)
})
