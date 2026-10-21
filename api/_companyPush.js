/**
 * Shared helpers for company Web Push (subscribe + dispatch).
 * VAPID private key and webhook secret never leave the server.
 */
import { timingSafeEqual } from 'node:crypto'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'

export const PUSH_EVENT_TYPES = Object.freeze({
  COMPANY_BOOKING_NEW: 'COMPANY_BOOKING_NEW',
  RESCUE_OPPORTUNITY_NEW: 'RESCUE_OPPORTUNITY_NEW',
  PASSENGER_CONFIRMED: 'PASSENGER_CONFIRMED',
  PASSENGER_CANCELLED: 'PASSENGER_CANCELLED',
})

/**
 * Normalize VAPID key material to URL-safe Base64 without "=" padding.
 * Does not change key bytes — only encoding form for web-push.
 */
export function normalizeVapidKeyBase64(raw) {
  let s = String(raw ?? '').trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
  }
  // Strip whitespace/newlines that env UIs sometimes inject
  s = s.replace(/\s+/g, '')
  s = s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  return s
}

function decodeVapidKeyBytes(urlSafeNoPad) {
  const s = String(urlSafeNoPad || '')
  const padLen = (4 - (s.length % 4)) % 4
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen)
  return Buffer.from(b64, 'base64')
}

const VAPID_URL_SAFE_RE = /^[A-Za-z0-9_-]+$/

/**
 * Inspect + normalize env VAPID keys. Never logs key values.
 * @returns {{
 *   ok: boolean,
 *   error?: string,
 *   publicRawLength: number,
 *   publicNormalizedLength: number,
 *   publicDecodedBytes: number,
 *   privateRawLength: number,
 *   privateNormalizedLength: number,
 *   privateDecodedBytes: number,
 *   publicNormalized: string,
 *   privateNormalized: string,
 * }}
 */
export function resolveNormalizedVapidKeys() {
  const publicRaw = String(process.env.VAPID_PUBLIC_KEY || '')
  const privateRaw = String(process.env.VAPID_PRIVATE_KEY || '')
  const publicNormalized = normalizeVapidKeyBase64(publicRaw)
  const privateNormalized = normalizeVapidKeyBase64(privateRaw)

  let publicDecodedBytes = 0
  let privateDecodedBytes = 0
  try {
    if (publicNormalized) publicDecodedBytes = decodeVapidKeyBytes(publicNormalized).length
  } catch {
    publicDecodedBytes = -1
  }
  try {
    if (privateNormalized) privateDecodedBytes = decodeVapidKeyBytes(privateNormalized).length
  } catch {
    privateDecodedBytes = -1
  }

  const report = {
    ok: false,
    publicRawLength: publicRaw.trim().length,
    publicNormalizedLength: publicNormalized.length,
    publicDecodedBytes,
    privateRawLength: privateRaw.trim().length,
    privateNormalizedLength: privateNormalized.length,
    privateDecodedBytes,
    publicNormalized,
    privateNormalized,
  }

  if (!publicNormalized || !privateNormalized) {
    report.error = 'VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY missing after normalize.'
    return report
  }
  if (!VAPID_URL_SAFE_RE.test(publicNormalized) || publicNormalized.includes('=')) {
    report.error = 'Normalized VAPID public key is not URL-safe Base64 without padding.'
    return report
  }
  if (!VAPID_URL_SAFE_RE.test(privateNormalized) || privateNormalized.includes('=')) {
    report.error = 'Normalized VAPID private key is not URL-safe Base64 without padding.'
    return report
  }
  if (publicDecodedBytes !== 65) {
    report.error = `Normalized VAPID public key must decode to 65 bytes (got ${publicDecodedBytes}).`
    return report
  }
  if (privateDecodedBytes !== 32) {
    report.error = `Normalized VAPID private key must decode to 32 bytes (got ${privateDecodedBytes}).`
    return report
  }

  report.ok = true
  return report
}

/** Normalized public key for browser subscribe + web-push. */
export function getVapidPublicKey() {
  return normalizeVapidKeyBase64(process.env.VAPID_PUBLIC_KEY)
}

