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

export type DeskBooking = BookingLike & {
  pickup_address?: string | null
  dropoff_address?: string | null
  booking_reference?: string | null
  customer_name?: string | null
  estimated_price_eur?: number | null
  driver_pickup_status?: string | null
  completion_confirmation_status?: string | null
  created_at?: string | null
}

const DUE_GRACE_MS = 2 * 60 * 1000

export function isRideNow(booking: { ride_datetime?: string | null }, nowMs: number): boolean {
  if (!booking.ride_datetime) return true
  const ride = Date.parse(booking.ride_datetime)
  if (!Number.isFinite(ride)) return true
  return ride <= nowMs + DUE_GRACE_MS
}

export function pickupProgress(status?: string | null): 'accepted' | 'on_way' | 'arrived' {
  const value = String(status || '').toUpperCase()
  if (value === 'ON_THE_WAY') return 'on_way'
  if (value === 'ARRIVED') return 'arrived'
  return 'accepted'
}

export function isUnderway(booking: { driver_pickup_status?: string | null; completed_at?: string | null }): boolean {
  if (booking.completed_at) return false
  const stage = pickupProgress(booking.driver_pickup_status)
  return stage === 'on_way' || stage === 'arrived'
}

export function activeTrips<T extends DeskBooking>(bookings: T[], nowMs: number): T[] {
  return bookings.filter(booking => classifyBooking(booking, nowMs) === 'accepted')
}

function tripRank(booking: DeskBooking, nowMs: number): number {
  if (isUnderway(booking)) return 0
  if (isRideNow(booking, nowMs)) return 1
  return 2
}

export function sortActiveTrips<T extends DeskBooking>(bookings: T[], nowMs: number): T[] {
  return activeTrips(bookings, nowMs).slice().sort((a, b) => {
    const rank = tripRank(a, nowMs) - tripRank(b, nowMs)
    if (rank !== 0) return rank
    const aTime = Date.parse(a.ride_datetime || '') || Number.MAX_SAFE_INTEGER
    const bTime = Date.parse(b.ride_datetime || '') || Number.MAX_SAFE_INTEGER
    return aTime - bTime
  })
}

export function currentTrip<T extends DeskBooking>(bookings: T[], nowMs: number): T | null {
  const active = activeTrips(bookings, nowMs)
  return active.find(booking => isUnderway(booking)) || active.find(booking => isRideNow(booking, nowMs)) || null
}

export function nextScheduled<T extends DeskBooking>(bookings: T[], nowMs: number): T | null {
  return sortActiveTrips(bookings, nowMs).find(booking => !isUnderway(booking) && !isRideNow(booking, nowMs)) || null
}

