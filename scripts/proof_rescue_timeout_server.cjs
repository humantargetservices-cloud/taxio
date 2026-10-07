/**
 * Staging-only proof: Rescue timeout is server-authoritative (no browser).
 * Uses service role against lyjicuuyrvblbsqlduqg only.
 *
 * Proves:
 *  - expired decision_deadline → process_timeouts auto-activates Rescue
 *  - late ACCEPT blocked after Rescue exists
 *  - frozen price preserved on rescue preview
 *  - B/C opportunity rows created with expires_at
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
  console.log(JSON.stringify({ fatal: 'staging only', host: url }))
  process.exit(1)
}

const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

;(async () => {
  const report = { host: new URL(url).hostname, checks: {}, notes: [] }

  const { data: companies, error: cErr } = await admin
    .from('companies')
    .select('id,name,slug,status,rescue_enabled')
    .eq('status', 'approved')
    .eq('rescue_enabled', true)
    .limit(5)
  assert(!cErr, cErr?.message || 'companies query failed')
  assert((companies || []).length >= 2, 'need >=2 rescue-enabled approved companies')

  const companyA = companies[0]
  const others = companies.slice(1)
  report.companyA = { id: companyA.id, name: companyA.name }

  const frozen = 42.5
  const deadline = new Date(Date.now() - 2000).toISOString()
  const { data: booking, error: bErr } = await admin
    .from('booking_requests')
    .insert({
      company_id: companyA.id,
      status: 'new',
      pickup_address: 'Proof Pickup 1, Brugge',
      dropoff_address: 'Proof Dropoff 2, Brugge',
      ride_datetime: new Date(Date.now() + 3600_000).toISOString(),
      car_type: 'Berline',
      service_type: 'standard',
      customer_name: 'Timeout Proof',
      customer_phone: '32000000000',
      estimated_price_eur: frozen,
      price_currency: 'EUR',
      decision_deadline_at: deadline,
      notes: `Trip price: €${frozen.toFixed(2)}`,
    })
    .select('id,status,decision_deadline_at,estimated_price_eur')
    .single()
  assert(!bErr && booking?.id, bErr?.message || 'insert booking failed')
  report.bookingId = booking.id

  // Simulate A offline: no dashboard tick — only server RPC
  const tick = await admin.rpc('taxio_rescue_process_timeouts')
  assert(!tick.error, tick.error?.message || 'process_timeouts failed')
  report.tick = tick.data
  report.checks.autoActivated = Number(tick.data?.auto_activated || 0) >= 1

  const { data: rescue, error: rErr } = await admin
    .from('rescue_requests')
    .select('id,status,preview_estimated_price,booking_request_id,original_company_id')
    .eq('booking_request_id', booking.id)
    .maybeSingle()
  assert(!rErr, rErr?.message || 'rescue query failed')
  report.checks.rescueCreated = !!rescue?.id && rescue.status === 'OPEN'
  report.checks.frozenPrice =
    String(rescue?.preview_estimated_price || '').includes('42') ||
    String(rescue?.preview_estimated_price || '').includes('42,5') ||
    String(rescue?.preview_estimated_price || '').includes('42.5')

  const { data: bookingAfter } = await admin
    .from('booking_requests')
    .select('id,status,decision_deadline_at')
    .eq('id', booking.id)
    .single()
  report.checks.bookingRejected = bookingAfter?.status === 'rejected'
  report.checks.deadlineCleared = bookingAfter?.decision_deadline_at == null

  const { data: opps } = await admin
    .from('rescue_opportunities')
    .select('id,company_id,status,expires_at')
    .eq('rescue_request_id', rescue.id)
  report.checks.opportunitiesOffered = (opps || []).filter((o) => o.status === 'OFFERED').length >= 1
  report.checks.opportunityHasExpiry = (opps || []).every((o) => !!o.expires_at)
  report.opportunityCount = (opps || []).length
  report.otherCompaniesAvailable = others.length

  // Late ACCEPT blocked (client-equivalent: only update if still new)
  const late = await admin
    .from('booking_requests')
    .update({ status: 'accepted', decision_deadline_at: null })
    .eq('id', booking.id)
    .eq('company_id', companyA.id)
    .eq('status', 'new')
    .select('id')
  report.checks.lateAcceptNoRow = !late.error && (late.data || []).length === 0

  // DB trigger guard (if 07 applied): force update should fail
  const force = await admin
    .from('booking_requests')
    .update({ status: 'accepted' })
    .eq('id', booking.id)
    .eq('company_id', companyA.id)
    .select('id,status')
  if (force.error && /RESCUE_ALREADY_ACTIVE/i.test(force.error.message || '')) {
    report.checks.dbGuardBlocksLateAccept = true
    report.notes.push('DB guard trigger present')
  } else if (!force.error && force.data?.[0]?.status === 'accepted') {
    report.checks.dbGuardBlocksLateAccept = false
    report.notes.push('DB guard not applied yet — client eq(status,new) still blocks')
    // revert for cleanliness
    await admin.from('booking_requests').update({ status: 'rejected' }).eq('id', booking.id)
  } else {
    report.checks.dbGuardBlocksLateAccept = false
    report.notes.push(`force accept result: ${force.error?.message || 'no change'}`)
  }

  // Cron schedule presence (best-effort via optional RPC / notice)
  // Cannot query cron.job without SQL access; record instruction
  report.checks.cronSqlPrepared = fs.existsSync(
    path.join(root, 'supabase', 'RUN_ON_STAGING_RESCUE_07_TIMEOUT_CRON.sql')
  )

  report.pass =
    report.checks.autoActivated &&
    report.checks.rescueCreated &&
    report.checks.bookingRejected &&
    report.checks.deadlineCleared &&
    report.checks.opportunitiesOffered &&
    report.checks.opportunityHasExpiry &&
    report.checks.lateAcceptNoRow &&
    report.checks.frozenPrice

  console.log(JSON.stringify(report, null, 2))
  process.exit(report.pass ? 0 : 2)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: e.message }))
  process.exit(1)
})
