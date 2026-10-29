/**
 * Native TAXIO Operator push.
 * Tokens are staging-only. Payloads carry booking and rescue ids, never passenger contact details.
 * The sender refuses to run unless SUPABASE_URL is the staging project.
 * Android delivery is recorded separately from the web/PWA outbox.
 */

const STAGING_HOST = 'lyjicuuyrvblbsqlduqg.supabase.co'
const PRODUCTION_HOST = 'gdiamipqrhxbmrcsnqdk.supabase.co'
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_RECEIPT_URL = 'https://exp.host/--/api/v2/push/getReceipts'

export const OPERATOR_CHANNEL_ID = 'taxio-offers-v2'
export const OPERATOR_SOUND = 'taxio_offer.wav'
const RECEIPT_WAIT_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 3

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
      channelId: OPERATOR_CHANNEL_ID,
      sound: OPERATOR_SOUND,
    })
  }
  return messages
}

export function interpretExpoPushTicket(ticket) {
  if (ticket?.status === 'ok' && ticket.id) {
    return { outcome: 'accepted', ticketId: String(ticket.id), revoke: false, retry: false, error: null }
  }
  const error = String(ticket?.details?.error || ticket?.message || 'TICKET_ERROR').slice(0, 180)
  return {
    outcome: 'error',
    ticketId: null,
    revoke: error === 'DeviceNotRegistered',
    retry: error === 'MessageRateExceeded',
    error,
  }
}

export function interpretExpoReceipt(receipt) {
  if (!receipt) return { outcome: 'pending', revoke: false, retry: false, error: null }
  if (receipt.status === 'ok') return { outcome: 'delivered', revoke: false, retry: false, error: null }
  const error = String(receipt.details?.error || receipt.message || 'RECEIPT_ERROR').slice(0, 180)
  return {
    outcome: 'error',
    revoke: error === 'DeviceNotRegistered',
    retry: error === 'MessageRateExceeded',
    error,
  }
}

export function shouldSendAndroidPush(row, now = Date.now()) {
  if (!row) return true
  const attempts = Number(row.attempt_count || 0)
  if (row.status === 'RECEIPT_OK' || row.status === 'REVOKED') return false
  if (row.status === 'SENT' && row.expo_ticket_id) {
    const updated = Date.parse(row.updated_at || '')
    if (Number.isFinite(updated) && now - updated < RECEIPT_WAIT_MS) return false
    return attempts < MAX_ATTEMPTS
  }
  if (row.status === 'FAILED') return attempts < MAX_ATTEMPTS
  return attempts < MAX_ATTEMPTS
}

function deliveryKey(content, token) {
  if (content?.outboxId) return `outbox:${content.outboxId}:${token}`
  if (content?.testKey) return `test:${content.testKey}:${token}`
  return ''
}

function missingTable(error) {
  return /operator_push_deliveries|operator_push_tokens|does not exist|42P01/i.test(error?.message || '')
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, payload }
}

async function revokeToken(admin, token) {
  const { error } = await admin
    .from('operator_push_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('expo_push_token', token)
    .is('revoked_at', null)
  return !error
}

async function saveDelivery(admin, row) {
  const { error } = await admin.from('operator_push_deliveries').upsert(row, { onConflict: 'delivery_key' })
  if (!error) return 'LOGGED'
  return missingTable(error) ? 'TABLE_MISSING' : 'LOG_FAILED'
}

async function collectReceipts(admin, companyId) {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data, error } = await admin
    .from('operator_push_deliveries')
    .select('delivery_key,expo_push_token,expo_ticket_id,attempt_count,status')
    .eq('company_id', companyId)
    .eq('status', 'SENT')
    .gte('updated_at', since)
    .limit(100)
  if (error) return { checked: 0, delivered: 0, revoked: 0, log: missingTable(error) ? 'TABLE_MISSING' : 'LOG_FAILED' }
  const rows = (data || []).filter(row => row.expo_ticket_id)
  if (!rows.length) return { checked: 0, delivered: 0, revoked: 0, log: 'LOGGED' }
  const response = await postJson(EXPO_RECEIPT_URL, { ids: rows.map(row => row.expo_ticket_id) })
  if (!response.ok) return { checked: rows.length, delivered: 0, revoked: 0, log: 'RECEIPT_HTTP_' + response.status }
  const receipts = response.payload?.data || {}
  let delivered = 0
  let revoked = 0
  for (const row of rows) {
    const verdict = interpretExpoReceipt(receipts[row.expo_ticket_id])
    if (verdict.outcome === 'pending') continue
    if (verdict.revoke) {
      await revokeToken(admin, row.expo_push_token)
      revoked += 1
    }
    if (verdict.outcome === 'delivered') delivered += 1
    await saveDelivery(admin, {
      delivery_key: row.delivery_key,
      company_id: companyId,
      expo_push_token: row.expo_push_token,
      expo_ticket_id: row.expo_ticket_id,
      attempt_count: row.attempt_count,
      status: verdict.outcome === 'delivered' ? 'RECEIPT_OK' : verdict.revoke ? 'REVOKED' : verdict.retry ? 'FAILED' : 'REVOKED',
      last_error: verdict.error,
      updated_at: new Date().toISOString(),
    })
  }
  return { checked: rows.length, delivered, revoked, log: 'LOGGED' }
}

