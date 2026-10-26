// Mobile push contracts only. No registration is performed in the offline prototype.
// Server-side token registration must verify Supabase user, company membership,
// device ownership, and provide token revocation on logout.
export type PushRegistration = {
  expoPushToken: string
  platform: 'android' | 'ios'
  companyId: string
  deviceId: string
}
export type BookingPushPayload = {
  type: 'booking_offer' | 'rescue_offer' | 'trip_status'
  bookingRequestId: string
  companyId: string
  rescueRequestId?: string
  decisionDeadlineAt?: string
}
export function isExpectedPushForCompany(payload: BookingPushPayload, authorizedCompanyId: string): boolean {
  return payload.companyId === authorizedCompanyId
}
// Local matching is for display only. A push is never proof of authorization,
// availability or entitlement: fetch authoritative server state before action.
