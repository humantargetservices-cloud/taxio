/**
 * POST /api/company-push-dispatch
 * Server-to-server only. Protected by COMPANY_PUSH_WEBHOOK_SECRET.
 * Dispatches one company_push_outbox row via Web Push (VAPID).
 */
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import {
  buildPushNotificationContent,
  configureWebPush,
  extractPushWebhookSecret,
  getCompanyPushWebhookSecret,
  isGonePushError,
  loadSafePushContext,
  secretsEqual,
  sendWebPushToSubscription,
  validateVapidEnv,
} from './_companyPush.js'

function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Taxio-Push-Secret'
  )
}

export default async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end()
    res.statusCode = 204
    return res.end()
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const expected = getCompanyPushWebhookSecret()
  if (!expected) {
    return json(res, 503, {
      error: 'COMPANY_PUSH_WEBHOOK_SECRET is not configured.',
      code: 'SECRET_MISSING',
    })
  }

  const provided = extractPushWebhookSecret(req)
  if (!secretsEqual(provided, expected)) {
    return json(res, 401, { error: 'Unauthorized.', code: 'UNAUTHORIZED' })
  }

  const envErr = validateSupabaseServiceEnv()
  if (envErr) return json(res, 503, { error: envErr, code: 'ENV' })
  const vapidErr = validateVapidEnv()
  if (vapidErr) return json(res, 503, { error: vapidErr, code: 'VAPID' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const outboxId = String(body.outbox_id || body.outboxId || body.id || '').trim()
    const dedupeKey = String(body.dedupe_key || body.dedupeKey || '').trim()
    if (!outboxId && !dedupeKey) {
      return json(res, 400, {
        error: 'outbox_id or dedupe_key is required.',
        code: 'INVALID_INPUT',
      })
    }

    const admin = makeSupabaseServiceClient()
    let q = admin.from('company_push_outbox').select('*')
    if (outboxId) q = q.eq('id', outboxId)
    else q = q.eq('dedupe_key', dedupeKey)

    const { data: outbox, error: loadErr } = await q.maybeSingle()
    if (loadErr) {
      console.error('[company-push-dispatch:load]', loadErr.message)
      return json(res, 500, { error: 'Could not load outbox.', code: 'DB_ERROR' })
    }
    if (!outbox) return json(res, 404, { error: 'Outbox event not found.', code: 'NOT_FOUND' })

    if (outbox.status === 'SENT') {
      return json(res, 200, {
        ok: true,
        code: 'ALREADY_SENT',
        outbox_id: outbox.id,
        sent: true,
      })
    }

    await admin
      .from('company_push_outbox')
      .update({
        status: 'PROCESSING',
        processing_at: new Date().toISOString(),
        attempt_count: Number(outbox.attempt_count || 0) + 1,
      })
      .eq('id', outbox.id)

    const companyId = outbox.company_id
    const { data: subs, error: subErr } = await admin
      .from('company_push_subscriptions')
      .select('id, endpoint, p256dh, auth, enabled')
      .eq('company_id', companyId)
      .eq('enabled', true)

    if (subErr) {
      console.error('[company-push-dispatch:subs]', subErr.message)
      await admin
        .from('company_push_outbox')
        .update({
          status: 'FAILED',
          last_error: 'subscription_query_failed',
        })
        .eq('id', outbox.id)
      return json(res, 500, { error: 'Could not load subscriptions.', code: 'DB_ERROR' })
    }

    if (!subs?.length) {
      await admin
        .from('company_push_outbox')
        .update({
          status: 'FAILED',
          last_error: 'no_enabled_subscriptions',
        })
        .eq('id', outbox.id)
      return json(res, 200, {
        ok: false,
        code: 'NO_SUBSCRIPTIONS',
        outbox_id: outbox.id,
        delivered: 0,
      })
    }

    const safeCtx = await loadSafePushContext(admin, outbox)
    const content = buildPushNotificationContent(outbox.event_type, safeCtx)
    const payload = {
      title: content.title,
      body: content.body,
      tag: content.tag,
      data: content.data,
      event_type: outbox.event_type,
    }

    // Hard guard: never ship passenger PII fields even if a future bug adds them
    delete payload.customer_phone
    delete payload.customer_name
    delete payload.passenger_phone
    delete payload.passenger_name
    if (payload.data) {
      delete payload.data.customer_phone
      delete payload.data.customer_name
      delete payload.data.passenger_phone
      delete payload.data.passenger_name
    }

    const webpushApi = configureWebPush()
    let delivered = 0
    let disabled = 0
    const errors = []

    for (const sub of subs) {
      try {
        await sendWebPushToSubscription(webpushApi, sub, payload)
        delivered += 1
        await admin
          .from('company_push_subscriptions')
          .update({
            last_success_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sub.id)
      } catch (err) {
        const msg = String(err?.message || err || 'send_failed').slice(0, 240)
        if (isGonePushError(err)) {
          disabled += 1
          await admin
            .from('company_push_subscriptions')
            .update({
              enabled: false,
              last_error: `gone:${err.statusCode || 410}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sub.id)
        } else {
          errors.push(msg)
          await admin
            .from('company_push_subscriptions')
            .update({
              last_error: msg,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sub.id)
        }
      }
    }

    if (delivered > 0) {
      await admin
        .from('company_push_outbox')
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString(),
          last_error: errors.length ? errors[0] : null,
        })
        .eq('id', outbox.id)

      return json(res, 200, {
        ok: true,
        code: 'SENT',
        outbox_id: outbox.id,
        event_type: outbox.event_type,
        company_id: companyId,
        delivered,
        disabled,
        subscription_count: subs.length,
      })
    }

    const failMsg = errors[0] || (disabled ? 'all_subscriptions_gone' : 'send_failed')
    await admin
      .from('company_push_outbox')
      .update({
        status: 'FAILED',
        last_error: String(failMsg).slice(0, 240),
      })
      .eq('id', outbox.id)

    return json(res, 200, {
      ok: false,
      code: 'FAILED',
      outbox_id: outbox.id,
      delivered: 0,
      disabled,
      error: failMsg,
    })
  } catch (err) {
    console.error('[company-push-dispatch]', err?.message || err)
    return json(res, 500, {
      error: err?.message || 'Dispatch failed.',
      code: 'SERVER_ERROR',
    })
  }
}
