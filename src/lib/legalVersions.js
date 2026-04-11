/**
 * Bump when published legal text changes (for audit / future backend persistence).
 * Used in registration and booking payloads; safe to extend server-side later.
 */
export const TERMS_VERSION_RIDER = 'taxio-rider-terms-2026-04-v2'
export const TERMS_VERSION_COMPANY = 'taxio-company-terms-2026-04-v2'
export const TERMS_VERSION_PRIVACY = 'taxio-privacy-2026-04'

/** @deprecated use TERMS_VERSION_RIDER */
export const TERMS_VERSION_PLATFORM = TERMS_VERSION_RIDER
/** Booking acceptance references rider terms + privacy (single checkbox UX). */
export const TERMS_VERSION_BOOKING_RIDER = `${TERMS_VERSION_RIDER}+${TERMS_VERSION_PRIVACY}`

/** Company registration: Company Terms + Privacy Policy (single checkbox UX). */
export const REGISTRATION_TERMS_BUNDLE = `${TERMS_VERSION_COMPANY}+${TERMS_VERSION_PRIVACY}`
