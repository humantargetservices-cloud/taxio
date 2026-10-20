/**
 * Company A accept → passenger booking-confirmed WhatsApp (View trip).
 *
 * LIVE SEND REQUIRES migration:
 *   booking_requests.booking_confirmed_whatsapp_sent_at timestamptz
 * See: supabase/RUN_ON_STAGING_BOOKING_CONFIRMED_WHATSAPP.sql
 *
 * Without that column this module returns MIGRATION_REQUIRED and never sends
 * (no unsafe in-memory / non-atomic duplicate protection).
 */
import {
  bookingConfirmedTemplateConfigured,
  sendBookingConfirmedTemplate,
  whatsappCloudRecipient,
} from './_whatsapp.js'
import { tripUrlForToken } from './_passengerTrip.js'

const SEND_ONCE_COLUMN = 'booking_confirmed_whatsapp_sent_at'

/** Only treat errors that name the send-once column as migration gaps (audit B07). */
function isMissingColumnError(err) {
  const m = String(err?.message || err || '')
  return /booking_confirmed_whatsapp_sent_at/i.test(m)
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ bookingRequestId: string, dryRun?: boolean, req?: object }} opts
 */
export async function notifyBookingConfirmedWhatsApp(admin, opts = {}) {
  const bookingRequestId = String(opts.bookingRequestId || '').trim()
  const dryRun = opts.dryRun === true
  if (!bookingRequestId) {
    return { ok: false, code: 'INVALID_INPUT', error: 'bookingRequestId required' }
  }

  let booking = null
  let columnReady = true
  {
    const { data, error: loadErr } = await admin
      .from('booking_requests')
      .select(
        `id, status, company_id, customer_phone, booking_reference, passenger_trip_token, ${SEND_ONCE_COLUMN}`
      )
      .eq('id', bookingRequestId)
      .maybeSingle()
    if (loadErr && isMissingColumnError(loadErr)) {
      columnReady = false
      const { data: fallback, error: load2 } = await admin
        .from('booking_requests')
        .select('id, status, company_id, customer_phone, booking_reference, passenger_trip_token')
        .eq('id', bookingRequestId)
        .maybeSingle()
      if (load2) return { ok: false, code: 'LOAD_FAILED', error: load2.message }
      booking = fallback
    } else if (loadErr) {
      return { ok: false, code: 'LOAD_FAILED', error: loadErr.message }
    } else {
      booking = data
    }
  }
  if (!booking) return { ok: false, code: 'NOT_FOUND' }
  if (String(booking.status || '') !== 'accepted') {
    return { ok: false, code: 'NOT_ACCEPTED', error: 'Booking is not accepted.' }
  }

  const tripToken = String(booking.passenger_trip_token || '').trim()
  if (tripToken.length < 20) {
    return { ok: false, code: 'NO_TRIP_TOKEN', error: 'passenger_trip_token missing.' }
  }

  const { data: company } = await admin
    .from('companies')
    .select('id, name')
    .eq('id', booking.company_id)
    .maybeSingle()

  const companyName = String(company?.name || '').trim() || 'your taxi company'
  const bookingReference = String(booking.booking_reference || '').trim()
  const passengerPhone = String(booking.customer_phone || '').trim()
  const tripUrl = opts.req ? tripUrlForToken(opts.req, tripToken) : null

  if (!bookingReference) {
    return { ok: false, code: 'NO_BOOKING_REFERENCE', kind: 'booking_confirmed' }
  }

  if (dryRun) {
    const sendResult = await sendBookingConfirmedTemplate({
      toPhone: passengerPhone,
      companyName,
      bookingReference,
      tripToken,
      dryRun: true,
    })
    return {
      ok: sendResult.ok === true,
      code: sendResult.ok ? 'DRY_RUN' : 'DRY_RUN_FAILED',
      kind: 'booking_confirmed',
      dryRun: true,
      companyName,
      bookingReference,
      tripToken,
      tripUrl,
      passengerPhoneDigits: whatsappCloudRecipient(passengerPhone),
      templateConfigured: bookingConfirmedTemplateConfigured(),
      expectedTemplate: 'taxio_booking_confirmed_staging',
      bodyParameters: sendResult.bodyParameters || null,
      urlParameter: sendResult.urlParameter || null,
      dryRunPayload: sendResult.dryRunPayload || null,
      error: sendResult.error || null,
      sendOnceColumn: SEND_ONCE_COLUMN,
      sendOnceColumnReady: columnReady,
      migrationRequired: !columnReady,
      migration: columnReady
        ? null
        : 'supabase/RUN_ON_STAGING_BOOKING_CONFIRMED_WHATSAPP.sql',
      alreadySentAt: columnReady ? booking[SEND_ONCE_COLUMN] || null : null,
    }
  }

  if (!columnReady) {
    return {
      ok: false,
      code: 'MIGRATION_REQUIRED',
      kind: 'booking_confirmed',
      error: `Add booking_requests.${SEND_ONCE_COLUMN} before enabling live send.`,
      expectedColumn: SEND_ONCE_COLUMN,
      migration: 'supabase/RUN_ON_STAGING_BOOKING_CONFIRMED_WHATSAPP.sql',
      companyName,
      bookingReference,
      tripToken,
    }
  }

  if (booking[SEND_ONCE_COLUMN]) {
    return {
      ok: true,
      code: 'ALREADY_SENT',
      kind: 'booking_confirmed',
      sent_at: booking[SEND_ONCE_COLUMN],
      tripToken,
      tripUrl,
    }
  }

  if (!bookingConfirmedTemplateConfigured()) {
    return {
      ok: false,
      code: 'TEMPLATE_NOT_CONFIGURED',
      kind: 'booking_confirmed',
      expectedTemplate: 'taxio_booking_confirmed_staging',
      env: 'WHATSAPP_BOOKING_CONFIRMED_TEMPLATE_NAME',
    }
  }

  if (!whatsappCloudRecipient(passengerPhone)) {
    return { ok: false, code: 'INVALID_PASSENGER_PHONE', kind: 'booking_confirmed' }
  }

  const claimIso = new Date().toISOString()
  const { data: claimed, error: claimErr } = await admin
    .from('booking_requests')
    .update({ [SEND_ONCE_COLUMN]: claimIso })
    .eq('id', bookingRequestId)
    .eq('status', 'accepted')
    .is(SEND_ONCE_COLUMN, null)
    .select(`id, ${SEND_ONCE_COLUMN}`)
    .maybeSingle()

  if (claimErr) {
    if (isMissingColumnError(claimErr)) {
      return {
        ok: false,
        code: 'MIGRATION_REQUIRED',
        kind: 'booking_confirmed',
        error: `Add booking_requests.${SEND_ONCE_COLUMN} before enabling live send.`,
        expectedColumn: SEND_ONCE_COLUMN,
        migration: 'supabase/RUN_ON_STAGING_BOOKING_CONFIRMED_WHATSAPP.sql',
      }
    }
    return { ok: false, code: 'CLAIM_FAILED', error: claimErr.message, kind: 'booking_confirmed' }
  }
  if (!claimed) {
    return { ok: true, code: 'ALREADY_SENT', kind: 'booking_confirmed', tripToken, tripUrl }
  }

  const sendResult = await sendBookingConfirmedTemplate({
    toPhone: passengerPhone,
    companyName,
    bookingReference,
    tripToken,
    dryRun: false,
  })

  if (!sendResult.ok) {
    await admin
      .from('booking_requests')
      .update({ [SEND_ONCE_COLUMN]: null })
      .eq('id', bookingRequestId)
      .eq(SEND_ONCE_COLUMN, claimIso)
    return {
      ok: false,
      code: 'SEND_FAILED',
      kind: 'booking_confirmed',
      error: sendResult.error || 'send failed',
      metaError: sendResult.metaError || null,
    }
  }

  return {
    ok: true,
    code: 'SENT',
    kind: 'booking_confirmed',
    messageId: sendResult.messageId || null,
    tripToken,
    tripUrl,
    companyName,
    bookingReference,
  }
}
