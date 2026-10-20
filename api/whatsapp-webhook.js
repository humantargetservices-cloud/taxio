/**
 * Official Meta WhatsApp Cloud API webhook.
 * GET  — verification challenge
 * POST — inbound messages + delivery status callbacks
 *
 * Soft-fail only. Never blocks booking or dashboard.
 *
 * Signature: HMAC-SHA256 of EXACT raw body with WHATSAPP_APP_SECRET.
 * Body parser is disabled so Vercel does not re-serialize JSON before verify.
 */
import crypto from 'crypto'
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import { processWhatsappWebhookPayload } from './_whatsappInbound.js'

/** Required so Meta X-Hub-Signature-256 matches the exact request bytes. */
export const config = {
  api: {
    bodyParser: false,
  },
}

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a || ''), 'utf8')
  const bb = Buffer.from(String(b || ''), 'utf8')
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8')

  // Prefer unread stream when bodyParser is disabled.
  if (req.readable && !req.readableEnded) {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    return Buffer.concat(chunks)
  }

  // Last resort (should not happen with bodyParser:false) — never use for HMAC in prod.
  if (req.body && typeof req.body === 'object') {
    console.warn('[whatsapp-webhook] raw body unavailable; parsed body present (HMAC may fail)')
    return Buffer.from(JSON.stringify(req.body), 'utf8')
  }
  return Buffer.alloc(0)
}

function verifyMetaSignature(req, rawBody) {
  const secret = String(process.env.WHATSAPP_APP_SECRET || '').trim()
  if (!secret) {
    console.warn('[whatsapp-webhook] WHATSAPP_APP_SECRET missing — rejecting POST')
    return { ok: false, reason: 'MISSING_APP_SECRET' }
  }
  const header = String(req.headers['x-hub-signature-256'] || '').trim()
  if (!header) {
    console.warn('[whatsapp-webhook] X-Hub-Signature-256 missing — rejecting POST')
    return { ok: false, reason: 'MISSING_SIGNATURE_HEADER' }
  }
  if (!header.startsWith('sha256=')) {
    console.warn('[whatsapp-webhook] signature header format invalid — rejecting POST')
    return { ok: false, reason: 'BAD_SIGNATURE_FORMAT' }
  }
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`
  if (!timingSafeEqualStr(header, expected)) {
    console.warn('[whatsapp-webhook] signature mismatch — rejecting POST', {
      headerLen: header.length,
      rawBytes: rawBody?.length || 0,
    })
    return { ok: false, reason: 'SIGNATURE_MISMATCH' }
  }
  return { ok: true }
}

function parseJsonBody(raw) {
  try {
    return JSON.parse(raw.toString('utf8') || '{}')
  } catch {
    return {}
  }
}

/** Log Meta delivery statuses without PII. */
function logWhatsappStatuses(body) {
  try {
    const entries = Array.isArray(body?.entry) ? body.entry : []
    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : []
      for (const change of changes) {
        const statuses = Array.isArray(change?.value?.statuses) ? change.value.statuses : []
        for (const st of statuses) {
          const err = st?.errors?.[0]
          console.info('[whatsapp-status]', {
            id: st?.id || null,
            status: st?.status || null,
            timestamp: st?.timestamp || null,
            recipient_id_len: String(st?.recipient_id || '').length || 0,
            conversation_id: st?.conversation?.id || null,
            error_code: err?.code || null,
            error_title: err?.title || null,
            error_message: err?.message || null,
            error_details: err?.error_data?.details || null,
          })
        }
      }
    }
  } catch (e) {
    console.warn('[whatsapp-status:log]', e?.message || e)
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Hub-Signature-256')

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end()
    res.statusCode = 204
    return res.end()
  }

  // --- GET verification ---
  if (req.method === 'GET') {
    try {
      const q = req.query || {}
      const mode = String(q['hub.mode'] || q.hub_mode || '').trim()
      const token = String(q['hub.verify_token'] || q.hub_verify_token || '').trim()
      const challenge = String(q['hub.challenge'] || q.hub_challenge || '').trim()
      const expected = String(process.env.WHATSAPP_VERIFY_TOKEN || '').trim()

      if (mode === 'subscribe' && expected && timingSafeEqualStr(token, expected) && challenge) {
        if (typeof res.status === 'function') {
          res.status(200).setHeader('Content-Type', 'text/plain')
          return res.end(challenge)
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/plain')
        return res.end(challenge)
      }
      return json(res, 403, { ok: false, code: 'VERIFY_FAILED' })
    } catch (e) {
      console.warn('[whatsapp-webhook:get]', e?.message || e)
      return json(res, 500, { ok: false, code: 'VERIFY_ERROR' })
    }
  }

  if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' })

  // --- POST inbound / status ---
  try {
    const raw = await readRawBody(req)
    const sig = verifyMetaSignature(req, raw)
    if (!sig.ok) {
      return json(res, 401, { ok: false, code: 'INVALID_SIGNATURE', reason: sig.reason })
    }

    const body = parseJsonBody(raw)
    logWhatsappStatuses(body)

    const envErr = validateSupabaseServiceEnv()
    if (envErr) {
      console.warn('[whatsapp-webhook]', envErr)
      // Still 200 so Meta does not retry storm — log only
      return json(res, 200, { ok: true, skipped: true, code: 'SERVER_ENV' })
    }

    const admin = makeSupabaseServiceClient()
    const summary = await processWhatsappWebhookPayload(admin, body)
    return json(res, 200, { ok: true, ...summary })
  } catch (e) {
    console.warn('[whatsapp-webhook:post]', e?.message || e)
    // Always acknowledge Meta to avoid retry loops crashing ops
    return json(res, 200, { ok: true, code: 'SOFT_ERROR' })
  }
}
