/**
 * Staging only: clear passenger_confirm_whatsapp_sent_at on WAITING rescues
 * so failed/undelivered sends can retry after webhook/outbound fix.
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
  console.log(JSON.stringify({ fatal: 'staging only' }))
  process.exit(1)
}

const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

;(async () => {
  const { data: rows, error } = await admin
    .from('rescue_requests')
    .select('id,passenger_confirm_whatsapp_sent_at')
    .eq('status', 'ACCEPTED')
    .eq('passenger_confirm_status', 'WAITING_PASSENGER_CONFIRMATION')
    .not('passenger_confirm_whatsapp_sent_at', 'is', null)

  if (error) {
    console.log(JSON.stringify({ error: error.message }))
    process.exit(1)
  }
  const ids = (rows || []).map((r) => r.id)
  if (!ids.length) {
    console.log(JSON.stringify({ cleared: 0 }))
    return
  }
  const { data: cleared, error: upErr } = await admin
    .from('rescue_requests')
    .update({ passenger_confirm_whatsapp_sent_at: null })
    .in('id', ids)
    .eq('passenger_confirm_status', 'WAITING_PASSENGER_CONFIRMATION')
    .select('id')
  if (upErr) {
    console.log(JSON.stringify({ error: upErr.message }))
    process.exit(1)
  }
  console.log(JSON.stringify({ cleared: (cleared || []).length, ids: (cleared || []).map((r) => r.id) }))
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e.stack || e) }))
  process.exit(1)
})
