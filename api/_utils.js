import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export function json(res, status, body) {
  const payload = JSON.stringify(body)
  if (typeof res.status === 'function') {
    res.status(status).setHeader('Content-Type', 'application/json')
  } else {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
  }
  res.end(payload)
}

export function getOriginFromReq(req) {
  return (
    req.headers['x-forwarded-proto'] && req.headers['x-forwarded-host']
      ? `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host']}`
      : req.headers.origin || 'https://taxio.be'
  )
}

export function slugFromCompanyName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/** Human-readable check for required server env (Vercel or local .env). */
export function validateSupabaseServiceEnv() {
  const missing = []
  if (!String(process.env.SUPABASE_URL || '').trim()) missing.push('SUPABASE_URL')
  if (!String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY')
  }
  if (missing.length === 0) return null
  return `Server misconfiguration: missing environment variable(s): ${missing.join(', ')}. Set them in Vercel project settings (or .env for local dev).`
}

export function makeSupabaseServiceClient() {
  const msg = validateSupabaseServiceEnv()
  if (msg) throw new Error(msg)
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function makeResendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

/** Escape text for HTML email bodies (avoid template injection). */
export function escapeHtmlEmail(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function safeSendEmail({ to, subject, html }) {
  const from = process.env.MAIL_FROM
  if (!to || !from) {
    console.warn('[mail:skip] Missing recipient or MAIL_FROM')
    return { skipped: true, reason: 'missing_from_or_to' }
  }
  const resend = makeResendClient()
  if (!resend) {
    console.warn('[mail:skip] RESEND_API_KEY not set')
    return { skipped: true, reason: 'no_resend' }
  }
  try {
    await resend.emails.send({ from, to, subject, html })
    return { ok: true }
  } catch (err) {
    console.error('[mail:error]', err?.message || err)
    return { ok: false, error: err?.message || String(err) }
  }
}

export function makeTempPassword() {
  const seed = Math.random().toString(36).slice(2, 8)
  const n = Math.floor(100 + Math.random() * 900)
  return `Txio!${seed}${n}`
}
