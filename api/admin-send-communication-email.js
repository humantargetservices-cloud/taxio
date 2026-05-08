import { ensurePlatformAdminFromBearer } from './_adminAuth.js'
import {
  json,
  makeSupabaseServiceClient,
  resolveAdminCommunicationMailFrom,
  safeSendEmail,
  validateSupabaseServiceEnv,
} from './_utils.js'

const MAX_RECIPIENTS = 50

/** Wait between outbound sends to stay under Resend (~5 req/s). */
const DELAY_MS_MIN = 300
const DELAY_MS_MAX = 500

/** Extra wait before a single retry after rate limiting. */
const RATE_LIMIT_RETRY_DELAY_MS = 850

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function delayBetweenRecipientsMs() {
  return DELAY_MS_MIN + Math.floor(Math.random() * (DELAY_MS_MAX - DELAY_MS_MIN + 1))
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

/** Detect Resend rate limit without leaking secrets (uses status + message heuristics). */
function isResendRateLimited(mail) {
  if (!mail || mail.ok === true || mail.skipped) return false
  if (mail.statusCode === 429) return true
  const msg = String(mail.error || '').toLowerCase()
  return msg.includes('too many requests') || msg.includes('rate limit')
}

function safeRecipientFailureMessage(mail) {
  const e = String(mail?.error || 'send_failed')
  if (/^(re_|sk_|pk_|rz_|Bearer\s+)/i.test(e.trim())) return 'send_failed'
  return e.length > 300 ? `${e.slice(0, 297)}...` : e
}

/**
 * POST /api/admin-send-communication-email
 * body:
 * {
 *   recipients: [{ email, subject?, message? }] | [email],
 *   subject: string,
 *   message: string
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const envErr = validateSupabaseServiceEnv()
  if (envErr) return json(res, 503, { error: envErr })

  try {
    const supabase = makeSupabaseServiceClient()
    const auth = await ensurePlatformAdminFromBearer(supabase, req.headers.authorization)
    if (!auth.ok) return json(res, 401, { error: auth.error })

    const body =
      typeof req.body === 'string' && req.body ? JSON.parse(req.body) : req.body || {}
    const recipientsRaw = Array.isArray(body.recipients) ? body.recipients : []
    const defaultSubject = String(body.subject || '').trim()
    const defaultMessage = String(body.message || '').trim()

    if (!recipientsRaw.length) {
      return json(res, 400, { error: 'recipients is required.' })
    }
    if (recipientsRaw.length > MAX_RECIPIENTS) {
      return json(res, 400, { error: `Too many recipients. Max ${MAX_RECIPIENTS}.` })
    }
    if (!defaultSubject) return json(res, 400, { error: 'subject is required.' })
    if (!defaultMessage) return json(res, 400, { error: 'message is required.' })

    const normalized = recipientsRaw.map((r, idx) => {
      if (typeof r === 'string') {
        return {
          idx,
          email: String(r || '').trim(),
          subject: defaultSubject,
          message: defaultMessage,
        }
      }
      return {
        idx,
        email: String(r?.email || '').trim(),
        subject: String(r?.subject || defaultSubject).trim(),
        message: String(r?.message || defaultMessage).trim(),
      }
    })

    const skipped = []
    const failed = []
    let sent = 0
    let retried = 0
    const commFrom = resolveAdminCommunicationMailFrom()

    let firstOutboundSend = true
    for (const row of normalized) {
      if (!row.email || !isValidEmail(row.email)) {
        skipped.push({ email: row.email || null, reason: 'invalid_email' })
        continue
      }
      if (!row.subject) {
        skipped.push({ email: row.email, reason: 'missing_subject' })
        continue
      }
      if (!row.message) {
        skipped.push({ email: row.email, reason: 'missing_message' })
        continue
      }

      const html = String(row.message)
        .split('\n')
        .map((line) => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
        .join('<br />')

      const payload = {
        from: commFrom,
        to: row.email,
        subject: row.subject,
        html: `<div>${html}</div>`,
      }

      if (!firstOutboundSend) await sleep(delayBetweenRecipientsMs())
      firstOutboundSend = false

      let mail = await safeSendEmail(payload)
      if (!mail?.ok && !mail?.skipped && isResendRateLimited(mail)) {
        await sleep(RATE_LIMIT_RETRY_DELAY_MS)
        retried += 1
        mail = await safeSendEmail(payload)
      }

      if (mail?.ok) {
        sent += 1
        continue
      }
      if (mail?.skipped) {
        skipped.push({ email: row.email, reason: mail.reason || 'mail_skipped' })
        continue
      }
      failed.push({ email: row.email, error: safeRecipientFailureMessage(mail) })
    }

    return json(res, 200, {
      ok: true,
      sent,
      skipped,
      failed,
      retried,
      maxRecipients: MAX_RECIPIENTS,
    })
  } catch (e) {
    console.error('[admin-send-communication-email]', e)
    return json(res, 500, { error: e?.message || 'Server error.' })
  }
}
