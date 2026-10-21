/**
 * OneSignal Web Push client (subscription + delivery layer).
 * Uses the unified root TAXIO worker (/sw.js, scope /) which also imports OneSignalSDK.sw.js.
 *
 * Staging active UX: OneSignal subscription state is the only notification-status authority.
 * Does not send Supabase JWTs to OneSignal. External ID is company:<company_id>.
 */
import { isTaxioStagingClient } from './companyPush.js'
import {
  ONESIGNAL_SW_PATH,
  ONESIGNAL_SW_SCOPE,
  companyOneSignalExternalId,
  isCompetingRootOneSignalWorker,
  isInstalledPwa,
  isIosDevice,
  isPushEnrollmentComplete,
  oneSignalInitWorkerOptions,
  planPushEnable,
  pushUiModeFromSnapshot,
} from './oneSignalEnablePlan.js'

export {
  ONESIGNAL_SW_PATH,
  ONESIGNAL_SW_SCOPE,
  PRODUCTION_PUSH_ORIGIN,
  IOS_HOME_SCREEN_MESSAGE,
  companyOneSignalExternalId,
  isCompetingRootOneSignalWorker,
  isIosDevice,
  isInstalledPwa,
  isPushEnrollmentComplete,
  oneSignalInitWorkerOptions,
  planPushEnable,
  pushUiModeFromSnapshot,
} from './oneSignalEnablePlan.js'

export const ONESIGNAL_SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'

const OPT_IN_WAIT_MS = 15_000
const OPT_IN_POLL_MS = 250

let sdkLoadPromise = null
let initPromise = null
let stagingCleanupPromise = null
let subscriptionListenersBound = false

const STAGING_ONESIGNAL_SCOPE_CLEANUP_KEY = 'taxio_os_onesignal_scope_cleaned'

export function getOneSignalAppId() {
  try {
    return String(import.meta.env?.VITE_ONESIGNAL_APP_ID || '').trim()
  } catch {
    return ''
  }
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

function platformLabel() {
  if (isIosDevice()) return 'ios'
  if (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '')) return 'android'
  return 'other'
}

/** Safe stage log. Never includes tokens, subscription ids, app ids, or keys. */
function logPushStage(step, extra = {}) {
  console.info('[TAXIO ONESIGNAL]', {
    step,
    platform: platformLabel(),
    standalone: isInstalledPwa(),
    swPath: extra.swPath ?? null,
    swScope: extra.swScope ?? null,
    swState: extra.swState ?? null,
    permission: extra.permission ?? nativePermission(),
    initialized: extra.initialized ?? null,
    optedIn: !!extra.optedIn,
    subscriptionIdPresent: !!extra.subscriptionIdPresent,
    tokenPresent: !!extra.tokenPresent,
    error: extra.error ? String(extra.error).slice(0, 240) : null,
  })
}

function scriptPathname(scriptURL) {
  try {
    return new URL(scriptURL).pathname
  } catch {
    return ''
  }
}

function scopePathname(scope) {
  try {
    return new URL(scope).pathname
  } catch {
    return ''
  }
}

/**
 * Make scope `/` belong to /sw.js.
 * Unregisters only a default OneSignalSDKWorker.js at that same scope.
 */
export async function ensureTaxioRootServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: false, code: 'NO_SW' }
  }
  const regs = await navigator.serviceWorker.getRegistrations()
  let droppedCompeting = 0
  for (const reg of regs) {
    const scriptURL = String(
      reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || ''
    )
    const scriptPath = scriptPathname(scriptURL)
    const scopePath = scopePathname(reg.scope)
    if (!isCompetingRootOneSignalWorker({ scriptPath, scopePath })) continue
    const did = await reg.unregister()
    if (did) droppedCompeting += 1
    logPushStage('SW_DROP_COMPETING', {
      swPath: scriptPath || null,
      swScope: scopePath || null,
      swState: reg.active?.state || reg.waiting?.state || reg.installing?.state || null,
    })
  }
  const reg = await navigator.serviceWorker.register(ONESIGNAL_SW_PATH, { scope: ONESIGNAL_SW_SCOPE })
  const ready = (await navigator.serviceWorker.ready) || reg
  const active = ready.active || reg.active
  logPushStage('SW_READY', {
    swPath: scriptPathname(active?.scriptURL || '') || ONESIGNAL_SW_PATH,
    swScope: scopePathname(ready.scope) || ONESIGNAL_SW_SCOPE,
    swState: active?.state || ready.installing?.state || ready.waiting?.state || null,
    initialized: false,
  })
  return { ok: true, code: 'SW_READY', droppedCompeting, registration: ready }
}

/**
 * A browser PushSubscription created with another VAPID key blocks OneSignal.
 * Drop that subscription only — do not unregister the service worker.
 */
