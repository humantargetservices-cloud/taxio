/**
 * Company PWA Web Push subscribe helpers (client).
 * Stores subscription via authenticated /api/company-push-subscribe.
 *
 * Auth always uses a CURRENT Supabase access token (getSession + refresh),
 * never a token captured at dashboard mount.
 */
import { apiUrl } from './api.js'
import { supabase } from './supabase.js'
import { initServiceWorkerRegistration, waitForServiceWorkerReady } from './pwaInstallPrompt.js'

const ACCESS_TOKEN_REFRESH_SKEW_MS = 60_000
const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

/** Staging host / env only — never show technical push errors on production. */
export function isTaxioStagingClient() {
  try {
    if (
      String(import.meta.env?.VITE_TAXIO_STAGING || '')
        .trim()
        .toLowerCase() === 'true'
    ) {
      return true
    }
  } catch {
    /* ignore */
  }
  if (typeof window === 'undefined') return false
  const host = String(window.location.hostname || '').toLowerCase()
  return host === 'staging.taxio.be' || host.startsWith('staging.') || host.includes('stagingtaxio')
}

export function pushPermissionState() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  )
}

/** @param {{ access_token?: string, expires_at?: number } | null | undefined} session */
function accessTokenNeedsRefresh(session, nowMs = Date.now(), skewMs = ACCESS_TOKEN_REFRESH_SKEW_MS) {
  if (!session?.access_token) return true
  const exp = Number(session.expires_at)
  if (!Number.isFinite(exp) || exp <= 0) return false
  return exp * 1000 <= nowMs + skewMs
}

/**
 * Current Supabase access token for push API calls.
 * Always reads live session; refreshes when missing / expired / within 60s of expiry.
 */
export async function getFreshPushAccessToken() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data?.session?.access_token) {
      return { ok: false, code: 'SESSION_EXPIRED', error: SESSION_EXPIRED_MESSAGE, stage: 'AUTH_GET' }
    }
    let session = data.session
    if (accessTokenNeedsRefresh(session)) {
      const { data: refreshed, error: refErr } = await supabase.auth.refreshSession()
      if (refErr || !refreshed?.session?.access_token) {
        return { ok: false, code: 'SESSION_EXPIRED', error: SESSION_EXPIRED_MESSAGE, stage: 'AUTH_GET' }
      }
      session = refreshed.session
    }
    return { ok: true, accessToken: session.access_token, expiresAt: session.expires_at }
  } catch (e) {
    console.warn('[company-push] getFreshPushAccessToken', e?.message || e)
    return { ok: false, code: 'SESSION_EXPIRED', error: SESSION_EXPIRED_MESSAGE, stage: 'AUTH_GET' }
  }
}

function isPushAuthFailure(res, body) {
  if (res?.status === 401) return true
  const code = String(body?.code || '')
  if (code === 'NOT_AUTHENTICATED' || code === 'SESSION_EXPIRED') return true
  return /invalid auth token|missing bearer token/i.test(String(body?.error || ''))
}

/**
 * Authenticated fetch to /api/company-push-subscribe with fresh token + one 401 retry.
 * @param {'GET'|'POST'|'DELETE'} method
 * @param {object | null} body
 * @param {string} stageFailLabel AUTH_GET | AUTH_POST | …
 */
async function pushAuthedFetch(method, body, stageFailLabel) {
  const fresh = await getFreshPushAccessToken()
  if (!fresh.ok) {
    return {
      ok: false,
      status: 401,
      body: { ok: false, code: 'SESSION_EXPIRED', error: SESSION_EXPIRED_MESSAGE },
      stage: stageFailLabel || 'AUTH_GET',
      authRetries: 0,
    }
  }

  const doFetch = async (accessToken) => {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    }
    if (method !== 'GET') headers['Content-Type'] = 'application/json'
    const res = await fetch(apiUrl('/api/company-push-subscribe'), {
      method,
      headers,
      credentials: 'same-origin',
      body: method === 'GET' ? undefined : JSON.stringify(body || {}),
    })
    const parsed = await res.json().catch(() => ({}))
    return { res, body: parsed }
  }

  let { res, body: respBody } = await doFetch(fresh.accessToken)
  let authRetries = 0

  if (isPushAuthFailure(res, respBody)) {
    const { data: refreshed, error: refErr } = await supabase.auth.refreshSession()
    if (refErr || !refreshed?.session?.access_token) {
      return {
        ok: false,
        status: 401,
        body: { ok: false, code: 'SESSION_EXPIRED', error: SESSION_EXPIRED_MESSAGE },
        stage: stageFailLabel || 'AUTH_GET',
        authRetries: 0,
      }
    }
    authRetries = 1
    ;({ res, body: respBody } = await doFetch(refreshed.session.access_token))
  }

  if (isPushAuthFailure(res, respBody)) {
    return {
      ok: false,
      status: 401,
      body: { ok: false, code: 'SESSION_EXPIRED', error: SESSION_EXPIRED_MESSAGE },
      stage: stageFailLabel || 'AUTH_GET',
      authRetries,
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    body: respBody,
    stage: null,
    authRetries,
  }
}

