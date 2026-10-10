/**
 * Staging-only: Rescue 30s opportunity + 3-way simultaneous Accept race.
 * Project lyjicuuyrvblbsqlduqg ONLY. Cleans up test bookings/rescues.
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

const ACCOUNTS = [
  { email: 'owner.b.v001.staging@example.com', password: 'Txio!OwnerB_V00199', match: /antwerp/i, label: 'B' },
  { email: 'owner.c.v001.staging@example.com', password: 'Txio!OwnerC_V00199', match: /bruges/i, label: 'C' },
]
const OWNER_A = { email: 'owner.v001.staging@example.com', password: 'Txio!OwnerA_V00199', match: /ghent/i }
const RACE_D = {
  email: 'race.d.v001.staging@example.com',
  password: 'Txio!RaceD_V00199',
  label: 'D',
  match: /stagingt|stagingtaxio/i,
}

async function ensureRaceUserD(company) {
  const want = RACE_D.email.toLowerCase()
  let userId = null
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = (data?.users || []).find((u) => (u.email || '').toLowerCase() === want)
    if (hit) userId = hit.id
    if ((data?.users || []).length < 200) break
  }
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: RACE_D.email,
      password: RACE_D.password,
      email_confirm: true,
    })
    if (error) throw new Error(`create race D: ${error.message}`)
    userId = data.user.id
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: RACE_D.password,
      email_confirm: true,
    })
    if (error) throw new Error(`reset race D: ${error.message}`)
  }
  // Point company owner to race user for Accept auth (restore after test).
  const prevOwner = company.owner_user_id
  await admin.from('companies').update({ owner_user_id: userId, rescue_enabled: true }).eq('id', company.id)
  return { userId, prevOwner }
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

async function insertBooking(companyId) {
  const { data, error } = await admin
    .from('booking_requests')
    .insert({
      company_id: companyId,
      status: 'new',
      pickup_address: 'Race Pickup Aarschot',
      dropoff_address: 'Race Drop Zaventem',
      ride_datetime: new Date(Date.now() + 7200_000).toISOString(),
      car_type: 'Standard',
      service_type: 'standard',
      customer_name: 'Race Rider Secret',
      customer_phone: '32470111222',
      estimated_price_eur: 42.5,
      price_currency: 'EUR',
      decision_deadline_at: new Date(Date.now() + 25_000).toISOString(),
      notes: '30s race proof',
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

;(async () => {
  const checks = {}
  const notes = []

  // Apply opportunity seconds via data update (authoritative for expires_at).
  const { error: flagErr } = await admin
    .from('taxio_platform_flags')
    .update({ rescue_opportunity_seconds: 30, updated_at: new Date().toISOString() })
    .eq('id', 1)
  checks.flagsUpdated = !flagErr
  if (flagErr) notes.push({ flagErr: flagErr.message })

  const { data: secs } = await admin.rpc('taxio_rescue_opportunity_seconds')
  checks.opportunitySecondsRpc = Number(secs) === 30
  notes.push({ opportunitySecondsRpc: secs })

  const { data: flags } = await admin
    .from('taxio_platform_flags')
    .select('original_company_decision_seconds,rescue_opportunity_seconds')
    .eq('id', 1)
    .maybeSingle()
  checks.companyAStill25 = Number(flags?.original_company_decision_seconds) === 25
  checks.rescueTimerFlag30 = Number(flags?.rescue_opportunity_seconds) === 30

  const { data: cos } = await admin
    .from('companies')
    .select('id,name,slug,rescue_enabled,owner_user_id,status')
    .eq('status', 'approved')
  const companyA = (cos || []).find((c) => OWNER_A.match.test(c.name || c.slug || ''))
  if (!companyA) throw new Error('company A not found')

  const contestants = []
  let restoreOwner = null
  for (const acc of ACCOUNTS) {
    const company = (cos || []).find((c) => acc.match.test(c.name || c.slug || ''))
    if (!company) {
      notes.push({ missingCompany: acc.label })
      continue
    }
    await admin.from('companies').update({ rescue_enabled: true }).eq('id', company.id)
    const sess = await login(acc)
    contestants.push({ ...acc, company, sb: userClient(sess.token) })
  }
  // Third company: StagingT/StagingTaxio with ephemeral race owner (for simultaneous Accept).
  const companyD = (cos || []).find((c) => RACE_D.match.test(c.name || c.slug || ''))
  if (companyD) {
    const ensured = await ensureRaceUserD(companyD)
    restoreOwner = { companyId: companyD.id, owner_user_id: ensured.prevOwner }
    const sessD = await login(RACE_D)
    contestants.push({
      ...RACE_D,
      company: { ...companyD, owner_user_id: ensured.userId },
      sb: userClient(sessD.token),
    })
  } else {
    notes.push({ missingCompany: 'D' })
  }
  checks.threeContestants = contestants.length >= 3
  notes.push({ contestants: contestants.map((c) => c.company.name) })

  await admin.from('companies').update({ rescue_enabled: true }).eq('id', companyA.id)
  const loginA = await login(OWNER_A)
  const sbA = userClient(loginA.token)

  // --- Race: 3 simultaneous Accept ---
  const booking = await insertBooking(companyA.id)
  const act = await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: booking.id,
    p_company_id: companyA.id,
  })
  checks.activateOk = act.data?.ok === true
  const rescueId = act.data?.rescue_request_id
  notes.push({ activate: act.data, actErr: act.error?.message })

  const { data: opps } = await admin
    .from('rescue_opportunities')
    .select('id,company_id,status,expires_at')
    .eq('rescue_request_id', rescueId)
  const oppSecs =
    opps?.[0]?.expires_at &&
    Math.round((new Date(opps[0].expires_at).getTime() - Date.now()) / 1000)
  checks.serverExpiryAbout30 = Number.isFinite(oppSecs) && oppSecs >= 25 && oppSecs <= 35
  notes.push({ oppSecs, offered: (opps || []).length })

  const raceClients = contestants.slice(0, 3)
  const raceResults = await Promise.all(
    raceClients.map((c) =>
      c.sb
        .rpc('accept_rescue_request', {
          p_rescue_request_id: rescueId,
          p_company_id: c.company.id,
        })
        .then((r) => ({
          label: c.label,
          companyId: c.company.id,
          ok: r.data?.ok === true,
          code: r.data?.code || r.error?.message || 'ERR',
          data: r.data,
        }))
    )
  )
  notes.push({ raceResults: raceResults.map((r) => ({ label: r.label, ok: r.ok, code: r.code })) })

  const winners = raceResults.filter((r) => r.ok)
  const losers = raceResults.filter((r) => !r.ok)
  checks.threeAcceptReachedBackend = raceResults.length === 3
  checks.exactlyOneWinner = winners.length === 1
  checks.losersAssignedCode = losers.every((r) =>
    /ALREADY_ASSIGNED|ALREADY_TAKEN/.test(String(r.code || ''))
  )

  const { data: rescueAfter } = await admin
    .from('rescue_requests')
    .select('id,status,accepted_by_company_id,accepted_at,passenger_confirm_status,passenger_confirm_token')
    .eq('id', rescueId)
    .single()
  checks.oneWinnerCompanyId = !!rescueAfter?.accepted_by_company_id
  checks.waitingPassenger =
    rescueAfter?.status === 'ACCEPTED' &&
    rescueAfter?.passenger_confirm_status === 'WAITING_PASSENGER_CONFIRMATION'
  checks.winnerMatchesRace =
    winners[0] && winners[0].companyId === rescueAfter?.accepted_by_company_id

  // Winner immutable: loser retry + winner retry overwrite attempt
  const loser = losers[0]
  if (loser) {
    const again = await contestants
      .find((c) => c.label === loser.label)
      .sb.rpc('accept_rescue_request', {
        p_rescue_request_id: rescueId,
        p_company_id: loser.companyId,
      })
    checks.lateOverwriteRejected =
      again.data?.ok === false && /ALREADY_ASSIGNED|ALREADY_TAKEN/.test(again.data?.code || '')
  }

  const { data: rescueImmut } = await admin
    .from('rescue_requests')
    .select('accepted_by_company_id')
    .eq('id', rescueId)
    .single()
  checks.winnerImmutable = rescueImmut?.accepted_by_company_id === rescueAfter?.accepted_by_company_id

  // Loser PII: get_rescue_booking_details must not expose passenger phone
  if (loser) {
    const det = await contestants
      .find((c) => c.label === loser.label)
      .sb.rpc('get_rescue_booking_details', { p_rescue_request_id: rescueId })
    const phone = det.data?.customer_phone || det.data?.passenger_phone || det.data?.booking?.customer_phone
    checks.loserNoPii =
      det.data?.ok === false ||
      /PII_LOCKED|FORBIDDEN|NOT_WINNER|ALREADY/i.test(String(det.data?.code || '')) ||
      !phone
    notes.push({ loserDetailsCode: det.data?.code, loserOk: det.data?.ok })
  }

  // --- Late accept after opportunity expiry ---
  const booking2 = await insertBooking(companyA.id)
  const act2 = await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: booking2.id,
    p_company_id: companyA.id,
  })
  const rescue2 = act2.data?.rescue_request_id
  await admin
    .from('rescue_opportunities')
    .update({ expires_at: new Date(Date.now() - 2000).toISOString() })
    .eq('rescue_request_id', rescue2)
    .eq('status', 'OFFERED')
  const late = await raceClients[0].sb.rpc('accept_rescue_request', {
    p_rescue_request_id: rescue2,
    p_company_id: raceClients[0].company.id,
  })
  checks.lateAcceptRejected =
    late.data?.ok === false &&
    /OPPORTUNITY_EXPIRED|ALREADY_ASSIGNED|ALREADY_TAKEN|NOT_OPEN/.test(String(late.data?.code || ''))
  notes.push({ lateCode: late.data?.code })

  // Cleanup
  for (const id of [rescueId, rescue2].filter(Boolean)) {
    await admin.from('rescue_opportunities').delete().eq('rescue_request_id', id)
    await admin.from('rescue_requests').delete().eq('id', id)
  }
  await admin.from('booking_requests').delete().in('id', [booking.id, booking2.id])
  if (restoreOwner?.companyId) {
    await admin
      .from('companies')
      .update({ owner_user_id: restoreOwner.owner_user_id })
      .eq('id', restoreOwner.companyId)
  }

  const required = [
    'flagsUpdated',
    'opportunitySecondsRpc',
    'companyAStill25',
    'rescueTimerFlag30',
    'threeContestants',
    'activateOk',
    'serverExpiryAbout30',
    'threeAcceptReachedBackend',
    'exactlyOneWinner',
    'losersAssignedCode',
    'oneWinnerCompanyId',
    'waitingPassenger',
    'winnerMatchesRace',
    'winnerImmutable',
    'loserNoPii',
    'lateAcceptRejected',
  ]
  if (loser) required.push('lateOverwriteRejected')

  const failed = required.filter((k) => checks[k] !== true)
  const pass = failed.length === 0
  console.log(JSON.stringify({ pass, failed, checks, notes }, null, 2))
  process.exit(pass ? 0 : 1)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e.stack || e) }, null, 2))
  process.exit(1)
})
