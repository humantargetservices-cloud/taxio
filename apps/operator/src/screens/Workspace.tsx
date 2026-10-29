import React, { useEffect, useRef, useState } from 'react'
import * as Notifications from 'expo-notifications'
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { operatorDb, readCompanyBookings, readCompanyRescueOffers, readWonRescueBookingIds, setCompanyAvailability, type CompanyBooking, type RescueOffer } from '../backend'
import { BrandBar, CompanyCard } from '../components/CompanyCard'
import { FullScreenRequest } from '../components/FullScreenRequest'
import { IncomingOffer } from '../components/IncomingOffer'
import { QrSheet } from '../components/QrSheet'
import { TripDetail } from '../components/TripDetail'
import { TabBar, type DriverTab } from '../components/TabBar'
import { IconClock } from '../components/icons'
import { useOfferSync } from '../hooks/useOfferSync'
import { mobileActionsEnabled, sendOperatorAction } from '../operatorActions'
import { theme } from '../theme/theme'
import { isActionableOffer, isActionableRescue } from '../utils/bookingState'
import { bookingHost } from '../utils/environment'
import {
  availabilityFromControls,
  controlsFromAvailability,
  earningsBetween,
  euro,
  localDateKey,
  localDayBounds,
  pageOf,
  pickupWhen,
  shortPlace,
  sortActiveTrips,
  trailingWindow,
  tripsOnLocalDate,
  type ProgressAction,
} from '../utils/driverDesk'

export type DriverBooking = CompanyBooking

