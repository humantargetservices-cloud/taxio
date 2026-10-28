/**
 * POST /api/company-push-dispatch
 * Server-to-server only. Protected by COMPANY_PUSH_WEBHOOK_SECRET.
 *
 * Auth header (required):
 *   x-taxio-push-secret: <COMPANY_PUSH_WEBHOOK_SECRET>
 * Fallback for manual scripts:
 *   Authorization: Bearer <COMPANY_PUSH_WEBHOOK_SECRET>
 * Secret is NEVER accepted from URL query parameters.
 *
 * Accepts:
 * - Manual: { outbox_id } | { dedupe_key }
 * - Supabase Database Webhook INSERT envelope with record.id / record.dedupe_key
 *
 * Always reloads the authoritative outbox row from DB (does not trust webhook event fields).
 *
 * ACTIVE delivery: OneSignal REST API → External ID company:<company_id>
 * Legacy raw web-push / company_push_subscriptions are NOT used on this path.
 */
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import {
  buildPushNotificationContent,
  extractPushWebhookSecret,
  getCompanyPushWebhookSecret,
  loadSafePushContext,
  resolveOutboxLookupFromBody,
  secretsEqual,
  sendOneSignalPushToCompany,
  validateOneSignalServerEnv,
} from './_companyPush.js'
import { sendOperatorExpoPush } from './_operatorPush.js'

/** Reclaim a stuck PROCESSING row after this age (ms). */
const STALE_PROCESSING_MS = 2 * 60 * 1000

function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Taxio-Push-Secret'
  )
}

function rejectQuerySecret(req) {
  try {
    const url = new URL(req.url || '/', 'http://local')
    if (url.searchParams.has('secret') || url.searchParams.has('token')) return true
  } catch {
    /* ignore */
  }
  return false
}

function isRetryableStatus(status) {
  return status === 'PENDING' || status === 'FAILED'
}

function isStaleProcessing(row) {
  if (row?.status !== 'PROCESSING') return false
  const t = row.processing_at ? new Date(row.processing_at).getTime() : 0
  if (!t) return true
  return Date.now() - t > STALE_PROCESSING_MS
}

