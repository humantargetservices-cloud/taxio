/**
 * Frozen Rescue trip price proof (staging JWT).
 * Passenger €35 → booking → Rescue preview → B sees €35 → B pricing change → still €35 → accept → still €35.
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

const PICKUP = 'Brussels Airport, 1930 Zaventem'
const DROPOFF = 'Leuven, 3000 Leuven'

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

function nearly35(v) {
  return Math.abs(Number(v) - 35) < 0.001
}

/** True when label encodes €35 / 35 EUR (tolerates trailing '.' from to_char). */
function isEuro35Label(s) {
  const t = String(s || '')
    .replace(/\u00e2\u20ac/g, '€')
    .replace(/â‚¬/g, '€')
  const m = t.match(/(?:€|EUR)\s*([0-9]+(?:[.,][0-9]+)?)\.?/i) || t.match(/([0-9]+(?:[.,][0-9]+)?)\s*EUR/i)
  if (!m) return false
  return nearly35(String(m[1]).replace(',', '.'))
}

;(async () => {
  const report = { host, checks: {}, notes: {} }

  const colProbe = await admin.from('booking_requests').select('estimated_price_eur,price_currency').limit(1)
  if (colProbe.error) {
    report.pass = false
    report.fatal = 'migration_not_applied'
    report.notes.colProbe = colProbe.error.message
    console.log(JSON.stringify(report, null, 2))
    process.exit(1)
  }

  await admin.from('taxio_platform_flags').update({ rescue_globally_enabled: true }).eq('id', 1)
  await admin.from('companies').update({ rescue_enabled: true }).in('id', [A.id, B.id])

  const { data: bBefore } = await admin.from('companies').select('pricing').eq('id', B.id).maybeSingle()
  report.notes.bPricingBefore = bBefore?.pricing || null

  const passengerShown = 35
  const { data: booking, error: insErr } = await admin
    .from('booking_requests')
    .insert({
      company_id: A.id,
      customer_name: 'Fake Frozen Price Rider',
      customer_phone: '0470111222',
      pickup_address: PICKUP,
      dropoff_address: DROPOFF,
      car_type: 'Standard',
      service_type: 'standard',
      status: 'new',
      estimated_price_eur: passengerShown,
      price_currency: 'EUR',
      notes: 'WhatsApp quick book · Standard · ride_now\nEstimate: 28.0 km, 35 min, €35',
      rider_terms_accepted: true,
      rider_terms_accepted_at: new Date().toISOString(),
      rider_terms_version: 'taxio-rider-terms-2026-04-v2+taxio-privacy-2026-04',
    })
    .select('id,estimated_price_eur,price_currency,company_id,pickup_address,dropoff_address')
    .maybeSingle()
  if (insErr) throw new Error(insErr.message)

  report.checks.passengerPriceStored = nearly35(booking.estimated_price_eur) && booking.price_currency === 'EUR'
  report.notes.storedPrice = booking.estimated_price_eur

  const tokenA = await login(A.email, A.password)
  const tokenB = await login(B.email, B.password)
  const sbA = userSb(tokenA)
  const sbB = userSb(tokenB)

  const act = await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: booking.id,
    p_company_id: A.id,
  })
  report.checks.rescueActivated = !!(act.data?.ok && act.data.code === 'OPEN')
  report.checks.rescueSnapshotEuro35 = isEuro35Label(act.data?.preview_estimated_price)
  report.notes.preview = act.data?.preview_estimated_price || null
  report.notes.activateEstimatedPriceEur = act.data?.estimated_price_eur ?? null
  const rescueId = act.data?.rescue_request_id

  // No recalculation: activate must echo frozen booking amount, not invent a new fare
  report.checks.noRescueRecalc =
    report.checks.rescueSnapshotEuro35 &&
    (act.data?.estimated_price_eur == null || nearly35(act.data.estimated_price_eur))

  await sbA.from('booking_requests').update({ status: 'rejected' }).eq('id', booking.id).eq('company_id', A.id)

  const { data: rescueRow } = await admin
    .from('rescue_requests')
    .select(
      'preview_estimated_price,preview_pickup_label,preview_dropoff_label,booking_request_id,original_company_id'
    )
    .eq('id', rescueId)
    .maybeSingle()

  const { data: opp } = await sbB
    .from('rescue_opportunities')
    .select(
      'id,status,rescue:rescue_requests(preview_estimated_price,preview_pickup_label,preview_dropoff_label,status)'
    )
    .eq('company_id', B.id)
    .eq('rescue_request_id', rescueId)
    .maybeSingle()
  report.checks.bSeesEuro35 = isEuro35Label(opp?.rescue?.preview_estimated_price)

  // Change Company B pricing drastically — must NOT affect Rescue price
  const crazyPricing = {
    Standard: { enabled: true, start: '999.00', per_km: '50.00', initial_km: '0' },
    Van: { enabled: true, start: '999.00', per_km: '50.00', initial_km: '0' },
    Luxury: { enabled: false, start: '10.00', per_km: '4.00', initial_km: '3' },
  }
  await admin.from('companies').update({ pricing: crazyPricing }).eq('id', B.id)

  const { data: oppAfter } = await sbB
    .from('rescue_opportunities')
    .select('rescue:rescue_requests(preview_estimated_price)')
    .eq('company_id', B.id)
    .eq('rescue_request_id', rescueId)
    .maybeSingle()
  report.checks.bPricingChangeIgnored = isEuro35Label(oppAfter?.rescue?.preview_estimated_price)
  report.notes.previewAfterBPricingChange = oppAfter?.rescue?.preview_estimated_price || null

  const accept = await sbB.rpc('accept_rescue_request', {
    p_rescue_request_id: rescueId,
    p_company_id: B.id,
  })
  report.checks.atomicAccept = !!(accept.data?.ok && accept.data.code === 'ACCEPTED')

  const details = await sbB.rpc('get_rescue_booking_details', { p_rescue_request_id: rescueId })
  report.checks.priceAfterAccept =
    nearly35(details.data?.booking?.estimated_price_eur) &&
    (isEuro35Label(details.data?.preview_estimated_price) ||
      nearly35(details.data?.booking?.estimated_price_eur))

  const { data: bookingFinal } = await admin
    .from('booking_requests')
    .select('estimated_price_eur,price_currency,company_id,pickup_address,dropoff_address,customer_name,customer_phone')
    .eq('id', booking.id)
    .maybeSingle()

  report.checks.bookingStillEuro35 =
    nearly35(bookingFinal?.estimated_price_eur) && bookingFinal?.company_id === A.id

  report.checks.pickupDropoffPreserved =
    bookingFinal?.pickup_address === PICKUP &&
    bookingFinal?.dropoff_address === DROPOFF &&
    details.data?.booking?.pickup_address === PICKUP &&
    details.data?.booking?.dropoff_address === DROPOFF &&
    bookingFinal?.customer_name === 'Fake Frozen Price Rider' &&
    bookingFinal?.customer_phone === '0470111222'

  report.notes.rescuePickup = rescueRow?.preview_pickup_label || null
  report.notes.rescueDropoff = rescueRow?.preview_dropoff_label || null

  // Legacy notes-only fallback
  const { data: legacy } = await admin
    .from('booking_requests')
    .insert({
      company_id: A.id,
      customer_name: 'Fake Legacy Notes Price',
      customer_phone: '0470333444',
      pickup_address: PICKUP,
      dropoff_address: 'Leuven centrum',
      car_type: 'Standard',
      service_type: 'standard',
      status: 'new',
      estimated_price_eur: null,
      price_currency: 'EUR',
      notes: 'Estimate: 12.3 km, 20 min, €35',
      rider_terms_accepted: true,
      rider_terms_accepted_at: new Date().toISOString(),
      rider_terms_version: 'taxio-rider-terms-2026-04-v2+taxio-privacy-2026-04',
    })
    .select('id')
    .maybeSingle()
  const legacyAct = await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: legacy.id,
    p_company_id: A.id,
  })
  report.checks.legacyNotesFallback = isEuro35Label(legacyAct.data?.preview_estimated_price)
  report.notes.legacyPreview = legacyAct.data?.preview_estimated_price || null
  report.notes.legacyCode = legacyAct.data?.code || legacyAct.error?.message || null

  // Restore B pricing
  if (bBefore?.pricing) {
    await admin.from('companies').update({ pricing: bBefore.pricing }).eq('id', B.id)
  }

  report.pass = [
    'passengerPriceStored',
    'rescueActivated',
    'rescueSnapshotEuro35',
    'bSeesEuro35',
    'bPricingChangeIgnored',
    'atomicAccept',
    'priceAfterAccept',
    'bookingStillEuro35',
    'pickupDropoffPreserved',
    'noRescueRecalc',
  ].every((k) => report.checks[k] === true)

  console.log(JSON.stringify(report, null, 2))
  process.exit(report.pass ? 0 : 1)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: e.message }))
  process.exit(1)
})
