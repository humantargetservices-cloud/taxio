/**
 * Native TAXIO Operator push.
 * Tokens are staging-only. Payloads carry booking and rescue ids, never passenger contact details.
 * The sender refuses to run unless SUPABASE_URL is the staging project.
 */

const STAGING_HOST = 'lyjicuuyrvblbsqlduqg.supabase.co'
const PRODUCTION_HOST = 'gdiamipqrhxbmrcsnqdk.supabase.co'
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

const BLOCKED_DATA_KEYS = [
  'customer_phone',
  'customer_name',
  'passenger_phone',
  'passenger_name',
  'phone',
  'email',
]

export function stagingPushHost() {
  const raw = String(process.env.SUPABASE_URL || '').trim()
  try {
    return new URL(raw).host
  } catch {
    return ''
  }
}

export function assertStagingPushTarget() {
  const host = stagingPushHost()
  if (host === PRODUCTION_HOST) {
    return { ok: false, code: 'PRODUCTION_REFUSED' }
  }
  if (host !== STAGING_HOST) {
    return { ok: false, code: 'NOT_STAGING' }
  }
  return { ok: true, code: 'STAGING' }
}

export function buildOperatorPushMessages(tokens, content) {
  const data = {}
  const source = content?.data && typeof content.data === 'object' ? content.data : {}
  for (const [key, value] of Object.entries(source)) {
    if (BLOCKED_DATA_KEYS.includes(String(key).toLowerCase())) continue
    if (value == null || value === '') continue
    data[key] = value
  }
  if (content?.bookingId) data.booking_id = content.bookingId
  if (content?.rescueRequestId) data.rescue_request_id = content.rescueRequestId
  if (content?.eventType) data.event_type = content.eventType

  const seen = new Set()
  const messages = []
  for (const token of tokens || []) {
    if (!token || token.revoked_at) continue
    const to = String(token.expo_push_token || '').trim()
    if (!to.startsWith('ExponentPushToken[') && !to.startsWith('ExpoPushToken[')) continue
    if (seen.has(to)) continue
    seen.add(to)
    messages.push({
      to,
      title: String(content?.title || 'TAXIO').slice(0, 80),
      body: String(content?.body || 'Open TAXIO Operator').slice(0, 180),
      data,
      priority: 'high',
      channelId: 'taxio-offers',
      sound: 'default',
    })
  }
  return messages
}

export async function sendOperatorExpoPush(admin, content) {
  const gate = assertStagingPushTarget()
  if (!gate.ok) return { ...gate, sent: 0 }

  const companyId = String(content?.companyId || '').trim()
  if (!companyId) return { ok: false, code: 'COMPANY_REQUIRED', sent: 0 }

  const { data, error } = await admin
    .from('operator_push_tokens')
    .select('expo_push_token,revoked_at')
    .eq('company_id', companyId)
    .is('revoked_at', null)

  if (error) {
    const missing = /operator_push_tokens|does not exist|42P01/i.test(error.message || '')
    return { ok: false, code: missing ? 'TABLE_MISSING' : 'TOKEN_READ_FAILED', sent: 0 }
  }

  const messages = buildOperatorPushMessages(data || [], content)
  if (!messages.length) return { ok: true, code: 'NO_DEVICES', sent: 0 }

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  })
  if (!response.ok) return { ok: false, code: 'EXPO_HTTP_' + response.status, sent: 0 }
  return { ok: true, code: 'SENT', sent: messages.length }
}
