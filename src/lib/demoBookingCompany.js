/**
 * Public demo booking preview at `/book/demo` — no Supabase company row required.
 * Slug `demo` is reserved in `tenant.js` so it is not used as a live tenant subdomain.
 */
export const DEMO_BOOKING_SLUG = 'demo'

export function isDemoBookingSlug(slug) {
  return String(slug || '').trim().toLowerCase() === DEMO_BOOKING_SLUG
}

/** Synthetic approved company for the customer-facing booking UI preview. */
export function getDemoBookingCompany() {
  return {
    id: '__taxio_demo__',
    name: 'TAXIO Demo Taxi',
    slug: DEMO_BOOKING_SLUG,
    slogan: 'Preview — this is how customers see your booking page.',
    phone: '',
    email: 'info@taxio.be',
    vat_number: '',
    availability_status: 'available',
    pricing: null,
    logo_url: '',
  }
}
