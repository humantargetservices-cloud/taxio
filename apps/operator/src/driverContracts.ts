// The server is the source of truth for all decisions and deadlines.
export type TripAction = 'accept' | 'decline' | 'on_way' | 'arrived' | 'complete'
export type DriverTrip = {
  id: string
  companyId: string
  pickup: string
  dropoff: string
  kind: 'booking' | 'rescue'
  status: string
  decisionDeadlineAt: string | null
}
export function secondsToDeadline(deadline: string | null, nowMs: number): number | null {
  if (!deadline) return null
  const ms = Date.parse(deadline) - nowMs
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 1000)) : null
}
export function isActionAllowedLocally(trip: DriverTrip, nowMs: number): boolean {
  const seconds = secondsToDeadline(trip.decisionDeadlineAt, nowMs)
  return seconds !== null && seconds > 0
}
// UI checks are NOT authorization: all mutations must be checked by the server.
