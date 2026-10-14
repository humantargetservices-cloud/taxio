/**
 * OneSignal Web Push client (subscription + delivery layer).
 * TAXIO /sw.js remains the PWA/cache worker; OneSignal uses a separate scope.
 *
 * Does not send Supabase JWTs to OneSignal. External ID is company:<company_id>.
 */
export const ONESIGNAL_SW_PATH = 'onesignal/OneSignalSDKWorker.js'
export const ONESIGNAL_SW_SCOPE = '/onesignal/'
export const ONESIGNAL_SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'

let sdkLoadPromise = null
let initPromise = null

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
 * Run against the OneSignal SDK instance (via OneSignalDeferred queue).
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
    // Re-entrant: SDK may already be initialized (HMR / remount).
    try {
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
      // Already initialized is OK for SPA remounts.
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
 * Associate device/user with company External ID (no JWT).
 * Safe to call on every authenticated dashboard load.
 */
export async function associateOneSignalCompany(companyId) {
  if (!companyId) {
    return { ok: false, code: 'NO_COMPANY' }
  }
  const externalId = companyOneSignalExternalId(companyId)
  try {
    const OneSignal = await initOneSignalOnce()
    await OneSignal.login(externalId)
    console.info('[TAXIO ONESIGNAL]', {
      phase: 'LOGIN',
      externalId,
      subscriptionId: OneSignal.User?.PushSubscription?.id || null,
      optedIn: !!OneSignal.User?.PushSubscription?.optedIn,
    })
    return {
      ok: true,
      externalId,
      subscriptionId: OneSignal.User?.PushSubscription?.id || null,
      optedIn: !!OneSignal.User?.PushSubscription?.optedIn,
    }
  } catch (err) {
    console.warn('[TAXIO ONESIGNAL] associate failed', err?.message || err)
    return {
      ok: false,
      code: err?.code || 'ASSOCIATE_FAILED',
      stage: err?.stage || 'LOGIN',
      technicalReason: `${err?.stage || 'LOGIN'} — ${err?.name || 'Error'}: ${err?.message || err}`,
    }
  }
}

function nativePermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

/**
 * Button path: init → permission → subscribe → External ID.
 * @returns {{ ok: boolean, permission: string, code?: string, stage?: string, technicalReason?: string, externalId?: string, subscriptionId?: string }}
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

    await OneSignal.Notifications.requestPermission()
    const permission = OneSignal.Notifications?.permissionNative || nativePermission()
    if (permission === 'denied') {
      return { ok: false, permission: 'denied', code: 'DENIED', stage: 'PERMISSION' }
    }
    if (permission !== 'granted') {
      return { ok: false, permission, code: 'NOT_GRANTED', stage: 'PERMISSION' }
    }

    await OneSignal.User.PushSubscription.optIn()

    const externalId = companyOneSignalExternalId(companyId)
    await OneSignal.login(externalId)

    const optedIn = !!OneSignal.User?.PushSubscription?.optedIn
    const subscriptionId = OneSignal.User?.PushSubscription?.id || null

    console.info('[TAXIO ONESIGNAL]', {
      phase: 'SUBSCRIBE',
      externalId,
      subscriptionId,
      optedIn,
      permission,
    })

    if (!optedIn && !subscriptionId) {
      return {
        ok: false,
        permission: 'granted',
        code: 'SUBSCRIBE_FAILED',
        stage: 'OPT_IN',
        technicalReason: 'OPT_IN — not opted in after OneSignal.User.PushSubscription.optIn()',
        externalId,
      }
    }

    return {
      ok: true,
      permission: 'granted',
      code: 'SUBSCRIBED',
      externalId,
      subscriptionId,
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
 * Soft re-sync when OS permission already granted (no nagging prompt expected).
 */
export async function softSyncOneSignalTripNotifications(companyId) {
  if (!companyId || !getOneSignalAppId()) return { ok: false, code: 'SKIP' }
  if (nativePermission() !== 'granted') return { ok: false, code: 'NO_PERMISSION' }
  try {
    const OneSignal = await initOneSignalOnce()
    await OneSignal.User.PushSubscription.optIn()
    const externalId = companyOneSignalExternalId(companyId)
    await OneSignal.login(externalId)
    const optedIn = !!OneSignal.User?.PushSubscription?.optedIn
    return {
      ok: optedIn || !!OneSignal.User?.PushSubscription?.id,
      code: optedIn ? 'SUBSCRIBED' : 'PARTIAL',
      externalId,
      subscriptionId: OneSignal.User?.PushSubscription?.id || null,
    }
  } catch (err) {
    console.warn('[TAXIO ONESIGNAL] soft sync failed', err?.message || err)
    return { ok: false, code: 'SOFT_SYNC_FAILED' }
  }
}