/** Normalized private key for web-push only. */
export function getVapidPrivateKey() {
  return normalizeVapidKeyBase64(process.env.VAPID_PRIVATE_KEY)
}

export function getVapidSubject() {
  return String(process.env.VAPID_SUBJECT || '').trim() || 'mailto:humantargetservices@gmail.com'
}

export function getCompanyPushWebhookSecret() {
  return String(process.env.COMPANY_PUSH_WEBHOOK_SECRET || '').trim()
}

/** Staging/public App ID — same as client VITE_ONESIGNAL_APP_ID (not a secret). */
export function getOneSignalAppIdServer() {
  return String(process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID || '').trim()
}

/** Server-only OneSignal REST API key — never send to the browser. */
export function getOneSignalRestApiKey() {
  return String(process.env.ONESIGNAL_REST_API_KEY || '').trim()
}

export function validateOneSignalServerEnv() {
  if (!getOneSignalAppIdServer()) {
    return 'VITE_ONESIGNAL_APP_ID is not configured.'
  }
  if (!getOneSignalRestApiKey()) {
    return 'ONESIGNAL_REST_API_KEY is not configured.'
  }
  return null
}

/** Matches client OneSignal.login("company:<company_id>"). */
export function companyOneSignalExternalId(companyId) {
  return `company:${String(companyId || '').trim()}`
}

export function pushTtlSecondsForEvent(eventType) {
  if (
    eventType === PUSH_EVENT_TYPES.COMPANY_BOOKING_NEW ||
    eventType === PUSH_EVENT_TYPES.RESCUE_OPPORTUNITY_NEW
  ) {
    return 30
  }
  return 60
}

export function publicAppOrigin() {
  const raw = String(process.env.PUBLIC_APP_ORIGIN || '').trim().replace(/\/$/, '')
  // Apex redirects to www. Push click URLs must be the same origin as the service worker.
  return raw || 'https://www.taxio.be'
}

/** Absolute dashboard launch URL for OneSignal web push. */
export function absoluteDashboardLaunchUrl(urlQuery = '') {
  const origin = publicAppOrigin()
  const q = String(urlQuery || '').replace(/^\?/, '')
  return q ? `${origin}/dashboard/company?${q}` : `${origin}/dashboard/company`
}

