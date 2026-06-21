import { absolutePublicBookingUrl, parseTenantSlugFromHostname } from './tenant.js'
import { setPwaManifestReady } from './pwaInstallPrompt.js'

export const PWA_FALLBACK_ICON = '/pwa-fallback-icon.svg'

const IMAGE_FIELDS = ['logo_url', 'logo', 'image_url', 'photo_url']

function bookingRootDomain() {
  return String(import.meta.env.VITE_TAXIO_BOOKING_ROOT_DOMAIN || '')
    .trim()
    .toLowerCase()
}

/** Manifest API origin: tenant booking hosts use www apex so install identity is consistent. */
export function manifestApiOrigin() {
  if (typeof window === 'undefined') return ''
  const root = bookingRootDomain()
  const tenantSlug = parseTenantSlugFromHostname(window.location.hostname)
  if (tenantSlug && root) {
    return `https://www.${root}`
  }
  return window.location.origin
}

export function pickCompanyImageUrl(company) {
  if (!company || typeof company !== 'object') return null
  for (const field of IMAGE_FIELDS) {
    const raw = String(company[field] || '').trim()
    if (/^https?:\/\//i.test(raw)) return raw
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  }
  return null
}

export function resolvePwaIconUrl(company) {
  return pickCompanyImageUrl(company) || PWA_FALLBACK_ICON
}

export function companyInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  }
  const s = String(name || 'T').trim()
  return s.slice(0, 2).toUpperCase() || 'T'
}

export function shortenCompanyShortName(name, max = 12) {
  const s = String(name || '').trim()
  if (!s) return ''
  if (s.length <= max) return s
  return `${s.slice(0, max - 1).trim()}…`
}

function fillTemplate(template, vars) {
  let out = String(template || '')
  for (const [key, val] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(String(val ?? ''))
  }
  return out
}

export function buildPwaPromptStrings(tpwa, variant, companyName) {
  const name = String(companyName || '').trim()
  const base = { ...tpwa }
  if (variant === 'booking') {
    return {
      ...base,
      title: name
        ? fillTemplate(tpwa.bookingTitle, { companyName: name })
        : tpwa.bookingTitleFallback || tpwa.bookingTitle,
      body: tpwa.bookingBody,
    }
  }
  return {
    ...base,
    title: tpwa.operatorTitle,
    body: name
      ? fillTemplate(tpwa.operatorBody, { companyName: name })
      : tpwa.operatorBodyFallback || tpwa.operatorBody,
  }
}

export function buildManifestVersion(company, slug) {
  const updated = company?.updated_at
  if (updated) {
    return String(updated)
      .replace(/[:.TZ]/gi, '')
      .slice(0, 24)
  }
  if (company?.id) return String(company.id)
  const s = String(slug || company?.slug || '').trim().toLowerCase()
  if (s) return s.replace(/[^a-z0-9]/g, '')
  return 'taxio'
}

export function buildCompanyManifestHref({ context, company, slug }) {
  const params = new URLSearchParams()
  params.set('context', context === 'booking' ? 'booking' : 'dashboard')
  if (company?.id) params.set('companyId', String(company.id))
  const s = String(slug || company?.slug || '').trim()
  if (s) params.set('slug', s)
  const v = buildManifestVersion(company, s)
  if (v) params.set('v', v)
  const base = manifestApiOrigin() || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/api/company-manifest?${params.toString()}`
}

/** Remove every rel=manifest link so only one identity is active (fixes static TAXIO manifest winning). */
export function removeAllManifestLinks() {
  if (typeof document === 'undefined') return
  document.querySelectorAll('link[rel="manifest"]').forEach((el) => el.remove())
}

export function setCompanyManifestLink(href) {
  if (typeof document === 'undefined') return
  removeAllManifestLinks()
  const el = document.createElement('link')
  el.id = 'taxio-company-manifest'
  el.rel = 'manifest'
  el.href = href
  document.head.appendChild(el)
}

export function ensureGenericSiteManifest() {
  if (typeof document === 'undefined') return
  removeAllManifestLinks()
  const el = document.createElement('link')
  el.id = 'taxio-site-manifest'
  el.rel = 'manifest'
  el.href = '/manifest.webmanifest'
  document.head.appendChild(el)
}

function setOrCreateMeta(name, content) {
  if (typeof document === 'undefined') return
  let el = document.querySelector(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setOrCreateAppleTouchIcon(href) {
  if (typeof document === 'undefined') return
  document.querySelectorAll('link[rel="apple-touch-icon"]').forEach((el) => {
    if (el.id !== 'taxio-apple-touch-icon') el.remove()
  })
  let el = document.getElementById('taxio-apple-touch-icon')
  if (!el) {
    el = document.createElement('link')
    el.id = 'taxio-apple-touch-icon'
    el.rel = 'apple-touch-icon'
    document.head.appendChild(el)
  }
  el.href = href
}

function logPwaDev(message, detail) {
  if (!import.meta.env.DEV || typeof console === 'undefined') return
  if (detail !== undefined) console.log(`[taxio-pwa] ${message}`, detail)
  else console.log(`[taxio-pwa] ${message}`)
}

/**
 * Sync: point manifest at company booking identity before async company fetch.
 * Call from router as early as possible on booking routes.
 */
export function primeBookingPwaManifest(slug) {
  const href = buildCompanyManifestHref({ context: 'booking', slug })
  setCompanyManifestLink(href)
  logPwaDev('manifest href:', href)
  return prefetchCompanyManifest(href, slug)
}

/** Fetch manifest so Chrome registers company identity before install prompt. */
export async function prefetchCompanyManifest(href, label) {
  try {
    const res = await fetch(href, { cache: 'no-store', credentials: 'omit', mode: 'cors' })
    if (res.ok) {
      const manifest = await res.json()
      logPwaDev(`manifest applied for: ${manifest?.name || label || 'booking'}`)
    }
  } catch (err) {
    logPwaDev('manifest prefetch failed', err?.message || err)
  }
  setPwaManifestReady(true)
}

/**
 * Updates manifest link, document title, and iOS meta after company data loads.
 * @param {{ context: 'dashboard'|'booking', company?: object, slug?: string }} opts
 */
export function applyCompanyPwaIdentity(opts) {
  const { context, company, slug } = opts
  const companyName = String(company?.name || '').trim()
  const iconUrl = resolvePwaIconUrl(company)
  const manifestHref = buildCompanyManifestHref({ context, company, slug })

  setCompanyManifestLink(manifestHref)
  setOrCreateAppleTouchIcon(iconUrl)
  logPwaDev('manifest href:', manifestHref)

  if (context === 'dashboard') {
    const title = companyName ? `${companyName} · TAXIO Dashboard` : 'TAXIO Dashboard'
    document.title = title
    setOrCreateMeta('application-name', 'TAXIO Dashboard')
    setOrCreateMeta('apple-mobile-web-app-title', 'TAXIO')
  } else {
    const title = companyName ? `${companyName} booking` : 'Taxi booking'
    document.title = title
    setOrCreateMeta('application-name', companyName || 'Taxi booking')
    setOrCreateMeta('apple-mobile-web-app-title', companyName || 'Taxi')
  }

  return { iconUrl, manifestHref, companyName }
}

/** Booking page start URL for display (manifest uses API). */
export function bookingPwaStartUrl(slug) {
  return absolutePublicBookingUrl(slug)
}
