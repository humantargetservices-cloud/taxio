/**
 * Inbound Meta WhatsApp — TAXIO central number.
 *
 * 1) Confirm/Cancel quick-reply → same RPCs as browser confirm page
 * 2) Text with TX reference → booking customer_phone capture
 *
 * Soft-fail only. Never blocks booking or dashboard.
 */
import { extractBookingReferenceFromText } from './_bookingReference.js'
import { parseRescueButtonPayload, whatsappCloudRecipient } from './_whatsapp.js'

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

/** Mask token for logs: keep prefix + last 4. */
function maskToken(token) {
  const t = String(token || '')
  if (t.length < 8) return '***'
  return `${t.slice(0, 6)}…${t.slice(-4)}`
}

/**
 * Inspect Meta message shapes without PII.
 * Supports type=button and type=interactive button_reply.
 */
export function inspectWhatsappButtonMessage(msg) {
  if (!msg || typeof msg !== 'object') {
    return { type: null, buttonText: null, buttonPayload: null, interactiveId: null, interactiveTitle: null }
  }
  const type = String(msg.type || '') || null
  const buttonText = msg.button?.text != null ? String(msg.button.text) : null
  const buttonPayload = msg.button?.payload != null ? String(msg.button.payload) : null
  const ir = msg.interactive || {}
  const interactiveId =
    ir.button_reply?.id != null ? String(ir.button_reply.id) : null
  const interactiveTitle =
    ir.button_reply?.title != null ? String(ir.button_reply.title) : null
  return { type, buttonText, buttonPayload, interactiveId, interactiveTitle }
}

/**
 * Confirm / Cancel intent from button label when Meta returns text-only.
 * @returns {'CONFIRM'|'CANCEL'|null}
 */
export function inferRescueButtonActionFromLabel(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
  if (!s) return null
  // Exact / near-exact labels used by taxio_rescue_confirmation_staging
  if (s === 'confirm' || s === 'confirm ride' || s === 'bevestigen' || s === 'confirmer') {
    return 'CONFIRM'
  }
  if (s === 'cancel' || s === 'annuleren' || s === 'annuler') {
    return 'CANCEL'
  }
  return null
}

/**
 * Extract Confirm/Cancel payload from a Meta inbound message (button or interactive).
 * Tries every field Meta may populate; prefers TAXIO_CONFIRM:/TAXIO_CANCEL: token payloads.
 */
export function extractRescueButtonPayloadFromMessage(msg) {
  if (!msg || typeof msg !== 'object') return null
  const type = String(msg.type || '')
  const candidates = []

  if (type === 'button' || msg.button) {
    if (msg.button?.payload) candidates.push(msg.button.payload)
    if (msg.button?.text) candidates.push(msg.button.text)
  }

  if (type === 'interactive' || msg.interactive) {
    const ir = msg.interactive || {}
    if (String(ir.type || '') === 'button_reply' || ir.button_reply) {
      if (ir.button_reply?.id) candidates.push(ir.button_reply.id)
      if (ir.button_reply?.title) candidates.push(ir.button_reply.title)
    }
  }

  for (const c of candidates) {
    const parsed = parseRescueButtonPayload(c)
    if (parsed) return parsed
  }

  // Text-only Confirm/Cancel — caller may resolve token via sender phone.
  for (const c of candidates) {
    const action = inferRescueButtonActionFromLabel(c)
    if (action) return { action, token: null, labelOnly: true, label: String(c) }
  }

  return null
}

/**
 * Resolve WAITING Rescue + confirm token by matching passenger WhatsApp sender to booking phone.
 * Used when Meta returns button text without dynamic payload.
 */
export async function resolveRescueTokenBySenderPhone(admin, senderWaId, action) {
  const sender = whatsappCloudRecipient(senderWaId) || normalizeInboundSenderPhone(senderWaId)
  if (!sender) return { ok: false, code: 'INVALID_SENDER' }
  if (action !== 'CONFIRM' && action !== 'CANCEL') {
    return { ok: false, code: 'BAD_ACTION' }
  }

  const { data: waiting, error } = await admin
    .from('rescue_requests')
    .select(
      'id,passenger_confirm_token,passenger_confirm_status,accepted_by_company_id,booking_request_id,status'
    )
    .eq('status', 'ACCEPTED')
    .eq('passenger_confirm_status', 'WAITING_PASSENGER_CONFIRMATION')
    .not('accepted_by_company_id', 'is', null)
    .order('accepted_at', { ascending: false })
    .limit(40)

  if (error) {
    console.warn('[wa-inbound:resolve-token]', error.message)
    return { ok: false, code: 'QUERY_FAILED' }
  }

  const matches = []
  for (const r of waiting || []) {
    const { data: booking } = await admin
      .from('booking_requests')
      .select('id,customer_phone')
      .eq('id', r.booking_request_id)
      .maybeSingle()
    const bookPhone =
      whatsappCloudRecipient(booking?.customer_phone) ||
      normalizeInboundSenderPhone(booking?.customer_phone)
    if (bookPhone && bookPhone === sender) {
      matches.push(r)
    }
  }

  if (matches.length === 0) return { ok: false, code: 'NO_MATCHING_WAITING_RESCUE' }
  if (matches.length > 1) {
    console.warn('[wa-inbound:resolve-token] ambiguous matches', matches.length)
    return { ok: false, code: 'AMBIGUOUS_MATCH' }
  }

  const token = String(matches[0].passenger_confirm_token || '').trim()
  if (token.length < 20) return { ok: false, code: 'NO_CONFIRM_TOKEN' }
  return {
    ok: true,
    action,
    token,
    rescueRequestId: matches[0].id,
    resolvedVia: 'sender_phone',
  }
}

