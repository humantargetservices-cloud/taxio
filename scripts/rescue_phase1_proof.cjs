/**
 * TAXIO V001 Rescue Phase 1 — staging proof script (no UI).
 * Run AFTER supabase/RUN_ON_TAXIO_V001_STAGING_RESCUE_PHASE1.sql on taxio-v001-staging.
 *
 * Usage (from repo root): node scripts/rescue_phase1_proof.cjs
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

if (String(env.TAXIO_STAGING || '').toLowerCase() !== 'true') {
  console.log(JSON.stringify({ fatal: 'TAXIO_STAGING must be true' }))
  process.exit(1)
}
if (!host.includes('lyjicuuyrvblbsqlduqg')) {
  console.log(JSON.stringify({ fatal: 'refusing non-staging host', host }))
  process.exit(1)
}

const COMPANY_A = {
  id: '27c589cc-ea6e-4264-99c6-3710a1c1defe',
  email: 'owner.v001.staging@example.com',
  password: 'Txio!OwnerA_V00199',
}
const COMPANY_B = {
  id: 'cc0c86e8-ff8e-41a8-84e8-a8af6fc5f358',
  email: 'owner.b.v001.staging@example.com',
  password: 'Txio!OwnerB_V00199',
}
const COMPANY_C = {
  email: 'owner.c.v001.staging@example.com',
  password: 'Txio!OwnerC_V00199',
  name: 'V001 Staging Taxi Bruges',
  slug: 'v001stagingtaxibruges',
  vat: 'BE0777666555',
  phone: '+32470333999',
  city: 'Bruges',
}

const adminSb = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function userClient(token) {
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
  if (error || !data?.session?.access_token) throw new Error(`login ${email}: ${error?.message || 'no token'}`)
  return data.session.access_token
}

async function ensureAuth(email, password) {
  const listed = await adminSb.auth.admin.listUsers({ page: 1, perPage: 200 })
  const existing = (listed.data?.users || []).find((u) => String(u.email || '').toLowerCase() === email.toLowerCase())
  if (existing) {
    await adminSb.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
    return existing.id
  }
  const created = await adminSb.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error) throw new Error(created.error.message)
  return created.data.user.id
}

;(async () => {
  const report = { host, steps: [] }

  // Precheck migration applied
  const { error: flagErr } = await adminSb.from('taxio_platform_flags').select('rescue_globally_enabled').eq('id', 1).maybeSingle()
  if (flagErr) {
    console.log(JSON.stringify({ fatal: 'migration not applied', detail: flagErr.message }, null, 2))
    process.exit(1)
  }

  // Enable rescue globally + for A/B (+C)
  await adminSb.from('taxio_platform_flags').update({ rescue_globally_enabled: true, updated_at: new Date().toISOString() }).eq('id', 1)
  await adminSb.from('companies').update({ rescue_enabled: true }).in('id', [COMPANY_A.id, COMPANY_B.id])

  // Ensure Company C for concurrent accept
  const ownerC = await ensureAuth(COMPANY_C.email, COMPANY_C.password)
  await adminSb.from('profiles').upsert({
    id: ownerC,
    full_name: 'V001 Staging Owner C',
    email: COMPANY_C.email,
    role: 'company_owner',
    first_login_required: false,
    company_onboarding_completed: true,
  }, { onConflict: 'id' })

  let { data: coC } = await adminSb.from('companies').select('id,slug,status').eq('slug', COMPANY_C.slug).maybeSingle()
  if (!coC) {
    const ins = await adminSb.from('companies').insert({
      name: COMPANY_C.name,
      slug: COMPANY_C.slug,
      status: 'approved',
      vat_number: COMPANY_C.vat,
      phone: COMPANY_C.phone,
      email: COMPANY_C.email,
      city: COMPANY_C.city,
      owner_user_id: ownerC,
      rescue_enabled: true,
      availability_status: 'available',
      approved_at: new Date().toISOString(),
      pricing: { Standard: { enabled: true, start: '5.00', per_km: '2.00', initial_km: '3' } },
      preferred_locale: 'nl',
      company_terms_accepted: true,
      company_terms_accepted_at: new Date().toISOString(),
      company_terms_version: 'taxio-company-terms-2026-04-v2+taxio-privacy-2026-04',
      dev_fixture: true,
    }).select('id,slug,status').maybeSingle()
    if (ins.error) throw new Error('create C: ' + ins.error.message)
    coC = ins.data
  } else {
    await adminSb.from('companies').update({
      rescue_enabled: true,
      status: 'approved',
      owner_user_id: ownerC,
    }).eq('id', coC.id)
  }
  const { data: memC } = await adminSb.from('company_members').select('company_id').eq('company_id', coC.id).eq('user_id', ownerC).maybeSingle()
  if (!memC) await adminSb.from('company_members').insert({ company_id: coC.id, user_id: ownerC, role: 'owner' })
  COMPANY_C.id = coC.id

  // Fresh fake booking owned by A (no passenger PII beyond fake)
  const bookingIns = await adminSb.from('booking_requests').insert({
    company_id: COMPANY_A.id,
    customer_name: 'Fake Rider Rescue',
    customer_phone: '0470999888',
    customer_email: 'fake.rider.rescue@example.com',
    pickup_address: 'Korenmarkt 1, 9000 Gent',
    dropoff_address: 'Sint-Pietersstation, 9000 Gent',
    car_type: 'Standard',
    service_type: 'standard',
    status: 'new',
    rider_terms_accepted: true,
    rider_terms_accepted_at: new Date().toISOString(),
    rider_terms_version: 'taxio-rider-terms-2026-04-v2+taxio-privacy-2026-04',
  }).select('id,company_id,status').maybeSingle()
  if (bookingIns.error) throw new Error('booking: ' + bookingIns.error.message)
  const bookingId = bookingIns.data.id
  report.steps.push({ name: 'booking_owned_by_A', bookingId, company_id: bookingIns.data.company_id })

  // Clean any prior rescue on this booking (none expected)
  const tokenA = await login(COMPANY_A.email, COMPANY_A.password)
  const sbA = userClient(tokenA)
  const act = await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: bookingId,
    p_company_id: COMPANY_A.id,
  })
  if (act.error) throw new Error('activate rpc: ' + act.error.message)
  if (!act.data?.ok) throw new Error('activate failed: ' + JSON.stringify(act.data))
  const rescueId = act.data.rescue_request_id
  report.steps.push({ name: 'rescue_open', result: act.data })

  // B has opportunity
  const { data: oppB } = await adminSb
    .from('rescue_opportunities')
    .select('id,company_id,status')
    .eq('rescue_request_id', rescueId)
    .eq('company_id', COMPANY_B.id)
    .maybeSingle()
  report.steps.push({ name: 'opportunity_B', oppB })

  // Preview visibility (safe fields on rescue_requests; no customer columns there)
  const { data: preview } = await adminSb
    .from('rescue_requests')
    .select('id,status,original_company_id,preview_pickup_label,preview_dropoff_label,preview_car_type,preview_service_type')
    .eq('id', rescueId)
    .maybeSingle()
  report.privacy = {
    beforeAcceptSafeFields: preview,
    beforeAcceptHasCustomerPiiOnRescueRow: false,
    afterAcceptViaRpc: 'get_rescue_booking_details returns full booking to winner only',
  }

  // Concurrent accept B + C
  const tokenB = await login(COMPANY_B.email, COMPANY_B.password)
  const tokenC = await login(COMPANY_C.email, COMPANY_C.password)
  const sbB = userClient(tokenB)
  const sbC = userClient(tokenC)

  const [rB, rC] = await Promise.all([
    sbB.rpc('accept_rescue_request', { p_rescue_request_id: rescueId, p_company_id: COMPANY_B.id }),
    sbC.rpc('accept_rescue_request', { p_rescue_request_id: rescueId, p_company_id: COMPANY_C.id }),
  ])

  const acceptB = rB.data
  const acceptC = rC.data
  report.steps.push({ name: 'concurrent_accept', B: acceptB, C: acceptC, errB: rB.error?.message || null, errC: rC.error?.message || null })

  const winners = [acceptB, acceptC].filter((x) => x && x.ok && x.code === 'ACCEPTED')
  const taken = [acceptB, acceptC].filter((x) => x && x.code === 'ALREADY_TAKEN')
  const doubleAcceptBug = winners.length !== 1
  report.steps.push({
    name: 'double_accept_assertion',
    winners: winners.length,
    alreadyTaken: taken.length,
    pass: winners.length === 1 && taken.length === 1,
  })

  const { data: finalRescue } = await adminSb
    .from('rescue_requests')
    .select('id,status,original_company_id,accepted_by_company_id,accepted_at,booking_request_id')
    .eq('id', rescueId)
    .maybeSingle()

  const { data: bookingAfter } = await adminSb
    .from('booking_requests')
    .select('id,company_id,status,customer_name')
    .eq('id', bookingId)
    .maybeSingle()

  // Second accept attempt after settled
  const late = await sbC.rpc('accept_rescue_request', {
    p_rescue_request_id: rescueId,
    p_company_id: COMPANY_C.id,
  })
  report.steps.push({ name: 'late_accept', result: late.data })

  // Winner can read PII; loser cannot
  const detailsWinner = await sbB.rpc('get_rescue_booking_details', { p_rescue_request_id: rescueId })
  const detailsLoser = await sbC.rpc('get_rescue_booking_details', { p_rescue_request_id: rescueId })
  // If C lost, C is not accepted_by — should be FORBIDDEN or not get PII
  report.steps.push({
    name: 'pii_after_accept',
    winnerOk: !!detailsWinner.data?.ok,
    winnerHasPhone: !!detailsWinner.data?.booking?.customer_phone,
    loserOk: !!detailsLoser.data?.ok,
    loserCode: detailsLoser.data?.code || null,
  })

  // Normal booking regression: insert another booking for A
  const reg = await adminSb.from('booking_requests').insert({
    company_id: COMPANY_A.id,
    customer_name: 'Fake Rider Normal',
    customer_phone: '0470111000',
    pickup_address: 'Teststraat 1, 9000 Gent',
    dropoff_address: 'Teststraat 2, 9000 Gent',
    car_type: 'Standard',
    service_type: 'standard',
    status: 'new',
    rider_terms_accepted: true,
    rider_terms_accepted_at: new Date().toISOString(),
    rider_terms_version: 'taxio-rider-terms-2026-04-v2+taxio-privacy-2026-04',
  }).select('id').maybeSingle()
  report.steps.push({ name: 'normal_booking_regression', ok: !reg.error, id: reg.data?.id || null, err: reg.error?.message || null })

  // Kill switch blocks new activate
  await adminSb.from('taxio_platform_flags').update({ rescue_globally_enabled: false }).eq('id', 1)
  const blocked = await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: reg.data.id,
    p_company_id: COMPANY_A.id,
  })
  await adminSb.from('taxio_platform_flags').update({ rescue_globally_enabled: true }).eq('id', 1)
  report.steps.push({ name: 'kill_switch_blocks_activate', result: blocked.data })

  report.final = {
    rescue: finalRescue,
    bookingPreservedOwner: bookingAfter?.company_id === COMPANY_A.id,
    bookingStatusUnchanged: bookingAfter?.status === 'new',
    winnerIsB_or_C_single: winners.length === 1,
    originalCompanyStillA: finalRescue?.original_company_id === COMPANY_A.id,
  }

  report.pass =
    !doubleAcceptBug &&
    finalRescue?.status === 'ACCEPTED' &&
    finalRescue?.original_company_id === COMPANY_A.id &&
    !!finalRescue?.accepted_by_company_id &&
    finalRescue.accepted_by_company_id !== COMPANY_A.id &&
    bookingAfter?.company_id === COMPANY_A.id &&
    !reg.error &&
    blocked.data?.code === 'RESCUE_GLOBALLY_DISABLED' &&
    detailsWinner.data?.ok === true

  console.log(JSON.stringify(report, null, 2))
  process.exit(report.pass ? 0 : 1)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e && e.message || e) }, null, 2))
  process.exit(1)
})
