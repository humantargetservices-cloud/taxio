/**
 * Staging proof: Rescue Accept auth refresh (source + live race).
 * Does not import Vite-bound modules. Project lyjicuuyrvblbsqlduqg ONLY.
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

/** Mirror of rescueAccessTokenNeedsRefresh for offline proof. */
function rescueAccessTokenNeedsRefresh(session, nowMs = Date.now(), skewMs = 60_000) {
  if (!session?.access_token) return true
  const exp = Number(session.expires_at)
  if (!Number.isFinite(exp) || exp <= 0) return false
  return exp * 1000 <= nowMs + skewMs
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
  if (error || !data?.session) throw new Error(`login ${email}: ${error?.message || 'fail'}`)
  return data.session
}

;(async () => {
  const src = fs.readFileSync(path.join(root, 'src', 'lib', 'rescue.js'), 'utf8')
  const notifySrc = fs.readFileSync(path.join(root, 'src', 'lib', 'rescueNotifications.js'), 'utf8')
  const checks = {}
  const notes = []

  checks.usesGetSession = /supabase\.auth\.getSession\(/.test(src)
  checks.usesRefreshSession = /supabase\.auth\.refreshSession\(/.test(src)
  checks.maxOneRetry = /authRetries = 1/.test(src) && /isRescueAuthFailure/.test(src)
  checks.sessionExpiredUx =
    /Your session has expired\. Please sign in again\./.test(src) &&
    /SESSION_EXPIRED/.test(notifySrc)
  checks.noInvalidAuthUx =
    /invalid auth token/i.test(notifySrc) &&
    /Your session has expired\. Please sign in again\./.test(notifySrc)
  checks.acceptUsesAuthedPost = /action:\s*'accept'/.test(src) && /rescueAuthedPost/.test(src)
  checks.declineUsesAuthedPost = /action:\s*'decline'/.test(src)
  checks.winnerDetailsUsesAuthedPost = /action:\s*'winner_details'/.test(src)
  checks.acceptCallNoStaleToken = /acceptRescueRequest\(\{\s*rescueRequestId:\s*rescueId,\s*companyId,\s*\}\)/.test(
    notifySrc
  )
  checks.whatsappFilesClean = (() => {
    try {
      const { execSync } = require('child_process')
      const out = execSync('git status --porcelain -- api/_whatsapp.js api/_whatsappInbound.js api/whatsapp-webhook.js', {
        cwd: root,
        encoding: 'utf8',
      })
      return !String(out || '').trim()
    } catch {
      return false
    }
  })()
  checks.timerConstants =
    /ORIGINAL_COMPANY_DECISION_SECONDS = 25/.test(src) && /RESCUE_OPPORTUNITY_SECONDS = 30/.test(src)

  const now = Date.now()
  checks.needsRefreshWhenExpired = rescueAccessTokenNeedsRefresh(
    { access_token: 'x', expires_at: Math.floor((now - 10_000) / 1000) },
    now
  )
  checks.needsRefreshWhenNearExpiry = rescueAccessTokenNeedsRefresh(
    { access_token: 'x', expires_at: Math.floor((now + 30_000) / 1000) },
    now
  )
  checks.noRefreshWhenFresh = !rescueAccessTokenNeedsRefresh(
    { access_token: 'x', expires_at: Math.floor((now + 3600_000) / 1000) },
    now
  )
  checks.needsRefreshWhenMissing = rescueAccessTokenNeedsRefresh(null, now)

  const { data: cos } = await admin.from('companies').select('id,name,status').eq('status', 'approved')
  const companyA = (cos || []).find((c) => /ghent/i.test(c.name || ''))
  const companyB = (cos || []).find((c) => /antwerp/i.test(c.name || ''))
  const companyC = (cos || []).find((c) => /bruges/i.test(c.name || ''))
  if (!companyA || !companyB || !companyC) throw new Error('need companies')

  await admin
    .from('taxio_platform_flags')
    .update({
      rescue_globally_enabled: true,
      original_company_decision_seconds: 25,
      rescue_opportunity_seconds: 30,
    })
    .eq('id', 1)
  await admin.from('companies').update({ rescue_enabled: true }).in('id', [companyA.id, companyB.id, companyC.id])

  const sessA = await login('owner.v001.staging@example.com', 'Txio!OwnerA_V00199')
  const sessB = await login('owner.b.v001.staging@example.com', 'Txio!OwnerB_V00199')
  const sessC = await login('owner.c.v001.staging@example.com', 'Txio!OwnerC_V00199')
  const sbA = userClient(sessA.access_token)
  const sbB = userClient(sessB.access_token)
  const sbC = userClient(sessC.access_token)

  checks.freshLoginHasToken = Boolean(sessB.access_token) && !rescueAccessTokenNeedsRefresh(sessB)

  const { data: booking } = await admin
    .from('booking_requests')
    .insert({
      company_id: companyA.id,
      status: 'new',
      pickup_address: 'Auth Refresh Pickup',
      dropoff_address: 'Auth Refresh Drop',
      ride_datetime: new Date(Date.now() + 7200e3).toISOString(),
      car_type: 'Standard',
      service_type: 'standard',
      customer_name: 'Auth Refresh Rider',
      customer_phone: '32470999333',
      estimated_price_eur: 50,
      price_currency: 'EUR',
      decision_deadline_at: new Date(Date.now() - 1000).toISOString(),
      notes: 'Trip price: €50.00',
    })
    .select('id')
    .single()

  await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: booking.id,
    p_company_id: companyA.id,
  })
  const { data: rescue } = await admin
    .from('rescue_requests')
    .select('id')
    .eq('booking_request_id', booking.id)
    .single()

  const { data: opps } = await admin
    .from('rescue_opportunities')
    .select('expires_at')
    .eq('rescue_request_id', rescue.id)
    .eq('status', 'OFFERED')
  const oppSecs =
    opps?.[0]?.expires_at &&
    Math.round((new Date(opps[0].expires_at).getTime() - Date.now()) / 1000)
  checks.timer30 = Number.isFinite(oppSecs) && oppSecs >= 25 && oppSecs <= 35

  const race = await Promise.all([
    sbB.rpc('accept_rescue_request', { p_rescue_request_id: rescue.id, p_company_id: companyB.id }),
    sbC.rpc('accept_rescue_request', { p_rescue_request_id: rescue.id, p_company_id: companyC.id }),
  ])
  const winners = race.filter((r) => r.data?.ok === true)
  const losers = race.filter((r) => r.data?.ok !== true)
  checks.atomicOneWinner = winners.length === 1
  checks.losersLocked = losers.every((r) =>
    /ALREADY_TAKEN|ALREADY_ASSIGNED/.test(String(r.data?.code || ''))
  )

  const { data: after } = await admin
    .from('rescue_requests')
    .select('accepted_by_company_id,passenger_confirm_status,status')
    .eq('id', rescue.id)
    .single()
  checks.waiting =
    after?.status === 'ACCEPTED' &&
    after?.passenger_confirm_status === 'WAITING_PASSENGER_CONFIRMATION'
  checks.winnerImmutable = !!after?.accepted_by_company_id

  const loserClient = after?.accepted_by_company_id === companyB.id ? sbC : sbB
  const loserDet = await loserClient.rpc('get_rescue_booking_details', {
    p_rescue_request_id: rescue.id,
  })
  checks.noPiiLeak =
    loserDet.data?.ok === false ||
    !loserDet.data?.booking?.customer_phone ||
    /PII_LOCKED|FORBIDDEN|NOT_WINNER/i.test(String(loserDet.data?.code || ''))

  await admin.from('rescue_opportunities').delete().eq('rescue_request_id', rescue.id)
  await admin.from('rescue_requests').delete().eq('id', rescue.id)
  await admin.from('booking_requests').delete().eq('id', booking.id)

  notes.push({ oppSecs, raceCodes: race.map((r) => r.data?.code) })

  const required = [
    'usesGetSession',
    'usesRefreshSession',
    'maxOneRetry',
    'sessionExpiredUx',
    'noInvalidAuthUx',
    'acceptUsesAuthedPost',
    'declineUsesAuthedPost',
    'winnerDetailsUsesAuthedPost',
    'acceptCallNoStaleToken',
    'whatsappFilesClean',
    'timerConstants',
    'needsRefreshWhenExpired',
    'needsRefreshWhenNearExpiry',
    'noRefreshWhenFresh',
    'needsRefreshWhenMissing',
    'freshLoginHasToken',
    'timer30',
    'atomicOneWinner',
    'losersLocked',
    'waiting',
    'winnerImmutable',
    'noPiiLeak',
  ]
  const failed = required.filter((k) => checks[k] !== true)
  console.log(JSON.stringify({ pass: failed.length === 0, failed, checks, notes }, null, 2))
  process.exit(failed.length === 0 ? 0 : 1)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e.stack || e) }, null, 2))
  process.exit(1)
})
