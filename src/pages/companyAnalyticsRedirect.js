import { slugFromCompanyName } from '../lib/slug.js'
import {
  analyticsRedirectEventType,
  parseBookingAnalyticsSource,
  trackCompanyAnalyticsEvent,
} from '../lib/companyAnalytics.js'
import { bookingPageUrlWithSource } from '../lib/tenant.js'
import { mountBookCompany } from './bookCompany.js'

/**
 * /r/:slug?src=qr|share — record scan/visit, redirect to public booking page.
 * Analytics failure must never block the redirect.
 */
export async function mountCompanyAnalyticsRedirect(root, slug) {
  const normalized = slugFromCompanyName(slug)
  const src = parseBookingAnalyticsSource(window.location.search)
  const eventType = analyticsRedirectEventType(src)

  if (eventType) {
    trackCompanyAnalyticsEvent({
      slug: normalized,
      eventType,
      source: src,
      path: window.location.pathname,
    })
  }

  const dest = bookingPageUrlWithSource(normalized, src === 'qr' || src === 'share' ? src : null)

  try {
    const destUrl = new URL(dest, window.location.origin)
    const sameOrigin = destUrl.origin === window.location.origin
    if (!sameOrigin) {
      window.location.replace(destUrl.href)
      return
    }
    window.history.replaceState({}, '', `${destUrl.pathname}${destUrl.search}`)
    await mountBookCompany(root, normalized)
  } catch {
    window.location.replace(dest)
  }
}
