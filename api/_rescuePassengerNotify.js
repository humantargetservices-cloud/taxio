/**
 * Server-only: Rescue winner → passenger WhatsApp (View Booking → /trip/:token).
 * Never call from browser. Never contact passenger when Company A accepts normally.
 *
 * Message 1 (immediate): offer — passenger_confirm_whatsapp_sent_at send-once
 * Message 2 (~20m): reminder — passenger_confirm_reminder_whatsapp_sent_at send-once
 */
import {
  sendRescueOfferTemplate,
  sendRescueReminderTemplate,
  whatsappCloudRecipient,
  rescueOfferTemplateConfigured,
  rescueReminderTemplateConfigured,
} from './_whatsapp.js'

function publicAppOrigin() {
  return String(process.env.PUBLIC_APP_ORIGIN || '')
    .trim()
    .replace(/\/$/, '')
}

/** Authoritative passenger trip page URL (Confirm/Cancel live here). */
export function rescuePassengerTripUrl(tripToken) {
  const origin = publicAppOrigin()
  const t = String(tripToken || '').trim()
  if (!origin || !t) return null
  return `${origin}/trip/${encodeURIComponent(t)}`
}

/** @deprecated Legacy /rescue/confirm URL — not used for new WhatsApp CTAs. */
export function rescuePassengerConfirmUrl(token) {
  const origin = publicAppOrigin()
  const t = String(token || '').trim()
  if (!origin || !t) return null
  return `${origin}/rescue/confirm/${encodeURIComponent(t)}`
}

async function loadRescueNotifyContext(admin, rescueRequestId) {
  const { data: rescue, error: loadErr } = await admin
    .from('rescue_requests')
    .select(
      `
      id,
      status,
      original_company_id,
      accepted_by_company_id,
      accepted_at,
      passenger_confirm_status,
      passenger_confirm_token,
      passenger_confirm_deadline_at,
      passenger_confirm_whatsapp_sent_at,
      passenger_confirm_reminder_whatsapp_sent_at,
      preview_estimated_price,
      booking_request_id
    `
    )
    .eq('id', rescueRequestId)
    .maybeSingle()

  if (loadErr) {
    console.error('[rescue-notify:load]', loadErr.message)
    return { ok: false, code: 'LOAD_FAILED', error: loadErr.message }
  }
  if (!rescue) return { ok: false, code: 'NOT_FOUND' }

  if (String(rescue.status) !== 'ACCEPTED') {
    return { ok: false, code: 'NO_ACTION', reason: 'NOT_ACCEPTED' }
  }
  if (String(rescue.passenger_confirm_status) !== 'WAITING_PASSENGER_CONFIRMATION') {
    return { ok: false, code: 'NO_ACTION', reason: 'NOT_WAITING_PASSENGER' }
  }
  if (!rescue.accepted_by_company_id) {
    return { ok: false, code: 'NO_ACTION', reason: 'NO_WINNER' }
  }

  const { data: booking, error: bookErr } = await admin
    .from('booking_requests')
    .select('id, customer_phone, estimated_price_eur, price_currency, passenger_trip_token')
    .eq('id', rescue.booking_request_id)
    .maybeSingle()

  if (bookErr) {
    console.error('[rescue-notify:booking]', bookErr.message)
    return { ok: false, code: 'LOAD_FAILED', error: bookErr.message }
  }

  const tripToken = String(booking?.passenger_trip_token || '').trim()
  if (tripToken.length < 20) {
    return { ok: false, code: 'NO_ACTION', reason: 'NO_TRIP_TOKEN' }
  }

  const passengerPhone = String(booking?.customer_phone || '').trim()
  if (!passengerPhone || !whatsappCloudRecipient(passengerPhone)) {
    return { ok: false, code: 'NO_ACTION', reason: 'NO_PASSENGER_PHONE' }
  }

  if (!rescue.original_company_id) {
    return { ok: false, code: 'NO_ACTION', reason: 'NO_ORIGINAL_COMPANY' }
  }

  const [{ data: originalCo }, { data: winnerCo }] = await Promise.all([
    admin.from('companies').select('id, name').eq('id', rescue.original_company_id).maybeSingle(),
    admin.from('companies').select('id, name').eq('id', rescue.accepted_by_company_id).maybeSingle(),
  ])

  const originalCompanyName = String(originalCo?.name || '').trim()
  const winnerCompanyName = String(winnerCo?.name || '').trim()
  if (!originalCompanyName || !winnerCompanyName) {
    return { ok: false, code: 'NO_ACTION', reason: 'MISSING_COMPANY_NAMES' }
  }

  const tripUrl = rescuePassengerTripUrl(tripToken)

  return {
    ok: true,
    rescue,
    booking,
    tripToken,
    tripUrl,
    passengerPhone,
    originalCompanyName,
    winnerCompanyName,
  }
}

