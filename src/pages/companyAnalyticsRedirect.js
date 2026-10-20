import { slugFromCompanyName } from '../lib/slug.js'
import { parseBookingAnalyticsSource } from '../lib/companyAnalytics.js'
import { bookingPageUrlWithSource } from '../lib/tenant.js'

/**
 * /r/:slug?src=qr|share — redirect to booking page with src preserved.
 * qr_scan / share_visit are recorded once on the booking page load (not here),
 * so cross-origin redirects do not abort in-flight tracking requests.
 *
 * Booking page is dynamically imported so intl-tel-input stays out of the main bundle.
 */
export async function mountCompanyAnalyticsRedirect(root, slug) {
  const normalized = slugFromCompanyName(slug)
  const src = parseBookingAnalyticsSource(window.location.search)

  const dest = bookingPageUrlWithSource(normalized, src === 'qr' || src === 'share' ? src : null)

  try {
    const destUrl = new URL(dest, window.location.origin)
    const sameOrigin = destUrl.origin === window.location.origin
    if (!sameOrigin) {
      window.location.replace(destUrl.href)
      return
    }
    window.history.replaceState({}, '', `${destUrl.pathname}${destUrl.search}`)
    const { mountBookCompany } = await import('./bookCompany.js')
    await mountBookCompany(root, normalized)
  } catch {
    window.location.replace(dest)
  }
}
