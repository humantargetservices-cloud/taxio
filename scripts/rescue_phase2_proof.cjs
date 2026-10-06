/**
 * Rescue Phase 2 — staging proof of UI data paths (no browser).
 * Exercises enable, activate, opportunity list (safe fields), accept, lost race,
 * winner details, kill switch, normal booking.
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
const host = new URL(url).hostname
if (String(env.TAXIO_STAGING || '').toLowerCase() !== 'true' || !host.includes('lyjicuuyrvblbsqlduqg')) {
  console.log(JSON.stringify({ fatal: 'staging only' }))
  process.exit(1)
}

const A = {
  id: '27c589cc-ea6e-4264-99c6-3710a1c1defe',
  email: 'owner.v001.staging@example.com',
  password: 'Txio!OwnerA_V00199',
}
const B = {
  id: 'cc0c86e8-ff8e-41a8-84e8-a8af6fc5f358',
  email: 'owner.b.v001.staging@example.com',
  password: 'Txio!OwnerB_V00199',
}

const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function userSb(token) {
  return createClient(url, env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function login(email, password) {
  const anon = createClient(url, env.VITE_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await anon.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data.session.access_token
}

;(async () => {
  const report = { host, checks: {} }

  await admin.from('taxio_platform_flags').update({ rescue_globally_enabled: true }).eq('id', 1)
  await admin.from('companies').update({ rescue_enabled: true }).in('id', [A.id, B.id])

  // Owner can toggle rescue_enabled (same path as UI)
  const tokenA = await login(A.email, A.password)
  const sbA = userSb(tokenA)
  const toggle = await sbA.from('companies').update({ rescue_enabled: true }).eq('id', A.id)
  report.checks.rescueEnableUpdate = !toggle.error

  const bookingIns = await admin
    .from('booking_requests')
    .insert({
      company_id: A.id,
      customer_name: 'Fake Rider Phase2',
      customer_phone: '0470222333',
      customer_email: 'fake.phase2@example.com',
      pickup_address: 'Groentenmarkt 2, 9000 Gent',
      dropoff_address: 'Gent-Sint-Pieters, 9000 Gent',
      car_type: 'Standard',
      service_type: 'standard',
      status: 'new',
      rider_terms_accepted: true,
      rider_terms_accepted_at: new Date().toISOString(),
      rider_terms_version: 'taxio-rider-terms-2026-04-v2+taxio-privacy-2026-04',
    })
    .select('id,company_id')
    .maybeSingle()
  if (bookingIns.error) throw new Error(bookingIns.error.message)
  const bookingId = bookingIns.data.id
  report.checks.bookingOwnedByA = bookingIns.data.company_id === A.id

  const act = await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: bookingId,
    p_company_id: A.id,
  })
  report.checks.activation = !!(act.data?.ok && act.data.code === 'OPEN')
  const rescueId = act.data?.rescue_request_id

  // B lists opportunities the same way UI does (embedded rescue preview, no PII columns)
  const tokenB = await login(B.email, B.password)
  const sbB = userSb(tokenB)
  const { data: opps, error: oppErr } = await sbB
    .from('rescue_opportunities')
    .select(
      `id,status,rescue_request_id,rescue:rescue_requests(id,status,preview_pickup_label,preview_dropoff_label,preview_car_type,preview_service_type,preview_ride_datetime)`
    )
    .eq('company_id', B.id)
    .eq('rescue_request_id', rescueId)
    .maybeSingle()
  report.checks.opportunityQuery = !oppErr && !!opps
  report.checks.opportunitySafe =
    !!opps?.rescue?.preview_pickup_label &&
    !JSON.stringify(opps).includes('Fake Rider') &&
    !JSON.stringify(opps).includes('0470222333')

  const [accept1, accept2] = await Promise.all([
    sbB.rpc('accept_rescue_request', { p_rescue_request_id: rescueId, p_company_id: B.id }),
    sbB.rpc('accept_rescue_request', { p_rescue_request_id: rescueId, p_company_id: B.id }),
  ])
  const codes = [accept1.data?.code, accept2.data?.code].sort()
  report.checks.doubleClickAccept = codes.includes('ACCEPTED') && codes.includes('ALREADY_TAKEN')

  const { data: finalR } = await admin
    .from('rescue_requests')
    .select('status,original_company_id,accepted_by_company_id,booking_request_id')
    .eq('id', rescueId)
    .maybeSingle()
  report.checks.accepted = finalR?.status === 'ACCEPTED'
  report.checks.winnerB = finalR?.accepted_by_company_id === B.id
  report.checks.originalA = finalR?.original_company_id === A.id

  const { data: bookingAfter } = await admin
    .from('booking_requests')
    .select('company_id,status,customer_phone')
    .eq('id', bookingId)
    .maybeSingle()
  report.checks.bookingOwnerPreserved = bookingAfter?.company_id === A.id

  const detailsB = await sbB.rpc('get_rescue_booking_details', { p_rescue_request_id: rescueId })
  report.checks.winnerDetails = !!(detailsB.data?.ok && detailsB.data.booking?.customer_phone)

  // A sees accepted outbound with winner company id
  const { data: outA } = await sbA
    .from('rescue_requests')
    .select('status,accepted_by_company_id')
    .eq('id', rescueId)
    .maybeSingle()
  report.checks.originSeesAccepted = outA?.status === 'ACCEPTED' && outA?.accepted_by_company_id === B.id

  // Kill switch
  await admin.from('taxio_platform_flags').update({ rescue_globally_enabled: false }).eq('id', 1)
  const booking2 = await admin
    .from('booking_requests')
    .insert({
      company_id: A.id,
      customer_name: 'Fake Rider Kill',
      customer_phone: '0470333444',
      pickup_address: 'Korenmarkt 3, 9000 Gent',
      dropoff_address: 'Station Gent, 9000 Gent',
      car_type: 'Standard',
      service_type: 'standard',
      status: 'new',
      rider_terms_accepted: true,
      rider_terms_accepted_at: new Date().toISOString(),
      rider_terms_version: 'taxio-rider-terms-2026-04-v2+taxio-privacy-2026-04',
    })
    .select('id')
    .maybeSingle()
  const blocked = await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: booking2.data.id,
    p_company_id: A.id,
  })
  report.checks.killSwitchBlocks = blocked.data?.code === 'RESCUE_GLOBALLY_DISABLED'
  await admin.from('taxio_platform_flags').update({ rescue_globally_enabled: true }).eq('id', 1)

  report.checks.normalBooking = !!booking2.data?.id && !booking2.error

  report.pass = Object.values(report.checks).every(Boolean)
  console.log(JSON.stringify(report, null, 2))
  process.exit(report.pass ? 0 : 1)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e.message || e) }, null, 2))
  process.exit(1)
})
