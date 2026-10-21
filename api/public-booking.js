import {
  getClientIp,
  getUserAgent,
  json,
  makeSupabaseServiceClient,
  verifyTurnstileToken,
  validateSupabaseServiceEnv,
} from './_utils.js'
import { generateBookingReference } from './_bookingReference.js'
import { mintPassengerTripToken, tripUrlForToken } from './_passengerTrip.js'
import { normalizePassengerLocale } from './_passengerLocale.js'
import { draftPriceWrite, resolveStandardBookingPrice } from './_bookingPrice.js'

const MAX_NOTES_LEN = 500
const VEHICLE_TYPE_ORDER = ['Standard', 'Van', 'Luxury']
/** Allow tiny clock skew between client and server (Belgium trip-local → ISO). */
const PAST_RIDE_SKEW_MS = 60_000
const PAST_RIDE_ERROR = 'Please choose a future pickup time.'
const PRICE_UNAVAILABLE_ERROR =
  "We couldn't calculate this trip price. Please check the addresses and try again."

function isRideDatetimeInPast(iso) {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return true
  return t < Date.now() - PAST_RIDE_SKEW_MS
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '')
}

/** Prefer E.164 (+…). Accept legacy digit-only by prefixing +. */
function normalizePassengerPhoneE164(phone) {
  const raw = String(phone || '').trim()
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw
  const digits = normalizePhoneDigits(raw)
  if (digits.length >= 8 && digits.length <= 15 && /^[1-9]/.test(digits)) return `+${digits}`
  return ''
}

