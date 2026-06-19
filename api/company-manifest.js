import { getOriginFromReq, json, makeSupabaseServiceClient, slugFromCompanyName } from './_utils.js'

const THEME_COLOR = '#facc15'
const BACKGROUND_COLOR = '#020617'
const FALLBACK_ICON_PATH = '/pwa-fallback-icon.svg'

function bookingRootDomain() {
  return String(process.env.VITE_TAXIO_BOOKING_ROOT_DOMAIN || 'taxio.be')
    .trim()
    .toLowerCase()
}

function parseTenantSlugFromHost(hostHeader) {
  const root = bookingRootDomain()
  if (!root) return null
  const h = String(hostHeader || '').split(':')[0].toLowerCase()
  if (!h || h === root || !h.endsWith(`.${root}`)) return null
  const sub = h.slice(0, -(root.length + 1))
  if (!sub || sub.includes('.')) return null
  return sub
}

function pickCompanyImageUrl(company) {
  if (!company) return null
  for (const field of ['logo_url', 'logo', 'image_url', 'photo_url']) {
    const raw = String(company[field] || '').trim()
    if (/^https?:\/\//i.test(raw)) return raw
  }
  return null
}

function iconMime(url) {
  const u = String(url || '').toLowerCase()
  if (u.endsWith('.svg')) return 'image/svg+xml'
  if (u.endsWith('.webp')) return 'image/webp'
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg'
  return 'image/png'
}

function absoluteIconUrl(origin, url) {
  if (!url) return `${origin}${FALLBACK_ICON_PATH}`
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${origin}${url}`
  return `${origin}${FALLBACK_ICON_PATH}`
}

function manifestIcons(origin, imageUrl) {
  const src = absoluteIconUrl(origin, imageUrl)
  const type = iconMime(src)
  return [
    { src, sizes: '192x192', type, purpose: 'any' },
    { src, sizes: '512x512', type, purpose: 'any' },
    { src, sizes: '512x512', type, purpose: 'maskable' },
  ]
}

function shortenShortName(name, max = 12) {
  const s = String(name || '').trim()
  if (!s) return ''
  if (s.length <= max) return s
  return `${s.slice(0, max - 1).trim()}…`
}

function bookingStartUrl({ slug, origin, hostHeader }) {
  const normalized = slugFromCompanyName(slug)
  const root = bookingRootDomain()
  const host = String(hostHeader || '').split(':')[0].toLowerCase()
  if (root && host.endsWith(`.${root}`) && host !== root) {
    const sub = host.slice(0, -(root.length + 1))
    if (sub && sub === normalized) {
      return `https://${host}/`
    }
  }
  if (root && normalized.length >= 2) {
    return `https://${normalized}.${root}/`
  }
  return `${origin}/book/${encodeURIComponent(normalized)}`
}

function dashboardManifest(origin, company) {
  const name = String(company?.name || '').trim()
  return {
    name: name ? `${name} Dashboard` : 'My Dashboard',
    short_name: name ? 'My Dashboard' : 'Dashboard',
    description: name ? `${name} operator dashboard` : 'Taxi operator dashboard',
    start_url: '/dashboard/company',
    scope: '/dashboard/',
    display: 'standalone',
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    icons: manifestIcons(origin, pickCompanyImageUrl(company)),
  }
}

function bookingManifest(origin, company, slug, hostHeader) {
  const name = String(company?.name || '').trim()
  const resolvedSlug = slugFromCompanyName(slug || company?.slug)
  return {
    name: name || 'Taxi booking',
    short_name: shortenShortName(name) || 'Taxi',
    description: name ? `Book a taxi with ${name}` : 'Taxi booking page',
    start_url: bookingStartUrl({ slug: resolvedSlug, origin, hostHeader }),
    scope: '/',
    display: 'standalone',
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    icons: manifestIcons(origin, pickCompanyImageUrl(company)),
  }
}

function genericDashboardManifest(origin) {
  return {
    name: 'My Dashboard',
    short_name: 'Dashboard',
    description: 'Taxi operator dashboard',
    start_url: '/dashboard/company',
    scope: '/dashboard/',
    display: 'standalone',
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    icons: manifestIcons(origin, null),
  }
}

function genericBookingManifest(origin, slug, hostHeader) {
  const resolvedSlug = slugFromCompanyName(slug)
  return {
    name: 'Taxi booking',
    short_name: 'Taxi',
    description: 'Taxi booking page',
    start_url: resolvedSlug
      ? bookingStartUrl({ slug: resolvedSlug, origin, hostHeader })
      : `${origin}/`,
    scope: '/',
    display: 'standalone',
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    icons: manifestIcons(origin, null),
  }
}

async function fetchCompany({ supabase, companyId, slug }) {
  const select = 'id, name, slug, logo_url, status'
  if (companyId) {
    const { data, error } = await supabase
      .from('companies')
      .select(select)
      .eq('id', companyId)
      .maybeSingle()
    if (error) throw error
    return data
  }
  const normalized = slugFromCompanyName(slug)
  if (!normalized) return null
  const { data, error } = await supabase
    .from('companies')
    .select(select)
    .eq('slug', normalized)
    .maybeSingle()
  if (error) throw error
  return data
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  const origin = getOriginFromReq(req)
  const hostHeader = req.headers.host || req.headers['x-forwarded-host'] || ''

  const reqUrl = String(req.url || '/')
  const url = reqUrl.startsWith('http') ? new URL(reqUrl) : new URL(reqUrl, `https://${hostHeader || 'taxio.be'}`)

  let context = String(req.query?.context || url.searchParams.get('context') || '')
    .trim()
    .toLowerCase()
  let slug = String(req.query?.slug || url.searchParams.get('slug') || '').trim()
  const companyId = String(req.query?.companyId || url.searchParams.get('companyId') || '').trim()

  const hostSlug = parseTenantSlugFromHost(hostHeader)
  if (!slug && hostSlug) slug = hostSlug
  if (!context && hostSlug) context = 'booking'

  if (context !== 'dashboard' && context !== 'booking') {
    json(res, 400, { error: 'Invalid context' })
    return
  }

  let manifest

  try {
    const supabase = makeSupabaseServiceClient()
    const company = await fetchCompany({ supabase, companyId, slug })

    if (context === 'dashboard') {
      manifest = company ? dashboardManifest(origin, company) : genericDashboardManifest(origin)
    } else {
      const approved = company && company.status === 'approved'
      manifest = approved
        ? bookingManifest(origin, company, slug || company.slug, hostHeader)
        : genericBookingManifest(origin, slug || hostSlug, hostHeader)
    }
  } catch (err) {
    console.error('[company-manifest]', err?.message || err)
    manifest =
      context === 'dashboard'
        ? genericDashboardManifest(origin)
        : genericBookingManifest(origin, slug || hostSlug, hostHeader)
  }

  if (typeof res.status === 'function') {
    res
      .status(200)
      .setHeader('Content-Type', 'application/manifest+json; charset=utf-8')
      .setHeader('Cache-Control', 'public, max-age=300')
    res.end(JSON.stringify(manifest))
    return
  }

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.end(JSON.stringify(manifest))
}
