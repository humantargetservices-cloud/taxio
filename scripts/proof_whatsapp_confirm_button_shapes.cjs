/**
 * Staging: prove WhatsApp Confirm button shapes → taxio_rescue_passenger_confirm.
 * No real Meta network. Project lyjicuuyrvblbsqlduqg ONLY.
 */
const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')
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
Object.assign(process.env, env)
if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
  process.env.WHATSAPP_PHONE_NUMBER_ID = '1476530895539889'
}
if (!process.env.PUBLIC_APP_ORIGIN) process.env.PUBLIC_APP_ORIGIN = 'https://staging.taxio.be'

const url = String(env.SUPABASE_URL || '').replace(/\/$/, '')
if (!url.includes('lyjicuuyrvblbsqlduqg')) {
  console.log(JSON.stringify({ fatal: 'staging only' }))
  process.exit(1)
}

const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID).trim()

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
  return data.session.access_token
}

function metaButtonPayload(payload, text = 'Confirm') {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: phoneNumberId },
              messages: [
                {
                  from: '32470999177',
                  type: 'button',
                  button: { payload, text },
                },
              ],
            },
          },
        ],
      },
    ],
  }
}

function metaButtonTextOnly(text, from) {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: phoneNumberId },
              messages: [
                {
                  from,
                  type: 'button',
                  button: { payload: text, text },
                },
              ],
            },
          },
        ],
      },
    ],
  }
}

