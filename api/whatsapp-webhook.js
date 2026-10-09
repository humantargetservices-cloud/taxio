/**
 * Official Meta WhatsApp Cloud API webhook.
 * GET  — verification challenge
 * POST — inbound messages → booking reference match → customer_phone capture
 *
 * Soft-fail only. Never blocks booking or dashboard. No outbound Rescue send.
 */
import crypto from 'crypto'
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import { processWhatsappWebhookPayload } from './_whatsappInbound.js'

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a || ''), 'utf8')
  const bb = Buffer.from(String(b || ''), 'utf8')
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

function verifyMetaSignature(req, rawBody) {
  const secret = String(process.env.WHATSAPP_APP_SECRET || '').trim()
  if (!secret) {
    // Staging may run without secret during setup — log and allow only if explicitly opted in
    if (String(process.env.WHATSAPP_WEBHOOK_ALLOW_UNSIGNED || '').trim() === 'true') {
      console.warn('[whatsapp-webhook] unsigned allowed via WHATSAPP_WEBHOOK_ALLOW_UNSIGNED')
      return true
    }
    console.warn('[whatsapp-webhook] WHATSAPP_APP_SECRET missing — rejecting POST')
    return false
  }
  const header = String(req.headers['x-hub-signature-256'] || '').trim()
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`
  return timingSafeEqualStr(header, expected)
}

function getRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8')
  // Vercel often pre-parses JSON — reconstruct for HMAC (best-effort)
  return Buffer.from(JSON.stringify(req.body ?? {}), 'utf8')
}

function parseJsonBody(req, raw) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body
  try {
    return JSON.parse(raw.toString('utf8') || '{}')
  } catch {
    return {}
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

  // --- POST inbound ---
  try {
    const raw = getRawBody(req)
    if (!verifyMetaSignature(req, raw)) {
      return json(res, 401, { ok: false, code: 'INVALID_SIGNATURE' })
    }

    const envErr = validateSupabaseServiceEnv()
    if (envErr) {
      console.warn('[whatsapp-webhook]', envErr)
      // Still 200 so Meta does not retry storm — log only
      return json(res, 200, { ok: true, skipped: true, code: 'SERVER_ENV' })
    }

    const body = parseJsonBody(req, raw)
    const admin = makeSupabaseServiceClient()
    const summary = await processWhatsappWebhookPayload(admin, body)
    return json(res, 200, { ok: true, ...summary })
  } catch (e) {
    console.warn('[whatsapp-webhook:post]', e?.message || e)
    // Always acknowledge Meta to avoid retry loops crashing ops
    return json(res, 200, { ok: true, code: 'SOFT_ERROR' })
  }
}
