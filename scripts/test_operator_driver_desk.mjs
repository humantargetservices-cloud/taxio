import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  availabilityFromControls,
  controlsFromAvailability,
  currentTrip,
  earningsBetween,
  euro,
  navigationTarget,
  nextProgressAction,
  nextScheduled,
  pageOf,
  scheduleLabel,
  sortActiveTrips,
  tripsOnLocalDate,
} from '../apps/operator/src/utils/bookingState.ts'

const now = Date.parse('2026-10-28T15:00:00Z')

function booking(overrides) {
  return {
    id: 'b',
    status: 'accepted',
    pickup_address: 'Station',
    dropoff_address: 'Airport',
    estimated_price_eur: 20,
    ...overrides,
  }
}

test('several accepted trips sort underway, then ride now, then scheduled', () => {
  const rows = sortActiveTrips([
    booking({ id: 'later', ride_datetime: '2026-10-28T18:00:00Z' }),
    booking({ id: 'soon', ride_datetime: '2026-10-28T16:00:00Z' }),
    booking({ id: 'now', ride_datetime: null }),
    booking({ id: 'driving', ride_datetime: '2026-10-28T15:10:00Z', driver_pickup_status: 'ON_THE_WAY' }),
    booking({ id: 'done', status: 'accepted', completed_at: '2026-10-28T14:00:00Z' }),
  ], now)
  assert.deepEqual(rows.map(row => row.id), ['driving', 'now', 'soon', 'later'])
  assert.equal(currentTrip(rows, now)?.id, 'driving')
  assert.equal(nextScheduled(rows, now)?.id, 'soon')
  assert.equal(scheduleLabel(null, now), 'Ride Now')
  assert.notEqual(scheduleLabel('2026-10-28T18:00:00Z', now), 'Ride Now')
})

test('trip actions follow the server stage and do not treat a trip as complete locally', () => {
  const accepted = booking({ id: 'a', driver_pickup_status: null })
  assert.equal(nextProgressAction(accepted, now), 'mark_on_way')
  assert.equal(navigationTarget(accepted), 'pickup')
  const arrived = booking({ id: 'b', driver_pickup_status: 'ARRIVED' })
  assert.equal(nextProgressAction(arrived, now), 'complete_trip')
  assert.equal(navigationTarget(arrived), 'dropoff')
  const waiting = booking({ id: 'c', completed_at: '2026-10-28T14:30:00Z', completion_confirmation_status: 'AWAITING_PASSENGER' })
  assert.equal(nextProgressAction(waiting, now), null)
})

test('incoming request screen is accept-only and back does not accept', () => {
  const screen = readFileSync(new URL('../apps/operator/src/screens/Workspace.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(screen, /accessibilityLabel="Decline|Decline trip/)
  assert.match(screen, /Accept trip/)
  assert.match(screen, /hardwareBackPress/)
  assert.doesNotMatch(screen, /hardwareBackPress[\s\S]{0,180}onAccept/)
})

test('availability uses the single company field', () => {
  assert.equal(availabilityFromControls(true, true), 'available')
  assert.equal(availabilityFromControls(true, false), 'busy')
  assert.equal(availabilityFromControls(false, true), 'offline')
  assert.deepEqual(controlsFromAvailability('busy'), { online: true, acceptNew: false })
  assert.deepEqual(controlsFromAvailability('offline'), { online: false, acceptNew: false })
})

test('earnings stay estimated and do not invent payment or working hours', () => {
  const rows = [
    booking({ id: '1', completed_at: '2026-10-28T14:00:00Z', estimated_price_eur: 10 }),
    booking({ id: '2', completed_at: '2026-10-28T14:30:00Z', estimated_price_eur: null }),
    booking({ id: '3', completed_at: '2026-10-01T14:00:00Z', estimated_price_eur: 99 }),
  ]
  const summary = earningsBetween(rows, Date.parse('2026-10-28T00:00:00Z'), Date.parse('2026-10-29T00:00:00Z'))
  assert.equal(summary.completedTrips, 2)
  assert.equal(summary.estimatedTotalEur, 10)
  assert.equal(summary.averageEstimatedEur, 10)
  assert.equal(summary.tripsMissingEstimate, 1)
  assert.equal(summary.paidToCompanyEur, null)
  assert.equal(summary.earningsPerHourEur, null)
  assert.equal(summary.workingHoursTracked, false)
  assert.equal(euro(null), 'Unavailable')
})

test('history selects one local date and pages past the first rows', () => {
  const rows = []
  for (let i = 0; i < 25; i += 1) {
    rows.push(booking({
      id: 'h' + i,
      ride_datetime: '2026-10-28T10:' + String(i).padStart(2, '0') + ':00Z',
      created_at: '2026-10-28T09:00:00Z',
    }))
  }
  rows.push(booking({ id: 'other-day', ride_datetime: '2026-10-27T10:00:00Z' }))
  const day = tripsOnLocalDate(rows, '2026-10-28')
  assert.equal(day.length, 25)
  assert.equal(day.some(row => row.id === 'other-day'), false)
  const first = pageOf(day, 1, 20)
  assert.equal(first.rows.length, 20)
  assert.equal(first.hasMore, true)
  assert.equal(pageOf(day, 2, 20).rows.length, 25)
})

test('staging activation refuses a company that is not available', () => {
  const source = readFileSync(new URL('../api/public-booking.js', import.meta.url), 'utf8')
  const gate = source.indexOf("code: 'COMPANY_NOT_ACCEPTING'")
  const activate = source.indexOf("status: 'new'")
  assert.ok(gate > 0)
  assert.ok(activate > gate)
})
