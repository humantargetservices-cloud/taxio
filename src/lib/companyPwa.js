import { absolutePublicBookingUrl } from './tenant.js'

export const PWA_FALLBACK_ICON = '/pwa-fallback-icon.svg'

const IMAGE_FIELDS = ['logo_url', 'logo', 'image_url', 'photo_url']

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

export function buildCompanyManifestHref({ context, company, slug }) {
  const params = new URLSearchParams()
  params.set('context', context === 'booking' ? 'booking' : 'dashboard')
  if (company?.id) params.set('companyId', String(company.id))
  const s = String(slug || company?.slug || '').trim()
  if (s) params.set('slug', s)
  return `/api/company-manifest?${params.toString()}`
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

function setOrCreateLink(rel, href, id) {
  if (typeof document === 'undefined') return
  let el = id ? document.getElementById(id) : document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    if (id) el.id = id
    document.head.appendChild(el)
  }
  el.href = href
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

  setOrCreateLink('manifest', manifestHref, 'taxio-company-manifest')
  setOrCreateLink('apple-touch-icon', iconUrl, 'taxio-apple-touch-icon')

  if (context === 'dashboard') {
    const title = companyName ? `${companyName} Dashboard` : 'My Dashboard'
    document.title = title
    setOrCreateMeta('application-name', title)
    setOrCreateMeta('apple-mobile-web-app-title', 'My Dashboard')
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
