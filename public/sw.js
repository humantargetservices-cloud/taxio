/** Minimal TAXIO service worker — installability only; no API or booking data caching. */
const SHELL_CACHE = 'taxio-shell-v1'
const PRECACHE_URLS = ['/', '/index.html', '/taxio-logo.png', '/manifest.webmanifest', '/pwa-fallback-icon.svg']

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
        Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Never cache API manifests, booking data, or Supabase.
  if (url.pathname.startsWith('/api')) return
  if (/supabase/i.test(url.hostname)) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  const sameOrigin = url.origin === self.location.origin
  const staticAsset =
    sameOrigin &&
    (/\.(png|jpg|jpeg|webp|svg|ico|css|js|webmanifest)$/i.test(url.pathname) ||
      url.pathname.startsWith('/assets/'))

  if (!staticAsset) return

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
    )
  )
})
