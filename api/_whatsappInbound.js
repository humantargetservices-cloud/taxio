/**
 * Inbound Meta WhatsApp — TAXIO central number.
 *
 * 1) Confirm/Cancel quick-reply → same RPCs as browser confirm page
 * 2) Text with TX reference → booking customer_phone capture
 *
 * Soft-fail only. Never blocks booking or dashboard.
 */
import { extractBookingReferenceFromText } from './_bookingReference.js'
import { parseRescueButtonPayload } from './_whatsapp.js'

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

/** True when inbound phone_number_id is TAXIO's central Cloud API number. */
export function isCentralTaxioPhoneNumberId(phoneNumberId) {
  const expected = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
  const got = String(phoneNumberId || '').trim()
  if (!expected || !got) return false
  return expected === got
}

/**
 * Optional future helper: resolve Meta phone_number_id → company via company_whatsapp_waba.
 * Not used by the central TAXIO-number inbound flow.
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
 */
export async function capturePassengerContactFromInbound(admin, {
  phoneNumberId,
  senderWaId,
  messageText,
}) {
  if (!isCentralTaxioPhoneNumberId(phoneNumberId)) {
    return { ok: false, code: 'NOT_CENTRAL_TAXIO_NUMBER' }
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

  const companyId = booking.company_id
  const existing = digitsOnly(booking.customer_phone)
  if (existing) {
    if (existing === sender) {
      return { ok: true, code: 'ALREADY_CAPTURED', bookingId: booking.id, companyId }
    }
    return { ok: true, code: 'ALREADY_CAPTURED_OTHER', bookingId: booking.id, companyId }
  }

  const patch = {
    customer_phone: sender,
    customer_phone_captured_at: new Date().toISOString(),
    customer_phone_source: 'whatsapp',
  }

  let { error: updErr } = await admin.from('booking_requests').update(patch).eq('id', booking.id)
  if (
    updErr &&
    /customer_phone_captured_at|customer_phone_source|schema cache|Could not find/i.test(updErr.message || '')
  ) {
    ;({ error: updErr } = await admin
      .from('booking_requests')
      .update({ customer_phone: sender })
      .eq('id', booking.id))
  }
  if (updErr) {
    console.warn('[wa-inbound] update', updErr.message)
    return { ok: false, code: 'UPDATE_FAILED' }
  }
  return { ok: true, code: 'CAPTURED', bookingId: booking.id, companyId }
}

/**
 * Extract Confirm/Cancel payload from a Meta inbound message (button or interactive).
 */
export function extractRescueButtonPayloadFromMessage(msg) {
  if (!msg || typeof msg !== 'object') return null
  const type = String(msg.type || '')

  if (type === 'button') {
    return parseRescueButtonPayload(msg.button?.payload || msg.button?.text)
  }

  if (type === 'interactive') {
    const ir = msg.interactive || {}
    if (String(ir.type || '') === 'button_reply') {
      return parseRescueButtonPayload(ir.button_reply?.id || ir.button_reply?.title)
    }
  }

  // Some Cloud payloads nest button under type text with button object — ignore.
  return null
}

/**
 * Handle Confirm/Cancel quick-reply via same RPCs as /rescue/confirm/:token page.
 * Idempotent: ALREADY_CONFIRMED / ALREADY_CANCELLED are success.
 */
export async function handleRescuePassengerButtonReply(admin, { phoneNumberId, payloadRaw, parsed }) {
  if (!isCentralTaxioPhoneNumberId(phoneNumberId)) {
    return { ok: false, code: 'NOT_CENTRAL_TAXIO_NUMBER' }
  }

  const actionToken = parsed || parseRescueButtonPayload(payloadRaw)
  if (!actionToken) return { ok: false, code: 'NOT_RESCUE_BUTTON' }

  const rpcName =
    actionToken.action === 'CANCEL'
      ? 'taxio_rescue_passenger_cancel'
      : 'taxio_rescue_passenger_confirm'

  try {
    const { data, error } = await admin.rpc(rpcName, { p_token: actionToken.token })
    if (error) {
      console.warn('[wa-inbound:rescue-button]', error.message)
      return { ok: false, code: 'RPC_ERROR', error: error.message, action: actionToken.action }
    }
    const result = data && typeof data === 'object' ? data : { ok: false, code: 'EMPTY' }
    return {
      ok: result.ok === true,
      code: result.code || (result.ok ? 'OK' : 'FAILED'),
      action: actionToken.action,
      rpc: rpcName,
      result,
    }
  } catch (e) {
    console.warn('[wa-inbound:rescue-button]', e?.message || e)
    return {
      ok: false,
      code: 'RPC_EXCEPTION',
      error: String(e?.message || e),
      action: actionToken.action,
    }
  }
}

/**
 * Walk Meta Cloud API webhook payload.
 * Order: Confirm/Cancel buttons first, then TX text capture, else ignore.
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
          const type = String(msg?.type || '')

          // 1) Confirm / Cancel quick replies
          const buttonParsed = extractRescueButtonPayloadFromMessage(msg)
          if (buttonParsed) {
            const result = await handleRescuePassengerButtonReply(admin, {
              phoneNumberId,
              parsed: buttonParsed,
            })
            summary.processed += 1
            summary.results.push(result)
            continue
          }

          // 2) Text → booking reference contact capture
          if (type === 'text') {
            const text = msg?.text?.body || ''
            const from = msg?.from || ''
            const result = await capturePassengerContactFromInbound(admin, {
              phoneNumberId,
              senderWaId: from,
              messageText: text,
            })
            summary.processed += 1
            summary.results.push(result)
            continue
          }

          // 3) Everything else — safe ignore
          summary.results.push({ ok: true, code: 'IGNORED', type })
        }
      }
    }
  } catch (e) {
    console.warn('[wa-inbound] process', e?.message || e)
    summary.error = String(e?.message || e)
  }
  return summary
}
