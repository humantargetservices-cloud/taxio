/**
 * Rescue Phase 2 final flow proof (JWT): Accept / Refuse→Rescue / B accept / kill switch.
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
  const report = { host, checks: {}, notes: {} }

  await admin.from('taxio_platform_flags').update({ rescue_globally_enabled: true }).eq('id', 1)
  await admin.from('companies').update({ rescue_enabled: true }).in('id', [A.id, B.id])

  const tokenA = await login(A.email, A.password)
  const tokenB = await login(B.email, B.password)
  const sbA = userSb(tokenA)
  const sbB = userSb(tokenB)

  // Normal accept path
  const acceptBooking = await admin
    .from('booking_requests')
    .insert({
      company_id: A.id,
      customer_name: 'Fake Accept Rider',
      customer_phone: '0470555666',
      pickup_address: 'Brussels Airport, 1930 Zaventem',
      dropoff_address: 'Leuven station, 3000 Leuven',
      car_type: 'Standard',
      service_type: 'standard',
      status: 'new',
      notes: 'Estimate: 28.0 km, 35 min, €35',
      rider_terms_accepted: true,
      rider_terms_accepted_at: new Date().toISOString(),
      rider_terms_version: 'taxio-rider-terms-2026-04-v2+taxio-privacy-2026-04',
    })
    .select('id')
    .maybeSingle()
  const accUpd = await sbA
    .from('booking_requests')
    .update({ status: 'accepted' })
    .eq('id', acceptBooking.data.id)
    .eq('company_id', A.id)
  report.checks.acceptFlow = !accUpd.error
  const { data: noRescueOnAccept } = await admin
    .from('rescue_requests')
    .select('id')
    .eq('booking_request_id', acceptBooking.data.id)
    .maybeSingle()
  report.checks.acceptDoesNotRescue = !noRescueOnAccept

  // Refuse → Rescue
  const refuseBooking = await admin
    .from('booking_requests')
    .insert({
      company_id: A.id,
      customer_name: 'Fake Refuse Rider',
      customer_phone: '0470666777',
      pickup_address: 'Brussels Airport, 1930 Zaventem',
      dropoff_address: 'Leuven centrum, 3000 Leuven',
      car_type: 'Standard',
      service_type: 'standard',
      status: 'new',
      notes: 'Estimate: 30.0 km, 40 min, €35',
      rider_terms_accepted: true,
      rider_terms_accepted_at: new Date().toISOString(),
      rider_terms_version: 'taxio-rider-terms-2026-04-v2+taxio-privacy-2026-04',
    })
    .select('id')
    .maybeSingle()

  const act = await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: refuseBooking.data.id,
    p_company_id: A.id,
  })
  report.checks.refuseActivatesRescue = !!(act.data?.ok && act.data.code === 'OPEN')
  const rescueId = act.data?.rescue_request_id
  report.notes.previewPrice = act.data?.preview_estimated_price || null
  report.notes.priceColumnReady = act.data?.preview_estimated_price === '€35'
  report.notes.priceMissingReason = report.notes.priceColumnReady
    ? null
    : 'booking_requests has no estimated_price column; price only appears if notes contain Estimate…€N and preview_estimated_price migration is applied'

  await sbA.from('booking_requests').update({ status: 'rejected' }).eq('id', refuseBooking.data.id).eq('company_id', A.id)

  const { data: opp, error: oppErr } = await sbB
    .from('rescue_opportunities')
    .select(
      'id,status,rescue:rescue_requests(status,preview_pickup_label,preview_dropoff_label)'
    )
    .eq('company_id', B.id)
    .eq('rescue_request_id', rescueId)
    .maybeSingle()
  report.checks.bSeesOpportunity = !oppErr && !!opp && (opp.status === 'OFFERED' || opp.status === 'ACCEPTED')
  // Opportunity row must exist before accept; status may race if prior step slowed
  if (!report.checks.bSeesOpportunity && !oppErr) {
    // re-check after accept path already ran? keep false
  }
  report.notes.oppErr = oppErr?.message || null
  report.checks.privacyBeforeAccept =
    !!opp &&
    !JSON.stringify(opp).includes('Fake Refuse Rider') &&
    !JSON.stringify(opp).includes('0470666777')

  const accept = await sbB.rpc('accept_rescue_request', {
    p_rescue_request_id: rescueId,
    p_company_id: B.id,
  })
  report.checks.atomicAccept = !!(accept.data?.ok && accept.data.code === 'ACCEPTED')

  const late = await sbB.rpc('accept_rescue_request', {
    p_rescue_request_id: rescueId,
    p_company_id: B.id,
  })
  report.checks.secondAcceptTaken = late.data?.code === 'ALREADY_TAKEN'

  const details = await sbB.rpc('get_rescue_booking_details', { p_rescue_request_id: rescueId })
  report.checks.passengerDetailsAfter = !!(details.data?.ok && details.data.booking?.customer_phone)

  const { data: finalR } = await admin
    .from('rescue_requests')
    .select('status,original_company_id,accepted_by_company_id')
    .eq('id', rescueId)
    .maybeSingle()
  const { data: bookingAfter } = await admin
    .from('booking_requests')
    .select('company_id,status')
    .eq('id', refuseBooking.data.id)
    .maybeSingle()
  report.checks.originalPreserved =
    finalR?.original_company_id === A.id && bookingAfter?.company_id === A.id
  report.checks.aSeesWinner = finalR?.accepted_by_company_id === B.id

  // company rescue disabled
  await admin.from('companies').update({ rescue_enabled: false }).eq('id', A.id)
  const b3 = await admin
    .from('booking_requests')
    .insert({
      company_id: A.id,
      customer_name: 'Fake Disabled',
      customer_phone: '0470777888',
      pickup_address: 'Gent A',
      dropoff_address: 'Gent B',
      car_type: 'Standard',
      service_type: 'standard',
      status: 'new',
      rider_terms_accepted: true,
      rider_terms_accepted_at: new Date().toISOString(),
      rider_terms_version: 'taxio-rider-terms-2026-04-v2+taxio-privacy-2026-04',
    })
    .select('id')
    .maybeSingle()
  const disabledAct = await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: b3.data.id,
    p_company_id: A.id,
  })
  report.checks.rescueDisabled = disabledAct.data?.code === 'COMPANY_RESCUE_DISABLED'
  await admin.from('companies').update({ rescue_enabled: true }).eq('id', A.id)

  await admin.from('taxio_platform_flags').update({ rescue_globally_enabled: false }).eq('id', 1)
  const b4 = await admin
    .from('booking_requests')
    .insert({
      company_id: A.id,
      customer_name: 'Fake Kill',
      customer_phone: '0470888999',
      pickup_address: 'Gent C',
      dropoff_address: 'Gent D',
      car_type: 'Standard',
      service_type: 'standard',
      status: 'new',
      rider_terms_accepted: true,
      rider_terms_accepted_at: new Date().toISOString(),
      rider_terms_version: 'taxio-rider-terms-2026-04-v2+taxio-privacy-2026-04',
    })
    .select('id')
    .maybeSingle()
  const killAct = await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: b4.data.id,
    p_company_id: A.id,
  })
  report.checks.killSwitch = killAct.data?.code === 'RESCUE_GLOBALLY_DISABLED'
  await admin.from('taxio_platform_flags').update({ rescue_globally_enabled: true }).eq('id', 1)

  report.checks.normalBookingRows = !!acceptBooking.data?.id && !!refuseBooking.data?.id

  // RLS recursion regression
  const listOk = await sbB.from('rescue_opportunities').select('id').eq('company_id', B.id).limit(1)
  report.checks.rlsNoRecursion = !listOk.error

  report.pass = [
    'acceptFlow',
    'acceptDoesNotRescue',
    'refuseActivatesRescue',
    'bSeesOpportunity',
    'privacyBeforeAccept',
    'atomicAccept',
    'secondAcceptTaken',
    'passengerDetailsAfter',
    'originalPreserved',
    'aSeesWinner',
    'rescueDisabled',
    'killSwitch',
    'normalBookingRows',
    'rlsNoRecursion',
  ].every((k) => report.checks[k])

  console.log(JSON.stringify(report, null, 2))
  process.exit(report.pass ? 0 : 1)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e.message || e) }, null, 2))
  process.exit(1)
})
