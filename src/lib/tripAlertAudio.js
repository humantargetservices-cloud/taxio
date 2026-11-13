/**
 * Foreground-only TAXIO trip alert.
 *
 * This module never changes booking / Rescue state. Server state remains authoritative.
 * Background / locked-phone alerts stay on the existing OneSignal Web Push path.
 */

const ALERT_OWNER_KEY = 'taxio_trip_alert_owner_v1'
const OWNER_LEASE_MS = 4500
const OWNER_HEARTBEAT_MS = 1500
const HORN_ON_MS = 720
const HORN_PERIOD_MS = 1050
const VIBRATE_REPEAT_MS = 3200

const tabId =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`

let currentKey = ''
let audioContext = null
let gainNode = null
let oscillators = []
let hornInterval = null
let hornOffTimer = null
let vibrationInterval = null
let ownerHeartbeat = null
let lifecycleInstalled = false
let onVisibleRefresh = null
let channel = null

function safeParse(raw) {
  try {
    return JSON.parse(raw || 'null')
  } catch {
    return null
  }
}

function nowMs() {
  return Date.now()
}

function readOwner() {
  if (typeof localStorage === 'undefined') return null
  return safeParse(localStorage.getItem(ALERT_OWNER_KEY))
}

function writeOwner(requestKey) {
  if (typeof localStorage === 'undefined') return true
  const now = nowMs()
  const existing = readOwner()
  if (
    existing?.requestKey === requestKey &&
    existing?.tabId &&
    existing.tabId !== tabId &&
    Number(existing.expiresAt || 0) > now
  ) {
    return false
  }
  const mine = { tabId, requestKey, expiresAt: now + OWNER_LEASE_MS }
  localStorage.setItem(ALERT_OWNER_KEY, JSON.stringify(mine))
  const verify = readOwner()
  return verify?.tabId === tabId && verify?.requestKey === requestKey
}

function renewOwner() {
  if (!currentKey || typeof localStorage === 'undefined') return
  const owner = readOwner()
  if (owner?.tabId !== tabId || owner?.requestKey !== currentKey) {
    stopLocalAlert({ releaseOwner: false })
    return
  }
  localStorage.setItem(
    ALERT_OWNER_KEY,
    JSON.stringify({
      tabId,
      requestKey: currentKey,
      expiresAt: nowMs() + OWNER_LEASE_MS,
    })
  )
}

function releaseOwner(requestKey = currentKey) {
  if (!requestKey || typeof localStorage === 'undefined') return
  const owner = readOwner()
  if (owner?.tabId === tabId && owner?.requestKey === requestKey) {
    localStorage.removeItem(ALERT_OWNER_KEY)
  }
}

function ensureChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return channel
  channel = new BroadcastChannel('taxio-trip-alert-v1')
  channel.addEventListener('message', (event) => {
    const msg = event?.data || {}
    if (msg.type === 'STOP' && msg.requestKey && msg.requestKey === currentKey) {
      stopLocalAlert({ releaseOwner: true })
    }
    if (
      msg.type === 'CLAIM' &&
      msg.requestKey &&
      msg.requestKey === currentKey &&
      msg.tabId &&
      msg.tabId !== tabId &&
      String(msg.tabId) < String(tabId)
    ) {
      stopLocalAlert({ releaseOwner: true })
    }
  })
  return channel
}

function ensureAudioContext() {
  if (audioContext) return audioContext
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext
  if (!Ctx) return null
  audioContext = new Ctx()
  return audioContext
}

async function primeAudio() {
  const ctx = ensureAudioContext()
  if (!ctx) return false
  try {
    if (ctx.state === 'suspended') await ctx.resume()
    return ctx.state === 'running'
  } catch {
    return false
  }
}

function setHornLevel(on) {
  if (!gainNode || !audioContext) return
  const t = audioContext.currentTime
  const target = on ? 0.24 : 0.0001
  try {
    gainNode.gain.cancelScheduledValues(t)
    gainNode.gain.setTargetAtTime(target, t, on ? 0.018 : 0.025)
  } catch {
    gainNode.gain.value = on ? 0.24 : 0
  }
}

function pulseHorn() {
  setHornLevel(true)
  if (hornOffTimer) clearTimeout(hornOffTimer)
  hornOffTimer = setTimeout(() => setHornLevel(false), HORN_ON_MS)
}

async function startAudio() {
  const ctx = ensureAudioContext()
  if (!ctx) return false
  try {
    if (ctx.state === 'suspended') await ctx.resume()
  } catch {
    return false
  }
  if (ctx.state !== 'running') return false

  if (!gainNode) {
    gainNode = ctx.createGain()
    gainNode.gain.value = 0.0001
    gainNode.connect(ctx.destination)
  }

  if (!oscillators.length) {
    const a = ctx.createOscillator()
    const b = ctx.createOscillator()
    a.type = 'square'
    b.type = 'sawtooth'
    a.frequency.value = 390
    b.frequency.value = 465
    a.connect(gainNode)
    b.connect(gainNode)
    a.start()
    b.start()
    oscillators = [a, b]
  }

  pulseHorn()
  hornInterval = setInterval(pulseHorn, HORN_PERIOD_MS)
  return true
}

function startVibration() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  const pattern = [700, 200, 700, 200, 1000]
  try {
    navigator.vibrate(pattern)
    vibrationInterval = setInterval(() => {
      if (currentKey && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        navigator.vibrate(pattern)
      }
    }, VIBRATE_REPEAT_MS)
  } catch {
    /* progressive enhancement only */
  }
}

function stopSoundAndVibration() {
  if (hornInterval) clearInterval(hornInterval)
  if (hornOffTimer) clearTimeout(hornOffTimer)
  if (vibrationInterval) clearInterval(vibrationInterval)
  hornInterval = null
  hornOffTimer = null
  vibrationInterval = null
  setHornLevel(false)
  try {
    navigator?.vibrate?.(0)
  } catch {
    /* ignore */
  }
}

function stopLocalAlert({ releaseOwner: shouldReleaseOwner = true } = {}) {
  const previousKey = currentKey
  currentKey = ''
  stopSoundAndVibration()
  if (ownerHeartbeat) clearInterval(ownerHeartbeat)
  ownerHeartbeat = null
  if (shouldReleaseOwner) releaseOwner(previousKey)
}

export function stopForegroundTripAlert({ broadcast = false } = {}) {
  const requestKey = currentKey
  stopLocalAlert({ releaseOwner: true })
  if (broadcast && requestKey) {
    try {
      ensureChannel()?.postMessage({ type: 'STOP', requestKey, tabId })
    } catch {
      /* best effort */
    }
  }
}

async function startForegroundTripAlert(requestKey) {
  if (!requestKey || typeof document === 'undefined' || document.visibilityState !== 'visible') {
    return false
  }
  if (currentKey === requestKey) return true

  stopLocalAlert({ releaseOwner: true })
  if (!writeOwner(requestKey)) return false

  currentKey = requestKey
  ensureChannel()
  try {
    channel?.postMessage({ type: 'CLAIM', requestKey, tabId })
  } catch {
    /* best effort */
  }

  ownerHeartbeat = setInterval(renewOwner, OWNER_HEARTBEAT_MS)
  await startAudio()
  startVibration()
  return true
}

/**
 * Keep the foreground alert aligned to the currently actionable request.
 * Pass an empty requestKey when there is no actionable Company A / Rescue request.
 */
export function syncForegroundTripAlert(requestKey) {
  const key = String(requestKey || '').trim()
  const visible = typeof document !== 'undefined' && document.visibilityState === 'visible'

  if (!key || !visible) {
    if (currentKey) stopForegroundTripAlert({ broadcast: !key })
    return
  }

  if (currentKey === key) return
  void startForegroundTripAlert(key)
}

/**
 * Install once per page lifetime. A normal user gesture primes Web Audio so a later
 * actionable request can ring without changing the notification permission flow.
 */
export function installForegroundTripAlertLifecycle(refreshWhenVisible) {
  onVisibleRefresh = typeof refreshWhenVisible === 'function' ? refreshWhenVisible : onVisibleRefresh
  if (lifecycleInstalled || typeof document === 'undefined') return
  lifecycleInstalled = true
  ensureChannel()

  const unlock = () => {
    void primeAudio()
  }
  document.addEventListener('pointerdown', unlock, { passive: true })
  document.addEventListener('keydown', unlock, { passive: true })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Background / locked phone is owned by OneSignal system push, not browser audio.
      stopForegroundTripAlert({ broadcast: false })
      return
    }
    try {
      onVisibleRefresh?.()
    } catch {
      /* notification UI remains usable */
    }
  })
}
