/**
 * Shared helpers for company Web Push (subscribe + dispatch).
 * VAPID private key and webhook secret never leave the server.
 */
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'

export const PUSH_EVENT_TYPES = Object.freeze({
  COMPANY_BOOKING_NEW: 'COMPANY_BOOKING_NEW',
  RESCUE_OPPORTUNITY_NEW: 'RESCUE_OPPORTUNITY_NEW',
  PASSENGER_CONFIRMED: 'PASSENGER_CONFIRMED',
  PASSENGER_CANCELLED: 'PASSENGER_CANCELLED',
})

export function getVapidPublicKey() {
  return String(process.env.VAPID_PUBLIC_KEY || '').trim()
}

export function getVapidPrivateKey() {
  return String(process.env.VAPID_PRIVATE_KEY || '').trim()
}

export function getVapidSubject() {
  return String(process.env.VAPID_SUBJECT || '').trim() || 'mailto:humantargetservices@gmail.com'
}

export function getCompanyPushWebhookSecret() {
  return String(process.env.COMPANY_PUSH_WEBHOOK_SECRET || '').trim()
}

export function validateVapidEnv() {
  const missing = []
  if (!getVapidPublicKey()) missing.push('VAPID_PUBLIC_KEY')
  if (!getVapidPrivateKey()) missing.push('VAPID_PRIVATE_KEY')
  if (missing.length) {
    return `Server misconfiguration: missing ${missing.join(', ')}.`
  }
  return null
}

export function configureWebPush() {
  const err = validateVapidEnv()
  if (err) throw new Error(err)
  webpush.setVapidDetails(getVapidSubject(), getVapidPublicKey(), getVapidPrivateKey())
  return webpush
}

/** Timing-safe compare for webhook secrets. */
export function secretsEqual(a, b) {
  const x = String(a || '')
  const y = String(b || '')
  if (!x || !y || x.length !== y.length) return false
  let out = 0
  for (let i = 0; i < x.length; i++) out |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return out === 0
}

export function extractBearerToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || ''
  return String(authHeader).replace(/^Bearer\s+/i, '').trim()
}

export function extractPushWebhookSecret(req) {
  const hdr =
    req.headers?.['x-taxio-push-secret'] ||
    req.headers?.['X-Taxio-Push-Secret'] ||
    ''
  const fromHeader = String(hdr || '').trim()
  if (fromHeader) return fromHeader
  return extractBearerToken(req)
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
  const pickup = shortAddressLabel(ctx.pickup)
  const dropoff = shortAddressLabel(ctx.dropoff)
  const price = ctx.priceLabel || null
  const route = price ? `${pickup} → ${dropoff} · ${price}` : `${pickup} → ${dropoff}`

  switch (eventType) {
    case PUSH_EVENT_TYPES.COMPANY_BOOKING_NEW:
      return {
        title: 'New trip request',
        body: route,
        tag: `booking-${ctx.bookingId || 'new'}`,
        data: {
          url,
          event_type: eventType,
          booking_id: ctx.bookingId || null,
        },
      }
    case PUSH_EVENT_TYPES.RESCUE_OPPORTUNITY_NEW:
      return {
        title: 'New TAXIO Rescue trip',
        body: route,
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
        body: 'Your TAXIO trip is confirmed.',
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

export async function sendWebPushToSubscription(webpushApi, subscriptionRow, payloadObj) {
  const pushSubscription = {
    endpoint: subscriptionRow.endpoint,
    keys: {
      p256dh: subscriptionRow.p256dh,
      auth: subscriptionRow.auth,
    },
  }
  const body = JSON.stringify(payloadObj)
  await webpushApi.sendNotification(pushSubscription, body, {
    TTL: 60,
    urgency: 'high',
  })
}

export function isGonePushError(err) {
  const status = err?.statusCode || err?.status || 0
  return status === 404 || status === 410
}
