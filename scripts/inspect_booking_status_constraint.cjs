/**
 * Read-only/staging: inspect booking_requests_status_check allowed values.
 * Staging Supabase ONLY (lyjicuuyrvblbsqlduqg).
 */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function parseEnv(p) {
  const out = {}
  if (!fs.existsSync(p)) return out
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out[t.slice(0, i).trim()] = v
  }
  return out
}

const root = path.join(__dirname, '..')
const env = { ...parseEnv(path.join(root, '.env')), ...parseEnv(path.join(root, '.env.local')) }
const url = String(env.SUPABASE_URL || '').replace(/\/$/, '')
if (!url.includes('lyjicuuyrvblbsqlduqg')) {
  console.log(JSON.stringify({ fatal: 'staging only', url }))
  process.exit(1)
}

const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

;(async () => {
  const report = { host: new URL(url).hostname }

  // Probe draft insert — captures live check constraint rejection text.
  const { data: cos } = await admin.from('companies').select('id').eq('status', 'approved').limit(1)
  const companyId = cos?.[0]?.id || null
  report.companyId = companyId

  if (companyId) {
    const { data, error } = await admin
      .from('booking_requests')
      .insert({
        company_id: companyId,
        status: 'draft',
        pickup_address: 'constraint probe draft',
        dropoff_address: 'constraint probe drop',
        customer_name: 'probe',
        customer_phone: '',
      })
      .select('id,status,decision_deadline_at')
      .maybeSingle()
    report.draftInsert = {
      ok: !error,
      row: data || null,
      error: error
        ? { message: error.message, code: error.code, details: error.details, hint: error.hint }
        : null,
    }
    if (data?.id) {
      await admin.from('booking_requests').delete().eq('id', data.id)
    }
  }

  // Probe each candidate status to discover allowed set empirically if needed.
  const candidates = ['new', 'reviewed', 'accepted', 'rejected', 'draft', 'pending', 'cancelled']
  const allowed = []
  const denied = []
  if (companyId) {
    for (const st of candidates) {
      const { data, error } = await admin
        .from('booking_requests')
        .insert({
          company_id: companyId,
          status: st,
          pickup_address: `constraint probe ${st}`,
          dropoff_address: 'constraint probe drop',
          customer_name: 'probe',
          customer_phone: '',
        })
        .select('id,status')
        .maybeSingle()
      if (!error && data?.id) {
        allowed.push(st)
        await admin.from('booking_requests').delete().eq('id', data.id)
      } else {
        denied.push({ status: st, message: error?.message || 'unknown' })
      }
    }
  }
  report.allowedByProbe = allowed
  report.deniedByProbe = denied

  const { data: statuses } = await admin.from('booking_requests').select('status').limit(2000)
  report.statusesInUse = [...new Set((statuses || []).map((r) => r.status))].sort()

  // Repo schema.sql (for comparison only; not authoritative for staging)
  const schemaPath = path.join(root, 'supabase', 'schema.sql')
  const schema = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf8') : ''
  const m = schema.match(/booking_requests[\s\S]{0,800}?CHECK \(status IN \(([^)]+)\)\)/)
  report.repoSchemaSqlCheck = m ? m[1] : null

  report.draftSupported = allowed.includes('draft')
  report.pass = report.draftSupported === true
  console.log(JSON.stringify(report, null, 2))
  process.exit(report.pass ? 0 : 2)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e.stack || e) }, null, 2))
  process.exit(1)
})
