/**
 * Bump when published legal text changes (for audit / future backend persistence).
 * Used in registration and booking payloads; safe to extend server-side later.
 */
export const TERMS_VERSION_PLATFORM = 'taxio-terms-2026-04'
export const TERMS_VERSION_COMPANY = 'taxio-company-terms-2026-04'
export const TERMS_VERSION_BOOKING_RIDER = 'taxio-booking-rider-2026-04'

/** Sent on company registration when user accepts Terms of Use + Company Terms + Privacy. */
export const REGISTRATION_TERMS_BUNDLE = `${TERMS_VERSION_PLATFORM}+${TERMS_VERSION_COMPANY}`
