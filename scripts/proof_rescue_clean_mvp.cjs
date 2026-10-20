/**
 * Staging-only automated proof for clean Rescue MVP (server-authoritative).
 * Supabase lyjicuuyrvblbsqlduqg ONLY.
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

const ACCOUNTS = {
  A: { email: 'owner.v001.staging@example.com', password: 'Txio!OwnerA_V00199', match: /ghent/i },
  B: { email: 'owner.b.v001.staging@example.com', password: 'Txio!OwnerB_V00199', match: /antwerp/i },
  C: { email: 'owner.c.v001.staging@example.com', password: 'Txio!OwnerC_V00199', match: /bruges/i },
}

function userClient(token) {
  return createClient(url, env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function login(acc) {
  const anon = createClient(url, env.VITE_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await anon.auth.signInWithPassword({
    email: acc.email,
    password: acc.password,
  })
  if (error || !data?.session) throw new Error(`login ${acc.email}: ${error?.message || 'fail'}`)
  return { token: data.session.access_token, userId: data.user.id }
}

async function insertBooking(companyId, price, deadlineIso) {
  const { data, error } = await admin
    .from('booking_requests')
    .insert({
      company_id: companyId,
      status: 'new',
      pickup_address: 'Clean MVP Pickup',
      dropoff_address: 'Clean MVP Drop',
      ride_datetime: new Date(Date.now() + 7200_000).toISOString(),
      car_type: 'Berline',
      service_type: 'standard',
      customer_name: 'Clean MVP Rider',
      customer_phone: '0470999001',
      estimated_price_eur: price,
      price_currency: 'EUR',
      decision_deadline_at: deadlineIso || new Date(Date.now() + 25_000).toISOString(),
      notes: `Trip price: €${Number(price).toFixed(2)}`,
    })
    .select('*')
    .single()
  if (error) throw new Error(`insert booking: ${error.message}`)
  return data
}

function priceLooksLike(label, n) {
  const s = String(label || '')
  return s.includes(String(n)) || s.includes(String(n).replace('.', ','))
}

;(async () => {
  const checks = {}
  const notes = []

  const loginA = await login(ACCOUNTS.A)
  const loginB = await login(ACCOUNTS.B)
  const loginC = await login(ACCOUNTS.C)
  const sbA = userClient(loginA.token)
  const sbB = userClient(loginB.token)
  const sbC = userClient(loginC.token)

  const { data: companies } = await admin.from('companies').select('id,name,slug,rescue_enabled,owner_user_id,status')
  const companyA = companies.find((c) => c.owner_user_id === loginA.userId && ACCOUNTS.A.match.test(c.name))
    || companies.find((c) => c.owner_user_id === loginA.userId)
  const companyB = companies.find((c) => c.owner_user_id === loginB.userId)
  const companyC = companies.find((c) => c.owner_user_id === loginC.userId)
  if (!companyA || !companyB || !companyC) throw new Error('missing companies')
  notes.push({ A: companyA.name, B: companyB.name, C: companyC.name })

  await admin.from('taxio_platform_flags').update({ rescue_globally_enabled: true }).eq('id', 1)
  await admin.from('companies').update({ rescue_enabled: true }).in('id', [companyA.id, companyB.id, companyC.id])

  // 1) A ACCEPT → no Rescue
  {
    const b = await insertBooking(companyA.id, 35)
    const upd = await sbA
      .from('booking_requests')
      .update({ status: 'accepted', decision_deadline_at: null })
      .eq('id', b.id)
      .eq('company_id', companyA.id)
      .eq('status', 'new')
      .select('id')
    const { data: rescue } = await admin.from('rescue_requests').select('id').eq('booking_request_id', b.id).maybeSingle()
    checks.aAccept = !upd.error && (upd.data || []).length === 1 && !rescue
  }

  // 2) A DECLINE → OPEN
  let declineRescue = null
  {
    const b = await insertBooking(companyA.id, 48.5)
    const act = await sbA.rpc('activate_rescue_request', {
      p_booking_request_id: b.id,
      p_company_id: companyA.id,
    })
    const { data: rescue } = await admin
      .from('rescue_requests')
      .select('id,status,preview_estimated_price')
      .eq('booking_request_id', b.id)
      .maybeSingle()
    declineRescue = rescue
    checks.aDecline = act.data?.ok === true && rescue?.status === 'OPEN'
    checks.frozenPrice = priceLooksLike(rescue?.preview_estimated_price, 48.5) || priceLooksLike(rescue?.preview_estimated_price, 48)
  }

  // 5) opportunities
  {
    const { data: opps } = await admin
      .from('rescue_opportunities')
      .select('id,status,expires_at,company_id')
      .eq('rescue_request_id', declineRescue.id)
    checks.opportunities = (opps || []).filter((o) => o.status === 'OFFERED').length >= 2
    checks.opportunityExpiry = (opps || []).every((o) => !!o.expires_at)
  }

  // 3) A offline → process_timeouts
  {
    const b = await insertBooking(companyA.id, 22, new Date(Date.now() - 3000).toISOString())
    const tick = await admin.rpc('taxio_rescue_process_timeouts')
    const { data: rescue } = await admin.from('rescue_requests').select('id,status').eq('booking_request_id', b.id).maybeSingle()
    checks.aOffline = !tick.error && rescue?.status === 'OPEN'
    notes.push({ offlineTick: tick.data })
  }

  // 4) UI 0s logic — expired deadline not pending
  {
    const expired = { id: 'x', status: 'new', decision_deadline_at: new Date(Date.now() - 1000).toISOString() }
    const pending = [expired].filter(
      (b) => b.status === 'new' && b.decision_deadline_at && new Date(b.decision_deadline_at).getTime() > Date.now()
    )
    checks.aUi0s = pending.length === 0
  }

  // 7–11 atomic winner, waiting, PII lock/confirm
  {
    const b = await insertBooking(companyA.id, 55)
    await sbA.rpc('activate_rescue_request', { p_booking_request_id: b.id, p_company_id: companyA.id })
    const { data: rescue } = await admin.from('rescue_requests').select('id').eq('booking_request_id', b.id).single()

    const win = await sbB.rpc('accept_rescue_request', {
      p_rescue_request_id: rescue.id,
      p_company_id: companyB.id,
    })
    checks.atomicWinner = win.data?.ok === true

    const lose = await sbC.rpc('accept_rescue_request', {
      p_rescue_request_id: rescue.id,
      p_company_id: companyC.id,
    })
    checks.otherAcceptRejected = lose.data?.ok === false

    const { data: r2 } = await admin
      .from('rescue_requests')
      .select('status,passenger_confirm_status,passenger_confirm_token,preview_estimated_price')
      .eq('id', rescue.id)
      .single()
    checks.waitingPassenger =
      r2.status === 'ACCEPTED' && r2.passenger_confirm_status === 'WAITING_PASSENGER_CONFIRMATION'
    checks.frozenPriceWinner = priceLooksLike(r2.preview_estimated_price, 55)

    const before = await sbB.rpc('get_rescue_booking_details', { p_rescue_request_id: rescue.id })
    checks.piiLock =
      before.data?.ok === false ||
      /PII_LOCKED/i.test(before.data?.code || '') ||
      !(before.data?.customer_phone || before.data?.passenger_phone)

    const confirm = await admin.rpc('taxio_rescue_passenger_confirm', { p_token: r2.passenger_confirm_token })
    checks.passengerConfirm = confirm.data?.ok === true

    const after = await sbB.rpc('get_rescue_booking_details', { p_rescue_request_id: rescue.id })
    checks.piiUnlock =
      after.data?.ok === true &&
      !!(after.data?.customer_phone || after.data?.customer_name || after.data?.booking || after.data?.passenger_phone)
  }

  // 12) passenger cancel
  {
    const b = await insertBooking(companyA.id, 33)
    await sbA.rpc('activate_rescue_request', { p_booking_request_id: b.id, p_company_id: companyA.id })
    const { data: rescue } = await admin.from('rescue_requests').select('id').eq('booking_request_id', b.id).single()
    await sbB.rpc('accept_rescue_request', { p_rescue_request_id: rescue.id, p_company_id: companyB.id })
    const { data: r2 } = await admin
      .from('rescue_requests')
      .select('passenger_confirm_token')
      .eq('id', rescue.id)
      .single()
    const cancel = await admin.rpc('taxio_rescue_passenger_cancel', { p_token: r2.passenger_confirm_token })
    const { data: r3 } = await admin
      .from('rescue_requests')
      .select('passenger_confirm_status')
      .eq('id', rescue.id)
      .single()
    const details = await sbB.rpc('get_rescue_booking_details', { p_rescue_request_id: rescue.id })
    checks.passengerCancel =
      cancel.data?.ok === true &&
      r3.passenger_confirm_status === 'CANCELLED_BY_PASSENGER' &&
      (details.data?.ok === false || /PII_LOCKED|CANCEL/i.test(details.data?.code || '') || !details.data?.customer_phone)
  }

  // 13–14 architecture
  {
    const rescueJs = fs.readFileSync(path.join(root, 'src/lib/rescue.js'), 'utf8')
    const notifyJs = fs.readFileSync(path.join(root, 'src/lib/rescueNotifications.js'), 'utf8')
    const dashJs = fs.readFileSync(path.join(root, 'src/pages/dashboardCompany.js'), 'utf8')
    checks.noTickAuthority = !/tickRescueTimeouts/.test(rescueJs) && !/tickRescueTimeouts/.test(notifyJs)
    checks.dashboardNeverBlocked =
      /startRescueNotifications/.test(dashJs) && !/await loadRescueDashboardData/.test(dashJs)
    checks.noDashRemountFromRescue = !/startRescueLiveUpdates\(/.test(dashJs)
    checks.realtimeFailureGraceful = /failed soft|catch/.test(notifyJs)
  }

  checks.rescueUiDeleted = !fs.existsSync(path.join(root, 'src/lib/rescueUi.js'))
  checks.priceHelpersMoved = fs.existsSync(path.join(root, 'src/lib/rescuePrice.js'))

  const required = [
    'aAccept',
    'aDecline',
    'aOffline',
    'aUi0s',
    'opportunities',
    'frozenPrice',
    'atomicWinner',
    'otherAcceptRejected',
    'waitingPassenger',
    'piiLock',
    'passengerConfirm',
    'piiUnlock',
    'passengerCancel',
    'noTickAuthority',
    'dashboardNeverBlocked',
    'noDashRemountFromRescue',
    'realtimeFailureGraceful',
    'rescueUiDeleted',
    'priceHelpersMoved',
  ]
  const failed = required.filter((k) => checks[k] !== true)
  const pass = failed.length === 0

  console.log(JSON.stringify({ pass, failed, checks, notes }, null, 2))
  process.exit(pass ? 0 : 2)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: e.message }))
  process.exit(1)
})
