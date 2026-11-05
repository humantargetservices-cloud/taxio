import { useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { operatorDb, readCompanyBookings, readCompanyRescueOffers, type CompanyBooking, type RescueOffer } from '../backend'
import { isActionableOffer, offerKey } from '../utils/bookingState'

export type SyncBooking = CompanyBooking

type Options = {
  companyId: string | null
  enabled: boolean
  onBookings: (rows: SyncBooking[]) => void
  onRescue: (rows: RescueOffer[]) => void
  onIncoming: (booking: SyncBooking) => void
  onAvailability?: (status: string) => void
  onError: (message: string) => void
}

/** Foreground sync only. Background delivery requires a server push sender. */
export function useOfferSync(options: Options) {
  const seenOfferKeys = useRef<Set<string> | null>(null)
  const syncInFlight = useRef(false)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!options.companyId || !options.enabled) return
    let active = true
    const update = async () => {
      if(syncInFlight.current) return
      syncInFlight.current=true
      setSyncing(true)
      try {
        const rows = await readCompanyBookings(optionsRef.current.companyId || '')
        if (active) {
          const ids = new Set(rows.filter(b => isActionableOffer(b, Date.now())).map(b => b.id+':'+b.decision_deadline_at))
          const incoming = seenOfferKeys.current === null ? null : rows.find(b => isActionableOffer(b, Date.now()) && !seenOfferKeys.current?.has(b.id+':'+b.decision_deadline_at))
          seenOfferKeys.current = ids
          optionsRef.current.onBookings(rows)
          if (incoming) optionsRef.current.onIncoming(incoming)
          const company = await operatorDb?.from('companies').select('availability_status').eq('id', optionsRef.current.companyId || '').maybeSingle()
          if (company?.data?.availability_status) optionsRef.current.onAvailability?.(company.data.availability_status)
          try { optionsRef.current.onRescue(await readCompanyRescueOffers(optionsRef.current.companyId || '')) }
          catch { /* rescue permission may be unavailable */ }
        }
      } catch (e) {
        if (active) optionsRef.current.onError(e instanceof Error ? e.message : 'Unable to synchronize bookings')
      } finally {syncInFlight.current=false; if (active) setSyncing(false)}
    }
    void update()
    const timer = setInterval(() => { if (AppState.currentState === 'active') void update() }, 10000)
    const realtime = operatorDb?.channel('operator-' + options.companyId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_requests', filter: 'company_id=eq.' + options.companyId }, () => { if (AppState.currentState === 'active') void update() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rescue_opportunities', filter: 'company_id=eq.' + options.companyId }, () => { if (AppState.currentState === 'active') void update() })
      .subscribe()
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void update() })
    return () => { active = false; clearInterval(timer); subscription.remove(); if (realtime) void operatorDb?.removeChannel(realtime) }
  }, [options.companyId, options.enabled])

  return { syncing, remember(rows: SyncBooking[]) { seenOfferKeys.current = new Set(rows.filter(b => isActionableOffer(b, Date.now())).map(b => offerKey(b.id, b.decision_deadline_at))) } }
}