function deadlineStillOpen(rescue) {
  const iso = rescue?.passenger_confirm_deadline_at
  if (!iso) return true
  const t = new Date(iso).getTime()
  return Number.isFinite(t) && t > Date.now()
}

function reminderDue(rescue) {
  const accepted = rescue?.accepted_at ? new Date(rescue.accepted_at).getTime() : NaN
  if (!Number.isFinite(accepted)) return false
  if (Date.now() < accepted + 20 * 60 * 1000) return false
  return deadlineStillOpen(rescue)
}

/**
 * Atomically claim + send first Rescue offer WhatsApp (View Booking).
 */
export async function notifyRescuePassengerConfirmWhatsApp(admin, opts = {}) {
  const rescueRequestId = String(opts.rescueRequestId || '').trim()
  const dryRun = opts.dryRun === true
  if (!rescueRequestId) {
    return { ok: false, code: 'INVALID_INPUT', error: 'rescueRequestId required' }
  }

  const ctx = await loadRescueNotifyContext(admin, rescueRequestId)
  if (!ctx.ok) return ctx

  const { rescue, tripToken, tripUrl, passengerPhone, originalCompanyName, winnerCompanyName } = ctx

  if (rescue.passenger_confirm_whatsapp_sent_at) {
    return {
      ok: true,
      code: 'ALREADY_SENT',
      kind: 'offer',
      sent_at: rescue.passenger_confirm_whatsapp_sent_at,
      tripUrl,
    }
  }

  if (!rescueOfferTemplateConfigured() && !dryRun) {
    return {
      ok: false,
      code: 'TEMPLATE_NOT_CONFIGURED',
      kind: 'offer',
      metaTemplateSetupRequired: true,
      expectedTemplate: 'taxio_rescue_offer_staging',
      tripUrl,
    }
  }

  if (dryRun) {
    const sendResult = await sendRescueOfferTemplate({
      toPhone: passengerPhone,
      originalCompanyName,
      winnerCompanyName,
      tripToken,
      dryRun: true,
    })
    return {
      ok: sendResult.ok === true,
      code: sendResult.ok ? 'DRY_RUN_SENT' : 'DRY_RUN_FAILED',
      kind: 'offer',
      error: sendResult.error,
      metaTemplateSetupRequired: sendResult.metaTemplateSetupRequired === true,
      tripUrl,
      originalCompanyName,
      winnerCompanyName,
      tripToken,
      bodyParamCount: sendResult.bodyParameters?.length ?? null,
      bodyParameters: sendResult.bodyParameters || null,
      urlParameter: sendResult.urlParameter || null,
      dryRunPayload: sendResult.dryRunPayload || null,
      passengerPhoneDigits: whatsappCloudRecipient(passengerPhone),
      dryRun: true,
    }
  }

  const claimIso = new Date().toISOString()
  const { data: claimed, error: claimErr } = await admin
    .from('rescue_requests')
    .update({ passenger_confirm_whatsapp_sent_at: claimIso })
    .eq('id', rescueRequestId)
    .is('passenger_confirm_whatsapp_sent_at', null)
    .eq('status', 'ACCEPTED')
    .eq('passenger_confirm_status', 'WAITING_PASSENGER_CONFIRMATION')
    .select('id, passenger_confirm_whatsapp_sent_at')
    .maybeSingle()

  if (claimErr) {
    console.error('[rescue-notify:claim:offer]', claimErr.message)
    return { ok: false, code: 'CLAIM_FAILED', error: claimErr.message, kind: 'offer' }
  }
  if (!claimed) {
    return { ok: true, code: 'ALREADY_SENT', kind: 'offer', tripUrl }
  }

  const sendResult = await sendRescueOfferTemplate({
    toPhone: passengerPhone,
    originalCompanyName,
    winnerCompanyName,
    tripToken,
    dryRun: false,
  })

  if (!sendResult.ok) {
    await admin
      .from('rescue_requests')
      .update({ passenger_confirm_whatsapp_sent_at: null })
      .eq('id', rescueRequestId)
      .eq('passenger_confirm_whatsapp_sent_at', claimIso)
    console.error('[rescue-notify:send-failed:offer]', {
      error: sendResult.error,
      status: sendResult.status,
      metaError: sendResult.metaError || null,
    })
    return {
      ok: false,
      code: sendResult.skipped ? sendResult.error || 'SEND_SKIPPED' : 'SEND_FAILED',
      kind: 'offer',
      error: sendResult.error,
      metaTemplateSetupRequired: sendResult.metaTemplateSetupRequired === true,
      metaError: sendResult.metaError || null,
      status: sendResult.status,
      tripUrl,
    }
  }

  return {
    ok: true,
    code: 'SENT',
    kind: 'offer',
    sent_at: claimIso,
    messageId: sendResult.messageId || null,
    template: sendResult.template || null,
    tripUrl,
    originalCompanyName,
    winnerCompanyName,
    passengerPhoneDigits: whatsappCloudRecipient(passengerPhone),
  }
}

