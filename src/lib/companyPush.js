/**
 * Company PWA Web Push subscribe helpers (client).
 * Stores subscription via authenticated /api/company-push-subscribe.
 */
import { getSession } from './api.js'
import { initServiceWorkerRegistration, waitForServiceWorkerReady } from './pwaInstallPrompt.js'

function apiUrl(path) {
  if (typeof window === 'undefined') return path
  return path
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
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

async function authHeaders() {
  const { data } = await getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('NOT_AUTHENTICATED')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export async function fetchVapidPublicKey() {
  const headers = await authHeaders()
  const res = await fetch(apiUrl('/api/company-push-subscribe'), {
    method: 'GET',
    headers,
    credentials: 'same-origin',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || body.code || 'VAPID_FETCH_FAILED')
  const key = String(body.vapidPublicKey || '').trim()
  if (!key) throw new Error('VAPID_PUBLIC_MISSING')
  return { vapidPublicKey: key, companyId: body.companyId || null }
}

export async function storePushSubscription(subscription) {
  const headers = await authHeaders()
  const json = subscription?.toJSON ? subscription.toJSON() : subscription
  const res = await fetch(apiUrl('/api/company-push-subscribe'), {
    method: 'POST',
    headers,
    credentials: 'same-origin',
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || body.code || 'SUBSCRIBE_SAVE_FAILED')
  return body
}

export async function disablePushSubscription(endpoint) {
  const headers = await authHeaders()
  const res = await fetch(apiUrl('/api/company-push-subscribe'), {
    method: 'DELETE',
    headers,
    credentials: 'same-origin',
    body: JSON.stringify({ endpoint }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || body.code || 'UNSUBSCRIBE_FAILED')
  return body
}

/**
 * Request permission, subscribe with PushManager, upsert server row.
 * @returns {{ ok: boolean, permission: string, code?: string }}
 */
export async function enableCompanyTripNotifications() {
  if (!isPushSupported()) {
    return { ok: false, permission: 'unsupported', code: 'UNSUPPORTED' }
  }

  initServiceWorkerRegistration()
  await waitForServiceWorkerReady()

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, permission, code: permission === 'denied' ? 'DENIED' : 'NOT_GRANTED' }
  }

  const { vapidPublicKey } = await fetchVapidPublicKey()
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
  }

  await storePushSubscription(sub)
  return { ok: true, permission: 'granted', code: 'SUBSCRIBED' }
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
  if (perm === 'granted') return 'prompt' // granted but may need re-store after wipe
  return 'prompt'
}
