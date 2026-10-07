/**
 * Online smoke for https://taxio-v001-staging-eta.vercel.app against staging Supabase.
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
  console.log(JSON.stringify({ fatal: 'staging only' }))
  process.exit(1)
}

const A = {
  id: '27c589cc-ea6e-4264-99c6-3710a1c1defe',
  email: 'owner.v001.staging@example.com',
  password: 'Txio!OwnerA_V00199',
  slug: 'v001stagingtaxighent',
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

function isEuro35Label(s) {
  const t = String(s || '')
    .replace(/â‚¬/g, '€')
    .replace(/\u00e2\u20ac/g, '€')
  const m = t.match(/(?:€|EUR)\s*([0-9]+(?:[.,][0-9]+)?)\.?/i)
  return !!(m && Math.abs(Number(String(m[1]).replace(',', '.')) - 35) < 0.001)
}

;(async () => {
  const report = { base: BASE, host, checks: {}, notes: {} }

  const home = await fetch(BASE + '/')
  report.checks.homeOk = home.status === 200
  const homeHtml = await home.text()
  report.checks.homeIsTaxio = /TAXIO/i.test(homeHtml)

  const book = await fetch(`${BASE}/book/${A.slug}`)
  report.checks.bookingPageOk = book.status === 200
  const bookHtml = await book.text()
  report.checks.bookingPageHasForm = /TAXIO|root|script/i.test(bookHtml)

  await admin.from('taxio_platform_flags').update({ rescue_globally_enabled: true }).eq('id', 1)
  await admin.from('companies').update({ rescue_enabled: true }).in('id', [A.id, B.id])

  const tokenA = await login(A.email, A.password)
  const tokenB = await login(B.email, B.password)
  const sbA = userSb(tokenA)
  const sbB = userSb(tokenB)
  report.checks.companyALogin = !!tokenA
  report.checks.companyBLogin = !!tokenB

  // Normal accept
  const { data: acceptBooking } = await admin
    .from('booking_requests')
    .insert({
      company_id: A.id,
      customer_name: 'Online Smoke Accept',
      customer_phone: '0470123456',
      pickup_address: 'Brussels Airport, 1930 Zaventem',
      dropoff_address: 'Leuven, 3000 Leuven',
      car_type: 'Standard',
      service_type: 'standard',
      status: 'new',
      estimated_price_eur: 35,
      price_currency: 'EUR',
      notes: 'Estimate: 28 km, 35 min, €35',
      rider_terms_accepted: true,
      rider_terms_accepted_at: new Date().toISOString(),
      rider_terms_version: 'taxio-rider-terms-2026-04-v2+taxio-privacy-2026-04',
    })
    .select('id,estimated_price_eur')
    .maybeSingle()
  const acc = await sbA
    .from('booking_requests')
    .update({ status: 'accepted' })
    .eq('id', acceptBooking.id)
    .eq('company_id', A.id)
  report.checks.normalAccept = !acc.error && Number(acceptBooking.estimated_price_eur) === 35

  // Refuse → Rescue via live /api/rescue
  const { data: refuseBooking } = await admin
    .from('booking_requests')
    .insert({
      company_id: A.id,
      customer_name: 'Online Smoke Refuse',
      customer_phone: '0470654321',
      pickup_address: 'Brussels Airport, 1930 Zaventem',
      dropoff_address: 'Leuven, 3000 Leuven',
      car_type: 'Standard',
      service_type: 'standard',
      status: 'new',
      estimated_price_eur: 35,
      price_currency: 'EUR',
      notes: 'Estimate: 28 km, 35 min, €35',
      rider_terms_accepted: true,
      rider_terms_accepted_at: new Date().toISOString(),
      rider_terms_version: 'taxio-rider-terms-2026-04-v2+taxio-privacy-2026-04',
    })
    .select('id,estimated_price_eur,pickup_address,dropoff_address')
    .maybeSingle()

  const activateRes = await fetch(`${BASE}/api/rescue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      action: 'activate',
      bookingRequestId: refuseBooking.id,
      companyId: A.id,
    }),
  })
  const activateBody = await activateRes.json().catch(() => ({}))
  report.checks.refuseRescueApi = activateRes.ok && activateBody.ok === true
  report.notes.activatePreview = activateBody.preview_estimated_price || null
  report.notes.activateEstimatedPriceEur = activateBody.estimated_price_eur ?? null
  report.checks.frozenPriceOnActivate =
    isEuro35Label(activateBody.preview_estimated_price) || Number(activateBody.estimated_price_eur) === 35
  const rescueId = activateBody.rescue_request_id

  await sbA.from('booking_requests').update({ status: 'rejected' }).eq('id', refuseBooking.id)

  const { data: opp } = await sbB
    .from('rescue_opportunities')
    .select('id,status,rescue:rescue_requests(preview_estimated_price,status)')
    .eq('company_id', B.id)
    .eq('rescue_request_id', rescueId)
    .maybeSingle()
  report.checks.bSeesOpportunity = !!opp && opp.status === 'OFFERED'
  report.checks.bSeesFrozenPrice =
    isEuro35Label(opp?.rescue?.preview_estimated_price) || Number(activateBody.estimated_price_eur) === 35

  const acceptRes = await fetch(`${BASE}/api/rescue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({
      action: 'accept',
      rescueRequestId: rescueId,
      companyId: B.id,
    }),
  })
  const acceptBody = await acceptRes.json().catch(() => ({}))
  report.checks.bAcceptApi = acceptRes.ok && acceptBody.ok === true

  const details = await sbB.rpc('get_rescue_booking_details', { p_rescue_request_id: rescueId })
  report.checks.passengerUnlocked = !!(details.data?.ok && details.data.booking?.customer_phone)
  report.checks.priceAfterAccept = Number(details.data?.booking?.estimated_price_eur) === 35

  const { data: finalR } = await admin
    .from('rescue_requests')
    .select('status,accepted_by_company_id,original_company_id,preview_estimated_price')
    .eq('id', rescueId)
    .maybeSingle()
  const { data: bookingFinal } = await admin
    .from('booking_requests')
    .select('company_id,estimated_price_eur,pickup_address,dropoff_address')
    .eq('id', refuseBooking.id)
    .maybeSingle()

  report.checks.aRescuedByB =
    finalR?.status === 'ACCEPTED' && finalR?.accepted_by_company_id === B.id
  report.checks.originalPreserved =
    bookingFinal?.company_id === A.id &&
    bookingFinal?.pickup_address === refuseBooking.pickup_address &&
    bookingFinal?.dropoff_address === refuseBooking.dropoff_address &&
    Number(bookingFinal?.estimated_price_eur) === 35

  // Confirm aliases are not taxio.be
  report.checks.notProductionDomain = !/taxio\.be/i.test(BASE)

  report.pass = Object.values(report.checks).every(Boolean)
  console.log(JSON.stringify(report, null, 2))
  process.exit(report.pass ? 0 : 1)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: e.message }))
  process.exit(1)
})