function scrubOneSignalErrorText(text) {
  return String(text || '')
    .replace(/Key\s+[^\s"']+/gi, 'Key [redacted]')
    .replace(/ONESIGNAL_REST_API_KEY[^\s]*/gi, 'ONESIGNAL_REST_API_KEY=[redacted]')
    .slice(0, 240)
}

/**
 * Map a OneSignal Create Notification response to SENT or FAILED.
 * recipients === 0 is a failed delivery even when an id is present.
 * A successful body that omits recipients stays SENT so older responses still count.
 *
 * @returns {{ ok: boolean, code: string, error?: string }}
 */
export function oneSignalSendOutcome({ httpOk, notificationId, recipients, errorDetail } = {}) {
  if (!httpOk) {
    return {
      ok: false,
      code: 'ONESIGNAL_HTTP',
      error: errorDetail || 'onesignal_http_error',
    }
  }
  const id = notificationId ? String(notificationId).trim() : ''
  if (!id) {
    return {
      ok: false,
      code: 'ONESIGNAL_NO_RECIPIENTS',
      error: errorDetail || 'onesignal_no_notification_id',
    }
  }
  if (recipients === 0) {
    return { ok: false, code: 'ONESIGNAL_NO_RECIPIENTS', error: 'onesignal_no_recipients' }
  }
  if (recipients == null || recipients > 0) {
    return { ok: true, code: 'SENT' }
  }
  return { ok: false, code: 'ONESIGNAL_NO_RECIPIENTS', error: 'onesignal_no_recipients' }
}

/**
 * Send push via OneSignal REST Create Notification API.
 * Targets External ID company:<company_id> — not company_push_subscriptions.
 *
 * @returns {Promise<{ ok: true, notificationId: string|null, recipients: number|null, externalId: string }>}
 */
export async function sendOneSignalPushToCompany({ companyId, eventType, content }) {
  const appId = getOneSignalAppIdServer()
  const apiKey = getOneSignalRestApiKey()
  if (!appId || !apiKey) {
    throw Object.assign(new Error('OneSignal server env missing'), { code: 'ONESIGNAL_ENV' })
  }

  const externalId = companyOneSignalExternalId(companyId)
  if (!companyId || externalId === 'company:') {
    throw Object.assign(new Error('missing_company_id'), { code: 'NO_COMPANY' })
  }

  const launchUrl = absoluteDashboardLaunchUrl(content?.data?.urlQuery || content?.urlQuery || '')
  // Prefer path from content.data.url when relative; else absolute dashboard
  let url = launchUrl
  const dataUrl = content?.data?.url
  if (typeof dataUrl === 'string' && dataUrl.startsWith('/')) {
    url = `${publicAppOrigin()}${dataUrl}`
  } else if (typeof dataUrl === 'string' && /^https?:\/\//i.test(dataUrl)) {
    url = dataUrl
  }

  const ttl = pushTtlSecondsForEvent(eventType)
  const payload = {
    app_id: appId,
    target_channel: 'push',
    include_aliases: {
      external_id: [externalId],
    },
    headings: { en: String(content?.title || 'TAXIO').slice(0, 80) },
    contents: { en: String(content?.body || 'Open TAXIO for trip updates.').slice(0, 160) },
    url,
    ttl,
    // High priority where the browser supports it. Web Push uses the device
    // default sound; there is no custom ringtone on this channel.
    priority: 10,
    chrome_web_icon: `${publicAppOrigin()}/taxio-logo.png`,
    firefox_icon: `${publicAppOrigin()}/taxio-logo.png`,
  }
  if (content?.tag) {
    payload.collapse_id = String(content.tag).slice(0, 64)
  }

  // Hard guard: never ship passenger PII
  const data = content?.data && typeof content.data === 'object' ? { ...content.data } : {}
  delete data.customer_phone
  delete data.customer_name
  delete data.passenger_phone
  delete data.passenger_name
  if (Object.keys(data).length) payload.data = data

  const res = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  })

  const rawText = await res.text().catch(() => '')
  let parsed = {}
  try {
    parsed = rawText ? JSON.parse(rawText) : {}
  } catch {
    parsed = {}
  }

  const notificationId = parsed?.id ? String(parsed.id) : null
  const recipients =
    parsed?.recipients != null && Number.isFinite(Number(parsed.recipients))
      ? Number(parsed.recipients)
      : null
  const errorDetail =
    (Array.isArray(parsed?.errors) && parsed.errors[0]) ||
    parsed?.error ||
    (!res.ok ? `onesignal_http_${res.status}` : '')
  const outcome = oneSignalSendOutcome({
    httpOk: res.ok,
    notificationId,
    recipients,
    errorDetail,
  })

  if (!outcome.ok) {
    const err = new Error(scrubOneSignalErrorText(outcome.error))
    err.statusCode = res.ok ? 200 : res.status
    err.code = outcome.code
    throw err
  }

  console.info('[company-push] OneSignal accepted', {
    notificationId,
    recipients,
    externalId,
    eventType,
    ttl,
    httpStatus: res.status,
  })

  return { ok: true, notificationId, recipients, externalId }
}

export function validateVapidEnv() {
  const resolved = resolveNormalizedVapidKeys()
  if (!resolved.ok) {
    console.error('[company-push] VAPID validation failed', {
      publicRawLength: resolved.publicRawLength,
      publicNormalizedLength: resolved.publicNormalizedLength,
      publicDecodedBytes: resolved.publicDecodedBytes,
      privateRawLength: resolved.privateRawLength,
      privateNormalizedLength: resolved.privateNormalizedLength,
      privateDecodedBytes: resolved.privateDecodedBytes,
      error: resolved.error,
    })
    return resolved.error || 'Invalid VAPID configuration.'
  }
  return null
}

