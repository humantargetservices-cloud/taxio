/**
 * Focused regression tests for Bug 1 (placeholder) + Bug 2 mapping (pickup fields).
 * Run: node --test scripts/test_passenger_trip_token.mjs
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizePassengerTripTokenInput,
  whatsappTripUrlButtonParameter,
  isUnresolvedWhatsappUrlPlaceholder,
  mapPassengerTripState,
} from '../api/_passengerTrip.js'

const SAMPLE = 'a'.repeat(32) + 'bcdef0'

describe('normalizePassengerTripTokenInput', () => {
  it('passes through opaque tokens', () => {
    assert.equal(normalizePassengerTripTokenInput(SAMPLE), SAMPLE)
  })

  it('decodes percent-encoding once', () => {
    assert.equal(normalizePassengerTripTokenInput(encodeURIComponent(SAMPLE)), SAMPLE)
  })

  it('does not invent tokens from empty input', () => {
    assert.equal(normalizePassengerTripTokenInput(''), '')
  })
})

describe('whatsappTripUrlButtonParameter', () => {
  it('sends opaque token only', () => {
    assert.equal(whatsappTripUrlButtonParameter(SAMPLE), SAMPLE)
  })

  it('rejects full URLs as Meta suffix', () => {
    assert.equal(whatsappTripUrlButtonParameter(`https://staging.taxio.be/trip/${SAMPLE}`), '')
  })

  it('rejects unresolved {{1}} placeholder', () => {
    assert.equal(whatsappTripUrlButtonParameter('{{1}}'), '')
  })
})

describe('isUnresolvedWhatsappUrlPlaceholder (Bug 1 — /trip/%7B%7B1%7D%7D)', () => {
  it('detects literal {{1}} and percent-encoded braces', () => {
    assert.equal(isUnresolvedWhatsappUrlPlaceholder('{{1}}'), true)
    assert.equal(isUnresolvedWhatsappUrlPlaceholder('%7B%7B1%7D%7D'), true)
    assert.equal(isUnresolvedWhatsappUrlPlaceholder(SAMPLE), false)
  })
})

describe('mapPassengerTripState — pickup progress (Company A + Rescue)', () => {
  const baseBooking = {
    status: 'accepted',
    passenger_trip_token: SAMPLE,
    booking_reference: 'TX-TEST',
    pickup_address: 'A',
    dropoff_address: 'B',
    completed_at: null,
  }
  const companyA = { name: 'StagingT', phone: '+32470000000', email: 'a@test.be' }

  it('Company A ON_THE_WAY', () => {
    const mapped = mapPassengerTripState({
      booking: { ...baseBooking, driver_pickup_status: 'ON_THE_WAY', driver_eta_minutes: 7 },
      companyA,
      winnerCompany: null,
      rescue: null,
    })
    assert.equal(mapped.state, 'COMPANY_A_ACCEPTED')
    assert.equal(mapped.trip.driver_pickup_status, 'ON_THE_WAY')
    assert.equal(mapped.trip.driver_eta_minutes, 7)
  })

  it('Company A ARRIVED', () => {
    const mapped = mapPassengerTripState({
      booking: {
        ...baseBooking,
        driver_pickup_status: 'ARRIVED',
        driver_arrived_at: '2026-10-19T10:00:00Z',
      },
      companyA,
      winnerCompany: null,
      rescue: null,
    })
    assert.equal(mapped.state, 'COMPANY_A_ACCEPTED')
    assert.equal(mapped.trip.driver_pickup_status, 'ARRIVED')
  })

  it('Rescue CONFIRMED ARRIVED', () => {
    const mapped = mapPassengerTripState({
      booking: {
        ...baseBooking,
        status: 'rejected',
        driver_pickup_status: 'ARRIVED',
      },
      companyA,
      winnerCompany: { name: 'RescueCo', phone: '+32471111111' },
      rescue: {
        status: 'ACCEPTED',
        passenger_confirm_status: 'CONFIRMED',
      },
    })
    assert.equal(mapped.state, 'CONFIRMED')
    assert.equal(mapped.trip.driver_pickup_status, 'ARRIVED')
    assert.equal(mapped.headline_company, 'RescueCo')
  })

  it('null pickup stays null (no false status)', () => {
    const mapped = mapPassengerTripState({
      booking: { ...baseBooking, driver_pickup_status: null },
      companyA,
      winnerCompany: null,
      rescue: null,
    })
    assert.equal(mapped.state, 'COMPANY_A_ACCEPTED')
    assert.equal(mapped.trip.driver_pickup_status, null)
  })

  it('same trip token stays valid after Rescue takeover (headline switches)', () => {
    const token = SAMPLE
    const companyAOnly = mapPassengerTripState({
      booking: { ...baseBooking, passenger_trip_token: token },
      companyA,
      winnerCompany: null,
      rescue: null,
    })
    const afterRescue = mapPassengerTripState({
      booking: {
        ...baseBooking,
        passenger_trip_token: token,
        status: 'rejected',
        driver_pickup_status: 'ON_THE_WAY',
        driver_eta_minutes: 5,
      },
      companyA,
      winnerCompany: { name: 'RescueCo', phone: '+32471111111' },
      rescue: {
        status: 'ACCEPTED',
        passenger_confirm_status: 'CONFIRMED',
      },
    })
    assert.equal(companyAOnly.trip_token, token)
    assert.equal(afterRescue.trip_token, token)
    assert.equal(companyAOnly.headline_company, 'StagingT')
    assert.equal(afterRescue.headline_company, 'RescueCo')
    assert.equal(afterRescue.trip.driver_pickup_status, 'ON_THE_WAY')
  })
})

describe('placeholder path never looks like a real token', () => {
  it('decoded Meta {{1}} is too short and flagged unresolved', () => {
    const decoded = normalizePassengerTripTokenInput('%7B%7B1%7D%7D')
    assert.equal(decoded, '{{1}}')
    assert.equal(isUnresolvedWhatsappUrlPlaceholder(decoded), true)
    assert.ok(decoded.length < 20)
  })
})