async function clearBlockingBrowserPushSubscription() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false
  const reg = await navigator.serviceWorker.getRegistration(ONESIGNAL_SW_SCOPE)
  const existing = await reg?.pushManager?.getSubscription?.()
  if (!existing) return false
  const removed = await existing.unsubscribe()
  logPushStage('SW_CLEAR_STALE_SUBSCRIPTION', {
    swPath: scriptPathname(reg.active?.scriptURL || ''),
    swScope: scopePathname(reg.scope),
    swState: reg.active?.state || null,
    error: removed ? null : 'unsubscribe_returned_false',
  })
  return !!removed
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
      await ensureTaxioRootServiceWorker()
      await OneSignal.init({
        appId,
        ...oneSignalInitWorkerOptions(),
        notifyButton: { enable: false },
        welcomeNotification: { disable: true },
        allowLocalhostAsSecureOrigin: Boolean(import.meta.env.DEV),
      })
      bindOneSignalStateListeners(OneSignal)
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
  return isPushEnrollmentComplete({
    permission: snap?.browserPermission,
    optedIn: snap?.optedIn,
    subscriptionIdPresent: snap?.subscriptionIdPresent,
    tokenPresent: snap?.tokenPresent,
  })
}

function bindOneSignalStateListeners(OneSignal) {
  if (subscriptionListenersBound) return
  subscriptionListenersBound = true
  try {
    OneSignal.Notifications.addEventListener('permissionChange', (granted) => {
      logPushStage('permissionChange', {
        permission: granted === true ? 'granted' : granted === false ? 'denied' : nativePermission(),
        initialized: true,
      })
    })
  } catch {
    /* SDK build without this event */
  }
  try {
    OneSignal.User.PushSubscription.addEventListener('change', (event) => {
      const current = event?.current
      logPushStage('subscriptionChange', {
        permission: nativePermission(),
        initialized: true,
        optedIn: !!current?.optedIn,
        subscriptionIdPresent: !!current?.id,
        tokenPresent: !!current?.token,
      })
    })
  } catch {
    /* poll path still covers enrollment */
  }
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
    logPushStage('LOGIN', {
      permission: snap.browserPermission,
      initialized: true,
      optedIn: snap.optedIn,
      subscriptionIdPresent: snap.subscriptionIdPresent,
      tokenPresent: snap.tokenPresent,
      error: loginOk ? null : 'external_id_mismatch',
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
 * @returns {Promise<'unsupported'|'prompt'|'incomplete'|'on'|'blocked'>}
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
        logPushStage('LOGIN', {
          initialized: true,
          permission: nativePermission(),
          error: err?.message || 'login_soft_fail',
        })
      }
    }
    const snap = readOneSignalPushSnapshot(OneSignal)
    const mode = pushUiModeFromSnapshot({
      supported: true,
      permission: snap.browserPermission,
      optedIn: snap.optedIn,
      subscriptionIdPresent: snap.subscriptionIdPresent,
      tokenPresent: snap.tokenPresent,
    })
    logPushStage('UI_MODE', {
      permission: snap.browserPermission,
      initialized: true,
      optedIn: snap.optedIn,
      subscriptionIdPresent: snap.subscriptionIdPresent,
      tokenPresent: snap.tokenPresent,
      error: mode === 'on' ? null : mode,
    })
    return mode
  } catch (err) {
    logPushStage('UI_MODE', { initialized: false, error: err?.message || 'ui_mode_failed' })
    return nativePermission() === 'granted' ? 'incomplete' : 'prompt'
  }
}

/**
 * v16 optIn subscribes only when the SDK already reads permission as granted.
 * A first call can return after syncing permission and leave no push token.
 */
async function optInUntilSubscribed(OneSignal) {
  const stage = (step, snap, error = null) =>
    logPushStage(step, {
      permission: snap?.browserPermission || nativePermission(),
      initialized: true,
      optedIn: snap?.optedIn,
      subscriptionIdPresent: snap?.subscriptionIdPresent,
      tokenPresent: snap?.tokenPresent,
      error,
    })

  stage('OPT_IN', readOneSignalPushSnapshot(OneSignal))
  await OneSignal.User.PushSubscription.optIn()
  let after = await waitUntilOneSignalOptedIn(OneSignal)
  if (isActivelySubscribed(after)) return after

  stage('OPT_IN_RETRY', after, 'no_subscription_yet')
  await OneSignal.User.PushSubscription.optIn()
  after = await waitUntilOneSignalOptedIn(OneSignal, { timeoutMs: 8_000 })
  if (isActivelySubscribed(after)) return after

  const cleared = await clearBlockingBrowserPushSubscription()
  if (!cleared) return after
  await ensureTaxioRootServiceWorker()
  stage('OPT_IN_AFTER_STALE_SUBSCRIPTION', after)
  await OneSignal.User.PushSubscription.optIn()
  return waitUntilOneSignalOptedIn(OneSignal, { timeoutMs: 8_000 })
}

/**
 * Enable button path:
 * init → login(company:<id>) → permission → optIn → wait until opted in.
 */