export function configureWebPush() {
  const resolved = resolveNormalizedVapidKeys()
  if (!resolved.ok) {
    console.error('[company-push] VAPID validation failed', {
      publicRawLength: resolved.publicRawLength,
      publicNormalizedLength: resolved.publicNormalizedLength,
      publicDecodedBytes: resolved.publicDecodedBytes,
      privateRawLength: resolved.privateRawLength,
      privateNormalizedLength: resolved.privateNormalizedLength,
      privateDecodedBytes: resolved.privateDecodedBytes,
      error: resolved.error,
    })
    throw new Error(resolved.error || 'Invalid VAPID configuration.')
  }
  console.info('[company-push] VAPID normalized OK', {
    publicRawLength: resolved.publicRawLength,
    publicNormalizedLength: resolved.publicNormalizedLength,
    publicDecodedBytes: resolved.publicDecodedBytes,
    privateRawLength: resolved.privateRawLength,
    privateNormalizedLength: resolved.privateNormalizedLength,
    privateDecodedBytes: resolved.privateDecodedBytes,
  })
  webpush.setVapidDetails(
    getVapidSubject(),
    resolved.publicNormalized,
    resolved.privateNormalized
  )
  return webpush
}

/** Timing-safe compare for webhook secrets. */
export function secretsEqual(a, b) {
  const x = String(a || '')
  const y = String(b || '')
  if (!x || !y || x.length !== y.length) return false
  try {
    return timingSafeEqual(Buffer.from(x, 'utf8'), Buffer.from(y, 'utf8'))
  } catch {
    let out = 0
    for (let i = 0; i < x.length; i++) out |= x.charCodeAt(i) ^ y.charCodeAt(i)
    return out === 0
  }
}

export function extractBearerToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || ''
  return String(authHeader).replace(/^Bearer\s+/i, '').trim()
}

/**
 * Webhook / manual dispatch secret.
 * Preferred header: x-taxio-push-secret
 * Fallback: Authorization Bearer (manual staging scripts only).
 * Never accepted from URL query parameters.
 */
export function extractPushWebhookSecret(req) {
  const hdr =
    req.headers?.['x-taxio-push-secret'] ||
    req.headers?.['X-Taxio-Push-Secret'] ||
    ''
  const fromHeader = String(hdr || '').trim()
  if (fromHeader) return fromHeader
  return extractBearerToken(req)
}

/**
 * Resolve outbox lookup keys from manual body OR Supabase Database Webhook envelope.
 * Does not trust company_id / event_type from the payload for dispatch.
 *
 * Supported shapes:
 * - { outbox_id } / { dedupe_key }
 * - { record: { id, dedupe_key } }  (Supabase DB webhook INSERT)
 * - { payload: { record: { id, dedupe_key } } }
 * - { type, table, record } (full webhook envelope)
 *
 * @returns {{ outboxId: string, dedupeKey: string }}
 */
export function resolveOutboxLookupFromBody(body) {
  const b = body && typeof body === 'object' ? body : {}
  const record =
    (b.record && typeof b.record === 'object' ? b.record : null) ||
    (b.payload?.record && typeof b.payload.record === 'object' ? b.payload.record : null) ||
    (b.data?.record && typeof b.data.record === 'object' ? b.data.record : null) ||
    null

  const outboxId = String(
    b.outbox_id || b.outboxId || record?.id || (record ? '' : b.id) || ''
  ).trim()
  const dedupeKey = String(
    b.dedupe_key || b.dedupeKey || record?.dedupe_key || record?.dedupeKey || ''
  ).trim()

  return { outboxId, dedupeKey }
}