/**
 * Atomically claim + send 20-minute reminder WhatsApp (View Booking).
 */
export async function notifyRescuePassengerReminderWhatsApp(admin, opts = {}) {
  const rescueRequestId = String(opts.rescueRequestId || '').trim()
  const dryRun = opts.dryRun === true
  if (!rescueRequestId) {
    return { ok: false, code: 'INVALID_INPUT', error: 'rescueRequestId required' }
  }

  const ctx = await loadRescueNotifyContext(admin, rescueRequestId)
  if (!ctx.ok) return ctx

  const { rescue, tripToken, tripUrl, passengerPhone, winnerCompanyName } = ctx

  if (!reminderDue(rescue)) {
    return { ok: false, code: 'NO_ACTION', reason: 'REMINDER_NOT_DUE', kind: 'reminder', tripUrl }
  }

  if (rescue.passenger_confirm_reminder_whatsapp_sent_at) {
    return {
      ok: true,
      code: 'ALREADY_SENT',
      kind: 'reminder',
      sent_at: rescue.passenger_confirm_reminder_whatsapp_sent_at,
      tripUrl,
    }
  }

  if (!rescueReminderTemplateConfigured() && !dryRun) {
    return {
      ok: false,
      code: 'TEMPLATE_NOT_CONFIGURED',
      kind: 'reminder',
      metaTemplateSetupRequired: true,
      expectedTemplate: 'taxio_rescue_reminder_staging',
      tripUrl,
    }
  }

  if (dryRun) {
    const sendResult = await sendRescueReminderTemplate({
      toPhone: passengerPhone,
      winnerCompanyName,
      tripToken,
      dryRun: true,
    })
    return {
      ok: sendResult.ok === true,
      code: sendResult.ok ? 'DRY_RUN_SENT' : 'DRY_RUN_FAILED',
      kind: 'reminder',
      error: sendResult.error,
      metaTemplateSetupRequired: sendResult.metaTemplateSetupRequired === true,
      tripUrl,
      winnerCompanyName,
      tripToken,
      bodyParamCount: sendResult.bodyParameters?.length ?? null,
      bodyParameters: sendResult.bodyParameters || null,
      urlParameter: sendResult.urlParameter || null,
      dryRunPayload: sendResult.dryRunPayload || null,
      dryRun: true,
    }
  }

  const claimIso = new Date().toISOString()
  const { data: claimed, error: claimErr } = await admin
    .from('rescue_requests')
    .update({ passenger_confirm_reminder_whatsapp_sent_at: claimIso })
    .eq('id', rescueRequestId)
    .is('passenger_confirm_reminder_whatsapp_sent_at', null)
    .eq('status', 'ACCEPTED')
    .eq('passenger_confirm_status', 'WAITING_PASSENGER_CONFIRMATION')
    .select('id, passenger_confirm_reminder_whatsapp_sent_at')
    .maybeSingle()

  if (claimErr) {
    console.error('[rescue-notify:claim:reminder]', claimErr.message)
    return { ok: false, code: 'CLAIM_FAILED', error: claimErr.message, kind: 'reminder' }
  }
  if (!claimed) {
    return { ok: true, code: 'ALREADY_SENT', kind: 'reminder', tripUrl }
  }

  // Re-check terminal status after claim race (confirm/cancel/expire may have won)
  const { data: again } = await admin
    .from('rescue_requests')
    .select('passenger_confirm_status, passenger_confirm_deadline_at')
    .eq('id', rescueRequestId)
    .maybeSingle()
  if (
    String(again?.passenger_confirm_status || '') !== 'WAITING_PASSENGER_CONFIRMATION' ||
    !deadlineStillOpen(again)
  ) {
    // Keep claim so we never send a stale reminder later
    return {
      ok: true,
      code: 'SKIPPED_TERMINAL',
      kind: 'reminder',
      tripUrl,
    }
  }

  const sendResult = await sendRescueReminderTemplate({
    toPhone: passengerPhone,
    winnerCompanyName,
    tripToken,
    dryRun: false,
  })

  if (!sendResult.ok) {
    await admin
      .from('rescue_requests')
      .update({ passenger_confirm_reminder_whatsapp_sent_at: null })
      .eq('id', rescueRequestId)
      .eq('passenger_confirm_reminder_whatsapp_sent_at', claimIso)
    console.error('[rescue-notify:send-failed:reminder]', {
      error: sendResult.error,
      status: sendResult.status,
      metaError: sendResult.metaError || null,
    })
    return {
      ok: false,
      code: sendResult.skipped ? sendResult.error || 'SEND_SKIPPED' : 'SEND_FAILED',
      kind: 'reminder',
      error: sendResult.error,
      metaTemplateSetupRequired: sendResult.metaTemplateSetupRequired === true,
      metaError: sendResult.metaError || null,
      status: sendResult.status,
      tripUrl,
    }
  }

  return {
    ok: true,
    code: 'SENT',
    kind: 'reminder',
    sent_at: claimIso,
    messageId: sendResult.messageId || null,
    template: sendResult.template || null,
    tripUrl,
    winnerCompanyName,
  }
}

