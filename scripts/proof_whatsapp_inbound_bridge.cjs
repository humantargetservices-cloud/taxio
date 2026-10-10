/**
 * Staging proof: central TAXIO WhatsApp inbound + booking reference.
 * Soft DB checks. Never touches production.
 */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { generateBookingReference, extractBookingReferenceFromText } = require('../api/_bookingReference.js')
const {
  capturePassengerContactFromInbound,
  normalizeInboundSenderPhone,
  isCentralTaxioPhoneNumberId,
} = require('../api/_whatsappInbound.js')

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
  console.log(JSON.stringify({ fatal: 'staging only', host: url }))
  process.exit(1)
}

// Central TAXIO Cloud phone_number_id for this proof (matches staging Meta number)
const CENTRAL_ID = String(process.env.WHATSAPP_PHONE_NUMBER_ID || env.WHATSAPP_PHONE_NUMBER_ID || '1322109130989115').trim()
process.env.WHATSAPP_PHONE_NUMBER_ID = CENTRAL_ID

const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function hasColumn(table, column) {
  const { error } = await admin.from(table).select(column).limit(0)
  return !error
}

;(async () => {
  const checks = {}
  const notes = []

  const bookJs = fs.readFileSync(path.join(root, 'src/pages/bookCompany.js'), 'utf8')
  const rescueJs = fs.readFileSync(path.join(root, 'api/rescue.js'), 'utf8')
  const inboundJs = fs.readFileSync(path.join(root, 'api/_whatsappInbound.js'), 'utf8')

  checks.completionPhonePresent = /bk-complete-phone/.test(bookJs)
  checks.normalBookingNoTaxioWa = !/32492702795/.test(bookJs)
  checks.companyAWhatsAppDigits = /whatsappDigitsForWaMe\(company\.phone/.test(bookJs)
  checks.draftOnBook = /createDraftBookingLog|booking_phase:\s*'draft'/.test(bookJs)
  checks.activateOnChannel = /activateDraftBookingLog|booking_phase:\s*'activate'/.test(bookJs)
  checks.timerOnlyOnChannel = /must NOT start the 25s timer/.test(bookJs)
  checks.horizontalChannels = /bk-channel-whatsapp[\s\S]*bk-channel-sms[\s\S]*bk-channel-email/.test(
    bookJs
  )
  checks.callCompanyChannel = /bk-channel-call/.test(bookJs)
  checks.smsMessageIcon = /messageCircle/.test(bookJs)
  checks.centralModel = /isCentralTaxioPhoneNumberId|NOT_CENTRAL_TAXIO_NUMBER/.test(inboundJs)
  checks.noWabaRequiredForCapture = !/resolveCompanyByPhoneNumberId\(admin,\s*phoneNumberId\)/.test(
    inboundJs.split('capturePassengerContactFromInbound')[1] || ''
  )
  checks.noSoftNotifyOnAccept = !/softNotifyPassengerAfterWin/.test(rescueJs)
  checks.webhookFile = fs.existsSync(path.join(root, 'api/whatsapp-webhook.js'))

  checks.centralIdCheck = isCentralTaxioPhoneNumberId(CENTRAL_ID) === true
  checks.rejectOtherPhoneId = isCentralTaxioPhoneNumberId('999999999') === false

  const ref1 = generateBookingReference()
  checks.refFormat = /^TX-[A-Z0-9]{6}$/.test(ref1)
  checks.extractRef = extractBookingReferenceFromText(`Booking reference: ${ref1}`) === ref1
  checks.normalizeSender = normalizeInboundSenderPhone('32470123456') === '32470123456'

  checks.col_booking_reference = await hasColumn('booking_requests', 'booking_reference')

  const { data: cos } = await admin.from('companies').select('id,name,status').eq('status', 'approved')
  const companyA = (cos || []).find((c) => /stagingt$/i.test(c.name)) || (cos || [])[0]
  notes.push({ companyA: companyA?.name, centralId: CENTRAL_ID })

  let bookingId = null
  let storedRef = null

  if (checks.col_booking_reference && companyA) {
    const ref = generateBookingReference()
    const { data, error } = await admin
      .from('booking_requests')
      .insert({
        company_id: companyA.id,
        status: 'new',
        pickup_address: 'Aarschot central proof',
        dropoff_address: 'Zaventem central proof',
        ride_datetime: new Date(Date.now() + 3600e3).toISOString(),
        car_type: 'Standard',
        service_type: 'standard',
        customer_name: 'Booking request',
        customer_phone: '',
        estimated_price_eur: 38.52,
        price_currency: 'EUR',
        booking_reference: ref,
        notes: 'central inbound proof',
        decision_deadline_at: new Date(Date.now() + 25000).toISOString(),
      })
      .select('id,booking_reference,company_id')
      .single()
    checks.refStored = !error && data?.booking_reference === ref
    bookingId = data?.id || null
    storedRef = data?.booking_reference || null
    if (error) notes.push({ insertErr: error.message })

    if (bookingId) {
      const okCap = await capturePassengerContactFromInbound(admin, {
        phoneNumberId: CENTRAL_ID,
        senderWaId: '32471112233',
        messageText: `Booking for: ${companyA.name}\nBooking reference: ${storedRef}`,
      })
      checks.txLookupCapture = okCap.ok === true && okCap.code === 'CAPTURED'
      checks.companyFromBooking = okCap.companyId === companyA.id

      const { data: after } = await admin
        .from('booking_requests')
        .select('customer_phone,customer_phone_source,customer_phone_captured_at,company_id')
        .eq('id', bookingId)
        .maybeSingle()
      checks.contactCaptured = after?.customer_phone === '32471112233'
      checks.sourceWhatsapp = after?.customer_phone_source === 'whatsapp' && !!after?.customer_phone_captured_at

      const dup = await capturePassengerContactFromInbound(admin, {
        phoneNumberId: CENTRAL_ID,
        senderWaId: '32471112233',
        messageText: `Booking reference: ${storedRef}`,
      })
      checks.duplicateSafe = dup.ok === true && /ALREADY_CAPTURED/.test(dup.code)

      const wrongNum = await capturePassengerContactFromInbound(admin, {
        phoneNumberId: '000000000000000',
        senderWaId: '32479999999',
        messageText: `Booking reference: ${storedRef}`,
      })
      checks.rejectNonCentral = wrongNum.ok === false && wrongNum.code === 'NOT_CENTRAL_TAXIO_NUMBER'

      const badRef = await capturePassengerContactFromInbound(admin, {
        phoneNumberId: CENTRAL_ID,
        senderWaId: '32471112233',
        messageText: 'No reference here',
      })
      checks.noRefRejected = badRef.ok === false && badRef.code === 'NO_BOOKING_REFERENCE'

      await admin.from('booking_requests').delete().eq('id', bookingId)
    }
  } else {
    notes.push('Skip DB tests — booking_reference missing')
  }

  checks.rescueAcceptStillPresent = /accept_rescue_request/.test(rescueJs)
  checks.decisionDeadlineStillOnInsert = /decision_deadline/.test(
    fs.readFileSync(path.join(root, 'supabase/RUN_ON_STAGING_RESCUE_06_MVP_SIMPLIFIED_CORE.sql'), 'utf8')
  )

  const required = [
    'completionPhonePresent',
    'normalBookingNoTaxioWa',
    'companyAWhatsAppDigits',
    'draftOnBook',
    'activateOnChannel',
    'timerOnlyOnChannel',
    'callCompanyChannel',
    'smsMessageIcon',
    'centralModel',
    'centralIdCheck',
    'rejectOtherPhoneId',
    'refFormat',
    'extractRef',
    'normalizeSender',
    'webhookFile',
    'noSoftNotifyOnAccept',
    'rescueAcceptStillPresent',
  ]
  if (checks.col_booking_reference) {
    required.push(
      'refStored',
      'txLookupCapture',
      'companyFromBooking',
      'contactCaptured',
      'sourceWhatsapp',
      'duplicateSafe',
      'rejectNonCentral',
      'noRefRejected'
    )
  }

  const failed = required.filter((k) => checks[k] !== true)
  console.log(JSON.stringify({ pass: failed.length === 0, failed, checks, notes }, null, 2))
  process.exit(failed.length === 0 ? 0 : 1)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e.stack || e) }, null, 2))
  process.exit(1)
})
