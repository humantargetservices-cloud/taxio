import { apiUrl } from './api.js'

/** @returns {'qr'|'share'|'direct'} */
export function parseBookingAnalyticsSource(search) {
  try {
    const params = new URLSearchParams(search || '')
    const raw = params.get('src') || params.get('taxio_source')
    if (raw === 'qr') return 'qr'
    if (raw === 'share') return 'share'
  } catch {
    /* ignore */
  }
  return 'direct'
}

/** Map landing-page source to a single analytics event (avoids qr + page_visit double count). */
export function analyticsVisitEventType(source) {
  if (source === 'qr') return 'qr_scan'
  if (source === 'share') return 'share_visit'
  return 'page_visit'
}

export function isAnalyticsDebugMode() {
  if (typeof window === 'undefined') return false
  try {
    return new URLSearchParams(window.location.search).get('taxioAnalyticsDebug') === '1'
  } catch {
    return false
  }
}

function analyticsDebugLog(message, detail) {
  if (!isAnalyticsDebugMode() || typeof console === 'undefined') return
  if (detail !== undefined) console.log(`[taxio-analytics] ${message}`, detail)
  else console.log(`[taxio-analytics] ${message}`)
}

/**
 * Fire-and-forget anonymous company analytics event.
 * Returns a Promise for optional awaiting; never throws.
 */
export function trackCompanyAnalyticsEvent({ companyId, slug, eventType, source, path, metadata }) {
  if (typeof fetch === 'undefined') return Promise.resolve(false)
  const payload = {
    company_id: companyId || undefined,
    slug: slug || undefined,
    event_type: eventType,
    source: source === 'direct' ? null : source,
    path: path || (typeof window !== 'undefined' ? window.location.pathname : null),
    metadata: metadata || {},
  }
  analyticsDebugLog('track', payload)
  return fetch(apiUrl('/api/track-company-analytics'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  })
    .then((res) => {
      analyticsDebugLog('track response', { ok: res.ok, status: res.status, eventType })
      return res.ok
    })
    .catch((err) => {
      analyticsDebugLog('track failed', err?.message || err)
      return false
    })
}

/** @deprecated Use analyticsVisitEventType — kept for redirect route compatibility. */
export function analyticsRedirectEventType(src) {
  if (src === 'qr') return 'qr_scan'
  if (src === 'share') return 'share_visit'
  return null
}
