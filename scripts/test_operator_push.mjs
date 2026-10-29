import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildOperatorPushMessages, assertStagingPushTarget, interpretExpoPushTicket, interpretExpoReceipt, shouldSendAndroidPush, OPERATOR_CHANNEL_ID, OPERATOR_SOUND } from '../api/_operatorPush.js'

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
  assert.equal(messages[0].channelId, OPERATOR_CHANNEL_ID)
  assert.equal(messages[0].sound, OPERATOR_SOUND)
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

test('expo tickets revoke a dead device and retry only a rate limit', () => {
  assert.equal(interpretExpoPushTicket({ status: 'ok', id: 'ticket-1' }).outcome, 'accepted')
  assert.equal(interpretExpoPushTicket({ status: 'error', details: { error: 'DeviceNotRegistered' } }).revoke, true)
  assert.equal(interpretExpoPushTicket({ status: 'error', details: { error: 'MessageRateExceeded' } }).retry, true)
  assert.equal(interpretExpoReceipt({ status: 'ok' }).outcome, 'delivered')
  assert.equal(interpretExpoReceipt(null).outcome, 'pending')
})

test('a recorded android alert is not sent again while its receipt is still open', () => {
  const now = Date.parse('2026-10-29T12:00:00Z')
  assert.equal(shouldSendAndroidPush(null, now), true)
  assert.equal(shouldSendAndroidPush({ status: 'RECEIPT_OK', attempt_count: 1 }, now), false)
  assert.equal(shouldSendAndroidPush({ status: 'REVOKED', attempt_count: 1 }, now), false)
  assert.equal(shouldSendAndroidPush({ status: 'SENT', expo_ticket_id: 't', attempt_count: 1, updated_at: '2026-10-29T11:50:00Z' }, now), false)
  assert.equal(shouldSendAndroidPush({ status: 'FAILED', attempt_count: 1, updated_at: '2026-10-29T11:00:00Z' }, now), true)
  assert.equal(shouldSendAndroidPush({ status: 'FAILED', attempt_count: 3, updated_at: '2026-10-29T11:00:00Z' }, now), false)
})

test('android delivery still runs when web push already finished or failed', () => {
  const src = readFileSync(new URL('../api/company-push-dispatch.js', import.meta.url), 'utf8')
  assert.match(src, /if \(outbox\.status === 'SENT'\) \{[\s\S]{0,240}deliverOperatorAndroid/)
  assert.match(src, /const operatorPush = await deliverOperatorAndroid\(admin, outbox\)/)
  assert.equal((src.match(/deliverOperatorAndroid\(/g) || []).length >= 3, true)
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
