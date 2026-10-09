/**
 * Inbound Meta WhatsApp → booking contact capture (soft-fail helpers).
 * Does NOT send outbound Rescue messages.
 */
import { extractBookingReferenceFromText } from './_bookingReference.js'

function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '')
}

/** Normalize Meta sender wa_id / phone to digits for booking_requests.customer_phone. */
export function normalizeInboundSenderPhone(waIdOrPhone) {
  let d = digitsOnly(waIdOrPhone)
  if (!d) return null
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length < 8 || d.length > 15) return null
  return d
}

/**
 * Resolve Meta phone_number_id → TAXIO company_id via company_whatsapp_waba.
 * @returns {Promise<{ companyId: string|null, error?: string }>}
 */
export async function resolveCompanyByPhoneNumberId(admin, phoneNumberId) {
  const id = String(phoneNumberId || '').trim()
  if (!id) return { companyId: null, error: 'MISSING_PHONE_NUMBER_ID' }
  try {
    const { data, error } = await admin
      .from('company_whatsapp_waba')
      .select('company_id')
      .eq('phone_number_id', id)
      .maybeSingle()
    if (error) {
      console.warn('[wa-inbound] mapping', error.message)
      return { companyId: null, error: 'MAPPING_QUERY_FAILED' }
    }
    if (!data?.company_id) return { companyId: null, error: 'UNKNOWN_PHONE_NUMBER_ID' }
    return { companyId: data.company_id }
  } catch (e) {
    console.warn('[wa-inbound] mapping err', e?.message || e)
    return { companyId: null, error: 'MAPPING_EXCEPTION' }
  }
}

/**
 * Match inbound message to booking and store passenger WhatsApp contact.
 * Soft-fail: never throws to callers for business mismatches.
 *
 * @returns {Promise<{ ok: boolean, code: string, bookingId?: string }>}
 */
export async function capturePassengerContactFromInbound(admin, {
  phoneNumberId,
  senderWaId,
  messageText,
}) {
  const resolved = await resolveCompanyByPhoneNumberId(admin, phoneNumberId)
  if (!resolved.companyId) {
    return { ok: false, code: resolved.error || 'UNKNOWN_COMPANY' }
  }

  const ref = extractBookingReferenceFromText(messageText)
  if (!ref) return { ok: false, code: 'NO_BOOKING_REFERENCE' }

  const sender = normalizeInboundSenderPhone(senderWaId)
  if (!sender) return { ok: false, code: 'INVALID_SENDER' }

  const { data: booking, error: findErr } = await admin
    .from('booking_requests')
    .select('id,company_id,customer_phone,booking_reference')
    .eq('booking_reference', ref)
    .maybeSingle()

  if (findErr) {
    console.warn('[wa-inbound] find booking', findErr.message)
    return { ok: false, code: 'BOOKING_QUERY_FAILED' }
  }
  if (!booking) return { ok: false, code: 'BOOKING_NOT_FOUND' }
  if (booking.company_id !== resolved.companyId) {
    return { ok: false, code: 'WRONG_COMPANY' }
  }

  const existing = digitsOnly(booking.customer_phone)
  if (existing) {
    if (existing === sender) return { ok: true, code: 'ALREADY_CAPTURED', bookingId: booking.id }
    // Do not overwrite a different captured number
    return { ok: true, code: 'ALREADY_CAPTURED_OTHER', bookingId: booking.id }
  }

  const patch = {
    customer_phone: sender,
    customer_phone_captured_at: new Date().toISOString(),
    customer_phone_source: 'whatsapp',
  }

  let { error: updErr } = await admin.from('booking_requests').update(patch).eq('id', booking.id)
  if (updErr && /customer_phone_captured_at|customer_phone_source|schema cache|Could not find/i.test(updErr.message || '')) {
    // Column not applied yet — still store phone only
    ;({ error: updErr } = await admin
      .from('booking_requests')
      .update({ customer_phone: sender })
      .eq('id', booking.id))
  }
  if (updErr) {
    console.warn('[wa-inbound] update', updErr.message)
    return { ok: false, code: 'UPDATE_FAILED' }
  }
  return { ok: true, code: 'CAPTURED', bookingId: booking.id }
}

/**
 * Walk Meta Cloud API webhook payload; process text messages only.
 * Always soft — returns summary, never throws.
 */
export async function processWhatsappWebhookPayload(admin, body) {
  const summary = { processed: 0, results: [] }
  try {
    const entries = Array.isArray(body?.entry) ? body.entry : []
    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : []
      for (const change of changes) {
        const value = change?.value
        if (!value) continue
        const phoneNumberId = value?.metadata?.phone_number_id
        const messages = Array.isArray(value?.messages) ? value.messages : []
        for (const msg of messages) {
          if (String(msg?.type || '') !== 'text') {
            summary.results.push({ code: 'UNSUPPORTED_TYPE', type: msg?.type })
            continue
          }
          const text = msg?.text?.body || ''
          const from = msg?.from || ''
          const result = await capturePassengerContactFromInbound(admin, {
            phoneNumberId,
            senderWaId: from,
            messageText: text,
          })
          summary.processed += 1
          summary.results.push(result)
        }
      }
    }
  } catch (e) {
    console.warn('[wa-inbound] process', e?.message || e)
    summary.error = String(e?.message || e)
  }
  return summary
}