export async function enableOneSignalTripNotifications(companyId) {
  const early = planPushEnable({
    supported: isOneSignalPushSupported(),
    ios: isIosDevice(),
    installedPwa: isInstalledPwa(),
    permission: nativePermission(),
    alreadySubscribed: false,
    companyId,
    appIdConfigured: Boolean(getOneSignalAppId()),
  })
  if (early.ok === false) {
    logPushStage(early.stage || early.code, {
      permission: nativePermission(),
      error: early.code,
    })
    return early
  }

  // Ask the browser while this tap is still the user gesture. Do not await
  // OneSignal login or init before this, or phones drop the prompt.
  let permission = nativePermission()
  if (permission === 'default' && typeof Notification !== 'undefined') {
    try {
      permission = await Notification.requestPermission()
    } catch (err) {
      const message = String(err?.message || err || 'requestPermission failed')
      logPushStage('PERMISSION', { error: message })
      return {
        ok: false,
        permission: nativePermission(),
        code: 'NOT_GRANTED',
        stage: 'PERMISSION',
        userMessage: 'Notifications were not allowed. Tap Enable notifications and choose Allow.',
        technicalReason: `PERMISSION — ${message}`,
      }
    }
  }
  if (permission === 'denied') {
    return { ok: false, permission: 'denied', code: 'DENIED', stage: 'PERMISSION' }
  }
  if (permission !== 'granted') {
    return {
      ok: false,
      permission,
      code: 'NOT_GRANTED',
      stage: 'PERMISSION',
      userMessage: 'Notifications were not allowed. Tap Enable notifications and choose Allow.',
    }
  }

  try {
    const OneSignal = await initOneSignalOnce()
    const before = readOneSignalPushSnapshot(OneSignal)
    logPushStage('AUDIT_BEFORE', {
      permission: before.browserPermission,
      initialized: true,
      optedIn: before.optedIn,
      subscriptionIdPresent: before.subscriptionIdPresent,
      tokenPresent: before.tokenPresent,
    })

    const externalId = companyOneSignalExternalId(companyId)
    await OneSignal.login(externalId)
    const afterLogin = await waitUntilExternalId(OneSignal, externalId)
    const seenId = afterLogin.externalId
    const loginOk = !seenId || seenId === externalId
    logPushStage('LOGIN', {
      permission: afterLogin.browserPermission,
      initialized: true,
      optedIn: afterLogin.optedIn,
      subscriptionIdPresent: afterLogin.subscriptionIdPresent,
      tokenPresent: afterLogin.tokenPresent,
      error: loginOk ? null : 'external_id_mismatch',
    })
    if (seenId && seenId !== externalId) {
      return {
        ok: false,
        permission: 'granted',
        code: 'LOGIN_FAILED',
        stage: 'LOGIN',
        userMessage: 'Could not link this phone to your company. Try again.',
        technicalReason: `LOGIN — externalId mismatch (got ${seenId})`,
        externalId,
        before,
        after: afterLogin,
        loginOk: false,
      }
    }

    if (isActivelySubscribed(afterLogin)) {
      logPushStage('ALREADY_SUBSCRIBED', {
        permission: 'granted',
        initialized: true,
        optedIn: true,
        subscriptionIdPresent: afterLogin.subscriptionIdPresent,
        tokenPresent: afterLogin.tokenPresent,
      })
      return {
        ok: true,
        permission: 'granted',
        code: 'ALREADY_SUBSCRIBED',
        externalId,
        subscriptionId: afterLogin.subscriptionId,
        tokenPresent: afterLogin.tokenPresent,
        before,
        after: afterLogin,
        loginOk: true,
      }
    }

    const after = await optInUntilSubscribed(OneSignal)
    logPushStage('AUDIT_AFTER', {
      permission: after.browserPermission,
      initialized: true,
      optedIn: after.optedIn,
      subscriptionIdPresent: after.subscriptionIdPresent,
      tokenPresent: after.tokenPresent,
      error: isActivelySubscribed(after) ? null : 'subscription_missing',
    })

    if (!isActivelySubscribed(after)) {
      const code = after.optedIn ? 'NO_SUBSCRIPTION' : 'NOT_OPTED_IN'
      return {
        ok: false,
        permission: 'granted',
        code,
        stage: 'OPT_IN',
        userMessage:
          'Permission was allowed, but the subscription did not finish. Try again.',
        technicalReason:
          code === 'NO_SUBSCRIPTION'
            ? 'OPT_IN — optedIn true but no subscription id/token yet'
            : 'OPT_IN — OneSignal PushSubscription.optedIn is still false after optIn() wait',
        externalId,
        subscriptionId: after.subscriptionId,
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
    logPushStage(stage, { initialized: true, error: `${name}: ${message}` })
    return {
      ok: false,
      permission: nativePermission(),
      code: err?.code || 'ENABLE_FAILED',
      stage,
      userMessage: 'Could not enable notifications. Try again.',
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

    const after = await optInUntilSubscribed(OneSignal)
    const ok = isActivelySubscribed(after)
    logPushStage('SOFT_SYNC', {
      permission: after.browserPermission,
      initialized: true,
      optedIn: after.optedIn,
      subscriptionIdPresent: after.subscriptionIdPresent,
      tokenPresent: after.tokenPresent,
      error: ok ? null : 'subscription_missing',
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