;(async () => {
  const inbound = await import(pathToFileURL(path.join(root, 'api', '_whatsappInbound.js')).href)
  const wa = await import(pathToFileURL(path.join(root, 'api', '_whatsapp.js')).href)
  const { processWhatsappWebhookPayload, extractRescueButtonPayloadFromMessage } = inbound
  const { buildRescueConfirmButtonPayload, buildRescueConfirmTemplateComponents } = wa

  const checks = {}
  const notes = []
  const cleanup = { bookingIds: [], rescueIds: [] }

  const { data: cos } = await admin.from('companies').select('id,name,status').eq('status', 'approved')
  const companyA = (cos || []).find((c) => /ghent/i.test(c.name || ''))
  const companyB = (cos || []).find((c) => /antwerp/i.test(c.name || ''))
  const companyC = (cos || []).find((c) => /bruges/i.test(c.name || ''))
  if (!companyA || !companyB || !companyC) throw new Error('need Ghent/Antwerp/Bruges')

  await admin.from('companies').update({ rescue_enabled: true }).in('id', [companyA.id, companyB.id, companyC.id])

  const tokenA = await login('owner.v001.staging@example.com', 'Txio!OwnerA_V00199')
  const tokenB = await login('owner.b.v001.staging@example.com', 'Txio!OwnerB_V00199')
  const tokenC = await login('owner.c.v001.staging@example.com', 'Txio!OwnerC_V00199')
  const sbA = userClient(tokenA)
  const sbB = userClient(tokenB)
  const sbC = userClient(tokenC)

  // --- Outbound template Confirm payload ---
  const fakeToken = 'a'.repeat(40)
  const built = buildRescueConfirmTemplateComponents({
    originalCompanyName: 'Company A',
    winnerCompanyName: 'Winner Co',
    confirmToken: fakeToken,
  })
  const qr0 = built.components.find((c) => c.type === 'button' && c.sub_type === 'quick_reply' && c.index === '0')
  checks.outboundConfirmPayload =
    qr0?.parameters?.[0]?.payload === buildRescueConfirmButtonPayload(fakeToken)

  // Extract shapes
  const shapePayload = extractRescueButtonPayloadFromMessage({
    type: 'button',
    button: { payload: buildRescueConfirmButtonPayload(fakeToken), text: 'Confirm' },
  })
  checks.extractPayloadShape =
    shapePayload?.action === 'CONFIRM' && shapePayload?.token === fakeToken

  const shapeTextOnly = extractRescueButtonPayloadFromMessage({
    type: 'button',
    button: { payload: 'Confirm', text: 'Confirm' },
  })
  checks.extractTextOnlyLabel =
    shapeTextOnly?.action === 'CONFIRM' && shapeTextOnly?.labelOnly === true

  // --- Live waiting rescue ---
  const passengerPhone = '32470999177'
  const { data: booking } = await admin
    .from('booking_requests')
    .insert({
      company_id: companyA.id,
      status: 'new',
      pickup_address: 'WA Confirm Pickup',
      dropoff_address: 'WA Confirm Drop',
      ride_datetime: new Date(Date.now() + 7200e3).toISOString(),
      car_type: 'Standard',
      service_type: 'standard',
      customer_name: 'WA Confirm Rider',
      customer_phone: passengerPhone,
      estimated_price_eur: 66.0,
      price_currency: 'EUR',
      decision_deadline_at: new Date(Date.now() - 1000).toISOString(),
      notes: 'Trip price: €66.00',
    })
    .select('*')
    .single()
  cleanup.bookingIds.push(booking.id)

  await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: booking.id,
    p_company_id: companyA.id,
  })
  const { data: rescue } = await admin
    .from('rescue_requests')
    .select('id,passenger_confirm_token,passenger_confirm_status,accepted_by_company_id')
    .eq('booking_request_id', booking.id)
    .single()
  cleanup.rescueIds.push(rescue.id)

  await sbB.rpc('accept_rescue_request', {
    p_rescue_request_id: rescue.id,
    p_company_id: companyB.id,
  })

  const { data: rescueWait } = await admin
    .from('rescue_requests')
    .select('id,passenger_confirm_token,passenger_confirm_status,accepted_by_company_id,status')
    .eq('id', rescue.id)
    .single()
  const token = rescueWait.passenger_confirm_token
  checks.waiting = rescueWait.passenger_confirm_status === 'WAITING_PASSENGER_CONFIRMATION'
  checks.winnerB = rescueWait.accepted_by_company_id === companyB.id

  // A) Simulated Meta Confirm WITH token payload
  const sumA = await processWhatsappWebhookPayload(
    admin,
    metaButtonPayload(buildRescueConfirmButtonPayload(token), 'Confirm')
  )
  const resA = sumA.results?.[0]
  checks.webhookPayloadConfirm =
    resA?.ok === true &&
    (resA?.code === 'CONFIRMED' || resA?.result?.code === 'CONFIRMED') &&
    resA?.rpc === 'taxio_rescue_passenger_confirm'

  const { data: afterA } = await admin
    .from('rescue_requests')
    .select('passenger_confirm_status,accepted_by_company_id,status')
    .eq('id', rescue.id)
    .single()
  checks.dbConfirmed = afterA?.passenger_confirm_status === 'CONFIRMED'
  checks.winnerImmutable = afterA?.accepted_by_company_id === companyB.id

  const winnerPii = await sbB.rpc('get_rescue_booking_details', { p_rescue_request_id: rescue.id })
  const loserPii = await sbC.rpc('get_rescue_booking_details', { p_rescue_request_id: rescue.id })
  checks.winnerPii =
    winnerPii.data?.ok === true && !!winnerPii.data?.booking?.customer_phone
  checks.loserPii =
    loserPii.data?.ok === false ||
    !loserPii.data?.booking?.customer_phone ||
    /FORBIDDEN|PII_LOCKED|NOT_WINNER/i.test(String(loserPii.data?.code || ''))

  // Idempotency
  const sumA2 = await processWhatsappWebhookPayload(
    admin,
    metaButtonPayload(buildRescueConfirmButtonPayload(token), 'Confirm')
  )
  checks.idempotent =
    sumA2.results?.[0]?.ok === true &&
    (sumA2.results?.[0]?.code === 'ALREADY_CONFIRMED' ||
      sumA2.results?.[0]?.result?.code === 'ALREADY_CONFIRMED')

  // Browser RPC comparison on same token after already confirmed
  const browser = await admin.rpc('taxio_rescue_passenger_confirm', { p_token: token })
  checks.browserSameRpc =
    browser.data?.ok === true && browser.data?.code === 'ALREADY_CONFIRMED'

  // B) New rescue — text-only Confirm (Meta returns payload=Confirm)
  const { data: booking2 } = await admin
    .from('booking_requests')
    .insert({
      company_id: companyA.id,
      status: 'new',
      pickup_address: 'WA TextOnly Pickup',
      dropoff_address: 'WA TextOnly Drop',
      ride_datetime: new Date(Date.now() + 8000e3).toISOString(),
      car_type: 'Standard',
      service_type: 'standard',
      customer_name: 'WA TextOnly Rider',
      customer_phone: '32470999288',
      estimated_price_eur: 41.0,
      price_currency: 'EUR',
      decision_deadline_at: new Date(Date.now() - 1000).toISOString(),
      notes: 'Trip price: €41.00',
    })
    .select('*')
    .single()
  cleanup.bookingIds.push(booking2.id)
  await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: booking2.id,
    p_company_id: companyA.id,
  })
  const { data: rescue2 } = await admin
    .from('rescue_requests')
    .select('id')
    .eq('booking_request_id', booking2.id)
    .single()
  cleanup.rescueIds.push(rescue2.id)
  await sbB.rpc('accept_rescue_request', {
    p_rescue_request_id: rescue2.id,
    p_company_id: companyB.id,
  })

  const sumB = await processWhatsappWebhookPayload(
    admin,
    metaButtonTextOnly('Confirm', '32470999288')
  )
  const resB = sumB.results?.[0]
  checks.webhookTextOnlyConfirm =
    resB?.ok === true &&
    (resB?.code === 'CONFIRMED' || resB?.result?.code === 'CONFIRMED') &&
    resB?.resolvedVia === 'sender_phone'

  const { data: afterB } = await admin
    .from('rescue_requests')
    .select('passenger_confirm_status')
    .eq('id', rescue2.id)
    .single()
  checks.textOnlyDbConfirmed = afterB?.passenger_confirm_status === 'CONFIRMED'

  notes.push({
    outboundPayload: qr0?.parameters?.[0]?.payload,
    resA,
    resB,
    sumA,
    sumB,
  })

  for (const id of cleanup.rescueIds.filter(Boolean)) {
    await admin.from('rescue_opportunities').delete().eq('rescue_request_id', id)
    await admin.from('rescue_requests').delete().eq('id', id)
  }
  if (cleanup.bookingIds.length) {
    await admin.from('booking_requests').delete().in('id', cleanup.bookingIds)
  }

  const required = [
    'outboundConfirmPayload',
    'extractPayloadShape',
    'extractTextOnlyLabel',
    'waiting',
    'winnerB',
    'webhookPayloadConfirm',
    'dbConfirmed',
    'winnerImmutable',
    'winnerPii',
    'loserPii',
    'idempotent',
    'browserSameRpc',
    'webhookTextOnlyConfirm',
    'textOnlyDbConfirmed',
  ]
  const failed = required.filter((k) => checks[k] !== true)
  console.log(JSON.stringify({ pass: failed.length === 0, failed, checks, notes }, null, 2))
  process.exit(failed.length === 0 ? 0 : 1)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e.stack || e) }, null, 2))
  process.exit(1)
})
