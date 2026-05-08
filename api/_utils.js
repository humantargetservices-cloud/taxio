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

/** Company-facing email / DB `preferred_locale`: nl default, matches app UI. */
const COMPANY_UI_LOCALES = ['en', 'fr', 'nl']
export const DEFAULT_COMPANY_LOCALE = 'nl'

export function normalizeCompanyLocale(raw) {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  return COMPANY_UI_LOCALES.includes(s) ? s : DEFAULT_COMPANY_LOCALE
}

/** Escape text for HTML email bodies (avoid template injection). */
export function escapeHtmlEmail(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const DEFAULT_MAIL_FROM_AUTOMATED = 'TAXIO <noreply@taxio.be>'
const DEFAULT_MAIL_FROM_ADMIN_COMM = 'TAXIO Team <info@taxio.be>'
const DEFAULT_MAIL_REPLY_TO = 'humantargetservices@gmail.com'

/** Reply-To on all outbound mail (automated + admin communication). Resend: `replyTo`. */
export function resolveMailReplyTo() {
  const explicit = String(process.env.MAIL_REPLY_TO || '').trim()
  return explicit || DEFAULT_MAIL_REPLY_TO
}

/** Registration, approvals, password flows, booking notices, etc. */
export function resolveAutomatedMailFrom() {
  const explicit = String(process.env.MAIL_FROM_AUTOMATED || '').trim()
  if (explicit) return explicit
  const fallback = String(process.env.MAIL_FROM || '').trim()
  if (fallback) return fallback
  return DEFAULT_MAIL_FROM_AUTOMATED
}

/** Admin Communication tab only — see api/admin-send-communication-email.js */
export function resolveAdminCommunicationMailFrom() {
  const explicit = String(process.env.MAIL_FROM_ADMIN_COMM || '').trim()
  if (explicit) return explicit
  const fallback = String(process.env.MAIL_FROM || '').trim()
  if (fallback) return fallback
  return DEFAULT_MAIL_FROM_ADMIN_COMM
}

/**
 * @param {{ to: string, subject: string, html: string, from?: string, replyTo?: string }} opts
 * If `from` is omitted, uses {@link resolveAutomatedMailFrom}.
 * If `replyTo` is omitted, uses {@link resolveMailReplyTo}.
 */
export async function safeSendEmail({ to, subject, html, from, replyTo }) {
  const resolvedFrom = String(from ?? '').trim() || resolveAutomatedMailFrom()
  const resolvedReplyTo = String(replyTo ?? '').trim() || resolveMailReplyTo()
  if (!to || !resolvedFrom) {
    const reason = !resolvedFrom ? 'missing_mail_from' : 'missing_recipient'
    console.warn('[mail:skip] Missing recipient or sender FROM', {
      toPresent: !!to,
      fromPresent: !!resolvedFrom,
    })
    return {
      skipped: true,
      reason,
      error: 'Email skipped because sender address or recipient is missing.',
    }
  }
  const resend = makeResendClient()
  if (!resend) {
    console.warn('[mail:skip] RESEND_API_KEY not set')
    return {
      skipped: true,
      reason: 'no_resend',
      error: 'Email skipped because RESEND_API_KEY is not set.',
    }
  }
  try {
    const result = await resend.emails.send({
      from: resolvedFrom,
      to,
      subject,
      html,
      replyTo: resolvedReplyTo,
    })
    if (result?.error) {
      console.error('[mail:error:resend-response]', result.error)
      return {
        ok: false,
        error:
          result.error?.message ||
          'Resend returned an error. Verify sender domain and Resend configuration.',
        provider: 'resend',
      }
    }
    return { ok: true, provider: 'resend', id: result?.data?.id || null }
  } catch (err) {
    const detail = err?.message || String(err)
    console.error('[mail:error]', detail, err)
    return {
      ok: false,
      error: detail,
      provider: 'resend',
    }
  }
}

export function makeTempPassword() {
  const seed = Math.random().toString(36).slice(2, 8)
  const n = Math.floor(100 + Math.random() * 900)
  return `Txio!${seed}${n}`
}

export function getClientIp(req) {
  const vercelFwd = String(req?.headers?.['x-vercel-forwarded-for'] || '').trim()
  if (vercelFwd) return vercelFwd.split(',')[0].trim()
  const cfIp = String(req?.headers?.['cf-connecting-ip'] || '').trim()
  if (cfIp) return cfIp
  const trueClientIp = String(req?.headers?.['true-client-ip'] || '').trim()
  if (trueClientIp) return trueClientIp
  const xfwd = String(req?.headers?.['x-forwarded-for'] || '').trim()
  // Fallback only; this header is easier to spoof when not behind trusted proxy.
  if (xfwd) return xfwd.split(',')[0].trim()
  const realIp = String(req?.headers?.['x-real-ip'] || '').trim()
  if (realIp) return realIp
  return 'unknown'
}

export function getUserAgent(req) {
  return String(req?.headers?.['user-agent'] || '').trim().slice(0, 512) || null
}

export function isTurnstileEnabled() {
  return String(process.env.TURNSTILE_ENABLED || '')
    .trim()
    .toLowerCase() === 'true'
}

export async function verifyTurnstileToken(token, remoteIp) {
  const secret = String(process.env.TURNSTILE_SECRET_KEY || '').trim()
  if (!isTurnstileEnabled()) return { enabled: false, passed: null, reason: 'disabled' }
  if (!secret) return { enabled: true, passed: false, reason: 'missing_secret' }
  const t = String(token || '').trim()
  if (!t) return { enabled: true, passed: false, reason: 'missing_token' }
  try {
    const body = new URLSearchParams()
    body.set('secret', secret)
    body.set('response', t)
    if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp)
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { enabled: true, passed: false, reason: `http_${response.status}` }
    }
    if (data?.success === true) return { enabled: true, passed: true, reason: null }
    const errs = Array.isArray(data?.['error-codes']) ? data['error-codes'].join(',') : 'verify_failed'
    return { enabled: true, passed: false, reason: errs }
  } catch (err) {
    return { enabled: true, passed: false, reason: err?.message || 'verify_exception' }
  }
}
