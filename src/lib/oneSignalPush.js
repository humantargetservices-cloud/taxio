/**
 * OneSignal Web Push client (subscription + delivery layer).
 * Uses the unified root TAXIO worker (/sw.js, scope /) which also imports OneSignalSDK.sw.js.
 *
 * Staging active UX: OneSignal subscription state is the only notification-status authority.
 * Does not send Supabase JWTs to OneSignal. External ID is company:<company_id>.
 */
import { isTaxioStagingClient } from './companyPush.js'

export const ONESIGNAL_SW_PATH = 'sw.js'
export const ONESIGNAL_SW_SCOPE = '/'
export const ONESIGNAL_SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'

const OPT_IN_WAIT_MS = 15_000
const OPT_IN_POLL_MS = 250

let sdkLoadPromise = null
let initPromise = null
let stagingCleanupPromise = null

const STAGING_ONESIGNAL_SCOPE_CLEANUP_KEY = 'taxio_os_onesignal_scope_cleaned'

export function getOneSignalAppId() {
  try {
    return String(import.meta.env?.VITE_ONESIGNAL_APP_ID || '').trim()
  } catch {
    return ''
  }
}

/** Stable OneSignal External ID for a company account (multi-device). */
export function companyOneSignalExternalId(companyId) {
  return `company:${String(companyId || '').trim()}`
}

export function isOneSignalPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof Notification !== 'undefined' &&
    ('PushManager' in window || 'safari' in window)
  )
}

function nativePermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

function loadOneSignalSdk() {
  if (typeof window === 'undefined') {
    return Promise.reject(Object.assign(new Error('ONESIGNAL_NO_WINDOW'), { stage: 'SDK_LOAD' }))
  }
  window.OneSignalDeferred = window.OneSignalDeferred || []
  if (window.OneSignal?.init) return Promise.resolve()
  if (sdkLoadPromise) return sdkLoadPromise

  sdkLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-taxio-onesignal-sdk]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(Object.assign(new Error('ONESIGNAL_SDK_LOAD_FAILED'), { stage: 'SDK_LOAD' })),
        { once: true }
      )
      return
    }
    const script = document.createElement('script')
    script.src = ONESIGNAL_SDK_URL
    script.async = true
    script.dataset.taxioOnesignalSdk = '1'
    script.onload = () => resolve()
    script.onerror = () =>
      reject(Object.assign(new Error('ONESIGNAL_SDK_LOAD_FAILED'), { stage: 'SDK_LOAD' }))
    document.head.appendChild(script)
  })

  return sdkLoadPromise
}

/**
 * @template T
 * @param {(OneSignal: any) => Promise<T> | T} fn
 * @returns {Promise<T>}
 */
async function withOneSignal(fn) {
  await loadOneSignalSdk()
  return new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        resolve(await fn(OneSignal))
      } catch (err) {
        reject(err)
      }
    })
  })
}

/**
 * Staging-only: unregister the old OneSignal-only worker (scope …/onesignal/).
 * Runs at most once per tab session; never unregisters root TAXIO /sw.js.
 */
export async function unregisterStagingScopedOneSignalWorker() {
  if (!isTaxioStagingClient()) {
    return { ok: false, code: 'NOT_STAGING', unregistered: 0 }
  }
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: false, code: 'NO_SW', unregistered: 0 }
  }

  try {
    if (sessionStorage.getItem(STAGING_ONESIGNAL_SCOPE_CLEANUP_KEY) === '1') {
      return { ok: true, code: 'ALREADY_CLEANED', unregistered: 0 }
    }
  } catch {
    /* private mode */
  }

  if (stagingCleanupPromise) return stagingCleanupPromise

  stagingCleanupPromise = (async () => {
    let unregistered = 0
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) {
        let pathname = ''
        try {
          pathname = new URL(reg.scope).pathname
        } catch {
          pathname = String(reg.scope || '')
        }
        if (!pathname.endsWith('/onesignal/') && pathname !== '/onesignal/') continue
        const scriptURL = String(
          reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || ''
        )
        // Only drop the dedicated onesignal worker — never root /sw.js
        if (scriptURL && /\/sw\.js(\?|$)/i.test(scriptURL) && !/onesignal/i.test(scriptURL)) {
          continue
        }
        const did = await reg.unregister()
        if (did) unregistered += 1
        console.info('[TAXIO ONESIGNAL]', {
          phase: 'STAGING_SW_CLEANUP',
          scope: reg.scope,
          scriptURL: scriptURL || null,
          unregistered: did,
        })
      }
      try {
        sessionStorage.setItem(STAGING_ONESIGNAL_SCOPE_CLEANUP_KEY, '1')
      } catch {
        /* ignore */
      }
      return { ok: true, code: unregistered > 0 ? 'CLEANED' : 'NOOP', unregistered }
    } catch (err) {
      console.warn('[TAXIO ONESIGNAL] staging SW cleanup failed', err?.message || err)
      stagingCleanupPromise = null
      return { ok: false, code: 'CLEANUP_FAILED', unregistered }
    }
  })()

  return stagingCleanupPromise
}

