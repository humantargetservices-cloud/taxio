/** Untrusted push data is a hint, never authorization to operate on a trip. */
export type OperatorPushEnvelope = {
  type: 'booking_offer' | 'rescue_offer' | 'trip_status'
  companyId: string
  bookingRequestId?: string
  rescueRequestId?: string
  decisionDeadlineAt?: string
}

/** Require a matching verified owner company and a valid identifier before refetching. */
export function parseOperatorPushEnvelope(
  input: unknown,
  authorizedCompanyId: string,
): OperatorPushEnvelope | null {
  if (!input || typeof input !== 'object' || !authorizedCompanyId) return null
  const x = input as Record<string, unknown>
  if (x.companyId !== authorizedCompanyId) return null
  if (x.type !== 'booking_offer' && x.type !== 'rescue_offer' && x.type !== 'trip_status') return null
  const bookingRequestId = typeof x.bookingRequestId === 'string' ? x.bookingRequestId : undefined
  const rescueRequestId = typeof x.rescueRequestId === 'string' ? x.rescueRequestId : undefined
  if (!bookingRequestId && !rescueRequestId) return null
  if (bookingRequestId && bookingRequestId.length > 128) return null
  if (rescueRequestId && rescueRequestId.length > 128) return null
  const deadline = typeof x.decisionDeadlineAt === 'string' ? x.decisionDeadlineAt : undefined
  if (deadline && !Number.isFinite(Date.parse(deadline))) return null
  return {
    type: x.type,
    companyId: authorizedCompanyId,
    bookingRequestId,
    rescueRequestId,
    decisionDeadlineAt: deadline,
  }
}

export function isPushOfferStillCurrent(envelope: OperatorPushEnvelope, now = Date.now()): boolean {
  if (envelope.type === 'trip_status') return true
  return Boolean(envelope.decisionDeadlineAt && Date.parse(envelope.decisionDeadlineAt) > now)
}

// Always refetch booking/rescue data with the authenticated user session.
// Never use push payload fields as authority for acceptance, passenger PII,
// or a client-generated expiry extension.