export function makeUserClient(token) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function getBearerUser(token) {
  const msg = validateSupabaseServiceEnv()
  if (msg) throw new Error(msg)
  const admin = makeSupabaseServiceClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

/**
 * Resolve the caller's company from JWT membership (never trust client company_id).
 * Same preference order as dashboard getCompanyForUser.
 */
export async function resolveCompanyIdForUser(admin, userId) {
  if (!userId) return null

  const { data: owned } = await admin
    .from('companies')
    .select('id, status, created_at, owner_user_id')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false })

  const { data: memberships } = await admin
    .from('company_members')
    .select('company_id, company:companies(id, status, created_at)')
    .eq('user_id', userId)

  const candidates = []
  const seen = new Set()
  for (const c of owned || []) {
    if (!c?.id || seen.has(c.id)) continue
    seen.add(c.id)
    candidates.push(c)
  }
  for (const m of memberships || []) {
    let c = m.company
    if (Array.isArray(c)) c = c[0]
    if (!c?.id || seen.has(c.id)) continue
    seen.add(c.id)
    candidates.push(c)
  }
  if (!candidates.length) return null

  const statusRank = (s) =>
    s === 'approved' ? 0 : s === 'suspended' ? 1 : s === 'pending' ? 2 : s === 'rejected' ? 3 : 4

  candidates.sort((a, b) => {
    const d = statusRank(a.status) - statusRank(b.status)
    if (d !== 0) return d
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })

  return candidates[0].id
}

/** Short lock-screen-safe address label (no house-level PII needed). */
export function shortAddressLabel(address) {
  const s = String(address || '').trim()
  if (!s) return '—'
  const parts = s.split(/\s*,\s*/)
  if (parts.length >= 2) return parts[parts.length - 1].trim().slice(0, 48) || '—'
  return s.slice(0, 48)
}

export function formatPriceLabel(amount, currency = 'EUR', fallbackText = null) {
  if (fallbackText) {
    const cleaned = String(fallbackText).trim()
    if (cleaned) return cleaned.replace(/â‚¬/g, '€').slice(0, 24)
  }
  if (amount == null || amount === '' || Number.isNaN(Number(amount))) return null
  const n = Number(amount)
  const amt = Number.isInteger(n) ? String(n) : String(n)
  const cur = String(currency || 'EUR').trim().toUpperCase() || 'EUR'
  if (cur === 'EUR') return `€${amt}`
  return `${amt} ${cur}`
}

export function dashboardDeepLink(extraQuery = '') {
  const q = String(extraQuery || '').replace(/^\?/, '')
  return q ? `/dashboard/company?${q}` : '/dashboard/company'
}

/**
 * Build OS notification payload (no passenger phone/name).
 * @returns {{ title: string, body: string, tag: string, data: object }}
 */
export function buildPushNotificationContent(eventType, ctx = {}) {
  const url = dashboardDeepLink(ctx.urlQuery || '')

  switch (eventType) {
    case PUSH_EVENT_TYPES.COMPANY_BOOKING_NEW:
      return {
        title: 'New trip request',
        body: 'New trip request — respond within 30 seconds.',
        tag: `booking-${ctx.bookingId || 'new'}`,
        data: {
          url,
          event_type: eventType,
          booking_id: ctx.bookingId || null,
        },
      }
    case PUSH_EVENT_TYPES.RESCUE_OPPORTUNITY_NEW:
      return {
        title: 'New trip request',
        body: 'New trip request — respond within 30 seconds.',
        tag: `rescue-opp-${ctx.opportunityId || ctx.rescueRequestId || 'new'}`,
        data: {
          url,
          event_type: eventType,
          rescue_request_id: ctx.rescueRequestId || null,
          rescue_opportunity_id: ctx.opportunityId || null,
        },
      }
    case PUSH_EVENT_TYPES.PASSENGER_CONFIRMED:
      return {
        title: 'Passenger confirmed',
        body: 'Your trip has been confirmed.',
        tag: `rescue-confirmed-${ctx.rescueRequestId || 'x'}`,
        data: {
          url,
          event_type: eventType,
          rescue_request_id: ctx.rescueRequestId || null,
        },
      }
    case PUSH_EVENT_TYPES.PASSENGER_CANCELLED:
      return {
        title: 'Trip cancelled',
        body: 'The passenger cancelled the trip.',
        tag: `rescue-cancelled-${ctx.rescueRequestId || 'x'}`,
        data: {
          url,
          event_type: eventType,
          rescue_request_id: ctx.rescueRequestId || null,
        },
      }
    default:
      return {
        title: 'TAXIO',
        body: 'Open TAXIO for trip updates.',
        tag: 'taxio-generic',
        data: { url: '/dashboard/company', event_type: eventType || null },
      }
  }
}

