/**
 * Tenant resolution — path-based slugs today (`/book/:slug`), subdomains later.
 * Example future: read `location.hostname` for `company.taxio.be` → slug lookup.
 */

export const BOOK_PATH_PREFIX = '/book/'

export function bookPathFromSlug(slug) {
  return `${BOOK_PATH_PREFIX}${encodeURIComponent(slug)}`
}

export function parseBookSlug(pathname) {
  if (!pathname.startsWith(BOOK_PATH_PREFIX)) return null
  const rest = pathname.slice(BOOK_PATH_PREFIX.length).split('/')[0]
  return rest ? decodeURIComponent(rest) : null
}

export function companyDashboardPath() {
  return '/dashboard/company'
}