export async function fetchVapidPublicKey() {
  const result = await pushAuthedFetch('GET', null, 'AUTH_GET')
  if (!result.ok) {
    const err = new Error(result.body?.error || SESSION_EXPIRED_MESSAGE)
    err.name = result.body?.code === 'SESSION_EXPIRED' ? 'SessionExpired' : 'AuthGetFailed'
    err.stage = result.stage || 'AUTH_GET'
    err.code = result.body?.code || 'AUTH_GET_FAILED'
    throw err
  }
  const key = String(result.body?.vapidPublicKey || '').trim()
  if (!key) {
    const err = new Error('VAPID_PUBLIC_MISSING')
    err.stage = 'AUTH_GET'
    throw err
  }
  return { vapidPublicKey: key, companyId: result.body.companyId || null }
}

export async function storePushSubscription(subscription) {
  const json = subscription?.toJSON ? subscription.toJSON() : subscription
  const result = await pushAuthedFetch(
    'POST',
    {
      endpoint: json.endpoint,
      keys: json.keys,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    },
    'AUTH_POST'
  )
  if (!result.ok) {
    const err = new Error(
      result.body?.code === 'SESSION_EXPIRED' || result.status === 401
        ? SESSION_EXPIRED_MESSAGE
        : result.body?.error || result.body?.code || 'SUBSCRIBE_SAVE_FAILED'
    )
    err.name = result.body?.code === 'SESSION_EXPIRED' ? 'SessionExpired' : 'DbStoreFailed'
    err.stage = result.body?.code === 'SESSION_EXPIRED' || result.status === 401 ? 'AUTH_POST' : 'DB_STORE'
    err.code = result.body?.code || 'DB_STORE_FAILED'
    throw err
  }
  return result.body
}

export async function disablePushSubscription(endpoint) {
  const result = await pushAuthedFetch('DELETE', { endpoint }, 'AUTH_POST')
  if (!result.ok) {
    const err = new Error(result.body?.error || result.body?.code || 'UNSUBSCRIBE_FAILED')
    err.stage = result.stage || 'AUTH_POST'
    throw err
  }
  return result.body
}

function workerStateLabel(worker) {
  if (!worker) return null
  return {
    state: worker.state || null,
    scriptURL: worker.scriptURL || null,
  }
}

/**
 * Snapshot SW registration for diagnostics (no secrets).
 * @param {ServiceWorkerRegistration | null | undefined} reg
 */
export function describeServiceWorkerRegistration(reg) {
  const controller = typeof navigator !== 'undefined' ? navigator.serviceWorker?.controller : null
  return {
    registrationExists: !!reg,
    installing: workerStateLabel(reg?.installing),
    waiting: workerStateLabel(reg?.waiting),
    active: workerStateLabel(reg?.active),
    controllerPresent: !!controller,
    controllerScriptURL: controller?.scriptURL || null,
  }
}

/**
 * Ensure an ACTIVE service worker before PushManager.subscribe.
 * @returns {Promise<ServiceWorkerRegistration>}
 */
export async function ensureActiveServiceWorkerRegistration() {
  initServiceWorkerRegistration()
  await waitForServiceWorkerReady()

  let reg = await navigator.serviceWorker.getRegistration()
  if (!reg) {
    initServiceWorkerRegistration()
    await waitForServiceWorkerReady()
    reg = await navigator.serviceWorker.getRegistration()
  }

  reg = (await navigator.serviceWorker.ready) || reg
  if (!reg) {
    throw Object.assign(new Error('Service worker registration missing'), {
      name: 'ServiceWorkerMissing',
      stage: 'SW_READY',
    })
  }

  if (!reg.active) {
    const deadline = Date.now() + 8000
    while (!reg.active && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100))
      reg = (await navigator.serviceWorker.getRegistration()) || reg
      if (!reg.active && (reg.installing || reg.waiting)) {
        try {
          await navigator.serviceWorker.ready
        } catch {
          /* continue */
        }
        reg = (await navigator.serviceWorker.getRegistration()) || reg
      }
    }
  }

  if (!reg.active) {
    const snap = describeServiceWorkerRegistration(reg)
    console.error('[TAXIO PUSH SUBSCRIBE]', {
      phase: 'SW_READY',
      ...snap,
    })
    throw Object.assign(new Error('Service worker has no active worker'), {
      name: 'ServiceWorkerInactive',
      stage: 'SW_READY',
      taxioPushDiag: snap,
    })
  }

  console.info('[TAXIO PUSH SUBSCRIBE]', {
    phase: 'SW_READY',
    ...describeServiceWorkerRegistration(reg),
  })

  return reg
}

/**
 * Request permission, subscribe with PushManager, upsert server row.
 * Sequence: fresh auth → VAPID GET → active SW → subscribe → POST (fresh auth).
 * @returns {{ ok: boolean, permission: string, code?: string, stage?: string, technicalReason?: string, userMessage?: string }}
 */
