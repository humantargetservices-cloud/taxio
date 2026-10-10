/**
 * Server-only: after Rescue atomic win → ONE WhatsApp to passenger.
 * Never call from browser. Never contact passenger when Company A accepts normally.
 */
import {
  sendRescuePassengerConfirmTemplate,
  whatsappCloudRecipient,
  buildRescueConfirmButtonPayload,
  buildRescueCancelButtonPayload,
} from './_whatsapp.js'

function publicAppOrigin() {
  return String(process.env.PUBLIC_APP_ORIGIN || '')
    .trim()
    .replace(/\/$/, '')
}

export function rescuePassengerConfirmUrl(token) {
  const origin = publicAppOrigin()
  const t = String(token || '').trim()
  if (!origin || !t) return null
  return `${origin}/rescue/confirm/${encodeURIComponent(t)}`
}

/**
 * Atomically claim + send passenger confirm WhatsApp for a Rescue winner.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin service role
 * @param {{ rescueRequestId: string, dryRun?: boolean }} opts
 */
export async function notifyRescuePassengerConfirmWhatsApp(admin, opts = {}) {
  const rescueRequestId = String(opts.rescueRequestId || '').trim()
  const dryRun = opts.dryRun === true
  if (!rescueRequestId) {
    return { ok: false, code: 'INVALID_INPUT', error: 'rescueRequestId required' }
  }

  const { data: rescue, error: loadErr } = await admin
    .from('rescue_requests')
    .select(
      `
      id,
      status,
      original_company_id,
      accepted_by_company_id,
      passenger_confirm_status,
      passenger_confirm_token,
      passenger_confirm_whatsapp_sent_at,
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
  if (rescue.passenger_confirm_whatsapp_sent_at) {
    return {
      ok: true,
      code: 'ALREADY_SENT',
      sent_at: rescue.passenger_confirm_whatsapp_sent_at,
      confirmUrl: rescuePassengerConfirmUrl(rescue.passenger_confirm_token),
    }
  }

  const token = String(rescue.passenger_confirm_token || '').trim()
  if (token.length < 20) {
    return { ok: false, code: 'NO_ACTION', reason: 'NO_CONFIRM_TOKEN' }
  }

  const { data: booking, error: bookErr } = await admin
    .from('booking_requests')
    .select('id, customer_phone, estimated_price_eur, price_currency')
    .eq('id', rescue.booking_request_id)
    .maybeSingle()

  if (bookErr) {
    console.error('[rescue-notify:booking]', bookErr.message)
    return { ok: false, code: 'LOAD_FAILED', error: bookErr.message }
  }

  const passengerPhone = String(booking?.customer_phone || '').trim()
  if (!passengerPhone || !whatsappCloudRecipient(passengerPhone)) {
    return { ok: false, code: 'NO_ACTION', reason: 'NO_PASSENGER_PHONE' }
  }

  const [{ data: originalCo }, { data: winnerCo }] = await Promise.all([
    admin.from('companies').select('id, name').eq('id', rescue.original_company_id).maybeSingle(),
    admin.from('companies').select('id, name').eq('id', rescue.accepted_by_company_id).maybeSingle(),
  ])

  const originalCompanyName = String(originalCo?.name || 'Your taxi company').trim() || 'Your taxi company'
  const winnerCompanyName = String(winnerCo?.name || 'A taxi company').trim() || 'A taxi company'
  // Frozen price stays on booking / confirm page — not in template body.
  const frozenPriceLabel =
    String(rescue.preview_estimated_price || '').trim() ||
    (booking?.estimated_price_eur != null
      ? `€${Number(booking.estimated_price_eur).toFixed(2)}`
      : null)
  const confirmUrl = rescuePassengerConfirmUrl(token)

  const claimIso = new Date().toISOString()
  const { data: claimed, error: claimErr } = await admin
    .from('rescue_requests')
    .update({ passenger_confirm_whatsapp_sent_at: claimIso })
    .eq('id', rescueRequestId)
    .is('passenger_confirm_whatsapp_sent_at', null)
    .eq('status', 'ACCEPTED')
    .eq('passenger_confirm_status', 'WAITING_PASSENGER_CONFIRMATION')
    .select('id, passenger_confirm_whatsapp_sent_at, passenger_confirm_token')
    .maybeSingle()

  if (claimErr) {
    console.error('[rescue-notify:claim]', claimErr.message)
    return { ok: false, code: 'CLAIM_FAILED', error: claimErr.message }
  }
  if (!claimed) {
    return { ok: true, code: 'ALREADY_SENT', confirmUrl }
  }

  const sendResult = await sendRescuePassengerConfirmTemplate({
    toPhone: passengerPhone,
    originalCompanyName,
    winnerCompanyName,
    confirmToken: token,
    dryRun,
  })

  if (!sendResult.ok) {
    await admin
      .from('rescue_requests')
      .update({ passenger_confirm_whatsapp_sent_at: null })
      .eq('id', rescueRequestId)
      .eq('passenger_confirm_whatsapp_sent_at', claimIso)
    console.error('[rescue-notify:send-failed]', sendResult.error || sendResult)
    return {
      ok: false,
      code: sendResult.skipped ? sendResult.error || 'SEND_SKIPPED' : 'SEND_FAILED',
      error: sendResult.error,
      confirmUrl,
      dryRun,
    }
  }

  return {
    ok: true,
    code: dryRun ? 'DRY_RUN_SENT' : 'SENT',
    sent_at: claimIso,
    confirmUrl,
    originalCompanyName,
    winnerCompanyName,
    companyName: winnerCompanyName,
    frozenPriceLabel,
    bodyParamCount: 2,
    confirmPayload: buildRescueConfirmButtonPayload(token),
    cancelPayload: buildRescueCancelButtonPayload(token),
    urlToken: token,
    dryRunPayload: sendResult.dryRunPayload || null,
    passengerPhoneDigits: whatsappCloudRecipient(passengerPhone),
    winnerCompanyId: rescue.accepted_by_company_id,
    originalCompanyId: rescue.original_company_id,
    dryRun,
  }
}

/** Retry helper for cron/tick: claim/send any eligible waiting rescues (send-once safe). */
export async function notifyPendingRescuePassengerWhatsApps(admin, { dryRun = false, limit = 10 } = {}) {
  const { data: rows, error } = await admin
    .from('rescue_requests')
    .select('id')
    .eq('status', 'ACCEPTED')
    .eq('passenger_confirm_status', 'WAITING_PASSENGER_CONFIRMATION')
    .is('passenger_confirm_whatsapp_sent_at', null)
    .not('accepted_by_company_id', 'is', null)
    .order('accepted_at', { ascending: true })
    .limit(Math.max(1, Math.min(50, Number(limit) || 10)))

  if (error) {
    console.error('[rescue-notify:pending]', error.message)
    return { ok: false, error: error.message, results: [] }
  }

  const results = []
  for (const row of rows || []) {
    results.push(await notifyRescuePassengerConfirmWhatsApp(admin, { rescueRequestId: row.id, dryRun }))
  }
  return { ok: true, results }
}