/**
 * Handle Confirm/Cancel quick-reply via same RPCs as /rescue/confirm/:token page.
 * Idempotent: ALREADY_CONFIRMED / ALREADY_CANCELLED are success.
 *
 * Note: phone_number_id mismatch is WARN-only for token-authenticated Rescue buttons
 * (HMAC already verified at webhook edge; token binds the action to one rescue).
 */
export async function handleRescuePassengerButtonReply(admin, {
  phoneNumberId,
  payloadRaw,
  parsed,
  senderWaId,
}) {
  const central = isCentralTaxioPhoneNumberId(phoneNumberId)
  if (!central) {
    console.warn('[wa-inbound:rescue-button] phone_number_id mismatch', {
      got_len: String(phoneNumberId || '').length,
      expected_set: Boolean(String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()),
    })
  }

  let actionToken = parsed || parseRescueButtonPayload(payloadRaw)

  // Meta sometimes returns only button text ("Confirm") — resolve token via sender phone.
  if (actionToken?.labelOnly && actionToken.action && !actionToken.token) {
    const resolved = await resolveRescueTokenBySenderPhone(admin, senderWaId, actionToken.action)
    if (!resolved.ok) {
      return {
        ok: false,
        code: resolved.code || 'TOKEN_RESOLVE_FAILED',
        action: actionToken.action,
        labelOnly: true,
      }
    }
    actionToken = { action: resolved.action, token: resolved.token, resolvedVia: 'sender_phone' }
  }

  if (!actionToken?.token || !actionToken?.action) {
    return { ok: false, code: 'NOT_RESCUE_BUTTON' }
  }

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
    console.info('[wa-inbound:rescue-button]', {
      action: actionToken.action,
      rpc: rpcName,
      code: result.code || null,
      ok: result.ok === true,
      token: maskToken(actionToken.token),
      resolvedVia: actionToken.resolvedVia || 'payload',
      phoneIdMatch: central,
    })
    return {
      ok: result.ok === true,
      code: result.code || (result.ok ? 'OK' : 'FAILED'),
      action: actionToken.action,
      rpc: rpcName,
      result,
      tokenMasked: maskToken(actionToken.token),
      resolvedVia: actionToken.resolvedVia || 'payload',
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
 * Order: status callbacks (log), Confirm/Cancel buttons, TX text capture, else ignore.
 */
export async function processWhatsappWebhookPayload(admin, body) {
  const summary = { processed: 0, statuses: 0, results: [] }
  try {
    const entries = Array.isArray(body?.entry) ? body.entry : []
    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : []
      for (const change of changes) {
        const value = change?.value
        if (!value) continue
        const phoneNumberId = value?.metadata?.phone_number_id

        const statuses = Array.isArray(value?.statuses) ? value.statuses : []
        for (const st of statuses) {
          summary.statuses += 1
          const err = st?.errors?.[0]
          summary.results.push({
            ok: true,
            code: 'STATUS',
            status: st?.status || null,
            messageId: st?.id || null,
            error_code: err?.code || null,
            error_title: err?.title || null,
          })
        }

        const messages = Array.isArray(value?.messages) ? value.messages : []
        for (const msg of messages) {
          const type = String(msg?.type || '')
          const inspected = inspectWhatsappButtonMessage(msg)

          // 1) Confirm / Cancel quick replies (template button OR interactive)
          const buttonParsed = extractRescueButtonPayloadFromMessage(msg)
          if (buttonParsed) {
            console.info('[wa-inbound:button]', {
              type: inspected.type,
              buttonText: inspected.buttonText,
              interactiveTitle: inspected.interactiveTitle,
              hasPayload: Boolean(inspected.buttonPayload || inspected.interactiveId),
              payloadLooksTaxio: /^TAXIO_(CONFIRM|CANCEL):/i.test(
                String(inspected.buttonPayload || inspected.interactiveId || '')
              ),
              labelOnly: buttonParsed.labelOnly === true,
              action: buttonParsed.action,
              tokenMasked: buttonParsed.token ? maskToken(buttonParsed.token) : null,
              phoneIdMatch: isCentralTaxioPhoneNumberId(phoneNumberId),
            })
            const result = await handleRescuePassengerButtonReply(admin, {
              phoneNumberId,
              parsed: buttonParsed,
              senderWaId: msg?.from || '',
            })
            summary.processed += 1
            summary.results.push(result)
            continue
          }

          // Log ignored button-like messages for diagnosis
          if (type === 'button' || type === 'interactive') {
            console.info('[wa-inbound:button-unparsed]', {
              type: inspected.type,
              buttonText: inspected.buttonText,
              hasPayload: Boolean(inspected.buttonPayload),
              interactiveIdLen: inspected.interactiveId ? inspected.interactiveId.length : 0,
              interactiveTitle: inspected.interactiveTitle,
            })
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
