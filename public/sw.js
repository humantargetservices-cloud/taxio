/**
 * TAXIO service worker — installability + offline shell fallback + Web Push.
 * Never caches /api/*, Supabase, or booking/Rescue/trip network authority.
 *
 * v3: same network-first / cache rules as v2, plus push + notificationclick.
 * Purges older taxio-shell-v1/v2 and taxio-assets-v1/v2 on activate.
 */
const SHELL_CACHE = 'taxio-shell-v3'
const ASSET_CACHE = 'taxio-assets-v3'
const PRECACHE_URLS = ['/taxio-logo.png', '/manifest.webmanifest', '/pwa-fallback-icon.svg']
const DEFAULT_DASHBOARD_URL = '/dashboard/company'

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

async function parsePushPayload(event) {
  let data = {}
  try {
    if (event.data) {
      const raw = await event.data.text()
      data = JSON.parse(raw)
    }
  } catch {
    try {
      data = event.data ? await event.data.json() : {}
    } catch {
      data = {}
    }
  }
  return data && typeof data === 'object' ? data : {}
}

function safeNotificationUrl(data) {
  const raw = String(data?.url || data?.data?.url || DEFAULT_DASHBOARD_URL).trim()
  if (!raw) return DEFAULT_DASHBOARD_URL
  // Same-origin path only — never absolute external or tokenized secrets
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  try {
    const u = new URL(raw, self.location.origin)
    if (u.origin === self.location.origin) return `${u.pathname}${u.search}${u.hash}`
  } catch {
    /* ignore */
  }
  return DEFAULT_DASHBOARD_URL
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const payload = await parsePushPayload(event)
      const title = String(payload.title || 'TAXIO').slice(0, 80)
      const body = String(payload.body || 'Open TAXIO for trip updates.').slice(0, 160)
      const tag = String(payload.tag || 'taxio-push').slice(0, 80)
      const data = payload.data && typeof payload.data === 'object' ? payload.data : {}
      const url = safeNotificationUrl({ ...payload, data })

      const options = {
        body,
        tag,
        renotify: true,
        icon: '/taxio-logo.png',
        badge: '/pwa-fallback-icon.svg',
        data: {
          ...data,
          url,
          event_type: payload.event_type || data.event_type || null,
        },
      }
      // Vibration is best-effort — unsupported platforms ignore it
      try {
        options.vibrate = [120, 60, 120]
      } catch {
        /* ignore */
      }

      await self.registration.showNotification(title, options)
    })()
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetPath = safeNotificationUrl(event.notification?.data || {})
  const targetUrl = new URL(targetPath, self.location.origin).href

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of allClients) {
        try {
          const clientUrl = new URL(client.url)
          if (clientUrl.origin === self.location.origin && 'focus' in client) {
            await client.focus()
            if ('navigate' in client) {
              try {
                await client.navigate(targetUrl)
              } catch {
                /* older browsers */
              }
            }
            return
          }
        } catch {
          /* continue */
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl)
      }
    })()
  )
})
