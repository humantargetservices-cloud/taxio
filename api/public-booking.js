import {
  getClientIp,
  getUserAgent,
  json,
  makeSupabaseServiceClient,
  verifyTurnstileToken,
  validateSupabaseServiceEnv,
} from './_utils.js'

const MAX_NOTES_LEN = 500

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  const envErr = validateSupabaseServiceEnv()
  if (envErr) return json(res, 503, { error: envErr })

  try {
    const body =
      typeof req.body === 'string' && req.body ? JSON.parse(req.body) : req.body || {}
    const companyId = String(body.company_id || '').trim()
    const pickup = normalizeAddress(body.pickup_address)
    const dropoff = normalizeAddress(body.dropoff_address)
    const riderName = String(body.customer_name || '').trim().slice(0, 120) || 'WhatsApp request'
    const riderPhoneDigits = normalizePhoneDigits(body.customer_phone)
    const riderEmail = normalizeEmail(body.customer_email || '')
    const carType = String(body.car_type || '').trim().slice(0, 40) || null
    const status = 'new'
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
    const humanConfirmed = !!body.humanConfirmed
    const ipAddress = getClientIp(req)
    const userAgent = getUserAgent(req)

    if (!companyId || !pickup || !dropoff) {
      return json(res, 400, { error: 'Missing booking fields.' })
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
    if (pickup.length < 5 || dropoff.length < 5) {
      return json(res, 400, {
        error: 'Pickup and drop-off must contain at least 5 characters.',
      })
    }
    if (pickup.toLowerCase() === dropoff.toLowerCase()) {
      return json(res, 400, { error: 'Pickup and drop-off cannot be the same.' })
    }
    if (notesRaw.length > MAX_NOTES_LEN) {
      return json(res, 400, { error: `Message too long (max ${MAX_NOTES_LEN} characters).` })
    }

    const supabase = makeSupabaseServiceClient()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const dedupeKey =
      submissionFingerprint ||
      `booking:${companyId}:${pickup.toLowerCase()}:${dropoff.toLowerCase()}:${String(carType || '')}:${String(requestedRideDate || 'now')}`.slice(
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
      .eq('dropoff_address', dropoff)
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

    const payload = {
      company_id: companyId,
      pickup_address: pickup,
      dropoff_address: dropoff,
      car_type: carType,
      customer_name: riderName,
      customer_phone: riderPhoneDigits,
      customer_email: riderEmail || null,
      ride_datetime: requestedRideDate,
      notes: notes || null,
      status,
      rider_terms_accepted: true,
      rider_terms_accepted_at: new Date().toISOString(),
      rider_terms_version: String(body?.termsAcceptance?.terms_version || '').trim() || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      turnstile_passed: turnstile.enabled ? !!turnstile.passed : null,
      turnstile_error: turnstile.enabled && !turnstile.passed ? String(turnstile.reason || '') : null,
    }

    let { error: insertErr } = await supabase.from('booking_requests').insert(payload)
    if (insertErr && missingColumn(insertErr, 'turnstile_')) {
      const { turnstile_passed: _tp, turnstile_error: _te, ...withoutTurnstile } = payload
      ;({ error: insertErr } = await supabase.from('booking_requests').insert(withoutTurnstile))
    }
    if (insertErr && (missingColumn(insertErr, 'ip_address') || missingColumn(insertErr, 'user_agent'))) {
      const {
        ip_address: _ip,
        user_agent: _ua,
        turnstile_passed: _tp2,
        turnstile_error: _te2,
        ...withoutMeta
      } = payload
      ;({ error: insertErr } = await supabase.from('booking_requests').insert(withoutMeta))
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
      ;({ error: insertErr } = await supabase.from('booking_requests').insert(withoutLegal))
    }
    if (insertErr) {
      console.error('[public-booking:insert]', insertErr)
      return json(res, 500, { error: `Could not save booking request: ${insertErr.message}` })
    }
    return json(res, 200, { data: { ok: true } })
  } catch (err) {
    console.error('[public-booking]', err)
    return json(res, 500, { error: err?.message || 'Internal server error.' })
  }
}
