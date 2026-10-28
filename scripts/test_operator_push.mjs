import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOperatorPushMessages, assertStagingPushTarget } from '../api/_operatorPush.js'

test('push messages keep routing ids and drop passenger contact fields', () => {
  const messages = buildOperatorPushMessages(
    [
      { expo_push_token: 'ExponentPushToken[abc]', revoked_at: null },
      { expo_push_token: 'ExponentPushToken[abc]', revoked_at: null },
      { expo_push_token: 'ExponentPushToken[revoked]', revoked_at: '2026-01-01T00:00:00Z' },
      { expo_push_token: 'not-a-token', revoked_at: null },
    ],
    {
      title: 'New trip request',
      body: 'Station → Airport',
      eventType: 'company_booking_new',
      bookingId: 'booking-1',
      data: {
        booking_id: 'booking-1',
        customer_phone: '+32000000000',
        passenger_name: 'Hidden',
      },
    },
  )
  assert.equal(messages.length, 1)
  assert.equal(messages[0].to, 'ExponentPushToken[abc]')
  assert.equal(messages[0].channelId, 'taxio-offers')
  assert.equal(messages[0].priority, 'high')
  assert.equal(messages[0].data.booking_id, 'booking-1')
  assert.equal(messages[0].data.customer_phone, undefined)
  assert.equal(messages[0].data.passenger_name, undefined)
})

test('sender refuses a production Supabase host', () => {
  const previous = process.env.SUPABASE_URL
  process.env.SUPABASE_URL = 'https://gdiamipqrhxbmrcsnqdk.supabase.co'
  try {
    assert.deepEqual(assertStagingPushTarget(), { ok: false, code: 'PRODUCTION_REFUSED' })
  } finally {
    if (previous == null) delete process.env.SUPABASE_URL
    else process.env.SUPABASE_URL = previous
  }
})

test('sender stays closed unless the staging project is configured', () => {
  const previous = process.env.SUPABASE_URL
  delete process.env.SUPABASE_URL
  try {
    assert.equal(assertStagingPushTarget().code, 'NOT_STAGING')
  } finally {
    if (previous == null) delete process.env.SUPABASE_URL
    else process.env.SUPABASE_URL = previous
  }
})
