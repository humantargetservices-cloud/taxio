/**
 * Runs before router/pages so booking routes swap manifest before installability checks.
 */
import { initPwaInstallListener } from './lib/pwaInstallPrompt.js'
import { ensureGenericSiteManifest, primeBookingPwaManifest } from './lib/companyPwa.js'
import { resolveBookSlugForRouter } from './lib/tenant.js'

initPwaInstallListener()

const bookSlug = resolveBookSlugForRouter(window.location.pathname, window.location.hostname)
if (bookSlug) {
  primeBookingPwaManifest(bookSlug)
} else {
  ensureGenericSiteManifest()
}