/** Load safe display fields for an outbox row (identifiers → labels only). */
export async function loadSafePushContext(admin, outbox) {
  const eventType = outbox.event_type
  const ctx = {
    bookingId: outbox.booking_id || null,
    rescueRequestId: outbox.rescue_request_id || null,
    opportunityId: outbox.rescue_opportunity_id || null,
  }

  if (eventType === PUSH_EVENT_TYPES.COMPANY_BOOKING_NEW && outbox.booking_id) {
    const { data: b } = await admin
      .from('booking_requests')
      .select('id, pickup_address, dropoff_address, estimated_price_eur, price_currency')
      .eq('id', outbox.booking_id)
      .maybeSingle()
    if (b) {
      ctx.pickup = b.pickup_address
      ctx.dropoff = b.dropoff_address
      ctx.priceLabel = formatPriceLabel(b.estimated_price_eur, b.price_currency)
      ctx.urlQuery = `booking=${b.id}`
    }
    return ctx
  }

  if (eventType === PUSH_EVENT_TYPES.RESCUE_OPPORTUNITY_NEW) {
    let rescueId = outbox.rescue_request_id
    if (!rescueId && outbox.rescue_opportunity_id) {
      const { data: opp } = await admin
        .from('rescue_opportunities')
        .select('id, rescue_request_id')
        .eq('id', outbox.rescue_opportunity_id)
        .maybeSingle()
      rescueId = opp?.rescue_request_id || null
      ctx.opportunityId = opp?.id || outbox.rescue_opportunity_id
    }
    if (rescueId) {
      const { data: r } = await admin
        .from('rescue_requests')
        .select(
          'id, preview_pickup_label, preview_dropoff_label, preview_estimated_price, booking_request_id'
        )
        .eq('id', rescueId)
        .maybeSingle()
      if (r) {
        ctx.rescueRequestId = r.id
        ctx.pickup = r.preview_pickup_label
        ctx.dropoff = r.preview_dropoff_label
        ctx.priceLabel = formatPriceLabel(null, 'EUR', r.preview_estimated_price)
        ctx.urlQuery = `rescue=${r.id}`
      }
    }
    return ctx
  }

  if (
    eventType === PUSH_EVENT_TYPES.PASSENGER_CONFIRMED ||
    eventType === PUSH_EVENT_TYPES.PASSENGER_CANCELLED
  ) {
    if (outbox.rescue_request_id) {
      ctx.rescueRequestId = outbox.rescue_request_id
      ctx.urlQuery = `rescue=${outbox.rescue_request_id}`
    }
    return ctx
  }

  return ctx
}

/**
 * @param {import('web-push')} webpushApi
 * @param {object} subscriptionRow
 * @param {object} payloadObj
 * @param {{ eventType?: string }} [opts]
 */
export async function sendWebPushToSubscription(webpushApi, subscriptionRow, payloadObj, opts = {}) {
  const pushSubscription = {
    endpoint: subscriptionRow.endpoint,
    keys: {
      p256dh: subscriptionRow.p256dh,
      auth: subscriptionRow.auth,
    },
  }
  const body = JSON.stringify(payloadObj)
  const eventType = String(opts.eventType || payloadObj?.event_type || '')
  // Opportunity windows are 25s/30s — do not keep stale trip alerts useful after expiry.
  const isTimedOpportunity =
    eventType === PUSH_EVENT_TYPES.COMPANY_BOOKING_NEW ||
    eventType === PUSH_EVENT_TYPES.RESCUE_OPPORTUNITY_NEW
  await webpushApi.sendNotification(pushSubscription, body, {
    TTL: isTimedOpportunity ? 30 : 60,
    urgency: 'high',
  })
}

export function isGonePushError(err) {
  const status = err?.statusCode || err?.status || 0
  return status === 404 || status === 410
}
