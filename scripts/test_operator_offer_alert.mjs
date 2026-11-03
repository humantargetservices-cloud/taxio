import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { routeOpenedAlert } from '../apps/operator/src/utils/bookingState.ts'
import {
  createOfferAlertController,
  remoteAlertExperience,
  stepOfferPlayback,
} from '../apps/operator/src/utils/offerAlertPlayback.ts'

const now = Date.parse('2026-10-27T12:00:00Z')
const future = { id: 'b1', status: 'new', decision_deadline_at: '2026-10-27T12:00:30Z' }
const expired = { id: 'b1', status: 'new', decision_deadline_at: '2026-10-27T11:59:00Z' }

function fakePlayer() {
  const calls = []
  let pending = null
  const player = {
    playing: false,
    loop: false,
    playCount: 0,
    pauseCount: 0,
    calls,
    play() {
      if (this.playing) throw new Error('overlapping loop')
      this.playing = true
      this.playCount += 1
      calls.push('play')
    },
    pause() {
      this.playing = false
      this.pauseCount += 1
      calls.push('pause')
    },
    seekTo() {
      calls.push('seek')
      if (!pending) return Promise.resolve()
      const wait = pending
      pending = null
      return wait
    },
    holdNextSeek() {
      let release
      pending = new Promise(resolve => { release = resolve })
      return release
    },
  }
  return player
}

function open(id, seconds = 30) {
  return { appActive: true, offerId: id, secondsRemaining: seconds }
}

test('a real booking repeats only while its server deadline is open', async () => {
  const player = fakePlayer()
  const alerts = createOfferAlertController(player)
  await alerts.dispatch(open('booking-1', 30))
  assert.equal(player.playCount, 1)
  assert.equal(player.playing, true)
  await alerts.dispatch(open('booking-1', 12))
  assert.equal(player.playCount, 1, 'the same offer must not start a second loop')
  await alerts.dispatch(open('booking-1', 0))
  assert.equal(player.playing, false)
  assert.equal(player.playCount, 1)
  assert.equal(alerts.snapshot().playing, false)
})

test('accept, decline, cancel, replace, background and cleanup each stop the loop', async () => {
  for (const reason of ['accepted', 'declined', 'cancelled', 'background', 'cleanup']) {
    const player = fakePlayer()
    const alerts = createOfferAlertController(player)
    await alerts.dispatch(open('booking-1'))
    await alerts.dispatch({ ...open('booking-1'), stopReason: reason, appActive: reason !== 'background', secondsRemaining: reason === 'expired' ? 0 : 20 })
    assert.equal(player.playing, false, reason)
    assert.equal(alerts.snapshot().offerId, null, reason)
  }
})

test('a replacement offer stops the previous loop before starting one new loop', async () => {
  const player = fakePlayer()
  const alerts = createOfferAlertController(player)
  await alerts.dispatch(open('booking-1'))
  await alerts.dispatch(open('booking-2'))
  assert.equal(player.playCount, 2)
  assert.equal(player.playing, true)
  assert.equal(alerts.snapshot().offerId, 'booking-2')
  assert.ok(player.calls.indexOf('pause') < player.calls.lastIndexOf('play'))
})

test('a Rescue offer uses the same single loop and stops when it expires', async () => {
  const player = fakePlayer()
  const alerts = createOfferAlertController(player)
  await alerts.dispatch(open('rescue-1', 20))
  await alerts.dispatch(open('rescue-1', 0))
  assert.equal(player.playing, false)
  assert.equal(player.playCount, 1)
})

test('a stop that arrives while playback is starting prevents the loop', async () => {
  const player = fakePlayer()
  const release = player.holdNextSeek()
  const alerts = createOfferAlertController(player)
  const started = alerts.dispatch(open('booking-1'))
  const stopped = alerts.dispatch({ appActive: true, offerId: 'booking-1', secondsRemaining: 0 })
  release()
  await started
  await stopped
  assert.equal(player.playCount, 0)
  assert.equal(player.playing, false)
})

test('foreground, background and locked screen have different achievable alerts', () => {
  assert.deepEqual(remoteAlertExperience('foreground'), {
    fullScreen: true,
    sound: 'repeat-until-server-deadline',
    headsUp: false,
    automaticLockScreenTakeover: false,
    tapRefreshesBeforeScreen: true,
  })
  for (const surface of ['background', 'locked']) {
    const experience = remoteAlertExperience(surface)
    assert.equal(experience.fullScreen, false)
    assert.equal(experience.sound, 'once')
    assert.equal(experience.headsUp, true)
    assert.equal(experience.automaticLockScreenTakeover, false)
    assert.equal(experience.tapRefreshesBeforeScreen, true)
  }
})

test('a refreshed booking or Rescue decides the screen after a background or locked tap', () => {
  assert.equal(routeOpenedAlert({ eventType: 'company_booking_new', booking: future, nowMs: now }), 'open-booking')
  assert.equal(routeOpenedAlert({ eventType: 'company_booking_new', booking: expired, nowMs: now }), 'expired')
  assert.equal(routeOpenedAlert({ eventType: 'company_booking_new', booking: { id: 'b1', status: 'rejected' }, nowMs: now }), 'unavailable')
  assert.equal(routeOpenedAlert({ eventType: 'rescue_opportunity_new', rescue: { status: 'OFFERED', expires_at: '2026-10-27T12:00:30Z' }, nowMs: now }), 'open-rescue')
  assert.equal(routeOpenedAlert({ eventType: 'rescue_opportunity_new', rescue: { status: 'OFFERED', expires_at: '2026-10-27T11:59:00Z' }, nowMs: now }), 'unavailable')
  const stopped = stepOfferPlayback(
    { generation: 1, offerId: 'b1', playing: true },
    { appActive: true, offerId: 'b1', secondsRemaining: 0 },
  )
  assert.equal(stopped.effect, 'stop')
  assert.equal(stopped.reason, 'expired')
  assert.equal(stopped.session.playing, false)
})

test('the installed app and the staging sender use the same new channel', () => {
  const app = readFileSync(new URL('../apps/operator/src/pushRegistration.ts', import.meta.url), 'utf8')
  const sender = readFileSync(new URL('../api/_operatorPush.js', import.meta.url), 'utf8')
  assert.match(app, /taxio-offers-v3/)
  assert.equal(app.includes('taxio-offers-v2'), false)
  assert.match(sender, /OPERATOR_CHANNEL_ID = 'taxio-offers-v3'/)
  assert.match(sender, /priority: 'high'/)
})
