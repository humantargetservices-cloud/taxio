/**
 * Staging dry-run: final Meta template taxio_rescue_confirmation_staging alignment.
 * NO real Meta send. Project lyjicuuyrvblbsqlduqg ONLY.
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
if (!String(process.env.PUBLIC_APP_ORIGIN || '').trim()) {
  process.env.PUBLIC_APP_ORIGIN = 'https://staging.taxio.be'
}
if (!String(process.env.WHATSAPP_TEMPLATE_NAME || '').trim()) {
  process.env.WHATSAPP_TEMPLATE_NAME = 'taxio_rescue_confirmation_staging'
}
if (!String(process.env.WHATSAPP_TEMPLATE_LANG || '').trim()) {
  process.env.WHATSAPP_TEMPLATE_LANG = 'en'
}
if (!String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()) {
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'dryrun-taxio-phone-number-id'
}

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
  return data.session.access_token
}

async function openRescueWithWinner({ companyA, companyB, sbA, sbB, phone, price, label }) {
  const { data: booking, error } = await admin
    .from('booking_requests')
    .insert({
      company_id: companyA.id,
      status: 'new',
      pickup_address: `${label} Pickup`,
      dropoff_address: `${label} Drop`,
      ride_datetime: new Date(Date.now() + 7200e3).toISOString(),
      car_type: 'Standard',
      service_type: 'standard',
      customer_name: `${label} Rider`,
      customer_phone: phone,
      estimated_price_eur: price,
      price_currency: 'EUR',
      decision_deadline_at: new Date(Date.now() - 1000).toISOString(),
      notes: `Trip price: €${Number(price).toFixed(2)}`,
    })
    .select('*')
    .single()
  if (error) throw new Error(`booking insert: ${error.message}`)

  const act = await sbA.rpc('activate_rescue_request', {
    p_booking_request_id: booking.id,
    p_company_id: companyA.id,
  })
  if (act.data?.ok !== true) throw new Error(`activate: ${JSON.stringify(act.data || act.error)}`)
  const rescueId = act.data.rescue_request_id

  const win = await sbB.rpc('accept_rescue_request', {
    p_rescue_request_id: rescueId,
    p_company_id: companyB.id,
  })
  if (win.data?.ok !== true && win.data?.code !== 'COMPANY_FOUND') {
    throw new Error(`accept: ${JSON.stringify(win.data || win.error)}`)
  }

  const { data: rescueRow } = await admin
    .from('rescue_requests')
    .select(
      'id,accepted_by_company_id,original_company_id,passenger_confirm_token,passenger_confirm_status,preview_estimated_price,passenger_confirm_whatsapp_sent_at'
    )
    .eq('id', rescueId)
    .single()

  return { booking, rescueId, rescueRow, win }
}

;(async () => {
  const notifyMod = await import(
    pathToFileURL(path.join(root, 'api', '_rescuePassengerNotify.js')).href
  )
  const waMod = await import(pathToFileURL(path.join(root, 'api', '_whatsapp.js')).href)
  const inboundMod = await import(pathToFileURL(path.join(root, 'api', '_whatsappInbound.js')).href)

  const {
    notifyRescuePassengerConfirmWhatsApp,
    notifyPendingRescuePassengerWhatsApps,
    rescuePassengerConfirmUrl,
  } = notifyMod
  const {
    buildRescueConfirmTemplateComponents,
    buildRescueConfirmButtonPayload,
    buildRescueCancelButtonPayload,
    parseRescueButtonPayload,
  } = waMod
  const { handleRescuePassengerButtonReply, processWhatsappWebhookPayload } = inboundMod

  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID).trim()
  const checks = {}
  const notes = []
  const cleanup = { bookingIds: [], rescueIds: [] }

  // Booking flow untouched: these files must not be dirty in this alignment work
  const bookingTouched = ['src/pages/bookCompany.js', 'src/lib/api.js', 'api/public-booking.js'].some(
    (f) => {
      try {
        const { execSync } = require('child_process')
        const out = execSync(`git status --porcelain -- "${f}"`, { cwd: root, encoding: 'utf8' })
        return Boolean(String(out || '').trim())
      } catch {
        return true
      }
    }
  )
  checks.bookingFlowUntouched = bookingTouched === false

  const { data: cos } = await admin
    .from('companies')
    .select('id,name,slug,rescue_enabled,status')
    .eq('status', 'approved')
  const companyA = (cos || []).find((c) => /ghent/i.test(c.name || ''))
  const companyB = (cos || []).find((c) => /antwerp/i.test(c.name || ''))
  const companyC = (cos || []).find(
    (c) => c.id !== companyA?.id && c.id !== companyB?.id && /brussels|bruges|leuven|liege/i.test(c.name || '')
  )
  if (!companyA || !companyB) throw new Error('need Ghent + Antwerp')

  await admin.from('companies').update({ rescue_enabled: true }).in('id', [companyA.id, companyB.id])

  const tokenA = await login('owner.v001.staging@example.com', 'Txio!OwnerA_V00199')
  const tokenB = await login('owner.b.v001.staging@example.com', 'Txio!OwnerB_V00199')
  const sbA = userClient(tokenA)
  const sbB = userClient(tokenB)

  // --- A accepts normally → NO TAXIO passenger WhatsApp ---
  {
    const { data: b } = await admin
      .from('booking_requests')
      .insert({
        company_id: companyA.id,
        status: 'new',
        pickup_address: 'WA Dry A Pickup',
        dropoff_address: 'WA Dry A Drop',
        ride_datetime: new Date(Date.now() + 3600e3).toISOString(),
        car_type: 'Standard',
        service_type: 'standard',
        customer_name: 'Normal Accept Rider',
        customer_phone: '32470999001',
        estimated_price_eur: 21.5,
        price_currency: 'EUR',
        decision_deadline_at: new Date(Date.now() + 25000).toISOString(),
      })
      .select('id')
      .single()
    cleanup.bookingIds.push(b.id)
    await admin.from('booking_requests').update({ status: 'accepted', decision_deadline_at: null }).eq('id', b.id)
    const { data: rescues } = await admin.from('rescue_requests').select('id').eq('booking_request_id', b.id)
    checks.aAcceptNoRescue = !rescues?.length
    const bogus = await notifyRescuePassengerConfirmWhatsApp(admin, {
      rescueRequestId: b.id,
      dryRun: true,
    })
    checks.aAcceptNoMessage =
      checks.aAcceptNoRescue &&
      bogus.ok === false &&
      (bogus.code === 'NOT_FOUND' || bogus.code === 'NO_ACTION')
  }

  // --- Winner path → template body/buttons dry-run ---
  const opened = await openRescueWithWinner({
    companyA,
    companyB,
    sbA,
    sbB,
    phone: '32470999111',
    price: 55.25,
    label: 'WA Dry Rescue',
  })
  cleanup.bookingIds.push(opened.booking.id)
  cleanup.rescueIds.push(opened.rescueId)

  checks.rescueOpened = true
  checks.waiting =
    opened.rescueRow?.passenger_confirm_status === 'WAITING_PASSENGER_CONFIRMATION'
  checks.tokenPresent = String(opened.rescueRow?.passenger_confirm_token || '').length >= 20
  checks.winnerCompany = opened.rescueRow?.accepted_by_company_id === companyB.id
  checks.frozenPrice =
    String(opened.rescueRow?.preview_estimated_price || '').includes('55') ||
    String(opened.rescueRow?.preview_estimated_price || '').includes('55.25')

  const confirmUrl = rescuePassengerConfirmUrl(opened.rescueRow?.passenger_confirm_token)
  checks.confirmUrl =
    !!confirmUrl &&
    confirmUrl.startsWith('https://staging.taxio.be/rescue/confirm/') &&
    confirmUrl.includes(opened.rescueRow.passenger_confirm_token)

  const beforeWin = await notifyRescuePassengerConfirmWhatsApp(admin, {
    rescueRequestId: '00000000-0000-4000-8000-000000000000',
    dryRun: true,
  })
  checks.beforeWinnerNoMessage = beforeWin.ok === false

  const first = await notifyRescuePassengerConfirmWhatsApp(admin, {
    rescueRequestId: opened.rescueId,
    dryRun: true,
  })
  checks.firstDryRun = first.ok === true && first.code === 'DRY_RUN_SENT'
  checks.phoneFromBooking = first.passengerPhoneDigits === '32470999111'
  checks.originalCompanyA =
    /ghent/i.test(String(first.originalCompanyName || '')) &&
    first.originalCompanyId === companyA.id
  checks.winnerNameUsed =
    /antwerp/i.test(String(first.winnerCompanyName || first.companyName || '')) &&
    first.winnerCompanyId === companyB.id
  checks.onlyTwoBodyParams = first.bodyParamCount === 2

  const bodyTexts = (first.dryRunPayload?.template?.components || [])
    .find((c) => c.type === 'body')
    ?.parameters?.map((p) => p.text)
  checks.bodyParamsExact =
    Array.isArray(bodyTexts) &&
    bodyTexts.length === 2 &&
    /ghent/i.test(bodyTexts[0] || '') &&
    /antwerp/i.test(bodyTexts[1] || '')

  // No pickup/dropoff/price in template body
  const bodyBlob = JSON.stringify(bodyTexts || [])
  checks.noTripDetailsInBody =
    !/WA Dry Rescue Pickup/i.test(bodyBlob) &&
    !/WA Dry Rescue Drop/i.test(bodyBlob) &&
    !/55\.25/.test(bodyBlob)

  checks.frozenPriceUnchanged =
    checks.frozenPrice &&
    (String(first.frozenPriceLabel || '').includes('55') ||
      String(opened.rescueRow?.preview_estimated_price || '').includes('55'))

  const token = opened.rescueRow.passenger_confirm_token
  const confirmPayload = first.confirmPayload || buildRescueConfirmButtonPayload(token)
  const cancelPayload = first.cancelPayload || buildRescueCancelButtonPayload(token)
  const parsedConfirm = parseRescueButtonPayload(confirmPayload)
  const parsedCancel = parseRescueButtonPayload(cancelPayload)
  checks.confirmButtonValid =
    parsedConfirm?.action === 'CONFIRM' && parsedConfirm?.token === token
  checks.cancelButtonValid =
    parsedCancel?.action === 'CANCEL' && parsedCancel?.token === token

  const urlBtn = (first.dryRunPayload?.template?.components || []).find(
    (c) => c.type === 'button' && c.sub_type === 'url'
  )
  checks.reviewDetailsToken =
    first.urlToken === token &&
    urlBtn?.index === '2' &&
    urlBtn?.parameters?.[0]?.text === token &&
    !!confirmUrl &&
    confirmUrl.includes(token)

  // Static component builder also only 2 body params
  const built = buildRescueConfirmTemplateComponents({
    originalCompanyName: companyA.name,
    winnerCompanyName: companyB.name,
    confirmToken: token,
  })
  checks.builderTwoParams = built.bodyParameters.length === 2

  notes.push({
    originalCompanyA: first.originalCompanyName,
    winnerCompany: first.winnerCompanyName,
    bodyTexts,
    confirmPayload,
    cancelPayload,
    urlToken: token,
    confirmUrl,
    frozenPriceLabel: first.frozenPriceLabel,
    templateName: first.dryRunPayload?.template?.name,
  })

  const { data: afterSend } = await admin
    .from('rescue_requests')
    .select('passenger_confirm_whatsapp_sent_at')
    .eq('id', opened.rescueId)
    .single()
  checks.sendOnceMarked = !!afterSend?.passenger_confirm_whatsapp_sent_at

  const second = await notifyRescuePassengerConfirmWhatsApp(admin, {
    rescueRequestId: opened.rescueId,
    dryRun: true,
  })
  checks.duplicateBlocked = second.ok === true && second.code === 'ALREADY_SENT'

  await admin
    .from('rescue_requests')
    .update({ passenger_confirm_whatsapp_sent_at: null })
    .eq('id', opened.rescueId)
  const [r1, r2] = await Promise.all([
    notifyRescuePassengerConfirmWhatsApp(admin, { rescueRequestId: opened.rescueId, dryRun: true }),
    notifyRescuePassengerConfirmWhatsApp(admin, { rescueRequestId: opened.rescueId, dryRun: true }),
  ])
  const codes = [r1.code, r2.code].sort()
  checks.concurrentOneSent =
    codes.includes('DRY_RUN_SENT') && codes.includes('ALREADY_SENT') && codes.length === 2
  notes.push({ concurrent: [r1.code, r2.code] })

  // --- Confirm webhook (same RPC as browser) + idempotency ---
  const confirm1 = await handleRescuePassengerButtonReply(admin, {
    phoneNumberId,
    parsed: { action: 'CONFIRM', token },
  })
  checks.confirmWebhook =
    confirm1.ok === true &&
    confirm1.rpc === 'taxio_rescue_passenger_confirm' &&
    (confirm1.code === 'CONFIRMED' || confirm1.result?.code === 'CONFIRMED')

  const confirm2 = await handleRescuePassengerButtonReply(admin, {
    phoneNumberId,
    payloadRaw: confirmPayload,
  })
  checks.confirmIdempotent =
    confirm2.ok === true &&
    (confirm2.code === 'ALREADY_CONFIRMED' || confirm2.result?.code === 'ALREADY_CONFIRMED')

  // Cancel after confirm must be rejected
  const cancelAfterConfirm = await handleRescuePassengerButtonReply(admin, {
    phoneNumberId,
    parsed: { action: 'CANCEL', token },
  })
  checks.neverCancelAfterConfirm =
    cancelAfterConfirm.ok === false &&
    (cancelAfterConfirm.code === 'ALREADY_CONFIRMED' ||
      cancelAfterConfirm.result?.code === 'ALREADY_CONFIRMED')

  const { data: afterConfirm } = await admin
    .from('rescue_requests')
    .select('passenger_confirm_status,accepted_by_company_id')
    .eq('id', opened.rescueId)
    .single()
  checks.confirmStatus = afterConfirm?.passenger_confirm_status === 'CONFIRMED'
  checks.winnerUnchanged = afterConfirm?.accepted_by_company_id === companyB.id

  // --- Cancel webhook path (separate rescue) + idempotency ---
  const cancelCase = await openRescueWithWinner({
    companyA,
    companyB,
    sbA,
    sbB,
    phone: '32470999222',
    price: 44.0,
    label: 'WA Cancel Case',
  })
  cleanup.bookingIds.push(cancelCase.booking.id)
  cleanup.rescueIds.push(cancelCase.rescueId)
  const cancelToken = cancelCase.rescueRow.passenger_confirm_token

  // Dry-run send-once for cancel case (does not need real WA)
  await notifyRescuePassengerConfirmWhatsApp(admin, {
    rescueRequestId: cancelCase.rescueId,
    dryRun: true,
  })

  const cancel1 = await handleRescuePassengerButtonReply(admin, {
    phoneNumberId,
    payloadRaw: buildRescueCancelButtonPayload(cancelToken),
  })
  checks.cancelWebhook =
    cancel1.ok === true &&
    cancel1.rpc === 'taxio_rescue_passenger_cancel' &&
    (cancel1.code === 'CANCELLED_BY_PASSENGER' ||
      cancel1.result?.code === 'CANCELLED_BY_PASSENGER')

  const cancel2 = await handleRescuePassengerButtonReply(admin, {
    phoneNumberId,
    parsed: { action: 'CANCEL', token: cancelToken },
  })
  checks.cancelIdempotent =
    cancel2.ok === true &&
    (cancel2.code === 'ALREADY_CANCELLED' || cancel2.result?.code === 'ALREADY_CANCELLED')

  // Confirm after cancel must be rejected
  const confirmAfterCancel = await handleRescuePassengerButtonReply(admin, {
    phoneNumberId,
    parsed: { action: 'CONFIRM', token: cancelToken },
  })
  checks.neverConfirmAfterCancel =
    confirmAfterCancel.ok === false &&
    (confirmAfterCancel.code === 'ALREADY_CANCELLED' ||
      confirmAfterCancel.result?.code === 'ALREADY_CANCELLED')

  // Loser / wrong token cannot confirm
  const badToken = `${token.slice(0, -4)}XXXX`
  const loserConfirm = await handleRescuePassengerButtonReply(admin, {
    phoneNumberId,
    parsed: { action: 'CONFIRM', token: badToken },
  })
  checks.loserCannotConfirm =
    loserConfirm.ok === false &&
    (loserConfirm.code === 'INVALID_TOKEN' || loserConfirm.result?.code === 'INVALID_TOKEN')

  // Normal inbound ignore
  const ignored = await processWhatsappWebhookPayload(admin, {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: phoneNumberId },
              messages: [{ type: 'image', from: '32470000000' }],
            },
          },
        ],
      },
    ],
  })
  checks.safeIgnore =
    (ignored.results || []).some((r) => r.code === 'IGNORED') && ignored.processed === 0

  const pending2 = await notifyPendingRescuePassengerWhatsApps(admin, { dryRun: true, limit: 20 })
  checks.loserNoMessage = !(pending2.results || []).some(
    (r) => r.code === 'DRY_RUN_SENT' && r.winnerCompanyId && r.winnerCompanyId !== companyB.id
  )

  notes.push({
    confirm1: { ok: confirm1.ok, code: confirm1.code },
    confirm2: { ok: confirm2.ok, code: confirm2.code },
    cancel1: { ok: cancel1.ok, code: cancel1.code },
    cancel2: { ok: cancel2.ok, code: cancel2.code },
    companyCPresent: !!companyC,
  })

  // Cleanup
  for (const id of cleanup.rescueIds.filter(Boolean)) {
    await admin.from('rescue_opportunities').delete().eq('rescue_request_id', id)
    await admin.from('rescue_requests').delete().eq('id', id)
  }
  if (cleanup.bookingIds.length) {
    await admin.from('booking_requests').delete().in('id', cleanup.bookingIds)
  }

  const required = [
    'bookingFlowUntouched',
    'aAcceptNoRescue',
    'aAcceptNoMessage',
    'rescueOpened',
    'waiting',
    'tokenPresent',
    'confirmUrl',
    'frozenPrice',
    'frozenPriceUnchanged',
    'winnerCompany',
    'firstDryRun',
    'phoneFromBooking',
    'originalCompanyA',
    'winnerNameUsed',
    'onlyTwoBodyParams',
    'bodyParamsExact',
    'noTripDetailsInBody',
    'confirmButtonValid',
    'cancelButtonValid',
    'reviewDetailsToken',
    'builderTwoParams',
    'sendOnceMarked',
    'duplicateBlocked',
    'concurrentOneSent',
    'confirmWebhook',
    'confirmIdempotent',
    'neverCancelAfterConfirm',
    'confirmStatus',
    'winnerUnchanged',
    'cancelWebhook',
    'cancelIdempotent',
    'neverConfirmAfterCancel',
    'loserCannotConfirm',
    'safeIgnore',
    'loserNoMessage',
  ]
  const failed = required.filter((k) => checks[k] !== true)
  console.log(JSON.stringify({ pass: failed.length === 0, failed, checks, notes }, null, 2))
  process.exit(failed.length === 0 ? 0 : 1)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e.stack || e) }, null, 2))
  process.exit(1)
})