/**
 * Initialize OneSignal once per page lifetime.
 * @returns {Promise<any>} OneSignal SDK
 */
export async function initOneSignalOnce() {
  const appId = getOneSignalAppId()
  if (!appId) {
    throw Object.assign(new Error('VITE_ONESIGNAL_APP_ID is not configured'), {
      name: 'OneSignalConfigError',
      stage: 'INIT',
      code: 'MISSING_APP_ID',
    })
  }

  if (initPromise) return initPromise

  initPromise = withOneSignal(async (OneSignal) => {
    try {
      await unregisterStagingScopedOneSignalWorker()
      await OneSignal.init({
        appId,
        serviceWorkerPath: ONESIGNAL_SW_PATH,
        serviceWorkerParam: { scope: ONESIGNAL_SW_SCOPE },
        notifyButton: { enable: false },
        welcomeNotification: { disable: true },
        allowLocalhostAsSecureOrigin: Boolean(import.meta.env.DEV),
      })
    } catch (err) {
      const msg = String(err?.message || err || '')
      if (!/already been initialized|can only be initialized once/i.test(msg)) {
        throw Object.assign(err instanceof Error ? err : new Error(msg), {
          stage: 'INIT',
          code: 'INIT_FAILED',
        })
      }
    }
    return OneSignal
  }).catch((err) => {
    initPromise = null
    throw err
  })

  return initPromise
}

/**
 * Snapshot of browser + OneSignal push state (no secrets; token length only).
 * @param {any} OneSignal
 */
export function readOneSignalPushSnapshot(OneSignal) {
  const sub = OneSignal?.User?.PushSubscription
  const token = sub?.token ? String(sub.token) : ''
  return {
    browserPermission: nativePermission(),
    onesignalPermissionNative: OneSignal?.Notifications?.permissionNative || null,
    onesignalPermission: !!OneSignal?.Notifications?.permission,
    optedIn: !!sub?.optedIn,
    subscriptionIdPresent: !!sub?.id,
    subscriptionId: sub?.id ? String(sub.id) : null,
    tokenPresent: token.length > 0,
    tokenLength: token.length,
    externalId: OneSignal?.User?.externalId ? String(OneSignal.User.externalId) : null,
  }
}

function isActivelySubscribed(snap) {
  return !!(snap?.optedIn && (snap.subscriptionIdPresent || snap.tokenPresent))
}

/**
 * Wait briefly for User.externalId to reflect login().
 * @param {any} OneSignal
 * @param {string} expectedExternalId
 * @param {{ timeoutMs?: number }} [opts]
 */
async function waitUntilExternalId(OneSignal, expectedExternalId, opts = {}) {
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 8_000
  const matches = () => readOneSignalPushSnapshot(OneSignal).externalId === expectedExternalId
  if (matches()) return readOneSignalPushSnapshot(OneSignal)

  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      try {
        OneSignal.User.removeEventListener('change', onChange)
      } catch {
        /* ignore */
      }
      clearInterval(pollId)
      clearTimeout(timerId)
      resolve(readOneSignalPushSnapshot(OneSignal))
    }
    const onChange = () => {
      if (matches()) finish()
    }
    try {
      OneSignal.User.addEventListener('change', onChange)
    } catch {
      /* poll only */
    }
    const pollId = setInterval(() => {
      if (matches()) finish()
    }, OPT_IN_POLL_MS)
    const timerId = setTimeout(finish, timeoutMs)
  })
}

/**
 * Wait until OneSignal reports an active opt-in (change listener + poll).
 * @param {any} OneSignal
 * @param {{ timeoutMs?: number }} [opts]
 */
