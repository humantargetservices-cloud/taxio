/** Absolute path so registration does not resolve under /dashboard/company. */
export const ONESIGNAL_SW_PATH = '/sw.js'
export const ONESIGNAL_SW_SCOPE = '/'
/**
 * Canonical operator origin. Apex taxio.be redirects here; the service worker
 * and OneSignal site URL are this origin.
 */
export const PRODUCTION_PUSH_ORIGIN = 'https://www.taxio.be'

/**
 * OneSignal v16 Typical Site ignores serviceWorkerPath unless this override is set,
 * then registers /OneSignalSDKWorker.js. That URL is the SPA HTML rewrite (not JS),
 * so PushManager.subscribe never runs. Custom Code still receives the same path.
 * Path has no leading slash: the SDK joins it onto `path`.
 */
export function oneSignalInitWorkerOptions() {
  return {
    path: '/',
    serviceWorkerPath: 'sw.js',
    serviceWorkerParam: { scope: ONESIGNAL_SW_SCOPE },
    serviceWorkerOverrideForTypical: true,
  }
}

/**
 * Drop only a default OneSignal worker that occupies scope `/`.
 * Never matches /sw.js, /onesignal/, or any other scope.
 */
export function isCompetingRootOneSignalWorker({ scriptPath, scopePath } = {}) {
  const script = String(scriptPath || '')
  const scope = String(scopePath || '')
  if (scope !== '/') return false
  if (/\/sw\.js$/i.test(script)) return false
  return /\/OneSignalSDKWorker\.js$/i.test(script) || /\/OneSignalSDKUpdaterWorker\.js$/i.test(script)
}

/** Enabled only when the browser allowed notifications AND OneSignal has a real subscription. */
export function isPushEnrollmentComplete({
  permission,
  optedIn,
  subscriptionIdPresent,
  tokenPresent,
} = {}) {
  return permission === 'granted' && !!optedIn && !!(subscriptionIdPresent || tokenPresent)
}

/**
 * Dashboard card mode. Permission granted without a subscription is incomplete, never on.
 */
export function pushUiModeFromSnapshot({
  supported = true,
  permission,
  optedIn,
  subscriptionIdPresent,
  tokenPresent,
} = {}) {
  if (!supported) return 'unsupported'
  if (permission === 'denied') return 'blocked'
  if (
    isPushEnrollmentComplete({ permission, optedIn, subscriptionIdPresent, tokenPresent })
  ) {
    return 'on'
  }
  if (permission === 'granted') return 'incomplete'
  return 'prompt'
}
export const IOS_HOME_SCREEN_MESSAGE =
  'Add TAXIO to your Home Screen first: tap Share, then Add to Home Screen, open TAXIO from the installed icon, then tap Enable notifications.'

/** Stable OneSignal External ID for a company account (multi-device). */
export function companyOneSignalExternalId(companyId) {
  return `company:${String(companyId || '').trim()}`
}

export function isIosDevice(nav = typeof navigator !== 'undefined' ? navigator : undefined) {
  if (!nav) return false
  const ua = String(nav.userAgent || '')
  if (/iPad|iPhone|iPod/i.test(ua)) return true
  return nav.platform === 'MacIntel' && Number(nav.maxTouchPoints) > 1
}

export function isInstalledPwa(win = typeof window !== 'undefined' ? window : undefined) {
  if (!win) return false
  try {
    if (win.matchMedia?.('(display-mode: standalone)')?.matches) return true
  } catch {
    /* ignore */
  }
  return win.navigator?.standalone === true
}

/**
 * Pure enable decision used before any OneSignal network call.
 * ok null means continue (request permission or opt in).
 */
export function planPushEnable({
  supported,
  ios,
  installedPwa,
  permission,
  alreadySubscribed,
  companyId,
  appIdConfigured,
}) {
  const id = String(companyId || '').trim()
  if (!id) return { ok: false, code: 'NO_COMPANY', stage: 'LOGIN' }
  if (!appIdConfigured) {
    return {
      ok: false,
      code: 'MISSING_APP_ID',
      stage: 'INIT',
      userMessage: 'Notifications are not configured on this TAXIO site.',
      technicalReason: 'INIT — OneSignalConfigError: VITE_ONESIGNAL_APP_ID is not configured',
    }
  }
  if (ios && !installedPwa) {
    return {
      ok: false,
      code: 'IOS_NEEDS_HOME_SCREEN',
      stage: 'SUPPORT',
      userMessage: IOS_HOME_SCREEN_MESSAGE,
    }
  }
  if (!supported) {
    return {
      ok: false,
      code: 'UNSUPPORTED',
      permission: 'unsupported',
      stage: 'SUPPORT',
      userMessage: 'This browser cannot show TAXIO notifications.',
    }
  }
  if (permission === 'denied') {
    return { ok: false, code: 'DENIED', permission: 'denied', stage: 'PERMISSION' }
  }
  const externalId = companyOneSignalExternalId(id)
  if (alreadySubscribed && permission === 'granted') {
    return { ok: true, code: 'ALREADY_SUBSCRIBED', permission: 'granted', externalId }
  }
  return {
    ok: null,
    code: permission === 'granted' ? 'OPT_IN' : 'REQUEST_PERMISSION',
    externalId,
  }
}
