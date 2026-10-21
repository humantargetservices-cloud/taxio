/** Absolute path so registration does not resolve under /dashboard/company. */
export const ONESIGNAL_SW_PATH = '/sw.js'
export const ONESIGNAL_SW_SCOPE = '/'
/**
 * Canonical operator origin. Apex taxio.be redirects here; the service worker
 * and OneSignal site URL are this origin.
 */
export const PRODUCTION_PUSH_ORIGIN = 'https://www.taxio.be'

/**
 * Production OneSignal is a Typical Site. The dashboard already sets
 * path /onesignal/, OneSignalSDKWorker.js, OneSignalSDKUpdaterWorker.js,
 * and scope /onesignal/. Do not pass serviceWorkerPath, serviceWorkerParam,
 * or serviceWorkerOverrideForTypical — those replace the dashboard config.
 * /sw.js stays the TAXIO PWA worker (ONESIGNAL_SW_PATH) and is not this config.
 * Staging uses the same init; its own OneSignal app id selects its dashboard config.
 */
export function oneSignalInitWorkerOptions() {
  return {}
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

/**
 * Company alias is linked only when OneSignal reports that exact external id.
 * An empty or different id is not a successful association.
 */
export function externalIdAssociationOk(seenId, expectedExternalId) {
  const expected = String(expectedExternalId || '').trim()
  if (!expected) return false
  return String(seenId || '') === expected
}

/** Enabled only when permission, a real subscription, and the company external id all match. */
export function isPushEnrollmentComplete({
  permission,
  optedIn,
  subscriptionIdPresent,
  tokenPresent,
  externalId,
  expectedExternalId,
} = {}) {
  return (
    permission === 'granted' &&
    !!optedIn &&
    !!(subscriptionIdPresent || tokenPresent) &&
    externalIdAssociationOk(externalId, expectedExternalId)
  )
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
  externalId,
  expectedExternalId,
} = {}) {
  if (!supported) return 'unsupported'
  if (permission === 'denied') return 'blocked'
  if (
    isPushEnrollmentComplete({
      permission,
      optedIn,
      subscriptionIdPresent,
      tokenPresent,
      externalId,
      expectedExternalId,
    })
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