async function waitUntilOneSignalOptedIn(OneSignal, opts = {}) {
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : OPT_IN_WAIT_MS
  const immediate = readOneSignalPushSnapshot(OneSignal)
  if (isActivelySubscribed(immediate)) return immediate

  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      try {
        OneSignal.User.PushSubscription.removeEventListener('change', onChange)
      } catch {
        /* ignore */
      }
      clearInterval(pollId)
      clearTimeout(timerId)
      resolve(readOneSignalPushSnapshot(OneSignal))
    }

    const onChange = (event) => {
      const current = event?.current
      if (current?.optedIn && (current?.id || current?.token)) {
        finish()
        return
      }
      if (isActivelySubscribed(readOneSignalPushSnapshot(OneSignal))) finish()
    }

    try {
      OneSignal.User.PushSubscription.addEventListener('change', onChange)
    } catch {
      /* poll only */
    }

    const pollId = setInterval(() => {
      if (isActivelySubscribed(readOneSignalPushSnapshot(OneSignal))) finish()
    }, OPT_IN_POLL_MS)

    const timerId = setTimeout(finish, timeoutMs)
  })
}

/**
 * Associate device/user with company External ID (no JWT).
 */
export async function associateOneSignalCompany(companyId) {
  if (!companyId) {
    return { ok: false, code: 'NO_COMPANY', loginOk: false }
  }
  const externalId = companyOneSignalExternalId(companyId)
  try {
    const OneSignal = await initOneSignalOnce()
    await OneSignal.login(externalId)
    const snap = await waitUntilExternalId(OneSignal, externalId)
    const loginOk = snap.externalId === externalId
    console.info('[TAXIO ONESIGNAL]', {
      phase: 'LOGIN',
      expectedExternalId: externalId,
      loginOk,
      ...snap,
    })
    return {
      ok: loginOk,
      loginOk,
      externalId,
      code: loginOk ? 'LOGIN_OK' : 'LOGIN_MISMATCH',
      ...snap,
    }
  } catch (err) {
    console.warn('[TAXIO ONESIGNAL] associate failed', err?.message || err)
    return {
      ok: false,
      loginOk: false,
      code: err?.code || 'ASSOCIATE_FAILED',
      stage: err?.stage || 'LOGIN',
      technicalReason: `${err?.stage || 'LOGIN'} — ${err?.name || 'Error'}: ${err?.message || err}`,
    }
  }
}

/**
 * UI mode from OneSignal only (never legacy localStorage / company_push_subscriptions).
 * @returns {Promise<'unsupported'|'prompt'|'on'|'blocked'>}
 */
export async function resolveOneSignalPushUiMode(companyId) {
  if (!isOneSignalPushSupported()) return 'unsupported'
  if (nativePermission() === 'denied') return 'blocked'
  if (!getOneSignalAppId()) return 'prompt'

  try {
    const OneSignal = await initOneSignalOnce()
    if (companyId) {
      const externalId = companyOneSignalExternalId(companyId)
      try {
        await OneSignal.login(externalId)
      } catch (err) {
        console.warn('[TAXIO ONESIGNAL] UI login soft-fail', err?.message || err)
      }
    }
    const snap = readOneSignalPushSnapshot(OneSignal)
    console.info('[TAXIO ONESIGNAL]', { phase: 'UI_MODE', ...snap })
    if (isActivelySubscribed(snap)) return 'on'
    return 'prompt'
  } catch (err) {
    console.warn('[TAXIO ONESIGNAL] UI mode soft-fail', err?.message || err)
    return 'prompt'
  }
}

/**
 * Enable button path:
 * init → login(company:<id>) → permission → optIn → wait until opted in.
 */
