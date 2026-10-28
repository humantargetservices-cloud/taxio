import React, { useEffect, useRef, useState } from 'react'
import * as Notifications from 'expo-notifications'
import { Image, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { readCompanyBookings, readCompanyRescueOffers, setCompanyAvailability, type CompanyBooking, type RescueOffer } from '../backend'
import { FullScreenRequest } from '../components/FullScreenRequest'
import { IncomingOffer } from '../components/IncomingOffer'
import { RouteDetails } from '../components/RouteDetails'
import { TripDetail } from '../components/TripDetail'
import { TabBar, type DriverTab } from '../components/TabBar'
import { useOfferSync } from '../hooks/useOfferSync'
import { mobileActionsEnabled, sendOperatorAction } from '../operatorActions'
import { theme } from '../theme/theme'
import { isActionableOffer, isActionableRescue } from '../utils/bookingState'
import { bookingHost } from '../utils/environment'
import {
  availabilityFromControls,
  controlsFromAvailability,
  currentTrip,
  earningsBetween,
  euro,
  localDateKey,
  localDayBounds,
  nextScheduled,
  pageOf,
  scheduleLabel,
  sortActiveTrips,
  trailingWindow,
  tripsOnLocalDate,
  type ProgressAction,
} from '../utils/driverDesk'

export type DriverBooking = CompanyBooking

export function Workspace({
  companyName,
  logoUrl,
  slug,
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
  const bookingsRef = useRef(bookings)
  const rescueRef = useRef(rescueOffers)
  const seenRescue = useRef<Set<string> | null>(null)
  bookingsRef.current = bookings
  rescueRef.current = rescueOffers
  const actions = mobileActionsEnabled() && !demo

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
  const underway = currentTrip(bookings, now)
  const scheduled = nextScheduled(bookings, now)
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
    const offer = rescueOffers.find(item => item.rescue_request_id === rescueRequestId)
    if (!offer || !isActionableRescue(offer.status, offer.expires_at, Date.now())) { setIncomingRescue(null); setOfferError('That rescue offer expired.'); return }
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
      setOfferError(next === 'available' ? 'Accepting new trips.' : next === 'busy' ? 'Online, not accepting new trips.' : 'Offline.')
    } catch (error) {
      setOfferError(error instanceof Error ? error.message : 'Unable to update availability')
    } finally { setBusy(false) }
  }

  function openTrip(id: string) {
    setSelectedId(id)
    setTab('trips')
  }

  const stateLabel = availability === 'offline' ? 'Offline' : availability === 'busy' ? 'Online · not accepting new trips' : 'Online · accepting trips'

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 28 }}>
        {demo ? <Text style={{ color: theme.warn }}>Offline preview. No live bookings.</Text> : null}
        {syncError ? <Text style={{ color: theme.danger }}>{syncError}</Text> : null}
        {offerError ? <Text style={{ color: theme.danger }}>{offerError}</Text> : null}

        {tab === 'home' ? (
          <View style={{ gap: 14 }}>
            <Text style={{ color: theme.gold, fontWeight: '900', letterSpacing: 2, fontSize: 18 }}>TAXIO</Text>
            {logoUrl ? <Image source={{ uri: logoUrl }} accessibilityLabel="Company logo" style={{ width: 52, height: 52, borderRadius: 12 }} /> : null}
            <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>{companyName}</Text>
            <Text style={{ color: availability === 'available' ? theme.ok : theme.warn, fontSize: 18, fontWeight: '800' }}>{stateLabel}</Text>
            <HomeCard title="Current trip" body={underway ? scheduleLabel(underway.ride_datetime, now) + ' · ' + (underway.pickup_address || '') : 'No trip underway'} onPress={() => underway && openTrip(underway.id)} />
            <HomeCard title="Next scheduled pickup" body={scheduled ? scheduleLabel(scheduled.ride_datetime, now) + ' · ' + (scheduled.pickup_address || '') : 'No scheduled trip'} onPress={() => scheduled && openTrip(scheduled.id)} />
            <HomeCard title="Pending requests" body={String(actionable.length)} onPress={() => actionable[0] && setIncoming(actionable[0])} />
            <HomeCard title="Rescue" body={String(openRescue.length)} onPress={() => openRescue[0] && setIncomingRescue(openRescue[0])} />
            <HomeCard title="Active trips" body={String(trips.length)} onPress={() => setTab('trips')} />
          </View>
        ) : null}

        {tab === 'trips' ? (
          selected ? (
            <TripDetail booking={selected} companyName={companyName} now={now} busy={busy} actionsEnabled={actions || demo} onBack={() => setSelectedId(null)} onProgress={progress} />
          ) : (
            <View style={{ gap: 12 }}>
              <Text style={{ color: theme.text, fontSize: 24, fontWeight: '900' }}>Active trips</Text>
              {trips.length === 0 ? <Text style={{ color: theme.muted }}>No accepted trips.</Text> : trips.map(booking => (
                <TouchableOpacity key={booking.id} accessibilityRole="button" accessibilityLabel={'Open ' + (booking.booking_reference || 'trip')} onPress={() => setSelectedId(booking.id)} style={card}>
                  <Text style={{ color: theme.gold, fontWeight: '800' }}>{scheduleLabel(booking.ride_datetime, now)}</Text>
                  <Text style={{ color: theme.text, fontWeight: '800' }}>{booking.booking_reference || 'No reference'} · {booking.driver_pickup_status || 'Accepted'}</Text>
                  <RouteDetails pickup={booking.pickup_address} dropoff={booking.dropoff_address} />
                  <Text style={{ color: theme.muted }}>{booking.customer_name || 'Passenger name unavailable'}</Text>
                  <Text style={{ color: theme.muted }}>{booking.estimated_price_eur == null ? 'Fare estimate unavailable' : 'Estimated ' + euro(Number(booking.estimated_price_eur))}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )
        ) : null}

        {tab === 'earnings' ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: theme.text, fontSize: 24, fontWeight: '900' }}>Earnings</Text>
            <Text style={{ color: theme.faint }}>Estimated booking value. TAXIO does not record money paid to the company.</Text>
            <EarningsBlock label="Today" summary={dayEarnings} />
            <EarningsBlock label="Last 7 days" summary={week.current} />
            <EarningsBlock label="Previous 7 days" summary={week.previous} />
            <EarningsBlock label="Last 30 days" summary={month.current} />
            <EarningsBlock label="Previous 30 days" summary={month.previous} />
            <Text style={{ color: theme.muted }}>Earnings per hour: unavailable. Working hours are not tracked, and trip duration is not used as a substitute.</Text>
          </View>
        ) : null}

        {tab === 'account' ? (
          <View style={{ gap: 14 }}>
            <Text style={{ color: theme.text, fontSize: 24, fontWeight: '900' }}>Account</Text>
            <Text style={{ color: theme.text, fontWeight: '800' }}>{companyName}</Text>
            <Text style={{ color: theme.muted }}>{stateLabel}</Text>
            <SwitchRow label="Online" value={controls.online} disabled={busy} onChange={value => persistAvailability(value, value ? true : false)} />
            <SwitchRow label="Accept new requests" value={controls.acceptNew} disabled={busy || !controls.online} onChange={value => persistAvailability(true, value)} />
            <Text style={{ color: theme.faint }}>Busy keeps the company online and the booking page shows busy. Staging refuses a new trip while busy or offline. Rescue offers still use the existing Rescue list.</Text>
            <Text style={{ color: theme.text, fontWeight: '800' }}>Alerts</Text>
            <Text style={{ color: theme.muted }}>{pushStatus || 'Alerts not registered'}</Text>
            <Text style={{ color: theme.text, fontWeight: '800' }}>Booking QR</Text>
            {qr ? <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center' }}><QRCode value={qr} size={160} /><Text style={{ color: '#111', marginTop: 8 }}>{qr}</Text></View> : <Text style={{ color: theme.muted }}>QR is shown only for an isolated staging company address.</Text>}
            {qr ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Share booking page" onPress={() => Share.share({ message: qr })} style={card}><Text style={{ color: theme.text, fontWeight: '800' }}>Share booking page</Text></TouchableOpacity> : null}
            <Text style={{ color: theme.text, fontWeight: '800' }}>History</Text>
            <TextInput accessibilityLabel="History date" value={historyDate} onChangeText={value => { setHistoryDate(value); setHistoryPage(1) }} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" style={{ backgroundColor: theme.input, color: theme.inputText, borderRadius: 12, padding: 12 }} />
            <Text style={{ color: theme.muted }}>{dayTrips.length} trips on this date. Working and waiting time are not tracked.</Text>
            {historyPageRows.rows.length === 0 ? <Text style={{ color: theme.muted }}>No trips for this date.</Text> : historyPageRows.rows.map(booking => (
              <TouchableOpacity key={booking.id} accessibilityRole="button" onPress={() => openTrip(booking.id)} style={card}>
                <Text style={{ color: theme.gold }}>{scheduleLabel(booking.ride_datetime, now)}</Text>
                <Text style={{ color: theme.text }}>{booking.pickup_address} → {booking.dropoff_address}</Text>
                <Text style={{ color: theme.muted }}>{booking.status}{booking.completed_at ? ' · completed' : ''} · {booking.estimated_price_eur == null ? 'Estimate unavailable' : 'Estimated ' + euro(Number(booking.estimated_price_eur))}</Text>
              </TouchableOpacity>
            ))}
            {historyPageRows.hasMore ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Load more history" onPress={() => setHistoryPage(page => page + 1)} style={card}><Text style={{ color: theme.text, fontWeight: '800' }}>Load more</Text></TouchableOpacity> : null}
            <Text style={{ color: theme.text, fontWeight: '800' }}>Performance</Text>
            <Text style={{ color: theme.muted }}>7 days: {week.current.completedTrips} completed, estimated {euro(week.current.estimatedTotalEur)}. Previous 7 days: {week.previous.completedTrips} completed, estimated {euro(week.previous.estimatedTotalEur)}.</Text>
            <Text style={{ color: theme.muted }}>30 days: {month.current.completedTrips} completed, estimated {euro(month.current.estimatedTotalEur)}. Previous 30 days: {month.previous.completedTrips} completed, estimated {euro(month.previous.estimatedTotalEur)}.</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign out" onPress={onSignOut} style={card}><Text style={{ color: theme.danger, fontWeight: '800' }}>Sign out</Text></TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
      <IncomingOffer offer={incoming} now={now} busy={busy} actionsEnabled={actions} error={offerError} onAccept={() => incoming && acceptBooking(incoming.id)} />
      <FullScreenRequest
        visible={!!incomingRescue}
        title="Rescue offer"
        pickup={incomingRescue?.rescue?.preview_pickup_label}
        dropoff={incomingRescue?.rescue?.preview_dropoff_label}
        whenText={scheduleLabel(incomingRescue?.rescue?.preview_ride_datetime, now)}
        fareText={incomingRescue?.rescue?.preview_estimated_price ? 'Estimated fare ' + incomingRescue.rescue.preview_estimated_price : 'Fare estimate unavailable'}
        deadline={incomingRescue?.expires_at}
        now={now}
        busy={busy}
        error={offerError}
        acceptLabel="ACCEPT"
        actionsEnabled={actions}
        onAccept={() => incomingRescue && acceptRescue(incomingRescue.rescue_request_id)}
      />
      <TabBar tab={tab} onChange={next => { setTab(next); if (next !== 'trips') setSelectedId(null) }} />
    </View>
  )
}

function HomeCard({ title, body, onPress }: { title: string; body: string; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={card}>
      <Text style={{ color: theme.faint, fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>{body}</Text>
    </TouchableOpacity>
  )
}

function EarningsBlock({ label, summary }: { label: string; summary: { completedTrips: number; estimatedTotalEur: number | null; averageEstimatedEur: number | null; paidToCompanyEur: null } }) {
  return (
    <View style={card}>
      <Text style={{ color: theme.text, fontWeight: '800' }}>{label}</Text>
      <Text style={{ color: theme.gold, fontSize: 20, fontWeight: '900' }}>{summary.completedTrips} completed · estimated {euro(summary.estimatedTotalEur)}</Text>
      <Text style={{ color: theme.muted }}>Average estimated fare {euro(summary.averageEstimatedEur)}</Text>
      <Text style={{ color: theme.faint }}>Paid to the company: not recorded</Text>
    </View>
  )
}

function SwitchRow({ label, value, disabled, onChange }: { label: string; value: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <TouchableOpacity accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value, disabled }} disabled={disabled} onPress={() => onChange(!value)} style={card}>
      <Text style={{ color: theme.text, fontWeight: '800' }}>{label}</Text>
      <Text style={{ color: value ? theme.ok : theme.muted }}>{value ? 'On' : 'Off'}</Text>
    </TouchableOpacity>
  )
}

const card = { backgroundColor: theme.card, borderRadius: 16, padding: 16, gap: 6 }
