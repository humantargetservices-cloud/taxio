/**
 * Staging proof: booking reference + inbound WhatsApp capture helpers.
 * Soft DB checks — does not apply SQL. Never touches production.
 */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { generateBookingReference, extractBookingReferenceFromText } = require('../api/_bookingReference.js')
const {
  capturePassengerContactFromInbound,
  normalizeInboundSenderPhone,
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

const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function hasColumn(table, column) {
  const { error } = await admin.from(table).select(column).limit(0)
  return !error
}

async function hasTable(name) {
  const { error } = await admin.from(name).select('*').limit(0)
  if (!error) return true
  return !/does not exist|schema cache|Could not find/i.test(error.message || '')
}

;(async () => {
  const checks = {}
  const notes = []

  const bookJs = fs.readFileSync(path.join(root, 'src/pages/bookCompany.js'), 'utf8')
  const pubJs = fs.readFileSync(path.join(root, 'api/public-booking.js'), 'utf8')
  const rescueJs = fs.readFileSync(path.join(root, 'api/rescue.js'), 'utf8')
  checks.phoneFieldAbsent = !/bk-rider-phone/.test(bookJs)
  checks.waStillCompanyDeepLink = /waMeBookingUrl|openWaMeUrl/.test(bookJs) && /Company A|companyWhatsAppDigits/.test(bookJs)
  checks.waIncludesReferenceHelper = /waLineBookingReference|booking_reference/.test(bookJs)
  checks.createBeforeOpenWa = /await createQuickBookingLog/.test(bookJs)
  checks.noSoftNotifyOnAccept = !/softNotifyPassengerAfterWin/.test(rescueJs)
  checks.webhookFile = fs.existsSync(path.join(root, 'api/whatsapp-webhook.js'))
  checks.publicBookingGeneratesRef = /generateBookingReference/.test(pubJs)

  const ref1 = generateBookingReference()
  const ref2 = generateBookingReference()
  checks.refFormat = /^TX-[A-Z0-9]{6}$/.test(ref1)
  checks.refNotSequential = ref1 !== ref2
  checks.extractRef = extractBookingReferenceFromText(`Hello\nBooking reference: ${ref1}\n`) === ref1
  checks.normalizeSender = normalizeInboundSenderPhone('32470123456') === '32470123456'

  checks.col_booking_reference = await hasColumn('booking_requests', 'booking_reference')
  checks.col_phone_captured_at = await hasColumn('booking_requests', 'customer_phone_captured_at')
  checks.col_phone_source = await hasColumn('booking_requests', 'customer_phone_source')
  checks.table_waba = await hasTable('company_whatsapp_waba')

  const { data: cos } = await admin.from('companies').select('id,name,rescue_enabled,status').eq('status', 'approved')
  const companyA = (cos || []).find((c) => /stagingt$/i.test(c.name)) || (cos || [])[0]
  notes.push({ companyA: companyA?.name, companyA_id: companyA?.id })

  let bookingId = null
  let storedRef = null

  if (checks.col_booking_reference && companyA) {
    const ref = generateBookingReference()
    const { data, error } = await admin
      .from('booking_requests')
      .insert({
        company_id: companyA.id,
        status: 'new',
        pickup_address: 'Aarschot proof',
        dropoff_address: 'Zaventem proof',
        ride_datetime: new Date(Date.now() + 3600e3).toISOString(),
        car_type: 'Standard',
        service_type: 'standard',
        customer_name: 'Booking request',
        customer_phone: '',
        estimated_price_eur: 38.52,
        price_currency: 'EUR',
        booking_reference: ref,
        notes: 'inbound bridge proof',
        decision_deadline_at: new Date(Date.now() + 25000).toISOString(),
      })
      .select('id,booking_reference,customer_phone')
      .single()
    checks.refStored = !error && data?.booking_reference === ref
    if (error) notes.push({ insertErr: error.message })
    bookingId = data?.id || null
    storedRef = data?.booking_reference || null

    if (checks.table_waba && bookingId) {
      const fakePhoneNumberId = `proof_${Date.now()}`
      await admin.from('company_whatsapp_waba').upsert({
        phone_number_id: fakePhoneNumberId,
        company_id: companyA.id,
        display_phone_number: '32470000000',
      })

      const okCap = await capturePassengerContactFromInbound(admin, {
        phoneNumberId: fakePhoneNumberId,
        senderWaId: '32471112233',
        messageText: `Hello, I would like to book a taxi ride.\nBooking reference: ${storedRef}`,
      })
      checks.referenceMatchCapture = okCap.ok === true && okCap.code === 'CAPTURED'

      const { data: after } = await admin
        .from('booking_requests')
        .select('customer_phone,customer_phone_source')
        .eq('id', bookingId)
        .maybeSingle()
      checks.contactCaptured = after?.customer_phone === '32471112233'
      checks.contactSourceWhatsapp =
        !checks.col_phone_source || after?.customer_phone_source === 'whatsapp' || after?.customer_phone === '32471112233'

      const dup = await capturePassengerContactFromInbound(admin, {
        phoneNumberId: fakePhoneNumberId,
        senderWaId: '32471112233',
        messageText: `Booking reference: ${storedRef}`,
      })
      checks.duplicateSafe = dup.ok === true && /ALREADY_CAPTURED/.test(dup.code)

      const otherCo = (cos || []).find((c) => c.id !== companyA.id)
      if (otherCo) {
        const otherPn = `proof_other_${Date.now()}`
        await admin.from('company_whatsapp_waba').upsert({
          phone_number_id: otherPn,
          company_id: otherCo.id,
        })
        const wrong = await capturePassengerContactFromInbound(admin, {
          phoneNumberId: otherPn,
          senderWaId: '32479999999',
          messageText: `Booking reference: ${storedRef}`,
        })
        checks.wrongCompanyProtection = wrong.ok === false && wrong.code === 'WRONG_COMPANY'
        await admin.from('company_whatsapp_waba').delete().eq('phone_number_id', otherPn)
      }

      const badRef = await capturePassengerContactFromInbound(admin, {
        phoneNumberId: fakePhoneNumberId,
        senderWaId: '32471112233',
        messageText: 'No reference here',
      })
      checks.noRefRejected = badRef.ok === false && badRef.code === 'NO_BOOKING_REFERENCE'

      await admin.from('company_whatsapp_waba').delete().eq('phone_number_id', fakePhoneNumberId)
    } else {
      notes.push('Skip capture DB tests — apply RUN_ON_STAGING_RESCUE_10 first')
    }

    if (bookingId) await admin.from('booking_requests').delete().eq('id', bookingId)
  } else {
    notes.push('Skip DB ref/capture — booking_reference column missing (SQL not applied)')
  }

  // Rescue engine untouched markers
  checks.rescueAcceptStillPresent = /accept_rescue_request/.test(fs.readFileSync(path.join(root, 'api/rescue.js'), 'utf8'))
  checks.rescueNotifyController =
    /startRescueNotifications/.test(fs.readFileSync(path.join(root, 'src/lib/rescueNotifications.js'), 'utf8'))

  const required = [
    'phoneFieldAbsent',
    'waStillCompanyDeepLink',
    'waIncludesReferenceHelper',
    'createBeforeOpenWa',
    'noSoftNotifyOnAccept',
    'webhookFile',
    'publicBookingGeneratesRef',
    'refFormat',
    'refNotSequential',
    'extractRef',
    'normalizeSender',
    'rescueAcceptStillPresent',
    'rescueNotifyController',
  ]
  if (checks.col_booking_reference) required.push('refStored')
  if (checks.table_waba && checks.col_booking_reference) {
    required.push(
      'referenceMatchCapture',
      'contactCaptured',
      'duplicateSafe',
      'wrongCompanyProtection',
      'noRefRejected'
    )
  }

  const failed = required.filter((k) => checks[k] !== true)
  const sqlReady = checks.col_booking_reference && checks.table_waba

  console.log(
    JSON.stringify(
      {
        pass: failed.length === 0,
        failed,
        sqlApplied: sqlReady,
        checks,
        notes,
      },
      null,
      2
    )
  )
  process.exit(failed.length === 0 ? 0 : 1)
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e.stack || e) }, null, 2))
  process.exit(1)
})
