import React, { useEffect, useRef, useState } from 'react'
import * as Notifications from 'expo-notifications'
import { Alert, BackHandler, Linking, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { operatorDb, readCompanyBookings, readCompanyRescueOffers, readWonRescueBookingIds, setCompanyAvailability, type CompanyBooking, type RescueOffer } from '../backend'
import QRCode from 'react-native-qrcode-svg'
import { BrandBar, CompanyCard } from '../components/CompanyCard'
import { TabBar, type DriverTab } from '../components/TabBar'
import { IconClock, IconNavigate, IconPhone } from '../components/icons'
import { navigationUrl } from '../utils/navigation'
import { useOfferSync } from '../hooks/useOfferSync'
import { mobileActionsEnabled, sendOperatorAction } from '../operatorActions'
import { theme } from '../theme/theme'
import { isActionableOffer, isActionableRescue, pickupProgress, routeOpenedAlert, secondsRemaining } from '../utils/bookingState'
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
  pushPermission,
  lastAlertTest,
  onTestAlert,
  testAlertBusy,
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
  pushPermission?: string
  lastAlertTest?: string
  onTestAlert?: () => void
  testAlertBusy?: boolean
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
  const [driverName, setDriverName] = useState('')
  const [rescuedIds, setRescuedIds] = useState<string[] | null>(null)
  const [expanded, setExpanded] = useState<'active' | 'completed' | 'total' | null>('active')
  const [panel, setPanel] = useState<'' | 'qr' | 'share' | 'contact' | 'eta' | 'prefs'>('')
  const [notice, setNotice] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [onboard, setOnboard] = useState<Record<string, true>>({})
  const [etaById, setEtaById] = useState<Record<string, number>>({})
  const [etaDraft, setEtaDraft] = useState('8')
  const [averageWindow, setAverageWindow] = useState<7 | 30>(7)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({})
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

  const openAlertRef = useRef<(data: Record<string, unknown>) => void>(() => {})
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {}
      void openAlertRef.current(data)
    })
    return () => sub.remove()
  }, [])

  async function openAlert(data: Record<string, unknown>) {
    const kind = String(data.event_type || '')
    const bookingId = String(data.booking_id || '')
    const rescueId = String(data.rescue_request_id || data.rescue_opportunity_id || '')
    let rows = bookingsRef.current
    let rescueRows = rescueRef.current
    if (!demo) {
      try {
        rows = await readCompanyBookings(companyId)
        setBookings(rows)
        try {
          rescueRows = await readCompanyRescueOffers(companyId)
          setRescueOffers(rescueRows)
        } catch { /* rescue may be unavailable */ }
      } catch {
        setNotice('Could not refresh this alert. Check the connection before acting on it.')
        return
      }
    }
    const booking = rows.find(row => row.id === bookingId) || null
    const rescueOffer = rescueRows.find(row => row.rescue_request_id === rescueId || row.id === rescueId) || null
    const action = routeOpenedAlert({ eventType: kind, booking, rescue: rescueOffer, nowMs: Date.now() })
    setIncoming(null)
    setIncomingRescue(null)
    if (action === 'test') { setNotice('Test alert opened. No trip was created.'); return }
    if (action === 'open-booking' && booking) { setOfferError(''); setIncoming(booking); setNotice(''); return }
    if (action === 'open-rescue' && rescueOffer) { setIncomingRescue(rescueOffer); setNotice(''); return }
    if (action === 'open-trip' && booking) { setSelectedId(booking.id); setTab('trips'); setNotice(''); return }
    if (action === 'expired') { setNotice('Request expired · no trip accepted'); return }
    setNotice('This offer is no longer available.')
  }
  openAlertRef.current = openAlert

  useEffect(() => {
    if (demo) return
    const actionable = new Set(bookings.filter(row => isActionableOffer(row, Date.now())).map(row => row.id))
    void Notifications.getPresentedNotificationsAsync().then(items => {
      for (const item of items) {
        const bookingId = String(item.request.content.data?.booking_id || '')
        if (!bookingId || actionable.has(bookingId)) continue
        void Notifications.dismissNotificationAsync(item.request.identifier)
      }
    }).catch(() => {})
  }, [bookings, demo])

  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  useEffect(() => {
    if (!incoming && !incomingRescue) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [incoming, incomingRescue])

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
    if (incoming && !isActionableOffer(incoming, now)) { setIncoming(null); setNotice('Request expired · no trip accepted') }
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


  function stageOf(booking: DriverBooking): 1 | 2 | 3 | 4 | 5 {
    if (booking.completed_at) return 5
    const progress = pickupProgress(booking.driver_pickup_status)
    if (progress === 'arrived') return onboard[booking.id] ? 4 : 3
    if (progress === 'on_way') return 2
    return 1
  }

  function tripKind(booking: DriverBooking) {
    if (!booking.pickup_address || /missing/i.test(booking.pickup_address)) return 'Needs pickup address'
    const ride = Date.parse(booking.ride_datetime || '')
    if (!Number.isFinite(ride)) return 'Direct booking'
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const rideDay = new Date(ride)
    rideDay.setHours(0, 0, 0, 0)
    return rideDay.getTime() > start.getTime() ? 'Scheduled booking' : 'Direct booking'
  }

  const stageName = ['', 'Confirmed', 'On the way', 'Arrived', 'Passenger onboard', 'Completed']
  const stageAction = ['', "I'm on my way", "I've arrived", 'Start trip', 'Complete trip']

  function sumFares(rows: DriverBooking[]) {
    const amounts = rows.map(row => Number(row.estimated_price_eur)).filter(amount => Number.isFinite(amount))
    return amounts.length ? amounts.reduce((sum, amount) => sum + amount, 0) : null
  }

  async function advance() {
    if (!selected) return
    const stage = stageOf(selected)
    if (stage === 4) { setConfirming(true); return }
    if (stage === 3) { setOnboard(current => ({ ...current, [selected.id]: true })); return }
    await progress(stage === 1 ? 'mark_on_way' : 'mark_arrived')
  }

  async function finishTrip() {
    setConfirming(false)
    await progress('complete_trip')
  }

  async function openNav(address: string) {
    const choice = await new Promise<'waze' | 'google' | null>(resolve => {
      Alert.alert('Navigate', address, [
        { text: 'Waze', onPress: () => resolve('waze') },
        { text: 'Google Maps', onPress: () => resolve('google') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ])
    })
    if (!choice) return
    const url = navigationUrl(address, choice)
    if (!url) { setNotice('Navigation unavailable. This address is missing.'); return }
    try { await Linking.openURL(url) } catch { setNotice('Unable to open navigation.') }
  }

  function copyLink() {
    if (!qr) { setNotice('A booking link is available only for an isolated staging company address.'); return }
    void Share.share({ message: qr }).then(() => setNotice('Booking link ready to share.')).catch(() => setNotice(qr))
  }

  const onTrip = trips.some(booking => { const stage = stageOf(booking); return stage > 1 && stage < 5 })
  const statusText = onTrip ? '● On a trip' : controls.online ? '● Online' : '○ Offline'
  const navTab: DriverTab = selected && tab === 'trips' ? 'trips' : historyOpen ? 'account' : tab
  const period = averageWindow === 7 ? week : month
  const activeRows = expanded === 'completed' ? completedToday : expanded === 'total' ? [...trips, ...completedToday] : trips
  const requestBooking = incoming
  const rescueRow = incomingRescue

  function tripRow(booking: DriverBooking) {
    const stage = stageOf(booking)
    return (
      <TouchableOpacity key={booking.id} accessibilityRole="button" accessibilityLabel={'Open ' + (booking.booking_reference || 'trip')} onPress={() => { setSelectedId(booking.id); setTab('trips'); setPanel(''); setHistoryOpen(false) }} style={tripRowStyle}>
        <View style={row}>
          <Text style={{ color: theme.text, fontWeight: '700', flex: 1 }}>{shortPlace(booking.pickup_address)} → {shortPlace(booking.dropoff_address)}</Text>
          <Text style={{ color: theme.text }}>{booking.estimated_price_eur == null ? '—' : euro(Number(booking.estimated_price_eur))}</Text>
        </View>
        <Text style={pickup}>{pickupWhen(booking.ride_datetime || booking.completed_at, now)}</Text>
        <Text style={small}>{stage === 5 ? 'Completed' : tripKind(booking) + ' · ' + stageName[stage]}</Text>
      </TouchableOpacity>
    )
  }

  const panels = panel === 'qr' || panel === 'share' ? (
    <View style={sheet}>
      <View style={row}>
        <Text style={[h3, { flex: 1, marginBottom: 0 }]}>{panel === 'qr' ? 'Scan to book with ' + companyName : 'Share booking page'}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => setPanel('')} style={chipBtn}><Text style={btnText}>Close</Text></TouchableOpacity>
      </View>
      {panel === 'qr' && qr ? <View style={qrBox}><QRCode value={qr} size={166} /></View> : null}
      <Text style={{ color: theme.text, marginVertical: 7 }}>{qr || 'Staging booking link unavailable'}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Copy booking link" onPress={copyLink} style={primaryBtn}><Text style={primaryText}>Copy booking link</Text></TouchableOpacity>
    </View>
  ) : panel === 'contact' && selected ? (
    <View style={sheet}>
      <Text style={h3}>Contact {selected.customer_name || 'passenger'}</Text>
      <View style={twoCol}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Call" onPress={() => selected.customer_phone ? Linking.openURL('tel:' + selected.customer_phone) : setNotice('Passenger phone is hidden until this trip is accepted.')} style={halfBtn}><Text style={btnText}>Call</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="WhatsApp" onPress={() => {
          const digits = String(selected.customer_phone || '').replace(/\D/g, '')
          if (!digits) { setNotice('Passenger phone is hidden until this trip is accepted.'); return }
          void Linking.openURL('https://wa.me/' + digits)
        }} style={halfBtn}><Text style={btnText}>WhatsApp</Text></TouchableOpacity>
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close contact" onPress={() => setPanel('')} style={quietBtn}><Text style={btnText}>Close</Text></TouchableOpacity>
    </View>
  ) : panel === 'eta' && selected ? (
    <View style={sheet}>
      <Text style={h3}>Minutes to pickup</Text>
      <TextInput accessibilityLabel="Minutes to pickup" keyboardType="number-pad" value={etaDraft} onChangeText={setEtaDraft} style={field} />
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Save ETA" onPress={() => { setEtaById(current => ({ ...current, [selected.id]: Math.max(0, Number(etaDraft) || 0) })); setPanel(''); setNotice('ETA saved on this phone. The passenger was not notified.') }} style={primaryBtn}><Text style={primaryText}>Save ETA</Text></TouchableOpacity>
    </View>
  ) : panel === 'prefs' ? (
    <View style={sheet}>
      <Text style={h3}>Preferences</Text>
      <Text style={{ color: theme.text }}>Language</Text>
      <Text style={small}>English · Nederlands · Français. The app stays in its current language.</Text>
      <Text style={{ color: theme.text, marginVertical: 7 }}>Appearance · Dark</Text>
      <Text style={h3}>Alert status</Text>
      <Text style={small}>Permission · {pushPermission || 'unknown'}</Text>
      <Text style={small}>Registration · {pushStatus || 'Alerts not registered'}</Text>
      <Text style={small}>Channel · Trip offers, high importance, TAXIO sound</Text>
      <Text style={small}>Connection · {syncError ? 'Not connected. ' + syncError : 'Connected to TAXIO'}</Text>
      <Text style={small}>Last test · {lastAlertTest || 'No test sent from this phone'}</Text>
      <Text style={small}>A test confirms the staging sender. It does not prove an alert will sound when Android has stopped the app.</Text>
      {demo ? null : <TouchableOpacity accessibilityRole="button" accessibilityLabel="Send test alert" disabled={testAlertBusy} onPress={onTestAlert} style={quietBtn}><Text style={btnText}>{testAlertBusy ? 'Sending test…' : 'Send test alert'}</Text></TouchableOpacity>}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign out" onPress={onSignOut} style={quietBtn}><Text style={btnText}>Sign out</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close preferences" onPress={() => setPanel('')} style={quietBtn}><Text style={btnText}>Close</Text></TouchableOpacity>
    </View>
  ) : null

  let body: React.ReactNode = null
  if (requestBooking || rescueRow) {
    const seconds = secondsRemaining(requestBooking ? requestBooking.decision_deadline_at : rescueRow?.expires_at, now)
    const expired = seconds == null || seconds <= 0
    const width = seconds == null ? 0 : Math.max(0, Math.min(100, (seconds / 45) * 100))
    const fare = requestBooking ? requestBooking.estimated_price_eur : null
    body = (
      <View style={{ minHeight: 540, justifyContent: 'space-between', paddingVertical: 8 }}>
        <View>
          <Text style={{ letterSpacing: 2, color: theme.gold, fontSize: 12 }}>{rescueRow ? 'RESCUE OFFER' : 'NEW TRIP REQUEST'}</Text>
          <Text style={{ color: theme.text, fontSize: 29, fontWeight: '700', marginVertical: 10 }}>{expired ? 'This request expired' : 'A passenger needs a ride'}</Text>
          <Text style={{ color: theme.price, fontSize: 40, fontWeight: '700' }}>{requestBooking ? (fare == null ? '—' : euro(Number(fare))) : (rescueRow?.rescue?.preview_estimated_price || 'Fare estimate unavailable')}</Text>
          <Text style={small}>{rescueRow ? 'Rescue fare · passenger details stay hidden' : 'Trip fare · direct booking'}</Text>
          <View style={route}>
            <Text style={small}>PICKUP</Text>
            <Text style={{ color: theme.text, marginBottom: 15 }}>{requestBooking?.pickup_address || rescueRow?.rescue?.preview_pickup_label || 'Pickup not set'}</Text>
            <Text style={small}>DESTINATION</Text>
            <Text style={{ color: theme.text }}>{requestBooking?.dropoff_address || rescueRow?.rescue?.preview_dropoff_label || 'Destination not set'}</Text>
          </View>
          <View style={panelBox}>
            <Text style={small}>PICKUP TIME</Text>
            <Text style={pickup}>{pickupWhen(requestBooking?.ride_datetime || rescueRow?.rescue?.preview_ride_datetime, now)}</Text>
            {requestBooking?.customer_name ? <Text style={small}>Passenger · {requestBooking.customer_name}</Text> : null}
          </View>
        </View>
        <View>
          <View style={row}><Text style={{ color: theme.text }}>Time to accept</Text><Text style={{ color: theme.text, fontWeight: '700' }}>{seconds == null ? '—' : seconds + 's'}</Text></View>
          <View style={countBar}><View style={{ width: `${width}%`, height: 6, backgroundColor: theme.gold }} /></View>
          {expired ? <Text style={small}>This offer can no longer be accepted.</Text> : (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Accept trip" disabled={busy || (!actions && !demo)} onPress={() => requestBooking ? acceptBooking(requestBooking.id) : rescueRow && acceptRescue(rescueRow.rescue_request_id)} style={[primaryBtn, { opacity: busy || (!actions && !demo) ? 0.55 : 1 }]}>
              <Text style={primaryText}>{busy ? 'Sending…' : 'Accept trip'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  } else if ((tab === 'home' || tab === 'trips') && !selected) {
    const cards: Array<['active' | 'completed' | 'total', number, string, string]> = [
      ['active', trips.length, 'Active', 'Bookings & updates'],
      ['completed', completedToday.length, 'Completed', 'Rescued & direct'],
      ['total', trips.length + completedToday.length, 'Total', 'All trips'],
    ]
    body = (
      <View>
        <Text style={small}>{dateLabel}</Text>
        <Text style={h2}>{tab === 'home' ? 'Your driving day' : 'Your trips'}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 18, marginBottom: 12 }}>
          {cards.map(item => (
            <TouchableOpacity key={item[0]} accessibilityRole="button" accessibilityState={{ expanded: expanded === item[0] }} onPress={() => setExpanded(current => current === item[0] ? null : item[0])} style={[statBtn, expanded === item[0] ? statOn : null]}>
              <Text style={num}>{item[1]}</Text>
              <Text style={{ fontSize: 12, color: theme.text }}>{item[2]}</Text>
              <Text style={small}>{item[3]} ⌄</Text>
            </TouchableOpacity>
          ))}
        </View>
        {expanded ? (
          <View style={panelBox}>
            <Text style={h3}>{expanded === 'active' ? 'Trips needing attention' : expanded === 'completed' ? 'Completed trips' : 'All trips'}</Text>
            {activeRows.map(tripRow)}
            {activeRows.length === 0 ? <Text style={small}>No trips in this group.</Text> : null}
          </View>
        ) : null}
        {offer ? (
          <View style={panelBox}>
            <View style={row}><Text style={h3}>Incoming booking</Text><Text style={badge}>NEW</Text></View>
            <Text style={{ color: theme.text, marginVertical: 7 }}>{shortPlace(offer.pickup_address)} → {shortPlace(offer.dropoff_address)}</Text>
            <Text style={pickup}>{pickupWhen(offer.ride_datetime, now)}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="View incoming request" onPress={() => { setNotice(''); setIncoming(offer) }} style={primaryBtn}><Text style={primaryText}>View incoming request</Text></TouchableOpacity>
          </View>
        ) : tab === 'home' ? (
          <View style={panelBox}>
            <Text style={h3}>Booking availability</Text>
            <Text style={{ color: theme.text, marginVertical: 7 }}>{controls.online && controls.acceptNew ? 'You can receive new requests.' : 'You are not receiving new requests.'}</Text>
            <Text style={small}>Manage availability in Account.</Text>
          </View>
        ) : null}
        {openRescue[0] && !offer ? (
          <View style={panelBox}>
            <Text style={h3}>Rescue offer</Text>
            <Text style={pickup}>{pickupWhen(openRescue[0].rescue?.preview_ride_datetime, now)}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="View rescue offer" onPress={() => setIncomingRescue(openRescue[0])} style={primaryBtn}><Text style={primaryText}>View incoming request</Text></TouchableOpacity>
          </View>
        ) : null}
      </View>
    )
  } else if (selected && tab === 'trips') {
    const stage = stageOf(selected)
    const address = stage === 4 ? selected.dropoff_address : selected.pickup_address
    body = (
      <View>
        <View style={row}>
          <View style={{ flex: 1 }}>
            <Text style={small}>TRIP #{selected.booking_reference || '—'}</Text>
            <Text style={h2}>{stageName[stage]}</Text>
          </View>
          <Text style={{ color: theme.price, fontSize: 25, fontWeight: '700' }}>{selected.estimated_price_eur == null ? '—' : euro(Number(selected.estimated_price_eur))}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 5, marginVertical: 16 }}>
          {[0, 1, 2, 3, 4].map(index => <View key={index} style={{ flex: 1, height: 4, borderRadius: 8, backgroundColor: index <= stage ? theme.gold : '#344258' }} />)}
        </View>
        <Text style={blueBadge}>{stageName[stage].toUpperCase()}</Text>
        <View style={route}>
          <Text style={small}>PICKUP</Text>
          <Text style={{ color: theme.text, marginBottom: 15 }}>{selected.pickup_address || 'Pickup not set'}</Text>
          <Text style={small}>DESTINATION</Text>
          <Text style={{ color: theme.text }}>{selected.dropoff_address || 'Destination not set'}</Text>
        </View>
        <View style={row}>
          <View><Text style={small}>PASSENGER</Text><Text style={{ color: theme.text }}>{selected.customer_name || 'Passenger'}</Text></View>
          <View><Text style={small}>PICKUP TIME</Text><Text style={pickup}>{pickupWhen(selected.ride_datetime, now)}</Text></View>
        </View>
        {tripKind(selected) === 'Needs pickup address' ? (
          <View style={panelBox}>
            <Text style={badge}>NEEDS UPDATE</Text>
            <Text style={{ color: theme.text, marginVertical: 7 }}>Confirm the exact pickup address with the passenger.</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Contact passenger" onPress={() => setPanel('contact')} style={quietBtn}><Text style={btnText}>Contact passenger</Text></TouchableOpacity>
          </View>
        ) : null}
        {stage === 2 ? <Text style={small}>Approx. {etaById[selected.id] ?? 8} min to pickup</Text> : null}
        {stage === 2 ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Update ETA" onPress={() => { setEtaDraft('8'); setPanel('eta') }} style={quietBtn}><Text style={btnText}>Update ETA</Text></TouchableOpacity> : null}
        {stage === 3 ? <Text style={{ color: theme.text, marginVertical: 7 }}>Waiting at pickup · passenger not yet onboard</Text> : null}
        {stage === 4 ? <Text style={{ color: theme.text, marginVertical: 7 }}>Passenger onboard · heading to destination</Text> : null}
        {stage < 5 ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={stageAction[stage]} disabled={busy || (!actions && !demo)} onPress={() => { void advance() }} style={[primaryBtn, { opacity: busy ? 0.55 : 1 }]}>
            <Text style={primaryText}>{busy ? 'Sending…' : stageAction[stage]}</Text>
          </TouchableOpacity>
        ) : (
          <View style={panelBox}><Text style={greenBadge}>COMPLETED</Text><Text style={{ color: theme.text, marginVertical: 7 }}>Trip added to earnings.</Text></View>
        )}
        {stage < 5 ? (
          <View style={twoCol}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Navigate" onPress={() => { void openNav(String(address || '')) }} style={halfBtn}><View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><IconNavigate size={19} /><Text style={btnText}>Navigate</Text></View></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Contact" onPress={() => setPanel('contact')} style={halfBtn}><View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><IconPhone size={19} /><Text style={btnText}>Contact</Text></View></TouchableOpacity>
          </View>
        ) : null}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Home" onPress={() => { setSelectedId(null); setTab('home'); setPanel('') }} style={quietBtn}><Text style={btnText}>← Home</Text></TouchableOpacity>
        {confirming ? (
          <View style={sheet}>
            <Text style={h3}>Complete this trip?</Text>
            <Text style={{ color: theme.text, marginVertical: 7 }}>{shortPlace(selected.pickup_address)} → {shortPlace(selected.dropoff_address)} · {selected.estimated_price_eur == null ? '—' : euro(Number(selected.estimated_price_eur))}</Text>
            <View style={twoCol}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => setConfirming(false)} style={halfBtn}><Text style={btnText}>Go back</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Confirm completion" onPress={() => { void finishTrip() }} style={halfGold}><Text style={primaryText}>Confirm completion</Text></TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    )
  } else if (tab === 'earnings') {
    body = (
      <View>
        <Text style={small}>{dateLabel}</Text>
        <Text style={h2}>Your earnings</Text>
        <View style={panelBox}>
          <Text style={small}>COMPLETED TRIP FARES · TODAY</Text>
          <Text style={{ color: theme.text, fontSize: 38, fontWeight: '700', marginVertical: 14 }}>{euro(dayEarnings.estimatedTotalEur)}</Text>
          <Text style={greenBadge}>{dayEarnings.completedTrips} completed trips</Text>
          <Text style={small}>Gross fares · before fees and expenses</Text>
        </View>
        <View style={panelBox}>
          <Text style={h3}>Breakdown</Text>
          <View style={[row, tripRowStyle]}><Text style={{ color: theme.muted }}>Direct bookings · {directToday.length}</Text><Text style={{ color: theme.text, fontWeight: '700' }}>{euro(sumFares(directToday))}</Text></View>
              <View style={[row, tripRowStyle]}><Text style={{ color: theme.muted }}>Rescued trips · {rescuedIds ? rescuedToday.length : '—'}</Text><Text style={{ color: theme.text, fontWeight: '700' }}>{rescuedIds ? euro(rescuedToday.length ? sumFares(rescuedToday) : 0) : 'Unavailable'}</Text></View>
        </View>
      </View>
    )
  } else if (historyOpen) {
    body = (
      <View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to account" onPress={() => setHistoryOpen(false)} style={quietBtn}><Text style={btnText}>← Account</Text></TouchableOpacity>
        <Text style={[h2, { marginTop: 18 }]}>History & performance</Text>
        <Text style={small}>Review a day and compare your averages</Text>
        <View style={panelBox}>
          <Text style={{ color: theme.text }}>Work date</Text>
          <TextInput accessibilityLabel="History date" value={historyDate} onChangeText={value => { setHistoryDate(value); setHistoryPage(1) }} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" style={field} />
        </View>
        {dayTrips.length === 0 ? (
          <View style={panelBox}><Text style={h3}>No activity recorded</Text><Text style={{ color: theme.text }}>No completed trips on this date. Online time is not tracked.</Text></View>
        ) : (
          <View style={panelBox}>
            <View style={row}><Text style={h3}>Selected day</Text><Text style={greenBadge}>{dayTrips.length} trips</Text></View>
            <Text style={{ color: theme.text, fontSize: 38, fontWeight: '700', marginVertical: 14 }}>{euro(sumFares(dayTrips))}</Text>
            <Text style={small}>Gross completed fares · before fees and expenses</Text>
            <View style={[row, tripRowStyle]}><Text style={{ color: theme.muted }}>Online time, including waiting</Text><Text style={{ color: theme.text, fontWeight: '700' }}>Unavailable</Text></View>
            <View style={[row, tripRowStyle]}><Text style={{ color: theme.muted }}>Gross fares / online hour</Text><Text style={{ color: theme.text, fontWeight: '700' }}>—</Text></View>
          </View>
        )}
        <View style={panelBox}>
          <View style={row}>
            <Text style={h3}>Performance averages</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Performance period" onPress={() => setAverageWindow(current => current === 7 ? 30 : 7)} style={chipBtn}><Text style={btnText}>{averageWindow === 7 ? 'Last 7 days' : 'Last 30 days'}</Text></TouchableOpacity>
          </View>
          <Text style={small}>{period.current.completedTrips} completed trips · estimated {euro(period.current.estimatedTotalEur)}. Online hours are not tracked.</Text>
          {historyPageRows.hasMore ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Load more history" onPress={() => setHistoryPage(page => page + 1)} style={quietBtn}><Text style={btnText}>Load more</Text></TouchableOpacity> : null}
          {historyPageRows.rows.map(booking => (
            <TouchableOpacity key={booking.id} onPress={() => setOpenHistory(current => ({ ...current, [booking.id]: !current[booking.id] }))} style={tripRowStyle}>
              <Text style={pickup}>{pickupWhen(booking.ride_datetime || booking.completed_at, now)} · {shortPlace(booking.pickup_address)} → {shortPlace(booking.dropoff_address)}</Text>
              {openHistory[booking.id] ? <Text style={small}>Fare recorded: {booking.estimated_price_eur == null ? 'Unavailable' : euro(Number(booking.estimated_price_eur))}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )
  } else {
    body = (
      <View>
        <Text style={h2}>Driver account</Text>
        <View style={panelBox}>
          <Text style={h3}>{driverName || 'Driver'}</Text>
          <Text style={small}>{companyName} · driver</Text>
        </View>
        <View style={panelBox}>
          <Text style={h3}>Availability</Text>
          <Text style={controls.online ? greenBadge : badge}>{controls.online ? 'ONLINE' : 'OFFLINE'}</Text>
          <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: controls.acceptNew }} disabled={busy} onPress={() => persistAvailability(true, !controls.acceptNew)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 7 }}>
            <View style={{ width: 19, height: 19, borderRadius: 3, borderWidth: 1, borderColor: theme.gold, backgroundColor: controls.acceptNew ? theme.gold : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {controls.acceptNew ? <Text style={{ color: theme.goldText, fontSize: 12, fontWeight: '700' }}>✓</Text> : null}
            </View>
            <Text style={{ color: theme.text }}>Accept new requests</Text>
          </TouchableOpacity>
          <Text style={small}>{controls.online ? 'Switch off requests to pause new bookings.' : 'Go online to receive requests. Your accepted trips stay available.'}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={controls.online ? 'Go offline' : 'Go online'} disabled={busy} onPress={() => persistAvailability(!controls.online, !controls.online)} style={controls.online ? offlineBtn : primaryBtn}>
            <Text style={controls.online ? { color: '#ffb2b2', fontWeight: '700' } : primaryText}>{controls.online ? 'Go offline' : 'Go online'}</Text>
          </TouchableOpacity>
        </View>
        <View style={panelBox}>
          <Text style={h3}>History & performance</Text>
          <Text style={small}>Review previous workdays, trip fares and your averages.</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="View history and averages" onPress={() => { setHistoryOpen(true); setPanel('') }} style={primaryBtn}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><IconClock /><Text style={primaryText}>View history & averages</Text></View>
          </TouchableOpacity>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Language, appearance and help" onPress={() => setPanel('prefs')} style={quietBtn}><Text style={btnText}>Language, appearance & help</Text></TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <BrandBar hidden={requestOpen} onSettings={() => { setNotice(''); setPanel('prefs') }} />
      <CompanyCard name={companyName} slogan={slogan} vatNumber={vatNumber} phone={phone} statusText={statusText} hideActions={requestOpen} onQr={() => { setNotice(''); setPanel('qr') }} onShare={() => { setNotice(''); setPanel('share') }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20, minHeight: 470 }}>
        {panels}
        {body}
        {syncError ? <Text style={{ color: theme.danger, marginTop: 10 }}>{syncError}</Text> : null}
        {offerError ? <Text style={{ color: theme.danger, marginTop: 10 }}>{offerError}</Text> : null}
        {notice ? <Text style={{ color: theme.warn, fontSize: 12, marginTop: 10 }}>{notice}</Text> : null}
      </ScrollView>
      {requestOpen ? null : <TabBar tab={navTab} onChange={next => { setTab(next); setPanel(''); setHistoryOpen(false); if (next !== 'trips') setSelectedId(null) }} />}
    </View>
  )
}

const row = { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 10 }
const h2 = { color: theme.text, fontSize: 23, fontWeight: '700' as const, letterSpacing: -0.5, marginBottom: 5 }
const h3 = { color: theme.text, fontSize: 16, fontWeight: '700' as const, marginBottom: 12 }
const small = { color: theme.muted, fontSize: 12 }
const pickup = { color: theme.gold, fontWeight: '600' as const }
const panelBox = { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 16, padding: 16, marginVertical: 14 }
const sheet = { backgroundColor: '#1b293e', borderWidth: 1, borderColor: '#41516b', borderRadius: 18, padding: 18, marginVertical: 14, gap: 8 }
const statBtn = { flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 9 }
const statOn = { borderColor: theme.gold, backgroundColor: '#302a1b' }
const num = { color: theme.text, fontSize: 26, fontWeight: '700' as const }
const tripRowStyle = { paddingVertical: 7, borderTopWidth: 1, borderTopColor: theme.line }
const badge = { color: theme.gold, backgroundColor: '#3b321b', overflow: 'hidden' as const, borderRadius: 7, paddingVertical: 4, paddingHorizontal: 9, fontSize: 11, fontWeight: '700' as const }
const greenBadge = { color: '#62deb8', backgroundColor: '#103b36', overflow: 'hidden' as const, borderRadius: 7, paddingVertical: 4, paddingHorizontal: 9, fontSize: 11, fontWeight: '700' as const, alignSelf: 'flex-start' as const }
const blueBadge = { color: '#80ceff', backgroundColor: '#12364e', overflow: 'hidden' as const, borderRadius: 7, paddingVertical: 4, paddingHorizontal: 9, fontSize: 11, fontWeight: '700' as const, alignSelf: 'flex-start' as const }
const primaryBtn = { width: '100%' as const, backgroundColor: theme.gold, borderRadius: 12, minHeight: 48, alignItems: 'center' as const, justifyContent: 'center' as const, marginTop: 8 }
const primaryText = { color: theme.goldText, fontWeight: '700' as const }
const quietBtn = { width: '100%' as const, backgroundColor: theme.iconBg, borderWidth: 1, borderColor: '#334155', borderRadius: 12, minHeight: 44, alignItems: 'center' as const, justifyContent: 'center' as const, marginTop: 8, padding: 12 }
const chipBtn = { ...quietBtn, width: undefined, minHeight: 36, marginTop: 0, paddingHorizontal: 14 }
const btnText = { color: theme.text, fontWeight: '700' as const }
const offlineBtn = { width: '100%' as const, borderWidth: 1, borderColor: '#f28f8f', borderRadius: 12, minHeight: 48, alignItems: 'center' as const, justifyContent: 'center' as const, marginTop: 16 }
const twoCol = { flexDirection: 'row' as const, gap: 9, marginVertical: 10 }
const halfBtn = { ...quietBtn, flex: 1, width: undefined }
const halfGold = { ...primaryBtn, flex: 1, width: undefined }
const route = { borderLeftWidth: 2, borderLeftColor: theme.gold, paddingLeft: 14, marginVertical: 18 }
const countBar = { height: 6, backgroundColor: '#344258', borderRadius: 9, marginVertical: 18, overflow: 'hidden' as const }
const qrBox = { backgroundColor: '#fff', padding: 12, borderRadius: 12, width: 190, alignSelf: 'center' as const, marginVertical: 18 }
const field = { backgroundColor: '#101929', color: theme.text, borderWidth: 1, borderColor: '#41516b', borderRadius: 9, padding: 10, marginTop: 10 }
