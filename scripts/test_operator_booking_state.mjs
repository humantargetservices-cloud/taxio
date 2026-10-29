import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyBooking, isActionableRescue, routeOpenedAlert, secondsRemaining } from '../apps/operator/src/utils/bookingState.ts'
import { isProductionTarget, liveActionsEnabled } from '../apps/operator/src/utils/environment.ts'

const now = Date.parse('2026-10-27T12:00:00Z')

test('a new booking with a future server deadline is actionable', () => {
  assert.equal(classifyBooking({ id: '1', status: 'new', decision_deadline_at: '2026-10-27T12:00:20Z' }, now), 'actionable')
})
test('a new booking with no deadline is not actionable', () => {
  assert.equal(classifyBooking({ id: '1', status: 'new', decision_deadline_at: null }, now), 'expired')
})
test('an expired deadline is not actionable and reports zero seconds', () => {
  assert.equal(classifyBooking({ id: '1', status: 'new', decision_deadline_at: '2026-10-27T11:59:00Z' }, now), 'expired')
  assert.equal(secondsRemaining('2026-10-27T11:59:00Z', now), 0)
})
test('accepted and completed trips are classified separately', () => {
  assert.equal(classifyBooking({ id: '1', status: 'accepted' }, now), 'accepted')
  assert.equal(classifyBooking({ id: '1', status: 'accepted', completed_at: '2026-10-27T11:00:00Z' }, now), 'completed')
})
test('rescue offers use the server status OFFERED', () => {
  assert.equal(isActionableRescue('OFFERED', '2026-10-27T12:00:30Z', now), true)
  assert.equal(isActionableRescue('pending', '2026-10-27T12:00:30Z', now), true)
  assert.equal(isActionableRescue('MISSED', '2026-10-27T12:00:30Z', now), false)
  assert.equal(isActionableRescue('OFFERED', '2026-10-27T11:00:00Z', now), false)
})
test('production hosts are refused', () => {
  assert.equal(isProductionTarget('https://www.taxio.be'), true)
  assert.equal(isProductionTarget('https://gdiamipqrhxbmrcsnqdk.supabase.co'), true)
  assert.equal(isProductionTarget('https://amigo.taxio.be'), true)
  assert.equal(isProductionTarget('https://staging.taxio.be'), false)
  assert.equal(liveActionsEnabled(), false)
})

test('an opened alert refetches into the current offer and never accepts an expired one', () => {
  const future = { id: 'b1', status: 'new', decision_deadline_at: '2026-10-27T12:00:30Z' }
  const expired = { id: 'b1', status: 'new', decision_deadline_at: '2026-10-27T11:00:00Z' }
  const accepted = { id: 'b1', status: 'accepted', decision_deadline_at: '2026-10-27T11:00:00Z' }
  assert.equal(routeOpenedAlert({ eventType: 'company_booking_new', booking: future, nowMs: now }), 'open-booking')
  assert.equal(routeOpenedAlert({ eventType: 'company_booking_new', booking: expired, nowMs: now }), 'expired')
  assert.equal(routeOpenedAlert({ eventType: 'company_booking_new', booking: accepted, nowMs: now }), 'open-trip')
  assert.equal(routeOpenedAlert({ eventType: 'company_booking_new', booking: { id: 'b1', status: 'cancelled' }, nowMs: now }), 'unavailable')
  assert.equal(routeOpenedAlert({ eventType: 'company_booking_new', booking: null, nowMs: now }), 'unavailable')
  assert.equal(routeOpenedAlert({ eventType: 'rescue_opportunity_new', rescue: { status: 'OFFERED', expires_at: '2026-10-27T12:00:30Z' }, nowMs: now }), 'open-rescue')
  assert.equal(routeOpenedAlert({ eventType: 'rescue_opportunity_new', rescue: { status: 'ACCEPTED', expires_at: '2026-10-27T12:00:30Z' }, nowMs: now }), 'unavailable')
  assert.equal(routeOpenedAlert({ eventType: 'rescue_opportunity_new', rescue: null, nowMs: now }), 'unavailable')
  assert.equal(routeOpenedAlert({ eventType: 'operator_test', booking: null, nowMs: now }), 'test')
})
