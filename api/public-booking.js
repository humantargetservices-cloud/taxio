import {
  getClientIp,
  getUserAgent,
  json,
  makeSupabaseServiceClient,
  verifyTurnstileToken,
  validateSupabaseServiceEnv,
} from './_utils.js'
import { generateBookingReference } from './_bookingReference.js'

const MAX_NOTES_LEN = 500
const VEHICLE_TYPE_ORDER = ['Standard', 'Van', 'Luxury']

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '')
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
  const riderPhoneDigits = normalizePhoneDigits(body.customer_phone)
  const notesRaw = String(body.notes || '')
  const notes = notesRaw.slice(0, MAX_NOTES_LEN)
  const ipAddress = getClientIp(req)
  const userAgent = getUserAgent(req)

  if (!bookingId || !companyId) {
    return json(res, 400, { error: 'Missing booking fields.' })
  }
  if (!riderPhoneDigits || riderPhoneDigits.length < 8 || riderPhoneDigits.length > 15) {
    return json(res, 400, { error: 'Invalid WhatsApp / mobile number.' })
  }

  const supabase = makeSupabaseServiceClient()
  const { data: existing, error: loadErr } = await supabase
    .from('booking_requests')
    .select('id, company_id, status, booking_reference, decision_deadline_at')
    .eq('id', bookingId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (loadErr) {
    console.error('[public-booking:activate-load]', loadErr)
    return json(res, 500, { error: 'Could not activate booking.' })
  }
  if (!existing) {
    return json(res, 404, { error: 'Booking draft not found.' })
  }

  // Already activated — idempotent success (prevents duplicate bookings on re-tap).
  if (String(existing.status || '') === 'new') {
    return json(res, 200, {
      data: {
        ok: true,
        id: existing.id,
        booking_reference: existing.booking_reference || null,
        activated: true,
        already: true,
      },
    })
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

  const deadlineIso = new Date(Date.now() + decisionSeconds * 1000).toISOString()
  const patch = {
    status: 'new',
    customer_phone: riderPhoneDigits,
    decision_deadline_at: deadlineIso,
  }
  if (notes) patch.notes = notes

  const { data: updated, error: updErr } = await supabase
    .from('booking_requests')
    .update(patch)
    .eq('id', bookingId)
    .eq('company_id', companyId)
    .eq('status', 'draft')
    .select('id, booking_reference')
    .maybeSingle()

  if (updErr) {
    console.error('[public-booking:activate]', updErr)
    return json(res, 500, { error: 'Something went wrong. Please try again.' })
  }
  if (!updated) {
    // Race: another activate won — reload
    const { data: again } = await supabase
      .from('booking_requests')
      .select('id, booking_reference, status')
      .eq('id', bookingId)
      .maybeSingle()
    if (again && String(again.status) === 'new') {
      return json(res, 200, {
        data: {
          ok: true,
          id: again.id,
          booking_reference: again.booking_reference || null,
          activated: true,
          already: true,
        },
      })
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

  return json(res, 200, {
    data: {
      ok: true,
      id: updated.id,
      booking_reference: updated.booking_reference || existing.booking_reference || null,
      activated: true,
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
    const requestedRideDate =
      body.ride_datetime && !Number.isNaN(new Date(body.ride_datetime).getTime())
        ? new Date(body.ride_datetime).toISOString()
        : new Date().toISOString()
    const notesRaw = String(body.notes || '')
    const notes = notesRaw.slice(0, MAX_NOTES_LEN)
    // SECURITY TODO (before production): recompute this once at create using Company A's
    // pricing + route distance. Freeze the result. Never recalculate during Rescue.
    // Current staging: trust the passenger-facing estimate submitted by the booking page.
    let estimatedPriceEur = null
    let priceCurrency = 'EUR'
    if (serviceType === 'standard') {
      const rawPrice = Number(body.estimated_price_eur)
      if (Number.isFinite(rawPrice) && rawPrice >= 0 && rawPrice <= 100000) {
        estimatedPriceEur = Math.round(rawPrice * 100) / 100
      }
      const cur = String(body.price_currency || 'EUR')
        .trim()
        .toUpperCase()
        .slice(0, 8)
      if (cur) priceCurrency = cur
    }
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
        .select('id, booking_reference, status, decision_deadline_at')
        .eq('company_id', companyId)
        .eq('status', 'draft')
        .eq('pickup_address', pickup)
        .eq('dropoff_address', dropoffFinal)
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
      reuseQuery = carType ? reuseQuery.eq('car_type', carType) : reuseQuery.is('car_type', null)
      const { data: reusableDraft, error: reuseErr } = await reuseQuery.maybeSingle()
      if (reuseErr) console.error('[public-booking:draft-reuse]', reuseErr)
      if (reusableDraft?.id && reusableDraft?.booking_reference) {
        // Keep frozen price if client sends one and draft has null.
        if (estimatedPriceEur != null) {
          await supabase
            .from('booking_requests')
            .update({
              estimated_price_eur: estimatedPriceEur,
              price_currency: priceCurrency,
            })
            .eq('id', reusableDraft.id)
            .eq('status', 'draft')
            .is('estimated_price_eur', null)
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

    const bookingReference = generateBookingReference()
    const payload = {
      company_id: companyId,
      pickup_address: pickup,
      dropoff_address: dropoffFinal,
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