export function scheduleLabel(rideDatetime: string | null | undefined, nowMs: number): string {
  if (isRideNow({ ride_datetime: rideDatetime }, nowMs)) return 'Ride Now'
  return new Date(String(rideDatetime)).toLocaleString('en-BE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export type ProgressAction = 'mark_on_way' | 'mark_arrived' | 'complete_trip'

export function nextProgressAction(booking: DeskBooking, nowMs: number): ProgressAction | null {
  if (classifyBooking(booking, nowMs) !== 'accepted') return null
  const stage = pickupProgress(booking.driver_pickup_status)
  if (stage === 'accepted') return 'mark_on_way'
  if (stage === 'on_way') return 'mark_arrived'
  return 'complete_trip'
}

export function navigationTarget(booking: { driver_pickup_status?: string | null; completed_at?: string | null }): 'pickup' | 'dropoff' {
  if (booking.completed_at || pickupProgress(booking.driver_pickup_status) === 'arrived') return 'dropoff'
  return 'pickup'
}

export function confirmationLabel(booking: { completed_at?: string | null; completion_confirmation_status?: string | null }): string | null {
  if (!booking.completed_at) return null
  const status = String(booking.completion_confirmation_status || 'AWAITING_PASSENGER')
  if (status === 'PASSENGER_CONFIRMED') return 'Passenger confirmed'
  if (status === 'CLOSED_UNCONFIRMED') return 'Closed without passenger confirmation'
  if (status === 'LEGACY_COMPLETED') return 'Completed'
  return 'Waiting for passenger confirmation'
}

export type AvailabilityStatus = 'available' | 'busy' | 'offline'

export function availabilityFromControls(online: boolean, acceptNew: boolean): AvailabilityStatus {
  if (!online) return 'offline'
  return acceptNew ? 'available' : 'busy'
}

export function controlsFromAvailability(status?: string | null): { online: boolean; acceptNew: boolean } {
  if (status === 'offline') return { online: false, acceptNew: false }
  if (status === 'busy') return { online: true, acceptNew: false }
  return { online: true, acceptNew: true }
}

export type EarningsSummary = {
  completedTrips: number
  estimatedTotalEur: number | null
  averageEstimatedEur: number | null
  tripsMissingEstimate: number
  paidToCompanyEur: null
  earningsPerHourEur: null
  workingHoursTracked: false
}

function money(value: unknown): number | null {
  if (value == null || value === '') return null
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? amount : null
}

export function earningsBetween(bookings: DeskBooking[], startMs: number, endMs: number): EarningsSummary {
  const completed = bookings.filter(booking => {
    const stamp = Date.parse(booking.completed_at || '')
    return Number.isFinite(stamp) && stamp >= startMs && stamp < endMs
  })
  const priced = completed
    .map(booking => money(booking.estimated_price_eur))
    .filter((amount): amount is number => amount != null)
  const estimatedTotalEur = priced.length ? priced.reduce((sum, amount) => sum + amount, 0) : null
  return {
    completedTrips: completed.length,
    estimatedTotalEur,
    averageEstimatedEur: priced.length ? estimatedTotalEur! / priced.length : null,
    tripsMissingEstimate: completed.length - priced.length,
    paidToCompanyEur: null,
    earningsPerHourEur: null,
    workingHoursTracked: false,
  }
}

export function trailingWindow(bookings: DeskBooking[], nowMs: number, days: number) {
  const currentStart = nowMs - days * 24 * 60 * 60 * 1000
  const previousStart = currentStart - days * 24 * 60 * 60 * 1000
  return {
    current: earningsBetween(bookings, currentStart, nowMs),
    previous: earningsBetween(bookings, previousStart, currentStart),
  }
}

export function localDayBounds(nowMs: number): { start: number; end: number } {
  const date = new Date(nowMs)
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  return { start, end: start + 24 * 60 * 60 * 1000 }
}

export function localDateKey(nowMs: number): string {
  const date = new Date(nowMs)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return date.getFullYear() + '-' + month + '-' + day
}

export function parseDateKey(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const probe = new Date(year, month - 1, day)
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) return null
  return { year, month, day }
}

export function tripsOnLocalDate<T extends DeskBooking>(bookings: T[], dateKey: string): T[] {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return []
  const start = new Date(parsed.year, parsed.month - 1, parsed.day).getTime()
  const end = start + 24 * 60 * 60 * 1000
  return bookings.filter(booking => {
    if (classifyBooking(booking, end) === 'draft') return false
    const stamp = Date.parse(booking.completed_at || booking.ride_datetime || booking.created_at || '')
    return Number.isFinite(stamp) && stamp >= start && stamp < end
  }).sort((a, b) => Date.parse(a.ride_datetime || a.completed_at || a.created_at || '') - Date.parse(b.ride_datetime || b.completed_at || b.created_at || ''))
}

export function pageOf<T>(rows: T[], page: number, size = 20): { rows: T[]; hasMore: boolean } {
  const count = Math.max(1, page) * size
  return { rows: rows.slice(0, count), hasMore: rows.length > count }
}

export function euro(amount: number | null): string {
  if (amount == null) return 'Unavailable'
  return '€' + amount.toFixed(2)
}