/** Retry helper for cron/tick: first offers + due reminders (send-once safe). */
export async function notifyPendingRescuePassengerWhatsApps(admin, { dryRun = false, limit = 10 } = {}) {
  const lim = Math.max(1, Math.min(50, Number(limit) || 10))
  const results = []

  // First offers still waiting for send
  const { data: offerRows, error: offerErr } = await admin
    .from('rescue_requests')
    .select('id')
    .eq('status', 'ACCEPTED')
    .eq('passenger_confirm_status', 'WAITING_PASSENGER_CONFIRMATION')
    .is('passenger_confirm_whatsapp_sent_at', null)
    .not('accepted_by_company_id', 'is', null)
    .order('accepted_at', { ascending: true })
    .limit(lim)

  if (offerErr) {
    console.error('[rescue-notify:pending:offer]', offerErr.message)
    return { ok: false, error: offerErr.message, results: [] }
  }

  for (const row of offerRows || []) {
    results.push(await notifyRescuePassengerConfirmWhatsApp(admin, { rescueRequestId: row.id, dryRun }))
  }

  // Reminders due at accepted_at + 20m (still WAITING, not sent; deadline checked in notify)
  const cutoffIso = new Date(Date.now() - 20 * 60 * 1000).toISOString()
  const { data: reminderRows, error: remErr } = await admin
    .from('rescue_requests')
    .select('id')
    .eq('status', 'ACCEPTED')
    .eq('passenger_confirm_status', 'WAITING_PASSENGER_CONFIRMATION')
    .is('passenger_confirm_reminder_whatsapp_sent_at', null)
    .not('accepted_by_company_id', 'is', null)
    .lte('accepted_at', cutoffIso)
    .order('accepted_at', { ascending: true })
    .limit(lim)

  if (remErr) {
    console.error('[rescue-notify:pending:reminder]', remErr.message)
    return { ok: false, error: remErr.message, results }
  }

  for (const row of reminderRows || []) {
    results.push(await notifyRescuePassengerReminderWhatsApp(admin, { rescueRequestId: row.id, dryRun }))
  }

  return { ok: true, results }
}