export function Workspace({
  companyName,
  slug,
  slogan,
  vatNumber,
  phone,
  demo,
  companyId,
  initialAvailability,
  initialBookings,
  initialRescue,
  pushStatus,
  onSignOut,
}: {
  companyName: string
  logoUrl?: string | null
  slug?: string | null
  slogan?: string | null
  vatNumber?: string | null
  phone?: string | null
  demo: boolean
  companyId: string
  initialAvailability?: string | null
  initialBookings: DriverBooking[]
  initialRescue: RescueOffer[]
  pushStatus?: string
  onSignOut: () => void
}) {
  const [tab, setTab] = useState<DriverTab>('home')
  const [bookings, setBookings] = useState<DriverBooking[]>(initialBookings)
  const [rescueOffers, setRescueOffers] = useState<RescueOffer[]>(initialRescue)
  const [incoming, setIncoming] = useState<DriverBooking | null>(null)
  const [incomingRescue, setIncomingRescue] = useState<RescueOffer | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [syncError, setSyncError] = useState('')
  const [offerError, setOfferError] = useState('')
  const [busy, setBusy] = useState(false)
  const [availability, setAvailability] = useState(initialAvailability || 'available')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyDate, setHistoryDate] = useState(localDateKey(Date.now()))
  const [qrOpen, setQrOpen] = useState(false)
  const [accountPanel, setAccountPanel] = useState<'main' | 'history' | 'help'>('main')
  const [driverName, setDriverName] = useState('')
  const [rescuedIds, setRescuedIds] = useState<string[] | null>(null)
  const bookingsRef = useRef(bookings)
  const rescueRef = useRef(rescueOffers)
  const seenRescue = useRef<Set<string> | null>(null)
  bookingsRef.current = bookings
  rescueRef.current = rescueOffers
  const actions = mobileActionsEnabled() && !demo

  useEffect(() => {
    if (demo) { setDriverName('Preview driver'); return }
    void operatorDb?.auth.getUser().then(({ data }) => {
      const user = data.user
      const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined
      const name = String(meta?.full_name || meta?.name || user?.email || '')
      if (name) setDriverName(name.includes('@') ? name.split('@')[0] : name)
    })
  }, [demo])

  useEffect(() => {
    if (demo) { setRescuedIds([]); return }
    void readWonRescueBookingIds(companyId).then(setRescuedIds)
  }, [companyId, demo, bookings])

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {}
      const kind = String(data.event_type || '')
      const bookingId = String(data.booking_id || '')
      if (kind.includes('rescue')) {
        const offer = rescueRef.current.find(item => isActionableRescue(item.status, item.expires_at, Date.now()))
        if (offer) setIncomingRescue(offer)
        return
      }
      const row = bookingsRef.current.find(item => item.id === bookingId)
      if (row && isActionableOffer(row, Date.now())) setIncoming(row)
      else if (bookingId) { setSelectedId(bookingId); setTab('trips') }
    })
    return () => sub.remove()
  }, [])

  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  useOfferSync({
    companyId,
    enabled: !demo,
    onBookings: setBookings,
    onRescue: setRescueOffers,
    onIncoming: row => { setOfferError(''); setIncoming(row) },
    onAvailability: setAvailability,
    onError: setSyncError,
  })

  useEffect(() => {
    const ids = new Set(rescueOffers.filter(offer => isActionableRescue(offer.status, offer.expires_at, Date.now())).map(offer => offer.id + ':' + offer.expires_at))
    if (seenRescue.current) {
      const fresh = rescueOffers.find(offer => isActionableRescue(offer.status, offer.expires_at, Date.now()) && !seenRescue.current?.has(offer.id + ':' + offer.expires_at))
      if (fresh) setIncomingRescue(fresh)
    }
    seenRescue.current = ids
  }, [rescueOffers])

  useEffect(() => {
    if (incoming && !isActionableOffer(incoming, now)) { setIncoming(null); setOfferError('That request expired.') }
  }, [incoming, now])

  useEffect(() => {
    if (incomingRescue && !isActionableRescue(incomingRescue.status, incomingRescue.expires_at, now)) setIncomingRescue(null)
  }, [incomingRescue, now])

  const actionable = bookings.filter(booking => isActionableOffer(booking, now))
  const trips = sortActiveTrips(bookings, now)
  const openRescue = rescueOffers.filter(offer => isActionableRescue(offer.status, offer.expires_at, now))
  const selected = bookings.find(booking => booking.id === selectedId) || null
  const controls = controlsFromAvailability(availability)
  const host = bookingHost()
  const qr = slug && host && /^[a-z0-9-]+$/.test(slug) ? `https://${slug}.${host}` : null
  const today = localDayBounds(now)
  const dayEarnings = earningsBetween(bookings, today.start, today.end)
  const week = trailingWindow(bookings, now, 7)
  const month = trailingWindow(bookings, now, 30)
  const dayTrips = tripsOnLocalDate(bookings, historyDate)
  const historyPageRows = pageOf(dayTrips, historyPage)
  const completedToday = bookings.filter(booking => {
    const stamp = Date.parse(booking.completed_at || '')
    return Number.isFinite(stamp) && stamp >= today.start && stamp < today.end
  })
  const rescuedToday = rescuedIds ? completedToday.filter(booking => rescuedIds.includes(booking.id)) : []
  const directToday = rescuedIds ? completedToday.filter(booking => !rescuedIds.includes(booking.id)) : completedToday
  const dateLabel = new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()
  const offer = actionable[0]
  const requestOpen = !!incoming || !!incomingRescue

  async function refresh() {
    const rows = await readCompanyBookings(companyId)
    setBookings(rows)
    try { setRescueOffers(await readCompanyRescueOffers(companyId)) } catch { /* rescue may be unavailable */ }
  }

  async function acceptBooking(id: string) {
    const target = bookings.find(booking => booking.id === id)
    if (!target || !isActionableOffer(target, Date.now())) { setIncoming(null); setOfferError('That request expired.'); return }
    if (demo) { setIncoming(null); setOfferError('Preview only. TAXIO was not asked to accept this trip.'); return }
    setBusy(true)
    setOfferError('')
    try {
      const result = await sendOperatorAction(companyId, { action: 'accept_booking', companyId, bookingRequestId: id })
      if (!result.ok) throw Error(result.error || result.code || 'Booking no longer available')
      setIncoming(null)
      setSelectedId(id)
      setTab('trips')
      await refresh()
    } catch (error) {
      setOfferError(error instanceof Error ? error.message : 'Unable to accept')
    } finally { setBusy(false) }
  }

  async function acceptRescue(rescueRequestId: string) {
    const offerRow = rescueOffers.find(item => item.rescue_request_id === rescueRequestId)
    if (!offerRow || !isActionableRescue(offerRow.status, offerRow.expires_at, Date.now())) { setIncomingRescue(null); setOfferError('That rescue offer expired.'); return }
    if (demo) { setIncomingRescue(null); setOfferError('Preview only. Rescue was not sent to TAXIO.'); return }
    setBusy(true)
    setOfferError('')
    try {
      const result = await sendOperatorAction(companyId, { action: 'accept', companyId, rescueRequestId })
      if (!result.ok) throw Error(result.error || result.code || 'Rescue no longer available')
      setIncomingRescue(null)
      setOfferError('Rescue claimed. Passenger details stay locked until the server confirms the passenger.')
      await refresh()
    } catch (error) {
      setOfferError(error instanceof Error ? error.message : 'Unable to claim rescue')
    } finally { setBusy(false) }
  }

  async function progress(action: ProgressAction) {
    if (!selected || demo) { setOfferError(demo ? 'Preview only. Trip progress was not sent.' : 'Select an accepted trip.'); return }
    setBusy(true)
    setOfferError('')
    try {
      const result = await sendOperatorAction(companyId, { action, companyId, bookingRequestId: selected.id })
      if (!result.ok) throw Error(result.error || result.code || 'Unable to update the trip')
      setOfferError(action === 'complete_trip' ? 'Completion sent. The trip is finished only after the server confirms it.' : 'Progress sent to TAXIO.')
      await refresh()
    } catch (error) {
      setOfferError(error instanceof Error ? error.message : 'Update failed')
    } finally { setBusy(false) }
  }

  async function persistAvailability(online: boolean, acceptNew: boolean) {
    const next = availabilityFromControls(online, acceptNew)
    if (demo) { setOfferError('Preview only. Availability was not changed.'); return }
    setBusy(true)
    try {
      await setCompanyAvailability(companyId, next)
      setAvailability(next)
    } catch (error) {
      setOfferError(error instanceof Error ? error.message : 'Unable to update availability')
    } finally { setBusy(false) }
  }

  function sumFares(rows: DriverBooking[]) {
    const amounts = rows.map(row => Number(row.estimated_price_eur)).filter(amount => Number.isFinite(amount))
    return amounts.length ? amounts.reduce((sum, amount) => sum + amount, 0) : null
  }

  function attentionKind(booking: DriverBooking) {
    if (!booking.pickup_address) return 'Needs pickup address · Confirmed'
    const ride = Date.parse(booking.ride_datetime || '')
    if (!Number.isFinite(ride)) return 'Direct booking · Confirmed'
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const rideDay = new Date(ride)
    rideDay.setHours(0, 0, 0, 0)
    return rideDay.getTime() > start.getTime() ? 'Scheduled booking · Confirmed' : 'Direct booking · Confirmed'
  }

  const shell = (body: React.ReactNode) => (
    <>
      <BrandBar onShare={() => setQrOpen(true)} />
      <CompanyCard name={companyName} slogan={slogan} vatNumber={vatNumber} phone={phone} availability={availability} onQr={() => setQrOpen(true)} onShare={() => setQrOpen(true)} />
      {demo ? <Text style={{ color: theme.warn, paddingHorizontal: 18, marginTop: 8 }}>Offline preview. No live bookings.</Text> : null}
      {syncError ? <Text style={{ color: theme.danger, paddingHorizontal: 18, marginTop: 8 }}>{syncError}</Text> : null}
      {offerError ? <Text style={{ color: theme.danger, paddingHorizontal: 18, marginTop: 8 }}>{offerError}</Text> : null}
      {body}
    </>
  )

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {tab === 'home' ? shell(
          <View style={{ padding: 16, gap: 14 }}>
            <Text style={{ color: theme.faint, fontWeight: '800', letterSpacing: 0.8, fontSize: 12 }}>{dateLabel}</Text>
            <Text style={{ color: theme.text, fontSize: 32, fontWeight: '900', marginTop: -8 }}>Your driving day</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Stat value={String(trips.length)} label={'Active\nBookings & updates'} emphasized onPress={() => setTab('trips')} />
              <Stat value={String(completedToday.length)} label={'Completed\nRescued & direct'} />
              <Stat value={String(trips.length + completedToday.length)} label={'Total\nAll trips'} />
            </View>
            {trips.length ? (
              <View style={card}>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>Trips needing attention</Text>
                {trips.map(booking => (
                  <TouchableOpacity key={booking.id} accessibilityRole="button" accessibilityLabel={'Open ' + (booking.booking_reference || 'trip')} onPress={() => { setSelectedId(booking.id); setTab('trips') }} style={{ paddingVertical: 8, gap: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <Text style={{ color: theme.text, fontWeight: '800', flex: 1 }}>{shortPlace(booking.pickup_address)} → {shortPlace(booking.dropoff_address)}</Text>
                      <Text style={{ color: theme.text, fontWeight: '800' }}>{booking.estimated_price_eur == null ? '—' : euro(Number(booking.estimated_price_eur))}</Text>
                    </View>
                    <Text style={{ color: theme.gold, fontWeight: '700' }}>{pickupWhen(booking.ride_datetime, now)}</Text>
                    <Text style={{ color: theme.faint }}>{attentionKind(booking)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            {offer ? (
              <View style={card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>Incoming booking</Text>
                  <Text style={{ color: theme.goldText, backgroundColor: theme.gold, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3, fontWeight: '900', fontSize: 12 }}>NEW</Text>
                </View>
                <Text style={{ color: theme.text, fontWeight: '700' }}>{shortPlace(offer.pickup_address)} → {shortPlace(offer.dropoff_address)}</Text>
                <Text style={{ color: theme.gold, fontWeight: '800' }}>{pickupWhen(offer.ride_datetime, now)}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="View incoming request" onPress={() => setIncoming(offer)} style={goldBtn}>
                  <Text style={goldText}>View incoming request</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {openRescue[0] ? (
              <View style={card}>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>Rescue offer</Text>
                <Text style={{ color: theme.muted }}>Passenger details stay hidden until you are the confirmed winner.</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="View rescue offer" onPress={() => setIncomingRescue(openRescue[0])} style={goldBtn}>
                  <Text style={goldText}>View rescue offer</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        {tab === 'trips' ? shell(selected ? (
          <TripDetail booking={selected} now={now} busy={busy} actionsEnabled={actions || demo} onHome={() => { setSelectedId(null); setTab('home') }} onProgress={progress} />
        ) : (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>Trips</Text>
            {trips.length === 0 ? <Text style={{ color: theme.muted }}>No accepted trips.</Text> : trips.map(booking => (
              <TouchableOpacity key={booking.id} accessibilityRole="button" accessibilityLabel={'Open ' + (booking.booking_reference || 'trip')} onPress={() => setSelectedId(booking.id)} style={card}>
                <Text style={{ color: theme.text, fontWeight: '800' }}>{shortPlace(booking.pickup_address)} → {shortPlace(booking.dropoff_address)}</Text>
                <Text style={{ color: theme.gold }}>{pickupWhen(booking.ride_datetime, now)}</Text>
                <Text style={{ color: theme.muted }}>{booking.booking_reference || 'No reference'} · {booking.customer_name || 'Passenger'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )) : null}

        {tab === 'earnings' ? shell(
          <View style={{ padding: 16, gap: 14 }}>
            <Text style={{ color: theme.faint, fontWeight: '800', letterSpacing: 0.8, fontSize: 12 }}>{dateLabel}</Text>
            <Text style={{ color: theme.text, fontSize: 32, fontWeight: '900', marginTop: -8 }}>Your earnings</Text>
            <View style={card}>
              <Text style={{ color: theme.faint, fontWeight: '800', letterSpacing: 0.6, fontSize: 12 }}>COMPLETED TRIP FARES · TODAY</Text>
              <Text style={{ color: theme.text, fontSize: 40, fontWeight: '900' }}>{euro(dayEarnings.estimatedTotalEur)}</Text>
              <View style={{ alignSelf: 'flex-start', backgroundColor: '#12362a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: theme.ok, fontWeight: '800' }}>{dayEarnings.completedTrips} completed trips</Text>
              </View>
              <Text style={{ color: theme.faint }}>Gross fares · before fees and expenses</Text>
            </View>
            <View style={card}>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>Breakdown</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: theme.muted }}>Direct bookings · {directToday.length}</Text><Text style={{ color: theme.text, fontWeight: '700' }}>{euro(sumFares(directToday))}</Text></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: theme.muted }}>Rescued trips · {rescuedIds ? rescuedToday.length : '—'}</Text><Text style={{ color: theme.text, fontWeight: '700' }}>{rescuedIds ? euro(sumFares(rescuedToday)) : 'Unavailable'}</Text></View>
            </View>
          </View>
        ) : null}

        {tab === 'account' ? shell(
          <View style={{ padding: 16, gap: 14 }}>
            {accountPanel === 'history' ? (
              <View style={{ gap: 12 }}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to account" onPress={() => setAccountPanel('main')}><Text style={{ color: theme.gold, fontWeight: '800' }}>← Account</Text></TouchableOpacity>
                <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>History & averages</Text>
                <TextInput accessibilityLabel="History date" value={historyDate} onChangeText={value => { setHistoryDate(value); setHistoryPage(1) }} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" style={{ backgroundColor: theme.card, color: theme.text, borderRadius: 12, padding: 12 }} />
                <Text style={{ color: theme.muted }}>{dayTrips.length} trips. Working and waiting time are not tracked.</Text>
                {historyPageRows.rows.map(booking => (
                  <TouchableOpacity key={booking.id} accessibilityRole="button" onPress={() => { setSelectedId(booking.id); setTab('trips') }} style={card}>
                    <Text style={{ color: theme.gold }}>{pickupWhen(booking.ride_datetime || booking.completed_at, now)}</Text>
                    <Text style={{ color: theme.text }}>{shortPlace(booking.pickup_address)} → {shortPlace(booking.dropoff_address)}</Text>
                    <Text style={{ color: theme.muted }}>{booking.estimated_price_eur == null ? 'Estimate unavailable' : 'Estimated ' + euro(Number(booking.estimated_price_eur))}</Text>
                  </TouchableOpacity>
                ))}
                {historyPageRows.hasMore ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Load more history" onPress={() => setHistoryPage(page => page + 1)} style={card}><Text style={{ color: theme.text, fontWeight: '800' }}>Load more</Text></TouchableOpacity> : null}
                <Text style={{ color: theme.muted }}>7 days: {week.current.completedTrips} trips, estimated {euro(week.current.estimatedTotalEur)}. Previous 7 days: {week.previous.completedTrips}, estimated {euro(week.previous.estimatedTotalEur)}.</Text>
                <Text style={{ color: theme.muted }}>30 days: {month.current.completedTrips} trips, estimated {euro(month.current.estimatedTotalEur)}. Previous 30 days: {month.previous.completedTrips}, estimated {euro(month.previous.estimatedTotalEur)}.</Text>
              </View>
            ) : accountPanel === 'help' ? (
              <View style={{ gap: 12 }}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to account" onPress={() => setAccountPanel('main')}><Text style={{ color: theme.gold, fontWeight: '800' }}>← Account</Text></TouchableOpacity>
                <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>Language, appearance & help</Text>
                <View style={card}>
                  <Text style={{ color: theme.text, fontWeight: '800' }}>Alerts</Text>
                  <Text style={{ color: theme.muted }}>{pushStatus || 'Alerts not registered'}</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign out" onPress={onSignOut} style={card}><Text style={{ color: theme.danger, fontWeight: '800' }}>Sign out</Text></TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <Text style={{ color: theme.text, fontSize: 32, fontWeight: '900' }}>Driver account</Text>
                <View style={card}>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>{driverName || 'Driver'}</Text>
                  <Text style={{ color: theme.muted }}>{companyName} · driver</Text>
                </View>
                <View style={card}>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>Availability</Text>
                  <View style={{ alignSelf: 'flex-start', backgroundColor: controls.online ? '#12362a' : '#2a2430', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: controls.online ? theme.ok : theme.faint, fontWeight: '800' }}>{controls.online ? 'ONLINE' : 'OFFLINE'}</Text>
                  </View>
                  <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: controls.acceptNew, disabled: !controls.online || busy }} disabled={!controls.online || busy} onPress={() => persistAvailability(true, !controls.acceptNew)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: controls.acceptNew ? theme.gold : 'transparent', borderWidth: 2, borderColor: theme.gold, alignItems: 'center', justifyContent: 'center' }}>
                      {controls.acceptNew ? <Text style={{ color: theme.goldText, fontWeight: '900', fontSize: 14 }}>✓</Text> : null}
                    </View>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>Accept new requests</Text>
                  </TouchableOpacity>
                  <Text style={{ color: theme.faint }}>Switch off requests to pause new bookings.</Text>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={controls.online ? 'Go offline' : 'Go online'} disabled={busy} onPress={() => persistAvailability(!controls.online, !controls.online)} style={{ borderWidth: 1, borderColor: '#d16a5c', borderRadius: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: theme.danger, fontWeight: '800' }}>{controls.online ? 'Go offline' : 'Go online'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={card}>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>History & performance</Text>
                  <Text style={{ color: theme.muted }}>Review previous workdays, trip fares and your averages.</Text>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="View history and averages" onPress={() => setAccountPanel('history')} style={goldBtn}>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><IconClock /><Text style={goldText}>View history & averages</Text></View>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Language, appearance and help" onPress={() => setAccountPanel('help')} style={{ ...card, alignItems: 'center' }}>
                  <Text style={{ color: theme.text, fontWeight: '700' }}>Language, appearance & help</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
      <IncomingOffer offer={incoming} now={now} busy={busy} actionsEnabled={actions} error={offerError} onAccept={() => incoming && acceptBooking(incoming.id)} companyName={companyName} slogan={slogan} vatNumber={vatNumber} phone={phone} availability={availability} />
      <FullScreenRequest
        visible={!!incomingRescue}
        title="RESCUE OFFER"
        pickup={incomingRescue?.rescue?.preview_pickup_label}
        dropoff={incomingRescue?.rescue?.preview_dropoff_label}
        whenText={pickupWhen(incomingRescue?.rescue?.preview_ride_datetime, now)}
        fareText={incomingRescue?.rescue?.preview_estimated_price || 'Fare estimate unavailable'}
        fareNote="Rescue fare · passenger details stay hidden"
        deadline={incomingRescue?.expires_at}
        now={now}
        busy={busy}
        error={offerError}
        acceptLabel="Accept trip"
        actionsEnabled={actions}
        onAccept={() => incomingRescue && acceptRescue(incomingRescue.rescue_request_id)}
        companyName={companyName}
        slogan={slogan}
        vatNumber={vatNumber}
        phone={phone}
        availability={availability}
      />
      {requestOpen ? null : <TabBar tab={tab} onChange={next => { setTab(next); setAccountPanel('main'); if (next !== 'trips') setSelectedId(null) }} />}
      <QrSheet visible={qrOpen} companyName={companyName} url={qr} onClose={() => setQrOpen(false)} />
    </View>
  )
}

function Stat({ value, label, emphasized, onPress }: { value: string; label: string; emphasized?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" disabled={!onPress} onPress={onPress} style={{ flex: 1, backgroundColor: theme.card, borderRadius: 16, padding: 12, minHeight: 108, borderWidth: emphasized ? 1 : 0, borderColor: theme.gold }}>
      <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>{value}</Text>
      <Text style={{ color: theme.muted, marginTop: 6 }}>{label}</Text>
    </TouchableOpacity>
  )
}

const card = { backgroundColor: theme.card, borderRadius: 18, padding: 16, gap: 8 }
const goldBtn = { backgroundColor: theme.gold, borderRadius: 14, minHeight: 52, alignItems: 'center' as const, justifyContent: 'center' as const }
const goldText = { color: theme.goldText, fontWeight: '900' as const, fontSize: 16 }
