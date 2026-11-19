/**
 * TAXIO root service worker — PWA cache/update + OneSignal Web Push display.
 * Never caches /api/*, Supabase, or booking/Rescue/trip network authority.
 *
 * v4: OneSignal SDK imported here (scope /). This is the only worker OneSignal
 * may register. Do not also register /OneSignalSDKWorker.js — that path is the
 * SPA HTML rewrite and cannot create a push subscription.
 * Purges older taxio-shell-v1/v2 and taxio-assets-v1/v2 on activate.
 */
/**
 * TAXIO push click interception must register before the OneSignal worker.
 * For TAXIO trip notifications we open an in-scope URL through Clients.openWindow().
 * Chrome/Android may route that URL into the installed standalone PWA/WebAPK.
 * Non-TAXIO notifications fall through to OneSignal unchanged.
 */
function taxioNotificationData(notification) {
  const root = notification?.data && typeof notification.data === 'object' ? notification.data : {}
  const candidates = [
    root,
    root.additionalData,
    root.data,
    root.custom?.a,
    root.custom,
  ].filter((item) => item && typeof item === 'object')

  return (
    candidates.find(
      (item) =>
        String(item.taxio_open_pwa || '') === '1' ||
        String(item.taxio_open_pwa || '') === 'true'
    ) || null
  )
}

function isStandaloneDashboard(client) {
  const url = new URL(client.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/dashboard/')) {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    const channel = new MessageChannel()
    const finish = (standalone) => {
      clearTimeout(timeout)
      channel.port1.close()
      resolve(standalone)
    }
    const timeout = setTimeout(() => finish(false), 300)
    channel.port1.onmessage = ({ data }) => finish(data === true)
    try {
      client.postMessage({ type: 'TAXIO_IS_STANDALONE_DASHBOARD' }, [channel.port2])
    } catch {
      finish(false)
    }
  })
}

async function openTripNotification(target) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const standalone = await Promise.all(windows.map(isStandaloneDashboard))
  const app = windows.find((_, index) => standalone[index])
  if (app) {
    try {
      const destination = app.url === target ? app : await app.navigate(target)
      if (destination) return await destination.focus()
    } catch {
      // The app may have closed after the client list was read.
    }
  }

  // Let the platform resolve the in-scope URL against installed apps on cold launch.
  const opened = await self.clients.openWindow(target)
  if (opened) await opened.focus()
}

self.addEventListener('notificationclick', (event) => {
  const data = taxioNotificationData(event.notification)
  if (!data) return

  const dashboard = new URL('/dashboard/company', self.location.origin)
  let target = dashboard
  try {
    const requested = new URL(data.taxio_path || data.url || dashboard.href, dashboard)
    if (requested.origin === dashboard.origin && requested.pathname === dashboard.pathname) {
      target = requested
    }
  } catch {
    // Fall back to the dashboard for a malformed deep link.
  }

  event.stopImmediatePropagation()
  event.notification.close()
  event.waitUntil(openTripNotification(target.href))
})

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js')

const SHELL_CACHE = 'taxio-shell-v3'
const ASSET_CACHE = 'taxio-assets-v3'
const PRECACHE_URLS = ['/taxio-logo.png', '/manifest.webmanifest', '/pwa-fallback-icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

function isApiOrBackend(url) {
  if (url.pathname.startsWith('/api')) return true
  if (/supabase/i.test(url.hostname)) return true
  return false
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.destination === 'document'
}

function isHashedViteAsset(url) {
  // Vite content-hashed bundles under /assets/
  return url.pathname.startsWith('/assets/')
}

function isSameOriginStatic(url, request) {
  if (url.origin !== self.location.origin) return false
  if (isHashedViteAsset(url)) return true
  return (
    /\.(png|jpg|jpeg|webp|svg|ico|css|js|webmanifest)$/i.test(url.pathname) ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/taxio-logo.png' ||
    url.pathname === '/pwa-fallback-icon.svg'
  )
}

/** Network-first HTML: always prefer live deploy; update shell fallback. */
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE)
      // Keep offline fallback in sync with latest deployed HTML
      try {
        await cache.put('/index.html', response.clone())
      } catch {
        /* ignore quota / opaque */
      }
    }
    return response
  } catch {
    const cached =
      (await caches.match('/index.html')) ||
      (await caches.match(request)) ||
      (await caches.match('/'))
    if (cached) return cached
    return new Response('TAXIO is offline. Please reconnect and try again.', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

/** Cache-first for content-hashed /assets/* only. */
async function cacheFirstHashedAsset(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(ASSET_CACHE)
    try {
      await cache.put(request, response.clone())
    } catch {
      /* ignore */
    }
  }
  return response
}

/** Network-first for other same-origin static (icons, manifest, non-hashed). */
async function networkFirstStatic(request) {
  try {
    const response = await fetch(request)
    if (response && response.ok && response.type === 'basic') {
      const cache = await caches.open(SHELL_CACHE)
      try {
        await cache.put(request, response.clone())
      } catch {
        /* ignore */
      }
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    throw new Error('offline')
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Network authority only — never SW-cache APIs / backends
  if (isApiOrBackend(url)) return

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  // Do not cache-first HTML / index outside navigate (e.g. fetch of index.html)
  if (url.origin === self.location.origin) {
    if (
      url.pathname === '/' ||
      url.pathname === '/index.html' ||
      url.pathname.endsWith('.html')
    ) {
      event.respondWith(networkFirstNavigation(request))
      return
    }
  }

  if (isHashedViteAsset(url)) {
    event.respondWith(cacheFirstHashedAsset(request))
    return
  }

  if (isSameOriginStatic(url, request)) {
    event.respondWith(
      networkFirstStatic(request).catch(
        () =>
          caches.match(request).then(
            (c) =>
              c ||
              new Response('', {
                status: 504,
                statusText: 'Gateway Timeout',
              })
          )
      )
    )
  }
})
