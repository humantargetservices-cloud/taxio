/**
 * Passenger live trip helpers (Batch 1).
 * Maps existing booking + rescue rows → UI states. No second state machine.
 */
import { randomBytes } from 'node:crypto'
import { getOriginFromReq } from './_utils.js'

const TOKEN_BYTES = 32

export function mintPassengerTripToken() {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export function tripUrlForToken(req, token) {
  const fromEnv = String(process.env.PUBLIC_APP_ORIGIN || '')
    .trim()
    .replace(/\/$/, '')
  const origin = fromEnv || getOriginFromReq(req)
  return `${origin}/trip/${encodeURIComponent(token)}`
}

function cleanPrice(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

function publicCompanyContacts(company) {
  if (!company) return null
  const phone = String(company.phone || '').trim() || null
  const email = String(company.email || '').trim() || null
  return {
    name: String(company.name || '').trim() || 'Taxi',
    phone,
    email,
    whatsapp_digits: phone ? phone.replace(/\D/g, '').replace(/^00/, '') : null,
  }
}

/**
 * Resolve passenger-safe trip snapshot from booking + optional rescue.
 * @param {{ booking: object, companyA: object|null, winnerCompany: object|null, rescue: object|null }}
 */
export function mapPassengerTripState({ booking, companyA, winnerCompany, rescue }) {
  if (!booking) {
    return { ok: false, state: 'INVALID', code: 'INVALID' }
  }

  const trip = {
    booking_reference: booking.booking_reference || null,
    pickup: booking.pickup_address || null,
    dropoff: booking.dropoff_address || null,
    ride_datetime: booking.ride_datetime || null,
    vehicle: booking.car_type || null,
    service_type: booking.service_type || null,
    estimated_price_eur: cleanPrice(booking.estimated_price_eur),
    price_currency: booking.price_currency || 'EUR',
  }

  const companyAName = companyA?.name || 'your taxi company'
  const pcs = String(rescue?.passenger_confirm_status || '')
  const rescueStatus = String(rescue?.status || '')
  const bookingStatus = String(booking.status || '')

  const base = {
    ok: true,
    trip_token: booking.passenger_trip_token || null,
    trip,
    company_a_name: companyAName,
  }

  // Terminal passenger cancel (Rescue path)
  if (pcs === 'CANCELLED_BY_PASSENGER') {
    return {
      ...base,
      state: 'CANCELLED',
      headline_company: winnerCompany?.name || companyAName,
      contacts: null,
      confirm_token: null,
      actions: { confirm: false, cancel: false },
    }
  }

  // Rescue confirmed
  if (pcs === 'CONFIRMED' && rescueStatus === 'ACCEPTED') {
    return {
      ...base,
      state: 'CONFIRMED',
      headline_company: winnerCompany?.name || 'your taxi company',
      contacts: publicCompanyContacts(winnerCompany),
      confirm_token: null,
      actions: { confirm: false, cancel: false },
    }
  }

  // Waiting for passenger to confirm Rescue winner
  if (rescueStatus === 'ACCEPTED' && pcs === 'WAITING_PASSENGER_CONFIRMATION') {
    return {
      ...base,
      state: 'RESCUE_WINNER_FOUND',
      headline_company: winnerCompany?.name || 'another taxi company',
      contacts: null,
      confirm_token: rescue.passenger_confirm_token || null,
      actions: { confirm: true, cancel: true },
    }
  }

  // Rescue search in progress
  if (rescueStatus === 'OPEN') {
    return {
      ...base,
      state: 'SEARCHING_RESCUE',
      headline_company: companyAName,
      contacts: null,
      confirm_token: null,
      actions: { confirm: false, cancel: false },
    }
  }

  // Rescue expired with no winner
  if (rescueStatus === 'EXPIRED' || (bookingStatus === 'rejected' && !rescue)) {
    return {
      ...base,
      state: 'NO_TAXI_AVAILABLE',
      headline_company: companyAName,
      contacts: null,
      confirm_token: null,
      actions: { confirm: false, cancel: false },
    }
  }

  // Company A accepted (no Rescue confirm required)
  if (bookingStatus === 'accepted') {
    return {
      ...base,
      state: 'COMPANY_A_ACCEPTED',
      headline_company: companyAName,
      contacts: publicCompanyContacts(companyA),
      confirm_token: null,
      actions: { confirm: false, cancel: false },
    }
  }

  // Live request to Company A
  if (bookingStatus === 'new' || bookingStatus === 'reviewed') {
    const deadlineMs = booking.decision_deadline_at
      ? new Date(booking.decision_deadline_at).getTime()
      : NaN
    const pastDeadline = Number.isFinite(deadlineMs) && deadlineMs <= Date.now()
    // Brief window after deadline before cron activates Rescue
    if (pastDeadline && !rescue) {
      return {
        ...base,
        state: 'SEARCHING_RESCUE',
        headline_company: companyAName,
        contacts: null,
        confirm_token: null,
        actions: { confirm: false, cancel: false },
      }
    }
    return {
      ...base,
      state: 'REQUESTING_COMPANY_A',
      headline_company: companyAName,
      contacts: null,
      confirm_token: null,
      actions: { confirm: false, cancel: false },
      decision_deadline_at: booking.decision_deadline_at || null,
    }
  }

  if (bookingStatus === 'rejected' && rescueStatus === 'ACCEPTED') {
    // Edge: accepted rescue without pcs yet
    return {
      ...base,
      state: 'RESCUE_WINNER_FOUND',
      headline_company: winnerCompany?.name || 'another taxi company',
      contacts: null,
      confirm_token: rescue?.passenger_confirm_token || null,
      actions: { confirm: true, cancel: true },
    }
  }

  return {
    ...base,
    state: 'EXPIRED',
    headline_company: companyAName,
    contacts: null,
    confirm_token: null,
    actions: { confirm: false, cancel: false },
  }
}

/**
 * Load booking + companies + latest rescue by passenger trip token (service role).
 */
export async function loadTripByPassengerToken(supabase, tripToken) {
  const token = String(tripToken || '').trim()
  if (token.length < 20) return { booking: null }

  const { data: booking, error } = await supabase
    .from('booking_requests')
    .select(
      'id, company_id, status, booking_reference, pickup_address, dropoff_address, ride_datetime, car_type, service_type, estimated_price_eur, price_currency, decision_deadline_at, passenger_trip_token, created_at'
    )
    .eq('passenger_trip_token', token)
    .maybeSingle()

  if (error || !booking) return { booking: null, error }

  const { data: companyA } = await supabase
    .from('companies')
    .select('id, name, phone, email, status')
    .eq('id', booking.company_id)
    .maybeSingle()

  const { data: rescues } = await supabase
    .from('rescue_requests')
    .select(
      'id, status, original_company_id, accepted_by_company_id, passenger_confirm_status, passenger_confirm_token, accepted_at, closed_at, created_at'
    )
    .eq('booking_request_id', booking.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const rescue = rescues?.[0] || null
  let winnerCompany = null
  if (rescue?.accepted_by_company_id) {
    const { data: w } = await supabase
      .from('companies')
      .select('id, name, phone, email, status')
      .eq('id', rescue.accepted_by_company_id)
      .maybeSingle()
    winnerCompany = w
  }

  return { booking, companyA, winnerCompany, rescue }
}

/** Resolve trip token from Rescue passenger_confirm_token (compat redirect). */
export async function resolveTripTokenFromConfirmToken(supabase, confirmToken) {
  const token = String(confirmToken || '').trim()
  if (token.length < 20) return null

  const { data: rescue } = await supabase
    .from('rescue_requests')
    .select('booking_request_id')
    .eq('passenger_confirm_token', token)
    .maybeSingle()

  if (!rescue?.booking_request_id) return null

  const { data: booking } = await supabase
    .from('booking_requests')
    .select('passenger_trip_token')
    .eq('id', rescue.booking_request_id)
    .maybeSingle()

  return booking?.passenger_trip_token || null
}
