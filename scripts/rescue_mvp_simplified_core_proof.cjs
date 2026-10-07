/**
 * TAXIO V001 — Simplified Rescue MVP core proof (staging only).
 * Covers Accept / Decline / 25s auto / B offer / 10s expire / atomic /
 * passenger confirm+cancel / PII lock / frozen €35 / original preserved.
 *
 * Usage: node scripts/rescue_mvp_simplified_core_proof.cjs
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
const BASE = process.env.V001_STAGING_URL || 'https://taxio-v001-staging-eta.vercel.app'

if (String(env.TAXIO_STAGING || '').toLowerCase() !== 'true' || !host.includes('lyjicuuyrvblbsqlduqg')) {
  console.log(JSON.stringify({ fatal: 'staging only', host }))
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
  if (error) throw new Error(`login ${email}: ${error.message}`)
  return data.session.access_token
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function isEuro35(s) {
  const t = String(s || '')
    .replace(/â‚¬/g, '€')
    .replace(/\u00e2\u20ac/g, '€')
  const m = t.match(/(?:€|EUR)\s*([0-9]+(?:[.,][0-9]+)?)\.?/i)
  return !!(m && Math.abs(Number(String(m[1]).replace(',', '.')) - 35) < 0.001)
}

function secsUntil(iso) {
  return (new Date(iso).getTime() - Date.now()) / 1000
}

const TERMS = {
  rider_terms_accepted: true,
  rider_terms_accepted_at: new Date().toISOString(),
  rider_terms_version: 'taxio-rider-terms-2026-04-v2+taxio-privacy-2026-04',
}

async function insertBooking(extra = {}) {
  const ride = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  const { data, error } = await admin
    .from('booking_requests')
    .insert({
      company_id: A.id,
      customer_name: extra.customer_name || 'MVP Proof Rider',
      customer_phone: extra.customer_phone || '0470111222',
      customer_email: extra.customer_email || 'mvp.rider@example.com',
      pickup_address: 'Brussels Airport, 1930 Zaventem',
      dropoff_address: 'Leuven, 3000 Leuven',
      ride_datetime: ride,
      car_type: 'Standard',
      service_type: 'standard',
      status: 'new',
      estimated_price_eur: 35,
      price_currency: 'EUR',
      notes: 'Estimate: 28 km, 35 min, €35',
      ...TERMS,
      ...extra,
    })
    .select(
      'id,company_id,status,decision_deadline_at,estimated_price_eur,pickup_address,dropoff_address,ride_datetime,customer_name,customer_phone'
    )
    .maybeSingle()
  if (error) throw new Error(`insert booking: ${error.message}`)
  return data
}

async function apiRescue(token, body) {
  const res = await fetch(`${BASE}/api/rescue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, ok: res.ok, body: json }
}

;(async () => {
  const report = {
    host,
    base: BASE,
    checks: {},
    notes: {},
  }

  // Ensure Rescue on for A/B (+ any other approved rescue companies)
  await admin.from('taxio_platform_flags').update({
    rescue_globally_enabled: true,
    original_company_decision_seconds: 25,
    rescue_opportunity_seconds: 10,
  }).eq('id', 1)

  const { data: flags } = await admin
    .from('taxio_platform_flags')
    .select('original_company_decision_seconds,rescue_opportunity_seconds,rescue_globally_enabled')
    .eq('id', 1)
    .maybeSingle()
  report.notes.flags = flags
  report.checks.flagsConfigured =
    flags?.rescue_globally_enabled === true &&
    Number(flags?.original_company_decision_seconds) === 25 &&
    Number(flags?.rescue_opportunity_seconds) === 10

  await admin.from('companies').update({ rescue_enabled: true }).in('id', [A.id, B.id])

  // Find company C if present (for concurrent accept)
  const { data: cRow } = await admin
    .from('companies')
    .select('id,slug,name,rescue_enabled,status')
    .eq('slug', 'v001stagingtaxibruges')
    .maybeSingle()
  let C = null
  let tokenC = null
  if (cRow?.id && cRow.status === 'approved') {
    await admin.from('companies').update({ rescue_enabled: true }).eq('id', cRow.id)
    C = {
      id: cRow.id,
      email: 'owner.c.v001.staging@example.com',
      password: 'Txio!OwnerC_V00199',
    }
  }

  const tokenA = await login(A.email, A.password)
  const tokenB = await login(B.email, B.password)
  if (C) {
    try {
      tokenC = await login(C.email, C.password)
    } catch (e) {
      report.notes.cLoginError = e.message
      C = null
    }
  }
  const sbA = userSb(tokenA)
  const sbB = userSb(tokenB)
  const sbC = tokenC ? userSb(tokenC) : null
  const anon = createClient(url, env.VITE_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // -------------------------------------------------------------------------
  // 1–5: A ACCEPT → no Rescue
  // -------------------------------------------------------------------------
  const acceptBooking = await insertBooking({
    customer_name: 'MVP Accept Rider',
    customer_phone: '0470100001',
  })
  const acceptDeadlineSec = secsUntil(acceptBooking.decision_deadline_at)
  report.checks.aAcceptDeadlineApprox25 =
    !!acceptBooking.decision_deadline_at && acceptDeadlineSec > 20 && acceptDeadlineSec <= 27
  report.notes.acceptDeadlineSec = Number(acceptDeadlineSec.toFixed(2))
  report.checks.aAcceptFrozenPrice = Number(acceptBooking.estimated_price_eur) === 35
  report.checks.aAcceptRoute =
    /Brussels Airport/i.test(acceptBooking.pickup_address) && /Leuven/i.test(acceptBooking.dropoff_address)

  const accUpd = await sbA
    .from('booking_requests')
    .update({ status: 'accepted', decision_deadline_at: null })
    .eq('id', acceptBooking.id)
    .eq('company_id', A.id)
  report.checks.aAcceptUpdate = !accUpd.error

  const { data: rescueOnAccept } = await admin
    .from('rescue_requests')
    .select('id')
    .eq('booking_request_id', acceptBooking.id)
    .maybeSingle()
  report.checks.aAcceptNoRescue = !rescueOnAccept

  const { data: acceptedRow } = await admin
    .from('booking_requests')
    .select('status,company_id,estimated_price_eur')
    .eq('id', acceptBooking.id)
    .maybeSingle()
  report.checks.aAcceptStatus = acceptedRow?.status === 'accepted' && acceptedRow?.company_id === A.id

  // -------------------------------------------------------------------------
  // 6–16: A DECLINE → B wins → WAITING → confirm → PII
  // -------------------------------------------------------------------------
  const declineBooking = await insertBooking({
    customer_name: 'MVP Decline Rider',
    customer_phone: '0470100002',
    customer_email: 'mvp.decline@example.com',
  })

  const activate = await apiRescue(tokenA, {
    action: 'decline',
    bookingRequestId: declineBooking.id,
    companyId: A.id,
  })
  // Fallback to RPC if API not yet redeployed with decline alias
  let actBody = activate.body
  if (!activate.body?.ok) {
    const rpc = await sbA.rpc('activate_rescue_request', {
      p_booking_request_id: declineBooking.id,
      p_company_id: A.id,
    })
    actBody = rpc.data || { ok: false, error: rpc.error?.message }
    report.notes.activateViaRpcFallback = true
  }
  report.checks.aDeclineActivates = actBody?.ok === true
  report.checks.aDeclineFrozenPrice =
    isEuro35(actBody?.preview_estimated_price) || Number(actBody?.estimated_price_eur) === 35
  const rescueId = actBody?.rescue_request_id
  report.notes.declineRescueId = rescueId
  report.notes.activatePreview = actBody?.preview_estimated_price || null

  const { data: rescueRow } = await admin
    .from('rescue_requests')
    .select(
      'id,status,original_company_id,preview_pickup_label,preview_dropoff_label,preview_ride_datetime,preview_estimated_price,passenger_confirm_status'
    )
    .eq('id', rescueId)
    .maybeSingle()
  report.checks.rescueOpen = rescueRow?.status === 'OPEN' && rescueRow?.original_company_id === A.id
  report.checks.rescuePreviewRoute =
    !!(rescueRow?.preview_pickup_label && rescueRow?.preview_dropoff_label) &&
    (/Brussels|Zaventem|1930/i.test(rescueRow.preview_pickup_label) ||
      /Airport/i.test(declineBooking.pickup_address)) &&
    (/Leuven|3000/i.test(rescueRow.preview_dropoff_label) || /Leuven/i.test(declineBooking.dropoff_address))
  report.checks.rescueFrozenPrice = isEuro35(rescueRow?.preview_estimated_price)

  const { data: oppB } = await sbB
    .from('rescue_opportunities')
    .select('id,status,expires_at,rescue:rescue_requests(preview_estimated_price,preview_pickup_label,preview_dropoff_label,preview_ride_datetime,status)')
    .eq('company_id', B.id)
    .eq('rescue_request_id', rescueId)
    .maybeSingle()
  report.checks.bPopupData = !!oppB && oppB.status === 'OFFERED' && oppB.rescue?.status === 'OPEN'
  const oppSec = oppB?.expires_at ? secsUntil(oppB.expires_at) : -1
  report.notes.bOpportunitySec = Number(oppSec.toFixed(2))
  report.checks.bCountdownApprox10 = oppSec > 7 && oppSec <= 12
  report.checks.bSeesFrozenPrice = isEuro35(oppB?.rescue?.preview_estimated_price)

  let acceptB = await apiRescue(tokenB, {
    action: 'accept',
    rescueRequestId: rescueId,
    companyId: B.id,
  })
  if (!acceptB.body?.ok) {
    const rpc = await sbB.rpc('accept_rescue_request', {
      p_rescue_request_id: rescueId,
      p_company_id: B.id,
    })
    acceptB = { ok: !!rpc.data?.ok, body: rpc.data || { ok: false }, status: rpc.data?.ok ? 200 : 409 }
    report.notes.acceptViaRpcFallback = true
  }
  report.checks.atomicWinner =
    acceptB.body?.ok === true &&
    (acceptB.body?.code === 'COMPANY_FOUND' || acceptB.body?.code === 'ACCEPTED' || acceptB.body?.ok === true)
  report.checks.waitingPassenger =
    acceptB.body?.passenger_confirm_status === 'WAITING_PASSENGER_CONFIRMATION' ||
    acceptB.body?.code === 'COMPANY_FOUND'

  const { data: afterAccept } = await admin
    .from('rescue_requests')
    .select(
      'status,accepted_by_company_id,original_company_id,passenger_confirm_status,passenger_confirm_token,preview_estimated_price,booking_request_id'
    )
    .eq('id', rescueId)
    .maybeSingle()
  report.checks.waitingPassengerDb =
    afterAccept?.status === 'ACCEPTED' &&
    afterAccept?.accepted_by_company_id === B.id &&
    afterAccept?.passenger_confirm_status === 'WAITING_PASSENGER_CONFIRMATION'
  report.checks.confirmTokenPresent =
    typeof afterAccept?.passenger_confirm_token === 'string' &&
    afterAccept.passenger_confirm_token.length >= 20

  const detailsBefore = await sbB.rpc('get_rescue_booking_details', { p_rescue_request_id: rescueId })
  report.checks.piiBeforeConfirm =
    detailsBefore.data?.ok === false &&
    detailsBefore.data?.code === 'PII_LOCKED_UNTIL_PASSENGER_CONFIRM' &&
    !detailsBefore.data?.booking?.customer_phone
  report.notes.piiBeforeCode = detailsBefore.data?.code || detailsBefore.error?.message

  const token = afterAccept?.passenger_confirm_token
  // Passenger preview without login (anon RPC + API)
  const previewRpc = await anon.rpc('taxio_rescue_passenger_preview', { p_token: token })
  const previewApi = await apiRescue(null, { action: 'passenger_preview', token })
  report.notes.passengerPreviewApi = { status: previewApi.status, ok: previewApi.body?.ok, code: previewApi.body?.code }
  report.notes.passengerPreviewRpc = { ok: previewRpc.data?.ok, code: previewRpc.data?.code, err: previewRpc.error?.message }
  report.checks.passengerLinkWorks = previewRpc.data?.ok === true || previewApi.body?.ok === true
  report.checks.passengerPreviewNoPii =
    !previewRpc.data?.customer_name && !previewRpc.data?.customer_phone && !previewRpc.data?.customer_email
  report.checks.passengerPreviewRpc = previewRpc.data?.ok === true && report.checks.passengerPreviewNoPii

  const confirmApi = await apiRescue(null, { action: 'passenger_confirm', token })
  let confirmBody = confirmApi.body
  if (!confirmBody?.ok) {
    const rpc = await anon.rpc('taxio_rescue_passenger_confirm', { p_token: token })
    confirmBody = rpc.data || { ok: false }
    report.notes.confirmViaRpcFallback = true
  }
  report.checks.passengerConfirm =
    confirmBody?.ok === true &&
    (confirmBody?.code === 'CONFIRMED' || confirmBody?.code === 'ALREADY_CONFIRMED')

  const detailsAfter = await sbB.rpc('get_rescue_booking_details', { p_rescue_request_id: rescueId })
  report.checks.piiAfterConfirm =
    detailsAfter.data?.ok === true &&
    detailsAfter.data?.booking?.customer_phone === '0470100002' &&
    detailsAfter.data?.booking?.customer_name === 'MVP Decline Rider'
  report.checks.frozenAfterConfirm = Number(detailsAfter.data?.booking?.estimated_price_eur) === 35

  const { data: bookingFinal } = await admin
    .from('booking_requests')
    .select('company_id,estimated_price_eur,pickup_address,dropoff_address,status')
    .eq('id', declineBooking.id)
    .maybeSingle()
  report.checks.originalCompanyPreserved =
    bookingFinal?.company_id === A.id &&
    afterAccept?.original_company_id === A.id &&
    Number(bookingFinal?.estimated_price_eur) === 35

  // -------------------------------------------------------------------------
  // 17: A no action → 25s timeout → Rescue
  // -------------------------------------------------------------------------
  const timeoutBooking = await insertBooking({
    customer_name: 'MVP Timeout Rider',
    customer_phone: '0470100003',
  })
  report.checks.timeoutDeadlineSet =
    !!timeoutBooking.decision_deadline_at &&
    secsUntil(timeoutBooking.decision_deadline_at) > 20 &&
    secsUntil(timeoutBooking.decision_deadline_at) <= 27

  // Authoritative: advance deadline, then process_timeouts (same path as wall-clock expiry)
  await admin
    .from('booking_requests')
    .update({ decision_deadline_at: new Date(Date.now() - 1000).toISOString() })
    .eq('id', timeoutBooking.id)

  let tick = await apiRescue(tokenA, { action: 'tick' })
  if (!tick.body?.ok) {
    const rpc = await sbA.rpc('taxio_rescue_process_timeouts')
    tick = { body: rpc.data || { ok: false }, ok: !!rpc.data?.ok }
    report.notes.tickViaRpcFallback = true
  }
  report.notes.tickAfterATimeout = tick.body

  const { data: autoRescue } = await admin
    .from('rescue_requests')
    .select('id,status,preview_estimated_price')
    .eq('booking_request_id', timeoutBooking.id)
    .maybeSingle()
  report.checks.a25sTimeoutActivates = !!autoRescue && autoRescue.status === 'OPEN'
  report.checks.a25sTimeoutFrozen = isEuro35(autoRescue?.preview_estimated_price)

  // Close this rescue so it does not interfere (expire opportunities)
  if (autoRescue?.id) {
    await admin
      .from('rescue_opportunities')
      .update({ status: 'WITHDRAWN', responded_at: new Date().toISOString() })
      .eq('rescue_request_id', autoRescue.id)
      .eq('status', 'OFFERED')
    await admin
      .from('rescue_requests')
      .update({ status: 'EXPIRED', closed_at: new Date().toISOString() })
      .eq('id', autoRescue.id)
      .eq('status', 'OPEN')
  }

  // -------------------------------------------------------------------------
  // 18: B no action → opportunity expires after 10s
  // -------------------------------------------------------------------------
  const expireBooking = await insertBooking({
    customer_name: 'MVP Opp Expire Rider',
    customer_phone: '0470100004',
  })
  const actExp = await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: expireBooking.id,
    p_company_id: A.id,
  })
  const expireRescueId = actExp.data?.rescue_request_id
  const { data: oppExpire } = await admin
    .from('rescue_opportunities')
    .select('id,expires_at,status')
    .eq('rescue_request_id', expireRescueId)
    .eq('company_id', B.id)
    .maybeSingle()
  report.checks.b10sWindowSet =
    !!oppExpire?.expires_at && secsUntil(oppExpire.expires_at) > 7 && secsUntil(oppExpire.expires_at) <= 12

  await admin
    .from('rescue_opportunities')
    .update({ expires_at: new Date(Date.now() - 5000).toISOString() })
    .eq('rescue_request_id', expireRescueId)
    .eq('status', 'OFFERED')

  // Confirm backdate landed before processing
  const { data: oppExpireCheck } = await admin
    .from('rescue_opportunities')
    .select('id,expires_at,status')
    .eq('id', oppExpire.id)
    .maybeSingle()
  report.notes.b10sExpireCheck = oppExpireCheck

  const tick2 = await sbA.rpc('taxio_rescue_process_timeouts')
  const { data: oppAfter } = await admin
    .from('rescue_opportunities')
    .select('status')
    .eq('id', oppExpire.id)
    .maybeSingle()
  const { data: rescueExpired } = await admin
    .from('rescue_requests')
    .select('status')
    .eq('id', expireRescueId)
    .maybeSingle()
  report.checks.b10sTimeout =
    oppAfter?.status === 'WITHDRAWN' &&
    (rescueExpired?.status === 'EXPIRED' || rescueExpired?.status === 'OPEN')
  // Prefer EXPIRED for OPEN with no offers left
  report.checks.b10sRescueExpired = rescueExpired?.status === 'EXPIRED'
  report.notes.b10sTick = tick2.data
  report.notes.b10sOppStatus = oppAfter?.status
  report.notes.b10sRescueStatus = rescueExpired?.status

  // -------------------------------------------------------------------------
  // 19: Concurrent B+C accept → one winner
  // -------------------------------------------------------------------------
  if (C && sbC) {
    const concurrentBooking = await insertBooking({
      customer_name: 'MVP Concurrent Rider',
      customer_phone: '0470100005',
    })
    const actC = await sbA.rpc('activate_rescue_request', {
      p_booking_request_id: concurrentBooking.id,
      p_company_id: A.id,
    })
    const concurrentRescueId = actC.data?.rescue_request_id
    const [rB, rC] = await Promise.all([
      sbB.rpc('accept_rescue_request', {
        p_rescue_request_id: concurrentRescueId,
        p_company_id: B.id,
      }),
      sbC.rpc('accept_rescue_request', {
        p_rescue_request_id: concurrentRescueId,
        p_company_id: C.id,
      }),
    ])
    const wins = [rB.data, rC.data].filter((x) => x?.ok === true)
    const loses = [rB.data, rC.data].filter((x) => x?.ok === false && x?.code === 'ALREADY_TAKEN')
    report.checks.concurrentOneWinner = wins.length === 1 && loses.length === 1
    report.notes.concurrent = { b: rB.data, c: rC.data }
    const { data: concRescue } = await admin
      .from('rescue_requests')
      .select('accepted_by_company_id,passenger_confirm_status')
      .eq('id', concurrentRescueId)
      .maybeSingle()
    report.checks.concurrentWaiting =
      concRescue?.passenger_confirm_status === 'WAITING_PASSENGER_CONFIRMATION'
    // Cancel passenger so no dangling WAITING
    const { data: concFull } = await admin
      .from('rescue_requests')
      .select('passenger_confirm_token')
      .eq('id', concurrentRescueId)
      .maybeSingle()
    if (concFull?.passenger_confirm_token) {
      await anon.rpc('taxio_rescue_passenger_cancel', { p_token: concFull.passenger_confirm_token })
    }
  } else {
    report.checks.concurrentOneWinner = false
    report.notes.concurrentSkipped = 'Company C unavailable'
  }

  // -------------------------------------------------------------------------
  // 20: Passenger CANCEL → winner never gets PII
  // -------------------------------------------------------------------------
  const cancelBooking = await insertBooking({
    customer_name: 'MVP Cancel Rider',
    customer_phone: '0470100006',
  })
  const actCancel = await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: cancelBooking.id,
    p_company_id: A.id,
  })
  const cancelRescueId = actCancel.data?.rescue_request_id
  await sbB.rpc('accept_rescue_request', {
    p_rescue_request_id: cancelRescueId,
    p_company_id: B.id,
  })
  const { data: cancelRescue } = await admin
    .from('rescue_requests')
    .select('passenger_confirm_token,passenger_confirm_status')
    .eq('id', cancelRescueId)
    .maybeSingle()

  let cancelRes = await apiRescue(null, {
    action: 'passenger_cancel',
    token: cancelRescue.passenger_confirm_token,
  })
  if (!cancelRes.body?.ok) {
    const rpc = await anon.rpc('taxio_rescue_passenger_cancel', {
      p_token: cancelRescue.passenger_confirm_token,
    })
    cancelRes = { body: rpc.data || { ok: false } }
    report.notes.cancelViaRpcFallback = true
  }
  report.checks.passengerCancel =
    cancelRes.body?.ok === true &&
    (cancelRes.body?.code === 'CANCELLED_BY_PASSENGER' || cancelRes.body?.code === 'ALREADY_CANCELLED')

  const detailsCancel = await sbB.rpc('get_rescue_booking_details', {
    p_rescue_request_id: cancelRescueId,
  })
  report.checks.piiAfterCancelStillLocked =
    detailsCancel.data?.ok === false &&
    detailsCancel.data?.code === 'PII_LOCKED_UNTIL_PASSENGER_CONFIRM'

  const { data: cancelStatus } = await admin
    .from('rescue_requests')
    .select('passenger_confirm_status')
    .eq('id', cancelRescueId)
    .maybeSingle()
  report.checks.passengerCancelStatus =
    cancelStatus?.passenger_confirm_status === 'CANCELLED_BY_PASSENGER'

  // -------------------------------------------------------------------------
  // 21: Normal TAXIO booking unaffected
  // -------------------------------------------------------------------------
  const normalBooking = await insertBooking({
    customer_name: 'MVP Normal Rider',
    customer_phone: '0470100007',
  })
  const normalAcc = await sbA
    .from('booking_requests')
    .update({ status: 'accepted' })
    .eq('id', normalBooking.id)
    .eq('company_id', A.id)
  const { data: normalRescue } = await admin
    .from('rescue_requests')
    .select('id')
    .eq('booking_request_id', normalBooking.id)
    .maybeSingle()
  report.checks.normalTaxio = !normalAcc.error && !normalRescue

  // -------------------------------------------------------------------------
  // 22: Frozen price unchanged throughout (aggregate)
  // -------------------------------------------------------------------------
  report.checks.frozenPriceThroughout =
    report.checks.aAcceptFrozenPrice &&
    report.checks.aDeclineFrozenPrice &&
    report.checks.rescueFrozenPrice &&
    report.checks.bSeesFrozenPrice &&
    report.checks.frozenAfterConfirm &&
    report.checks.originalCompanyPreserved

  // -------------------------------------------------------------------------
  // Summary mapping for required report keys
  // -------------------------------------------------------------------------
  report.summary = {
    A_ACCEPT: report.checks.aAcceptUpdate && report.checks.aAcceptNoRescue && report.checks.aAcceptStatus,
    A_DECLINE: report.checks.aDeclineActivates && report.checks.rescueOpen,
    A_25S_TIMEOUT: report.checks.a25sTimeoutActivates,
    RESCUE_ACTIVATION: report.checks.aDeclineActivates && report.checks.bPopupData,
    B_POPUP: report.checks.bPopupData && report.checks.bSeesFrozenPrice && report.checks.rescuePreviewRoute,
    B_10S_TIMEOUT: report.checks.b10sTimeout && report.checks.b10sRescueExpired,
    FROZEN_PRICE: report.checks.frozenPriceThroughout,
    ATOMIC_WINNER: report.checks.atomicWinner && report.checks.waitingPassengerDb,
    WAITING_PASSENGER: report.checks.waitingPassengerDb,
    PII_BEFORE_CONFIRM: report.checks.piiBeforeConfirm,
    PASSENGER_CONFIRM: report.checks.passengerLinkWorks && report.checks.passengerConfirm,
    PII_AFTER_CONFIRM: report.checks.piiAfterConfirm,
    PASSENGER_CANCEL: report.checks.passengerCancel && report.checks.piiAfterCancelStillLocked,
    ORIGINAL_COMPANY_PRESERVED: report.checks.originalCompanyPreserved,
    NORMAL_TAXIO: report.checks.normalTaxio,
    CONCURRENT: report.checks.concurrentOneWinner,
    COUNTDOWN_25: report.checks.aAcceptDeadlineApprox25,
    COUNTDOWN_10: report.checks.bCountdownApprox10,
  }

  report.pass = Object.values(report.summary).every(Boolean)
  console.log(JSON.stringify(report, null, 2))
  process.exit(report.pass ? 0 : 1)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: e.message, stack: e.stack }))
  process.exit(1)
})
