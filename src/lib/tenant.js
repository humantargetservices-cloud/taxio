/**
 * Public booking: path `/book/:slug` and optional production hostname `{slug}.{root}`.
 *
 * PRODUCTION (subdomain booking pages)
 * ───────────────────────────────────
 * - DNS: wildcard record for `*.{root}` (e.g. `*.taxio.be` CNAME/A) pointing at the same target as the apex.
 * - Hosting: attach the wildcard host to this SPA (e.g. Vercel → Domains → `*.taxio.be`; same project as `taxio.be`).
 * - Build env: set `VITE_TAXIO_BOOKING_ROOT_DOMAIN=taxio.be` so the client reads tenant slugs from the hostname.
 * - Optional: `VITE_TAXIO_BOOKING_RESERVED_SUBDOMAINS=www,app,admin` (comma-separated; `www` is always reserved).
 *
 * LOCAL / PREVIEW
 * ───────────────
 * - Leave `VITE_TAXIO_BOOKING_ROOT_DOMAIN` unset → only `/book/:slug` resolves a tenant.
 * - `localhost`, `127.0.0.1`, `*.local` never produce a hostname tenant.
 */

export const BOOK_PATH_PREFIX = '/book/'

const DEFAULT_RESERVED = new Set(['www', 'app', 'admin', 'api', 'mail', 'cdn', 'demo'])

function bookingRootDomain() {
  return String(import.meta.env.VITE_TAXIO_BOOKING_ROOT_DOMAIN || '')
    .trim()
    .toLowerCase()
}

function reservedSubdomainsSet() {
  const extra = String(import.meta.env.VITE_TAXIO_BOOKING_RESERVED_SUBDOMAINS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return new Set([...DEFAULT_RESERVED, ...extra])
}

function isLocalDevHostname(host) {
  const h = String(host || '').split(':')[0].toLowerCase()
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '[::1]' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local')
  )
}

function isValidTenantSubdomainLabel(label) {
  return /^[a-z0-9]+$/.test(label) && label.length >= 2
}

/**
 * @param {string} hostname - may include port; port is stripped
 * @returns {string | null} slug when host is `{slug}.{VITE_TAXIO_BOOKING_ROOT_DOMAIN}`
 */
export function parseTenantSlugFromHostname(hostname) {
  const root = bookingRootDomain()
  if (!root) return null

  const h = String(hostname || '').split(':')[0].toLowerCase()
  if (!h || isLocalDevHostname(h)) return null

  if (h === root) return null

  const suffix = `.${root}`
  if (!h.endsWith(suffix)) return null

  const sub = h.slice(0, -suffix.length)
  if (!sub || sub.includes('.')) return null

  if (reservedSubdomainsSet().has(sub)) return null
  if (!isValidTenantSubdomainLabel(sub)) return null

  return sub
}

/**
 * On a tenant booking host, these paths use the hostname slug (not `/book/:other`).
 * Other paths (e.g. `/admin`, `/terms`) use normal app routing on the same host.
 */
export function isTenantBookingPath(pathname) {
  const p = pathname || '/'
  if (p === '/' || p === '') return true
  if (p === '/book' || p.startsWith(`${BOOK_PATH_PREFIX}`)) return true
  return false
}

/**
 * Slug for the public booking screen: hostname tenant (when applicable) else `/book/:slug`.
 */
export function resolveBookSlugForRouter(pathname, hostname) {
  const host =
    hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')
  const fromHost = parseTenantSlugFromHostname(host)
  if (fromHost && isTenantBookingPath(pathname)) return fromHost
  return parseBookSlugFromPath(pathname)
}

export function bookPathFromSlug(slug) {
  return `${BOOK_PATH_PREFIX}${encodeURIComponent(slug)}`
}

export function parseBookSlugFromPath(pathname) {
  if (!pathname.startsWith(BOOK_PATH_PREFIX)) return null
  const rest = pathname.slice(BOOK_PATH_PREFIX.length).split('/')[0]
  return rest ? decodeURIComponent(rest) : null
}

/** @deprecated Prefer `parseBookSlugFromPath` or `resolveBookSlugForRouter`. */
export function parseBookSlug(pathname) {
  return parseBookSlugFromPath(pathname)
}

/**
 * Canonical public booking URL for share/copy (subdomain when configured, else same-origin path).
 */
export function absolutePublicBookingUrl(slug) {
  const s = String(slug || '').trim()
  if (!s) return BOOK_PATH_PREFIX
  const root = bookingRootDomain()
  const normalized = s.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (root && normalized.length >= 2) {
    return `https://${normalized}.${root}`
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${bookPathFromSlug(s)}`
  }
  return bookPathFromSlug(s)
}

export function companyDashboardPath() {
  return '/dashboard/company'
}

/** Short tracking redirect path: /r/:slug?src=qr|share */
export function companyAnalyticsRedirectPath(slug, src) {
  const normalized = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  if (!normalized) return '/'
  const q = src === 'qr' || src === 'share' ? `?src=${encodeURIComponent(src)}` : ''
  return `/r/${encodeURIComponent(normalized)}${q}`
}

/** Absolute URL for QR codes / share links that record analytics before redirect. */
export function absoluteAnalyticsRedirectUrl(slug, src) {
  const path = companyAnalyticsRedirectPath(slug, src)
  const root = bookingRootDomain()
  if (root) return `https://www.${root}${path}`
  if (typeof window !== 'undefined') return `${window.location.origin}${path}`
  return path
}

/** Booking page URL preserving src=qr|share after redirect. */
export function bookingPageUrlWithSource(slug, src) {
  const normalized = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  if (!normalized) return '/'
  const q = src === 'qr' || src === 'share' ? `?src=${encodeURIComponent(src)}` : ''
  const root = bookingRootDomain()
  if (root && normalized.length >= 2) {
    return `https://${normalized}.${root}${q}`
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${bookPathFromSlug(normalized)}${q}`
  }
  return `${bookPathFromSlug(normalized)}${q}`
}