export async function enableCompanyTripNotifications() {
  if (!isPushSupported()) {
    return { ok: false, permission: 'unsupported', code: 'UNSUPPORTED' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, permission, code: permission === 'denied' ? 'DENIED' : 'NOT_GRANTED' }
  }

  try {
    // 1–2. Fresh auth + VAPID
    const { vapidPublicKey } = await fetchVapidPublicKey()

    // 3. Active SW
    const reg = await ensureActiveServiceWorkerRegistration()

    // 4. PushManager.subscribe (reuse existing browser subscription if present)
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
      } catch (err) {
        const snap = describeServiceWorkerRegistration(reg)
        const name = String(err?.name || 'Error')
        const message = String(err?.message || err || 'subscribe_failed')
        console.error('[TAXIO PUSH SUBSCRIBE]', {
          phase: 'PUSH_SUBSCRIBE',
          errorName: name,
          errorMessage: message,
          activeState: snap.active?.state || null,
          controllerPresent: snap.controllerPresent,
        })
        return {
          ok: false,
          permission: 'granted',
          code: 'SUBSCRIBE_FAILED',
          stage: 'PUSH_SUBSCRIBE',
          technicalReason: `PUSH_SUBSCRIBE — ${name}: ${message}`,
          errorName: name,
          errorMessage: message,
          swDiag: snap,
        }
      }
    }

    // 5–6. POST with fresh auth (reuse browser sub; no duplicate subscribe)
    try {
      await storePushSubscription(sub)
    } catch (err) {
      // If auth failed after subscribe, refresh once more and retry store with same sub
      if (err?.stage === 'AUTH_POST' || err?.name === 'SessionExpired') {
        const again = await getFreshPushAccessToken()
        if (!again.ok) {
          return {
            ok: false,
            permission: 'granted',
            code: 'SESSION_EXPIRED',
            stage: 'AUTH_POST',
            technicalReason: `AUTH_POST — SessionExpired: ${SESSION_EXPIRED_MESSAGE}`,
            userMessage: SESSION_EXPIRED_MESSAGE,
          }
        }
        // Reuse existing PushSubscription — do not call subscribe() again
        try {
          await storePushSubscription(sub)
        } catch (err2) {
          const stage = err2?.stage || 'DB_STORE'
          const msg =
            stage === 'AUTH_POST' || err2?.name === 'SessionExpired'
              ? SESSION_EXPIRED_MESSAGE
              : String(err2?.message || 'store_failed')
          return {
            ok: false,
            permission: 'granted',
            code: stage === 'AUTH_POST' ? 'SESSION_EXPIRED' : 'DB_STORE_FAILED',
            stage,
            technicalReason: `${stage} — ${err2?.name || 'Error'}: ${msg}`,
            userMessage: stage === 'AUTH_POST' ? SESSION_EXPIRED_MESSAGE : undefined,
          }
        }
      } else {
        const stage = err?.stage || 'DB_STORE'
        return {
          ok: false,
          permission: 'granted',
          code: stage === 'AUTH_POST' ? 'SESSION_EXPIRED' : 'DB_STORE_FAILED',
          stage,
          technicalReason: `${stage} — ${err?.name || 'Error'}: ${err?.message || 'store_failed'}`,
          userMessage: stage === 'AUTH_POST' ? SESSION_EXPIRED_MESSAGE : undefined,
        }
      }
    }

    return { ok: true, permission: 'granted', code: 'SUBSCRIBED' }
  } catch (err) {
    const stage = err?.stage || 'AUTH_GET'
    const name = String(err?.name || 'Error')
    const message = String(err?.message || err || 'enable_failed')
    console.error('[TAXIO PUSH SUBSCRIBE]', { phase: stage, errorName: name, errorMessage: message })
    const sessionExpired =
      stage === 'AUTH_GET' ||
      stage === 'AUTH_POST' ||
      name === 'SessionExpired' ||
      /session has expired|NOT_AUTHENTICATED/i.test(message)
    return {
      ok: false,
      permission: 'granted',
      code: sessionExpired ? 'SESSION_EXPIRED' : 'ENABLE_FAILED',
      stage,
      technicalReason: `${stage} — ${name}: ${message}`,
      userMessage: sessionExpired ? SESSION_EXPIRED_MESSAGE : undefined,
    }
  }
}

const STATUS_KEY = (companyId) => `taxio_push_status_${companyId}`

export function readLocalPushStatus(companyId) {
  if (!companyId || typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(STATUS_KEY(companyId))
  } catch {
    return null
  }
}

export function writeLocalPushStatus(companyId, status) {
  if (!companyId || typeof localStorage === 'undefined') return
  try {
    if (!status) localStorage.removeItem(STATUS_KEY(companyId))
    else localStorage.setItem(STATUS_KEY(companyId), String(status))
  } catch {
    /* ignore */
  }
}

/**
 * UI mode for dashboard card.
 * @returns {'unsupported'|'prompt'|'on'|'blocked'}
 */
export function resolvePushUiMode(companyId) {
  if (!isPushSupported()) return 'unsupported'
  const perm = pushPermissionState()
  if (perm === 'denied') return 'blocked'
  if (perm === 'granted' && readLocalPushStatus(companyId) === 'on') return 'on'
  if (perm === 'granted') return 'prompt'
  return 'prompt'
}