function safeLastError(err) {
  return String(err?.message || err || 'send_failed')
    .replace(/Key\s+[^\s"']+/gi, 'Key [redacted]')
    .replace(/ONESIGNAL_REST_API_KEY[^\s]*/gi, 'ONESIGNAL_REST_API_KEY=[redacted]')
    .slice(0, 240)
}

export default async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end()
    res.statusCode = 204
    return res.end()
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  if (rejectQuerySecret(req)) {
    return json(res, 400, {
      error: 'Secret must not be passed in the URL.',
      code: 'SECRET_IN_QUERY_FORBIDDEN',
    })
  }

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
  const onesignalErr = validateOneSignalServerEnv()
  if (onesignalErr) {
    return json(res, 503, { error: onesignalErr, code: 'ONESIGNAL_ENV' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const { outboxId, dedupeKey } = resolveOutboxLookupFromBody(body)
    if (!outboxId && !dedupeKey) {
      return json(res, 400, {
        error: 'outbox_id, dedupe_key, or webhook record.id/dedupe_key is required.',
        code: 'INVALID_INPUT',
      })
    }

    const admin = makeSupabaseServiceClient()
    let q = admin.from('company_push_outbox').select('*')
    if (outboxId) q = q.eq('id', outboxId)
    else q = q.eq('dedupe_key', dedupeKey)

    const { data: loaded, error: loadErr } = await q.maybeSingle()
    if (loadErr) {
      console.error('[company-push-dispatch:load]', loadErr.message)
      return json(res, 500, { error: 'Could not load outbox.', code: 'DB_ERROR' })
    }
    if (!loaded) return json(res, 404, { error: 'Outbox event not found.', code: 'NOT_FOUND' })

    // Authoritative row from DB — ignore webhook company_id / event_type for targeting
    let outbox = loaded

    if (outbox.status === 'SENT') {
      return json(res, 200, {
        ok: true,
        code: 'ALREADY_SENT',
        outbox_id: outbox.id,
        sent: true,
      })
    }

    if (outbox.status === 'PROCESSING' && !isStaleProcessing(outbox)) {
      return json(res, 200, {
        ok: true,
        code: 'ALREADY_PROCESSING',
        outbox_id: outbox.id,
      })
    }

    if (!isRetryableStatus(outbox.status) && !isStaleProcessing(outbox)) {
      return json(res, 200, {
        ok: false,
        code: 'NOT_DISPATCHABLE',
        outbox_id: outbox.id,
        status: outbox.status,
      })
    }

    // Claim processing (idempotent under concurrent webhook retries)
    const claimFilterStatuses = isStaleProcessing(outbox)
      ? ['PENDING', 'FAILED', 'PROCESSING']
      : ['PENDING', 'FAILED']

    const { data: claimed, error: claimErr } = await admin
      .from('company_push_outbox')
      .update({
        status: 'PROCESSING',
        processing_at: new Date().toISOString(),
        attempt_count: Number(outbox.attempt_count || 0) + 1,
        last_error: null,
      })
      .eq('id', outbox.id)
      .in('status', claimFilterStatuses)
      .select('*')
      .maybeSingle()

    if (claimErr) {
      console.error('[company-push-dispatch:claim]', claimErr.message)
      return json(res, 500, { error: 'Could not claim outbox.', code: 'DB_ERROR' })
    }

    if (!claimed) {
      const { data: again } = await admin
        .from('company_push_outbox')
        .select('*')
        .eq('id', outbox.id)
        .maybeSingle()
      if (again?.status === 'SENT') {
        return json(res, 200, {
          ok: true,
          code: 'ALREADY_SENT',
          outbox_id: outbox.id,
          sent: true,
        })
      }
      return json(res, 200, {
        ok: true,
        code: 'ALREADY_PROCESSING',
        outbox_id: outbox.id,
      })
    }

    outbox = claimed
    const companyId = outbox.company_id

    const safeCtx = await loadSafePushContext(admin, outbox)
    const content = buildPushNotificationContent(outbox.event_type, safeCtx)

    // Hard guard: never ship passenger PII fields into OneSignal data
    if (content.data) {
      delete content.data.customer_phone
      delete content.data.customer_name
      delete content.data.passenger_phone
      delete content.data.passenger_name
    }

    try {
      const result = await sendOneSignalPushToCompany({
        companyId,
        eventType: outbox.event_type,
        content,
      })

      await admin
        .from('company_push_outbox')
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', outbox.id)

      let operator_push = { ok: false, code: 'SKIPPED', sent: 0 }
      try {
        operator_push = await sendOperatorExpoPush(admin, {
          companyId,
          eventType: outbox.event_type,
          title: content.title,
          body: content.body,
          bookingId: content.data?.booking_id || outbox.booking_id || null,
          rescueRequestId: content.data?.rescue_request_id || outbox.rescue_request_id || null,
          data: {
            event_type: outbox.event_type,
            booking_id: content.data?.booking_id || outbox.booking_id || null,
            rescue_request_id: content.data?.rescue_request_id || outbox.rescue_request_id || null,
            rescue_opportunity_id: content.data?.rescue_opportunity_id || outbox.rescue_opportunity_id || null,
          },
        })
      } catch (pushErr) {
        console.error('[company-push-dispatch:expo]', pushErr?.message || pushErr)
        operator_push = { ok: false, code: 'EXPO_ERROR', sent: 0 }
      }

      return json(res, 200, {
        ok: true,
        code: 'SENT',
        outbox_id: outbox.id,
        event_type: outbox.event_type,
        company_id: companyId,
        external_id: result.externalId,
        onesignal_notification_id: result.notificationId,
        recipients: result.recipients,
        provider: 'onesignal',
        operator_push: {
          ok: operator_push.ok === true,
          code: operator_push.code || null,
          sent: operator_push.sent || 0,
        },
      })
    } catch (err) {
      const failMsg = safeLastError(err)
      console.error('[company-push-dispatch:onesignal]', failMsg)
      await admin
        .from('company_push_outbox')
        .update({
          status: 'FAILED',
          last_error: failMsg,
        })
        .eq('id', outbox.id)

      return json(res, 200, {
        ok: false,
        code: err?.code || 'FAILED',
        outbox_id: outbox.id,
        company_id: companyId,
        provider: 'onesignal',
        error: failMsg,
      })
    }
  } catch (err) {
    console.error('[company-push-dispatch]', err?.message || err)
    return json(res, 500, {
      error: err?.message || 'Dispatch failed.',
      code: 'SERVER_ERROR',
    })
  }
}
