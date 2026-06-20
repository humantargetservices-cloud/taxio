import { apiUrl } from './api.js'

/** @returns {'qr'|'share'|'direct'} */
export function parseBookingAnalyticsSource(search) {
  try {
    const src = new URLSearchParams(search || '').get('src')
    if (src === 'qr') return 'qr'
    if (src === 'share') return 'share'
  } catch {
    /* ignore */
  }
  return 'direct'
}

/**
 * Fire-and-forget anonymous company analytics event.
 * Never throws — booking UX must not depend on this.
 */
export function trackCompanyAnalyticsEvent({ companyId, slug, eventType, source, path, metadata }) {
  if (typeof fetch === 'undefined') return
  const payload = {
    company_id: companyId || undefined,
    slug: slug || undefined,
    event_type: eventType,
    source: source === 'direct' ? null : source,
    path: path || (typeof window !== 'undefined' ? window.location.pathname : null),
    metadata: metadata || {},
  }
  void fetch(apiUrl('/api/track-company-analytics'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {})
}

export function analyticsRedirectEventType(src) {
  if (src === 'qr') return 'qr_scan'
  if (src === 'share') return 'share_visit'
  return null
}