export async function enableOneSignalTripNotifications(companyId) {
  if (!isOneSignalPushSupported()) {
    return { ok: false, permission: 'unsupported', code: 'UNSUPPORTED' }
  }
  if (!companyId) {
    return { ok: false, permission: nativePermission(), code: 'NO_COMPANY', stage: 'LOGIN' }
  }
  if (!getOneSignalAppId()) {
    return {
      ok: false,
      permission: nativePermission(),
      code: 'MISSING_APP_ID',
      stage: 'INIT',
      technicalReason: 'INIT — OneSignalConfigError: VITE_ONESIGNAL_APP_ID is not configured',
    }
  }

  try {
    const OneSignal = await initOneSignalOnce()
    const before = readOneSignalPushSnapshot(OneSignal)
    console.info('[TAXIO ONESIGNAL]', { phase: 'AUDIT_BEFORE', ...before })

    const externalId = companyOneSignalExternalId(companyId)
    await OneSignal.login(externalId)
    const afterLogin = await waitUntilExternalId(OneSignal, externalId)
    const loginOk = afterLogin.externalId === externalId
    console.info('[TAXIO ONESIGNAL]', {
      phase: 'LOGIN',
      expectedExternalId: externalId,
      loginOk,
      externalId: afterLogin.externalId,
    })
    if (!loginOk) {
      return {
        ok: false,
        permission: afterLogin.browserPermission,
        code: 'LOGIN_FAILED',
        stage: 'LOGIN',
        technicalReason: `LOGIN — externalId mismatch (got ${afterLogin.externalId || 'null'})`,
        externalId,
        before,
        after: afterLogin,
        loginOk: false,
      }
    }

    let permission = OneSignal.Notifications?.permissionNative || nativePermission()
    if (permission !== 'granted') {
      await OneSignal.Notifications.requestPermission()
      permission = OneSignal.Notifications?.permissionNative || nativePermission()
    }
    if (permission === 'denied') {
      return {
        ok: false,
        permission: 'denied',
        code: 'DENIED',
        stage: 'PERMISSION',
        externalId,
        before,
        loginOk: true,
      }
    }
    if (permission !== 'granted') {
      return {
        ok: false,
        permission,
        code: 'NOT_GRANTED',
        stage: 'PERMISSION',
        externalId,
        before,
        loginOk: true,
      }
    }

    // Always opt-in explicitly (even when browser permission was already granted)
    await OneSignal.User.PushSubscription.optIn()
    const after = await waitUntilOneSignalOptedIn(OneSignal)
    console.info('[TAXIO ONESIGNAL]', {
      phase: 'AUDIT_AFTER',
      expectedExternalId: externalId,
      loginOk: true,
      beforeOptedIn: before.optedIn,
      ...after,
    })

    if (!after.optedIn) {
      return {
        ok: false,
        permission: 'granted',
        code: 'NOT_OPTED_IN',
        stage: 'OPT_IN',
        technicalReason:
          'OPT_IN — OneSignal PushSubscription.optedIn is still false after optIn() wait',
        externalId,
        subscriptionId: after.subscriptionId,
        before,
        after,
        loginOk: true,
      }
    }

    if (!after.subscriptionIdPresent && !after.tokenPresent) {
      return {
        ok: false,
        permission: 'granted',
        code: 'NO_SUBSCRIPTION',
        stage: 'OPT_IN',
        technicalReason: 'OPT_IN — optedIn true but no subscription id/token yet',
        externalId,
        before,
        after,
        loginOk: true,
      }
    }

    return {
      ok: true,
      permission: 'granted',
      code: 'SUBSCRIBED',
      externalId,
      subscriptionId: after.subscriptionId,
      tokenPresent: after.tokenPresent,
      before,
      after,
      loginOk: true,
    }
  } catch (err) {
    const stage = err?.stage || 'ENABLE'
    const name = String(err?.name || 'Error')
    const message = String(err?.message || err || 'enable_failed')
    console.error('[TAXIO ONESIGNAL]', { phase: stage, errorName: name, errorMessage: message })
    return {
      ok: false,
      permission: nativePermission(),
      code: err?.code || 'ENABLE_FAILED',
      stage,
      technicalReason: `${stage} — ${name}: ${message}`,
    }
  }
}

/**
 * Soft re-sync: permission already granted but may still need OneSignal opt-in.
 */
export async function softSyncOneSignalTripNotifications(companyId) {
  if (!companyId || !getOneSignalAppId()) return { ok: false, code: 'SKIP' }
  if (nativePermission() !== 'granted') return { ok: false, code: 'NO_PERMISSION' }
  try {
    const OneSignal = await initOneSignalOnce()
    const externalId = companyOneSignalExternalId(companyId)
    await OneSignal.login(externalId)

    const before = readOneSignalPushSnapshot(OneSignal)
    if (isActivelySubscribed(before)) {
      return {
        ok: true,
        code: 'SUBSCRIBED',
        externalId,
        subscriptionId: before.subscriptionId,
        tokenPresent: before.tokenPresent,
        before,
        after: before,
      }
    }

    await OneSignal.User.PushSubscription.optIn()
    const after = await waitUntilOneSignalOptedIn(OneSignal)
    const ok = isActivelySubscribed(after)
    console.info('[TAXIO ONESIGNAL]', {
      phase: 'SOFT_SYNC',
      ok,
      beforeOptedIn: before.optedIn,
      ...after,
    })
    return {
      ok,
      code: ok ? 'SUBSCRIBED' : 'NOT_OPTED_IN',
      externalId,
      subscriptionId: after.subscriptionId,
      tokenPresent: after.tokenPresent,
      before,
      after,
    }
  } catch (err) {
    console.warn('[TAXIO ONESIGNAL] soft sync failed', err?.message || err)
    return { ok: false, code: 'SOFT_SYNC_FAILED' }
  }
}