export async function sendOperatorExpoPush(admin, content) {
  const gate = assertStagingPushTarget()
  if (!gate.ok) return { ...gate, sent: 0, failed: 0, revoked: 0, receipts: 0 }

  const companyId = String(content?.companyId || '').trim()
  if (!companyId) return { ok: false, code: 'COMPANY_REQUIRED', sent: 0, failed: 0, revoked: 0, receipts: 0 }

  const receipts = await collectReceipts(admin, companyId).catch(() => ({ checked: 0, delivered: 0, revoked: 0, log: 'RECEIPT_ERROR' }))

  const { data, error } = await admin
    .from('operator_push_tokens')
    .select('expo_push_token,revoked_at')
    .eq('company_id', companyId)
    .is('revoked_at', null)

  if (error) {
    const missing = /operator_push_tokens|does not exist|42P01/i.test(error.message || '')
    return { ok: false, code: missing ? 'TABLE_MISSING' : 'TOKEN_READ_FAILED', sent: 0, failed: 0, revoked: receipts.revoked || 0, receipts: receipts.delivered || 0 }
  }

  const messages = buildOperatorPushMessages(data || [], content)
  if (!messages.length) {
    return { ok: true, code: 'NO_DEVICES', sent: 0, failed: 0, revoked: receipts.revoked || 0, receipts: receipts.delivered || 0 }
  }

  const keys = messages.map(message => deliveryKey(content, message.to))
  const tracked = keys.every(Boolean)
  let prior = new Map()
  if (tracked) {
    const { data: existing, error: priorError } = await admin
      .from('operator_push_deliveries')
      .select('delivery_key,status,expo_ticket_id,attempt_count,updated_at')
      .in('delivery_key', keys)
    if (!priorError) prior = new Map((existing || []).map(row => [row.delivery_key, row]))
  }

  const now = Date.now()
  const pending = []
  for (let index = 0; index < messages.length; index += 1) {
    const key = keys[index]
    if (tracked && !shouldSendAndroidPush(prior.get(key), now)) continue
    pending.push({ message: messages[index], key, prior: prior.get(key) })
  }
  if (!pending.length) {
    return { ok: true, code: 'ALREADY_RECORDED', sent: 0, failed: 0, revoked: receipts.revoked || 0, receipts: receipts.delivered || 0 }
  }

  let sent = 0
  let failed = 0
  let revoked = receipts.revoked || 0
  let log = 'LOGGED'
  for (let offset = 0; offset < pending.length; offset += 100) {
    const batch = pending.slice(offset, offset + 100)
    const response = await postJson(EXPO_PUSH_URL, batch.map(item => item.message))
    if (!response.ok) {
      failed += batch.length
      for (const item of batch) {
        if (!item.key) continue
        const saved = await saveDelivery(admin, {
          delivery_key: item.key,
          company_id: companyId,
          outbox_id: content?.outboxId || null,
          test_key: content?.testKey || null,
          expo_push_token: item.message.to,
          status: 'FAILED',
          expo_ticket_id: null,
          attempt_count: Number(item.prior?.attempt_count || 0) + 1,
          last_error: 'EXPO_HTTP_' + response.status,
          updated_at: new Date().toISOString(),
        })
        if (saved !== 'LOGGED') log = saved
      }
      continue
    }
    const tickets = Array.isArray(response.payload?.data) ? response.payload.data : []
    for (let index = 0; index < batch.length; index += 1) {
      const item = batch[index]
      const verdict = interpretExpoPushTicket(tickets[index])
      if (verdict.outcome === 'accepted') sent += 1
      else failed += 1
      if (verdict.revoke) {
        await revokeToken(admin, item.message.to)
        revoked += 1
      }
      if (!item.key) continue
      const saved = await saveDelivery(admin, {
        delivery_key: item.key,
        company_id: companyId,
        outbox_id: content?.outboxId || null,
        test_key: content?.testKey || null,
        expo_push_token: item.message.to,
        status: verdict.outcome === 'accepted' ? 'SENT' : verdict.revoke ? 'REVOKED' : 'FAILED',
        expo_ticket_id: verdict.ticketId,
        attempt_count: Number(item.prior?.attempt_count || 0) + 1,
        last_error: verdict.error,
        updated_at: new Date().toISOString(),
      })
      if (saved !== 'LOGGED') log = saved
    }
  }

  const code = sent > 0 ? (log === 'LOGGED' ? 'SENT' : log) : failed > 0 ? 'FAILED' : 'NO_DEVICES'
  return {
    ok: sent > 0 || failed === 0,
    code,
    sent,
    failed,
    revoked,
    receipts: receipts.delivered || 0,
  }
}
