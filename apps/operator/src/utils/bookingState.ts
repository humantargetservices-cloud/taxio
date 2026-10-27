export type BookingLike = {
  id: string
  status: string
  decision_deadline_at?: string | null
  completed_at?: string | null
  ride_datetime?: string | null
}

export type BookingClass =
  | 'draft'
  | 'actionable'
  | 'accepted'
  | 'expired'
  | 'declined'
  | 'completed'
  | 'other'

export function offerKey(id: string, deadline: string | null | undefined): string {
  return id + ':' + (deadline || '')
}

export function deadlineMs(deadline: string | null | undefined): number | null {
  if (!deadline) return null
  const ms = Date.parse(deadline)
  return Number.isFinite(ms) ? ms : null
}

/** Seconds left until the server deadline. Null when the server sent no deadline. */
export function secondsRemaining(deadline: string | null | undefined, nowMs: number): number | null {
  const ms = deadlineMs(deadline)
  if (ms == null) return null
  return Math.max(0, Math.ceil((ms - nowMs) / 1000))
}

export function classifyBooking(booking: BookingLike, nowMs: number): BookingClass {
  if (booking.completed_at) return 'completed'
  const status = String(booking.status || '').toLowerCase()
  if (status === 'draft') return 'draft'
  if (status === 'accepted') return 'accepted'
  if (status === 'rejected' || status === 'reviewed' || status === 'cancelled') return 'declined'
  if (status === 'new') {
    const ms = deadlineMs(booking.decision_deadline_at)
    if (ms == null || ms <= nowMs) return 'expired'
    return 'actionable'
  }
  return 'other'
}

export function isActionableOffer(booking: BookingLike, nowMs: number): boolean {
  return classifyBooking(booking, nowMs) === 'actionable'
}

const OPEN_RESCUE = new Set(['offered', 'pending'])

export function isActionableRescue(status: string, expiresAt: string | null | undefined, nowMs: number): boolean {
  if (!OPEN_RESCUE.has(String(status || '').toLowerCase())) return false
  const ms = deadlineMs(expiresAt)
  return ms != null && ms > nowMs
}