function normalizeAddress(a) {
  return String(a || '')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeVehicleType(value) {
  const s = String(value || '').trim().toLowerCase()
  if (s === 'standard' || s.includes('standard')) return 'Standard'
  if (s === 'van' || s.includes('van')) return 'Van'
  if (s === 'luxury' || s.includes('lux')) return 'Luxury'
  return null
}

function pricingRowForType(pricing, typeName) {
  const p = pricing && typeof pricing === 'object' ? pricing : {}
  const direct = p[typeName]
  if (direct && typeof direct === 'object') return direct
  const wanted = normalizeVehicleType(typeName)
  for (const [key, row] of Object.entries(p)) {
    if (normalizeVehicleType(key) === wanted && row && typeof row === 'object') return row
  }
  return null
}

function hasExplicitVehicleTypeConfig(rawPricing) {
  return VEHICLE_TYPE_ORDER.some((typeName) =>
    Object.prototype.hasOwnProperty.call(pricingRowForType(rawPricing, typeName) || {}, 'enabled')
  )
}

function enabledVehicleTypes(rawPricing) {
  return VEHICLE_TYPE_ORDER.filter((typeName) => pricingRowForType(rawPricing, typeName)?.enabled === true)
}

function resolveEnabledVehicleTypes(rawPricing) {
  // Same source-of-truth rule as src/lib/bookingCarTypes.js:
  // { luxury: { enabled: true } } => Luxury only; van+luxury => Van + Luxury; {} or none enabled => Standard fallback.
  if (!hasExplicitVehicleTypeConfig(rawPricing)) return ['Standard']
  const enabledTypes = enabledVehicleTypes(rawPricing)
  return enabledTypes.length > 0 ? enabledTypes : ['Standard']
}

function missingColumn(err, column) {
  return String(err?.message || '')
    .toLowerCase()
    .includes(String(column || '').toLowerCase())
}

async function countAbuseEvents(supabase, { action, sinceIso, ipAddress, companyId, contactKey }) {
  let q = supabase
    .from('abuse_rate_events')
    .select('id', { count: 'exact', head: true })
    .eq('action', action)
    .gte('created_at', sinceIso)
  if (ipAddress) q = q.eq('ip_address', ipAddress)
  if (companyId) q = q.eq('company_id', companyId)
  if (contactKey) q = q.eq('contact_key', contactKey)
  const { count, error } = await q
  if (error) throw error
  return count || 0
}

async function logAbuseEvent(supabase, row) {
  const { error } = await supabase.from('abuse_rate_events').insert(row)
  if (error) throw error
}

async function logBlockedBooking(supabase, { ipAddress, companyId, contactKey, reason, extra = {} }) {
  try {
    await logAbuseEvent(supabase, {
      action: 'rider_booking_blocked',
      ip_address: ipAddress || null,
      company_id: companyId || null,
      contact_key: contactKey || null,
      metadata: { reason, ...extra },
    })
  } catch (err) {
    console.error('[public-booking:blocked-log]', err)
  }
}

async function activateDraftBooking(req, res, body) {
  const bookingId = String(body.booking_id || '').trim()
  const companyId = String(body.company_id || '').trim()
  const riderPhoneE164 = normalizePassengerPhoneE164(body.customer_phone)
  const riderName = String(body.customer_name || body.passenger_name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80)
  const notesRaw = String(body.notes || '')
  const notes = notesRaw.slice(0, MAX_NOTES_LEN)
  const ipAddress = getClientIp(req)
  const userAgent = getUserAgent(req)

  if (!bookingId || !companyId) {
    return json(res, 400, { error: 'Missing booking fields.' })
  }
  if (!riderPhoneE164) {
    return json(res, 400, { error: 'Invalid mobile number.' })
  }
  if (!riderName || riderName.length < 2) {
    return json(res, 400, { error: 'Please enter a name for pickup.' })
  }

  const supabase = makeSupabaseServiceClient()
  const { data: existing, error: loadErr } = await supabase
    .from('booking_requests')
    .select(
      'id, company_id, status, booking_reference, decision_deadline_at, passenger_trip_token, ride_datetime'
    )
    .eq('id', bookingId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (loadErr) {
    // Column may be missing before RUN_ON_STAGING_PASSENGER_TRIP_TOKEN.sql
    if (/passenger_trip_token|schema cache|column/i.test(loadErr.message || '')) {
      const { data: existingFallback, error: load2 } = await supabase
        .from('booking_requests')
        .select('id, company_id, status, booking_reference, decision_deadline_at, ride_datetime')
        .eq('id', bookingId)
        .eq('company_id', companyId)
        .maybeSingle()
      if (load2) {
        console.error('[public-booking:activate-load]', load2)
        return json(res, 500, { error: 'Could not activate booking.' })
      }
      if (!existingFallback) return json(res, 404, { error: 'Booking draft not found.' })
      console.error(
        '[public-booking:activate] passenger_trip_token column missing — apply supabase/RUN_ON_STAGING_PASSENGER_TRIP_TOKEN.sql'
      )
      return json(res, 503, {
        error: 'Trip page is not ready on this environment. Please try again shortly.',
        code: 'TRIP_TOKEN_COLUMN_MISSING',
      })
    }
    console.error('[public-booking:activate-load]', loadErr)
    return json(res, 500, { error: 'Could not activate booking.' })
  }
  if (!existing) {
    return json(res, 404, { error: 'Booking draft not found.' })
  }

  // Authoritative: scheduled/hourly drafts must not activate with a past pickup time.
  if (existing.ride_datetime && isRideDatetimeInPast(existing.ride_datetime)) {
    return json(res, 400, { error: PAST_RIDE_ERROR, code: 'PAST_RIDE_DATETIME' })
  }

  const respondActivated = (row, already) => {
    let tripToken = String(row.passenger_trip_token || '').trim()
    return (async () => {
      if (!tripToken) {
        tripToken = mintPassengerTripToken()
        const { error: tokErr } = await supabase
          .from('booking_requests')
          .update({ passenger_trip_token: tripToken })
          .eq('id', row.id)
          .is('passenger_trip_token', null)
        if (tokErr) {
          const { data: again } = await supabase
            .from('booking_requests')
            .select('passenger_trip_token')
            .eq('id', row.id)
            .maybeSingle()
          tripToken = String(again?.passenger_trip_token || '').trim()
        }
      }
      if (!tripToken) {
        return json(res, 500, { error: 'Could not create trip link.' })
      }
      return json(res, 200, {
        data: {
          ok: true,
          id: row.id,
          booking_reference: row.booking_reference || null,
          activated: true,
          already: !!already,
          passenger_trip_token: tripToken,
          trip_token: tripToken,
          trip_url: tripUrlForToken(req, tripToken),
        },
      })
    })()
  }

  // Already activated — idempotent success (prevents duplicate bookings on re-tap).
  if (String(existing.status || '') === 'new') {
    return respondActivated(existing, true)
  }

  if (String(existing.status || '') !== 'draft') {
    return json(res, 409, { error: 'Booking is no longer a draft.' })
  }

  let decisionSeconds = 25
  try {
    const { data: secs } = await supabase.rpc('taxio_rescue_decision_seconds')
    const n = Number(secs)
    if (Number.isFinite(n) && n > 0 && n <= 120) decisionSeconds = n
  } catch {
    /* keep default 25s */
  }

  const tripToken = mintPassengerTripToken()
  const deadlineIso = new Date(Date.now() + decisionSeconds * 1000).toISOString()
  const passengerLocale = normalizePassengerLocale(
    body.passenger_locale || body.locale || body.language
  )
  const patch = {
    status: 'new',
    customer_phone: riderPhoneE164,
    customer_name: riderName,
    decision_deadline_at: deadlineIso,
    passenger_trip_token: tripToken,
    passenger_locale: passengerLocale,
  }
  if (notes) patch.notes = notes

  let updated = null
  let updErr = null
  ;({ data: updated, error: updErr } = await supabase
    .from('booking_requests')
    .update(patch)
    .eq('id', bookingId)
    .eq('company_id', companyId)
    .eq('status', 'draft')
    .select('id, booking_reference, passenger_trip_token')
    .maybeSingle())

  if (updErr && missingColumn(updErr, 'passenger_locale')) {
    const { passenger_locale: _drop, ...withoutLocale } = patch
    ;({ data: updated, error: updErr } = await supabase
      .from('booking_requests')
      .update(withoutLocale)
      .eq('id', bookingId)
      .eq('company_id', companyId)
      .eq('status', 'draft')
      .select('id, booking_reference, passenger_trip_token')
      .maybeSingle())
  }

  if (updErr) {
    if (/passenger_trip_token|schema cache|column/i.test(updErr.message || '')) {
      console.error(
        '[public-booking:activate] passenger_trip_token column missing — apply supabase/RUN_ON_STAGING_PASSENGER_TRIP_TOKEN.sql'
      )
      return json(res, 503, {
        error: 'Trip page is not ready on this environment. Please try again shortly.',
        code: 'TRIP_TOKEN_COLUMN_MISSING',
      })
    }
    console.error('[public-booking:activate]', updErr)
    return json(res, 500, { error: 'Something went wrong. Please try again.' })
  }
  if (!updated) {
    // Race: another activate won — reload
    const { data: again } = await supabase
      .from('booking_requests')
      .select('id, booking_reference, status, passenger_trip_token')
      .eq('id', bookingId)
      .maybeSingle()
    if (again && String(again.status) === 'new') {
      return respondActivated(again, true)
    }
    return json(res, 409, { error: 'Could not activate booking draft.' })
  }

  // Count the real passenger submit once — at activate, not on draft prep.
  try {
    await logAbuseEvent(supabase, {
      action: 'rider_booking_submit',
      ip_address: ipAddress,
      company_id: companyId,
      contact_key: `activate:${bookingId}`,
      metadata: { phase: 'activate', ua: userAgent ? 'present' : 'missing' },
    })
  } catch (rateLogErr) {
    console.error('[public-booking:activate-abuse-log]', rateLogErr)
  }

  const tokenOut = String(updated.passenger_trip_token || tripToken)
  return json(res, 200, {
    data: {
      ok: true,
      id: updated.id,
      booking_reference: updated.booking_reference || existing.booking_reference || null,
      activated: true,
      passenger_trip_token: tokenOut,
      trip_token: tokenOut,
      trip_url: tripUrlForToken(req, tokenOut),
    },
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  const envErr = validateSupabaseServiceEnv()
  if (envErr) return json(res, 503, { error: envErr })

  try {
    const body =
      typeof req.body === 'string' && req.body ? JSON.parse(req.body) : req.body || {}
    const bookingPhase = String(body.booking_phase || 'create').trim().toLowerCase()
    if (bookingPhase === 'activate') {
      return await activateDraftBooking(req, res, body)
    }

    const companyId = String(body.company_id || '').trim()
    const pickup = normalizeAddress(body.pickup_address)
    const dropoff = normalizeAddress(body.dropoff_address)
    const riderName = String(body.customer_name || '').trim().slice(0, 120) || 'WhatsApp request'
    const riderPhoneDigits = normalizePhoneDigits(body.customer_phone)
    const riderEmail = normalizeEmail(body.customer_email || '')
    const carType = normalizeVehicleType(body.car_type) || null
    const serviceType =
      String(body.service_type || 'standard').trim().toLowerCase() === 'hourly' ? 'hourly' : 'standard'
    const durationHoursRaw = Number(body.duration_hours)
    const durationHours =
      serviceType === 'hourly' && Number.isFinite(durationHoursRaw) && durationHoursRaw > 0
        ? durationHoursRaw
        : null
    const bodyHourlyRate = Number(body.hourly_rate_eur)
    const bodyHourlyMin = parseInt(String(body.hourly_min_hours ?? ''), 10)
    // draft = prepared on BOOK (no Company A timer). create/default = live booking (status new).
    const status = bookingPhase === 'draft' ? 'draft' : 'new'
    const turnstileToken = String(body.turnstileToken || '').trim()
    const honeypot = String(body.website || '').trim()
    const formStartedAt = Number(body.formStartedAt || 0)
    const submissionFingerprint = String(body.submissionFingerprint || '').trim().slice(0, 220)
    const hasExplicitRideDatetime =
      !!body.ride_datetime && !Number.isNaN(new Date(body.ride_datetime).getTime())
    if (hasExplicitRideDatetime && isRideDatetimeInPast(body.ride_datetime)) {
      return json(res, 400, { error: PAST_RIDE_ERROR, code: 'PAST_RIDE_DATETIME' })
    }
    const requestedRideDate = hasExplicitRideDatetime
      ? new Date(body.ride_datetime).toISOString()
      : new Date().toISOString()
    const notesRaw = String(body.notes || '')
    const notes = notesRaw.slice(0, MAX_NOTES_LEN)
    // Filled after company pricing is known. Never taken from the passenger body.
    let estimatedPriceEur = null
    let priceCurrency = 'EUR'
    const humanConfirmed = !!body.humanConfirmed
    const ipAddress = getClientIp(req)
    const userAgent = getUserAgent(req)

    if (!companyId || !pickup) {
      return json(res, 400, { error: 'Missing booking fields.' })
    }
    // customer_phone is optional on booking create. Final Rescue model captures passenger
    // WhatsApp contact later via Company A inbound Meta webhook (not the booking form).
    if (riderPhoneDigits && (riderPhoneDigits.length < 8 || riderPhoneDigits.length > 15)) {
      return json(res, 400, { error: 'Invalid WhatsApp / mobile number.' })
    }
    if (honeypot) {
      return json(res, 400, { error: 'Security verification failed. Please retry the booking form.' })
    }
    if (!humanConfirmed) {
      return json(res, 400, { error: 'Please confirm you are a real person.' })
    }
    if (!Number.isFinite(formStartedAt) || Date.now() - formStartedAt < 1000) {
      return json(res, 400, { error: 'Please wait a moment before submitting.' })
    }
    const supabase = makeSupabaseServiceClient()

    const { data: companyRow, error: companyErr } = await supabase
      .from('companies')
      .select('id, status, pricing, hourly_enabled, hourly_rate_eur, hourly_min_hours')
      .eq('id', companyId)
      .maybeSingle()
    if (companyErr) {
      console.error('[public-booking:company]', companyErr)
      return json(res, 500, { error: 'Could not verify company.' })
    }
    if (!companyRow || companyRow.status !== 'approved') {
      return json(res, 400, { error: 'Company not available for booking.' })
    }
    const enabledTypes = resolveEnabledVehicleTypes(companyRow.pricing)
    if (!carType || !enabledTypes.includes(carType)) {
      return json(res, 400, { error: 'Selected vehicle type is not available.' })
    }

    const hourlyEmbed =
      companyRow.pricing &&
      typeof companyRow.pricing === 'object' &&
      companyRow.pricing.__hourly &&
      typeof companyRow.pricing.__hourly === 'object'
        ? companyRow.pricing.__hourly
        : null
    const coerceTruthy = (v) => {
      if (v === true || v === 1) return true
      const s = String(v ?? '')
        .trim()
        .toLowerCase()
      return s === 'true' || s === '1' || s === 'yes'
    }
    const companyHourlyEnabled =
      coerceTruthy(companyRow.hourly_enabled) || coerceTruthy(hourlyEmbed?.enabled)
    const companyHourlyRate =
      Number(companyRow.hourly_rate_eur ?? hourlyEmbed?.rate_eur) > 0
        ? Number(companyRow.hourly_rate_eur ?? hourlyEmbed?.rate_eur)
        : 60
    const companyHourlyMinParsed = parseInt(
      String(companyRow.hourly_min_hours ?? hourlyEmbed?.min_hours ?? ''),
      10
    )
    const companyHourlyMin =
      Number.isFinite(companyHourlyMinParsed) && companyHourlyMinParsed >= 1
        ? companyHourlyMinParsed
        : 3

    if (serviceType === 'hourly' && !companyHourlyEnabled) {
      return json(res, 400, { error: 'By-hour service is not available for this company.' })
    }

    let dropoffFinal = dropoff
    if (serviceType === 'hourly') {
      dropoffFinal = dropoff || 'By-hour service (no fixed drop-off)'
      if (!durationHours || durationHours < companyHourlyMin) {
        return json(res, 400, {
          error: `Duration must be at least ${companyHourlyMin} hour(s).`,
        })
      }
    } else if (!dropoffFinal) {
      return json(res, 400, { error: 'Missing booking fields.' })
    }

    if (pickup.length < 5) {
      return json(res, 400, { error: 'Pick-up must contain at least 5 characters.' })
    }
    if (serviceType === 'standard') {
      if (dropoffFinal.length < 5) {
        return json(res, 400, {
          error: 'Pickup and drop-off must contain at least 5 characters.',
        })
      }
      if (pickup.toLowerCase() === dropoffFinal.toLowerCase()) {
        return json(res, 400, { error: 'Pickup and drop-off cannot be the same.' })
      }
    }
    if (notesRaw.length > MAX_NOTES_LEN) {
      return json(res, 400, { error: `Message too long (max ${MAX_NOTES_LEN} characters).` })
    }

    if (serviceType === 'standard') {
      const priced = await resolveStandardBookingPrice({
        companyPricing: companyRow.pricing,
        carType,
        pickup: {
          lat: body.pickup_lat ?? body.pickupLat,
          lng: body.pickup_lng ?? body.pickupLng,
        },
        dropoff: {
          lat: body.dropoff_lat ?? body.dropoffLat,
          lng: body.dropoff_lng ?? body.dropoffLng,
        },
        clientPriceEur: body.estimated_price_eur,
      })
      if (!priced.ok) {
        return json(res, 422, { error: PRICE_UNAVAILABLE_ERROR, code: 'PRICE_UNAVAILABLE' })
      }
      estimatedPriceEur = priced.estimatedPriceEur
      priceCurrency = priced.priceCurrency
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const dedupeKey =
      submissionFingerprint ||
      `booking:${companyId}:${serviceType}:${pickup.toLowerCase()}:${dropoffFinal.toLowerCase()}:${String(carType || '')}:${String(durationHours || '')}:${String(requestedRideDate || 'now')}`.slice(
        0,
        220
      )
    const contactKey = dedupeKey

    const turnstile = await verifyTurnstileToken(turnstileToken, ipAddress)
    if (turnstile.enabled && !turnstile.passed) {
      await logBlockedBooking(supabase, {
        ipAddress,
        companyId,
        contactKey,
        reason: 'turnstile_failed',
        extra: { turnstile_reason: turnstile.reason || null },
      })
      return json(res, 400, {
        error: 'Security verification failed. Please retry the booking form.',
        code: 'TURNSTILE_FAILED',
      })
    }

    // Draft prep must not burn rider_booking_submit quota (failed draft retries caused 429).
    // Reuse an existing matching draft instead of inserting another row.
    if (status === 'draft') {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      let reuseQuery = supabase
        .from('booking_requests')
        .select('id, booking_reference, status, decision_deadline_at, estimated_price_eur')
        .eq('company_id', companyId)
        .eq('status', 'draft')
        .eq('pickup_address', pickup)
        .eq('dropoff_address', dropoffFinal)
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
      reuseQuery = carType ? reuseQuery.eq('car_type', carType) : reuseQuery.is('car_type', null)
      let { data: reusableDraft, error: reuseErr } = await reuseQuery.maybeSingle()
      if (reuseErr && missingColumn(reuseErr, 'estimated_price_eur')) {
        let retry = supabase
          .from('booking_requests')
          .select('id, booking_reference, status, decision_deadline_at')
          .eq('company_id', companyId)
          .eq('status', 'draft')
          .eq('pickup_address', pickup)
          .eq('dropoff_address', dropoffFinal)
          .gte('created_at', thirtyMinutesAgo)
          .order('created_at', { ascending: false })
          .limit(1)
        retry = carType ? retry.eq('car_type', carType) : retry.is('car_type', null)
        const again = await retry.maybeSingle()
        reusableDraft = again.data
        reuseErr = again.error
      }
      if (reuseErr) console.error('[public-booking:draft-reuse]', reuseErr)
      if (reusableDraft?.id && reusableDraft?.booking_reference) {
        // Keep a frozen fare. Fill a null fare with the server quote only.
        if (serviceType === 'standard') {
          const decision = draftPriceWrite(reusableDraft.estimated_price_eur, estimatedPriceEur)
          if (decision.missing) {
            return json(res, 422, { error: PRICE_UNAVAILABLE_ERROR, code: 'PRICE_UNAVAILABLE' })
          }
          if (decision.write) {
            const { error: priceErr } = await supabase
              .from('booking_requests')
              .update({
                estimated_price_eur: decision.estimatedPriceEur,
                price_currency: 'EUR',
              })
              .eq('id', reusableDraft.id)
              .eq('status', 'draft')
              .is('estimated_price_eur', null)
            if (priceErr && !missingColumn(priceErr, 'estimated_price_eur')) {
              console.error('[public-booking:draft-price]', priceErr)
            }
          }
        }
        // Refresh passenger UI language on reused draft (best-effort).
        const reuseLocale = normalizePassengerLocale(
          body.passenger_locale || body.locale || body.language
        )
        const { error: localeUpdErr } = await supabase
          .from('booking_requests')
          .update({ passenger_locale: reuseLocale })
          .eq('id', reusableDraft.id)
          .eq('status', 'draft')
        if (localeUpdErr && !missingColumn(localeUpdErr, 'passenger_locale')) {
          console.error('[public-booking:draft-locale]', localeUpdErr)
        }
        return json(res, 200, {
          data: {
            ok: true,
            id: reusableDraft.id,
            booking_reference: reusableDraft.booking_reference,
            reused: true,
          },
        })
      }
    } else {
      // Live create path (legacy) — rate-limit + dedupe apply here only.
      if (ipAddress !== 'unknown') {
        let count = 0
        try {
          count = await countAbuseEvents(supabase, {
            action: 'rider_booking_submit',
            sinceIso: oneHourAgo,
            ipAddress,
          })
        } catch (error) {
          console.error('[public-booking:rate:ip]', error)
        }
        if (count >= 10) {
          await logBlockedBooking(supabase, {
            ipAddress,
            companyId,
            contactKey,
            reason: 'rate_limit_ip_10_per_hour',
          })
          return json(res, 429, {
            error: 'Too many attempts. Please try again later.',
          })
        }
      }

      {
        let count = 0
        try {
          count = await countAbuseEvents(supabase, {
            action: 'rider_booking_submit',
            sinceIso: oneHourAgo,
            companyId,
          })
        } catch (error) {
          console.error('[public-booking:rate:company]', error)
        }
        if (count >= 30) {
          await logBlockedBooking(supabase, {
            ipAddress,
            companyId,
            contactKey,
            reason: 'rate_limit_company_30_per_hour',
          })
          return json(res, 429, {
            error: 'Too many attempts. Please try again later.',
          })
        }
      }

      if (contactKey) {
        let count = 0
        try {
          count = await countAbuseEvents(supabase, {
            action: 'rider_booking_submit',
            sinceIso: oneHourAgo,
            contactKey,
          })
        } catch (error) {
          console.error('[public-booking:rate:contact]', error)
        }
        if (count >= 5) {
          await logBlockedBooking(supabase, {
            ipAddress,
            companyId,
            contactKey,
            reason: 'rate_limit_contact_5_per_hour',
          })
          return json(res, 429, {
            error: 'Too many attempts. Please try again later.',
          })
        }
      }
      try {
        await logAbuseEvent(supabase, {
          action: 'rider_booking_submit',
          ip_address: ipAddress,
          company_id: companyId,
          contact_key: contactKey,
          metadata: {
            ua: userAgent ? 'present' : 'missing',
            turnstile_enabled: turnstile.enabled === true,
          },
        })
      } catch (rateLogErr) {
        console.error('[public-booking:abuse-log]', rateLogErr)
      }

      let duplicateQuery = supabase
        .from('booking_requests')
        .select('id')
        .eq('company_id', companyId)
        .eq('pickup_address', pickup)
        .eq('dropoff_address', dropoffFinal)
        .neq('status', 'draft')
        .gte('created_at', fifteenMinutesAgo)
        .limit(1)
      duplicateQuery = carType ? duplicateQuery.eq('car_type', carType) : duplicateQuery.is('car_type', null)
      const { data: duplicateRecent, error: dupErr } = await duplicateQuery.maybeSingle()
      if (dupErr) console.error('[public-booking:duplicate-check]', dupErr)
      if (duplicateRecent) {
        await logBlockedBooking(supabase, {
          ipAddress,
          companyId,
          contactKey,
          reason: 'duplicate_identical_within_15m',
        })
        return json(res, 429, {
          error:
            'This identical booking was already submitted recently. Please wait a few minutes before retrying.',
        })
      }
    }

    const pickupLatRaw = Number(body.pickup_lat ?? body.pickupLat)
    const pickupLngRaw = Number(body.pickup_lng ?? body.pickupLng)
    const pickupLat =
      Number.isFinite(pickupLatRaw) && pickupLatRaw >= -90 && pickupLatRaw <= 90
        ? pickupLatRaw
        : null
    const pickupLng =
      Number.isFinite(pickupLngRaw) && pickupLngRaw >= -180 && pickupLngRaw <= 180
        ? pickupLngRaw
        : null

    const bookingReference = generateBookingReference()
    const passengerLocale = normalizePassengerLocale(
      body.passenger_locale || body.locale || body.language
    )
    const payload = {
      company_id: companyId,
      pickup_address: pickup,
      dropoff_address: dropoffFinal,
      ...(pickupLat != null && pickupLng != null
        ? { pickup_lat: pickupLat, pickup_lng: pickupLng }
        : {}),
      car_type: carType,
      service_type: serviceType,
      duration_hours: serviceType === 'hourly' ? durationHours : null,
      hourly_rate_eur: serviceType === 'hourly' ? companyHourlyRate : null,
      hourly_min_hours: serviceType === 'hourly' ? companyHourlyMin : null,
      // Point-to-point frozen trip price (immutable booking snapshot). Hourly: leave null.
      estimated_price_eur: serviceType === 'standard' ? estimatedPriceEur : null,
      price_currency: priceCurrency,
      customer_name: riderName,
      customer_phone: riderPhoneDigits,
      customer_email: riderEmail || null,
      ride_datetime: requestedRideDate,
      notes: notes || null,
      status,
      booking_reference: bookingReference,
      passenger_locale: passengerLocale,
      rider_terms_accepted: true,
      rider_terms_accepted_at: new Date().toISOString(),
      rider_terms_version: String(body?.termsAcceptance?.terms_version || '').trim() || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      turnstile_passed: turnstile.enabled ? !!turnstile.passed : null,
      turnstile_error: turnstile.enabled && !turnstile.passed ? String(turnstile.reason || '') : null,
      // Draft must never start Company A 25s timer (INSERT trigger only sets deadline for status=new).
      ...(status === 'draft' ? { decision_deadline_at: null } : {}),
    }

    async function insertReturning(row) {
      return supabase.from('booking_requests').insert(row).select('id,booking_reference').maybeSingle()
    }

    let inserted = null
    let insertErr = null
    ;({ data: inserted, error: insertErr } = await insertReturning(payload))

    // Unique collision on reference — retry once with a new code
    if (insertErr && /booking_reference|duplicate key|unique/i.test(insertErr.message || '')) {
      payload.booking_reference = generateBookingReference()
      ;({ data: inserted, error: insertErr } = await insertReturning(payload))
    }

    if (insertErr && missingColumn(insertErr, 'passenger_locale')) {
      const { passenger_locale: _pl, ...withoutLocale } = payload
      ;({ data: inserted, error: insertErr } = await insertReturning(withoutLocale))
    }

    if (insertErr && missingColumn(insertErr, 'booking_reference')) {
      const { booking_reference: _br, ...withoutRef } = payload
      ;({ data: inserted, error: insertErr } = await supabase
        .from('booking_requests')
        .insert(withoutRef)
        .select('id')
        .maybeSingle())
      if (!insertErr && inserted) inserted = { ...inserted, booking_reference: null }
    }
    if (insertErr && missingColumn(insertErr, 'turnstile_')) {
      const { turnstile_passed: _tp, turnstile_error: _te, ...withoutTurnstile } = payload
      ;({ data: inserted, error: insertErr } = await insertReturning(withoutTurnstile))
    }
    if (insertErr && (missingColumn(insertErr, 'ip_address') || missingColumn(insertErr, 'user_agent'))) {
      const {
        ip_address: _ip,
        user_agent: _ua,
        turnstile_passed: _tp2,
        turnstile_error: _te2,
        ...withoutMeta
      } = payload
      ;({ data: inserted, error: insertErr } = await insertReturning(withoutMeta))
    }
    if (
      insertErr &&
      (missingColumn(insertErr, 'rider_terms_accepted') ||
        missingColumn(insertErr, 'rider_terms_accepted_at') ||
        missingColumn(insertErr, 'rider_terms_version'))
    ) {
      const {
        rider_terms_accepted: _rta,
        rider_terms_accepted_at: _rtaa,
        rider_terms_version: _rtv,
        ...withoutLegal
      } = payload
      ;({ data: inserted, error: insertErr } = await insertReturning(withoutLegal))
    }
    if (
      insertErr &&
      (missingColumn(insertErr, 'estimated_price_eur') || missingColumn(insertErr, 'price_currency'))
    ) {
      const { estimated_price_eur: _ep, price_currency: _pc, ...withoutPriceCols } = payload
      ;({ data: inserted, error: insertErr } = await insertReturning(withoutPriceCols))
    }
    if (
      insertErr &&
      (missingColumn(insertErr, 'service_type') ||
        missingColumn(insertErr, 'duration_hours') ||
        missingColumn(insertErr, 'hourly_rate_eur') ||
        missingColumn(insertErr, 'hourly_min_hours'))
    ) {
      const {
        service_type: _st,
        duration_hours: _dh,
        hourly_rate_eur: _hr,
        hourly_min_hours: _hm,
        estimated_price_eur: _ep2,
        price_currency: _pc2,
        ...withoutHourlyCols
      } = payload
      const hourlyMeta =
        serviceType === 'hourly'
          ? `taxio_hourly[service=hourly;duration_h=${durationHours};rate_eur=${companyHourlyRate};min_h=${companyHourlyMin}]`
          : ''
      const notesWithHourly = hourlyMeta
        ? withoutHourlyCols.notes
          ? `${withoutHourlyCols.notes} | ${hourlyMeta}`
          : hourlyMeta
        : withoutHourlyCols.notes
      ;({ data: inserted, error: insertErr } = await insertReturning({
        ...withoutHourlyCols,
        notes: notesWithHourly || null,
      }))
    }
    if (
      insertErr &&
      (missingColumn(insertErr, 'pickup_lat') || missingColumn(insertErr, 'pickup_lng'))
    ) {
      const { pickup_lat: _plat, pickup_lng: _plng, ...withoutPickupCoords } = payload
      ;({ data: inserted, error: insertErr } = await insertReturning(withoutPickupCoords))
    }
    if (insertErr) {
      console.error('[public-booking:insert]', insertErr)
      return json(res, 500, { error: 'Something went wrong. Please try again.' })
    }
    return json(res, 200, {
      data: {
        ok: true,
        id: inserted?.id || null,
        booking_reference: inserted?.booking_reference || payload.booking_reference || null,
      },
    })
  } catch (err) {
    console.error('[public-booking]', err)
    return json(res, 500, { error: 'Something went wrong. Please try again.' })
  }
}
