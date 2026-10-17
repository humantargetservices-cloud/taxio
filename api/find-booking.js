/**
 * Passenger booking recovery: booking_reference + phone → existing trip token.
 * Never mints a new token. Generic errors only. Rate-limited.
 */
import {
  getClientIp,
  json,
  makeSupabaseServiceClient,
  validateSupabaseServiceEnv,
} from './_utils.js'
import { tripUrlForToken } from './_passengerTrip.js'

const GENERIC_FAIL = {
  ok: false,
  code: 'NOT_FOUND',
  error: 'We could not find that booking. Check the reference and phone number.',
}

const RATE_LIMIT = 12
const RATE_WINDOW_MS = 15 * 60 * 1000

function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '')
}

function normalizePassengerPhoneE164(phone) {
  const raw = String(phone || '').trim()
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw
  const digits = normalizePhoneDigits(raw)
  if (digits.length >= 8 && digits.length <= 15 && /^[1-9]/.test(digits)) return `+${digits}`
  return ''
}

function normalizeBookingReference(ref) {
  return String(ref || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

function phonesMatch(stored, inputE164) {
  const a = normalizePhoneDigits(stored)
  const b = normalizePhoneDigits(inputE164)
  if (!a || !b) return false
  if (a === b) return true
  // Allow BE local 0… vs +32…
  const strip32 = (d) => (d.startsWith('32') && d.length > 9 ? d.slice(2) : d)
  const la = strip32(a.startsWith('0') ? `32${a.slice(1)}` : a)
  const lb = strip32(b.startsWith('0') ? `32${b.slice(1)}` : b)
  return la === lb || a.endsWith(lb) || b.endsWith(la)
}

async function countAbuseEvents(supabase, { action, sinceIso, ipAddress }) {
  let q = supabase
    .from('abuse_rate_events')
    .select('id', { count: 'exact', head: true })
    .eq('action', action)
    .gte('created_at', sinceIso)
  if (ipAddress) q = q.eq('ip_address', ipAddress)
  const { count, error } = await q
  if (error) throw error
  return count || 0
}

async function logAbuseEvent(supabase, row) {
  try {
    await supabase.from('abuse_rate_events').insert(row)
  } catch (err) {
    console.warn('[find-booking:abuse-log]', err?.message || err)
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (typeof res.status === 'function') return res.status(204).end()
    res.statusCode = 204
    return res.end()
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const envErr = validateSupabaseServiceEnv()
  if (envErr) return json(res, 503, { ok: false, error: envErr })

  const body =
    typeof req.body === 'string' && req.body
      ? JSON.parse(req.body)
      : req.body && typeof req.body === 'object'
        ? req.body
        : {}

  const bookingReference = normalizeBookingReference(
    body.booking_reference || body.bookingReference || body.reference
  )
  const phoneE164 = normalizePassengerPhoneE164(body.phone || body.customer_phone)
  const ipAddress = getClientIp(req)

  // Always require both fields before any DB lookup (no phone-only existence leak)
  if (!bookingReference || bookingReference.length < 4 || !phoneE164) {
    return json(res, 404, GENERIC_FAIL)
  }

  try {
    const supabase = makeSupabaseServiceClient()
    const sinceIso = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
    const recent = await countAbuseEvents(supabase, {
      action: 'passenger_find_booking',
      sinceIso,
      ipAddress,
    })
    if (recent >= RATE_LIMIT) {
      await logAbuseEvent(supabase, {
        action: 'passenger_find_booking',
        ip_address: ipAddress || null,
        contact_key: `ref:${bookingReference.slice(0, 12)}`,
        metadata: { blocked: true, reason: 'rate_limit' },
      })
      return json(res, 429, {
        ok: false,
        code: 'RATE_LIMIT',
        error: 'Too many attempts. Please try again later.',
      })
    }

    await logAbuseEvent(supabase, {
      action: 'passenger_find_booking',
      ip_address: ipAddress || null,
      contact_key: `ref:${bookingReference.slice(0, 12)}`,
      metadata: { attempted: true },
    })

    const { data: booking, error } = await supabase
      .from('booking_requests')
      .select('id, customer_phone, passenger_trip_token, booking_reference, status')
      .eq('booking_reference', bookingReference)
      .maybeSingle()

    if (error) {
      console.error('[find-booking]', error.message)
      return json(res, 404, GENERIC_FAIL)
    }

    if (!booking?.passenger_trip_token) {
      return json(res, 404, GENERIC_FAIL)
    }

    if (!phonesMatch(booking.customer_phone, phoneE164)) {
      return json(res, 404, GENERIC_FAIL)
    }

    const tripToken = String(booking.passenger_trip_token || '').trim()
    if (tripToken.length < 20) {
      return json(res, 404, GENERIC_FAIL)
    }

    return json(res, 200, {
      ok: true,
      trip_token: tripToken,
      trip_url: tripUrlForToken(req, tripToken),
      booking_reference: booking.booking_reference || bookingReference,
    })
  } catch (err) {
    console.error('[find-booking]', err?.message || err)
    return json(res, 404, GENERIC_FAIL)
  }
}
