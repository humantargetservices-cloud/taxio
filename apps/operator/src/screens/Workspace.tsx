import React, { useState } from 'react'
import { Alert, Image, Linking, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { type CompanyBooking, type RescueOffer } from '../backend'
import { IncomingOffer } from '../components/IncomingOffer'
import { RouteDetails } from '../components/RouteDetails'
import { StatusBadge } from '../components/StatusBadge'
import { TabBar, type DriverTab } from '../components/TabBar'
import { useOfferSync } from '../hooks/useOfferSync'
import { theme } from '../theme/theme'
import { classifyBooking, isActionableOffer, isActionableRescue, secondsRemaining } from '../utils/bookingState'
import { bookingHost } from '../utils/environment'
import { navigationUrl } from '../utils/navigation'
import { mobileActionsEnabled, sendOperatorAction } from '../operatorActions'
import { setCompanyAvailability } from '../backend'

export type DriverBooking = CompanyBooking

function whenLabel(value?: string | null) {
  if (!value) return 'Time not set'
  return new Date(value).toLocaleString('en-BE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

async function openNav(address: string, provider: 'waze' | 'google') {
  const url = navigationUrl(address, provider)
  if (!url) { Alert.alert('Navigation unavailable', 'This address is missing.'); return }
  try { await Linking.openURL(url) } catch { Alert.alert('Unable to open navigation', 'Install Waze or Google Maps and try again.') }
}

export function Workspace({
  companyName,
  logoUrl,
  slug,
  demo,
  companyId,
  initialAvailability,
  initialBookings,
  initialRescue,
}: {
  companyName: string
  logoUrl?: string | null
  slug?: string | null
  demo: boolean
  companyId: string
  initialAvailability?: string | null
  initialBookings: DriverBooking[]
  initialRescue: RescueOffer[]
}) {
  const [tab, setTab] = useState<DriverTab>('home')
  const [bookings, setBookings] = useState<DriverBooking[]>(initialBookings)
  const [rescueOffers, setRescueOffers] = useState<RescueOffer[]>(initialRescue)
  const [incoming, setIncoming] = useState<DriverBooking | null>(null)
  const [now, setNow] = useState(Date.now())
  const [message, setMessage] = useState(demo ? 'Offline preview. The server is not connected.' : '')
  const [syncError, setSyncError] = useState('')
  const [busy, setBusy] = useState(false)
  const [availability, setAvailability] = useState(initialAvailability || 'available')
  const actions = mobileActionsEnabled() && !demo
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  useOfferSync({
    companyId,
    enabled: !demo,
    onBookings: setBookings,
    onRescue: setRescueOffers,
    onIncoming: row => { setIncoming(row); setTab('requests') },
    onError: setSyncError,
  })

  const actionable = bookings.filter(b => isActionableOffer(b, now))
  const current = bookings.find(b => classifyBooking(b, now) === 'accepted')
  const upcoming = bookings.filter(b => b.ride_datetime && Date.parse(b.ride_datetime) > now && !b.completed_at).sort((a, b) => Date.parse(a.ride_datetime || '') - Date.parse(b.ride_datetime || ''))[0]
  const openRescue = rescueOffers.filter(o => isActionableRescue(o.status, o.expires_at, now))
  const history = bookings.filter(b => !isActionableOffer(b, now) && classifyBooking(b, now) !== 'accepted')
  const host = bookingHost()
  const qr = slug && host && /^[a-z0-9-]+$/.test(slug) ? `https://${slug}.${host}` : null

  async function acceptBooking(id: string) {
    const target = bookings.find(b => b.id === id)
    if (!target || !isActionableOffer(target, Date.now())) { setMessage('This offer is expired or no longer available.'); setIncoming(null); return }
    if (demo) { setMessage('Preview only. TAXIO was not asked to accept this trip.'); setIncoming(null); return }
    setBusy(true)
    try {
      const result = await sendOperatorAction(companyId, { action: 'accept_booking', companyId, bookingRequestId: id })
      if (!result.ok) throw Error(result.error || result.code || 'Booking no longer available')
      setMessage('Accepted by the TAXIO server.')
      setTab('trip')
      setIncoming(null)
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to accept') }
    finally { setBusy(false) }
  }

  async function declineBooking(id: string) {
    const target = bookings.find(b => b.id === id)
    if (!target || !isActionableOffer(target, Date.now())) { setMessage('This offer is no longer actionable.'); setIncoming(null); return }
    if (demo) { setMessage('Preview only. TAXIO was not asked to decline this trip.'); setIncoming(null); return }
    setBusy(true)
    try {
      const result = await sendOperatorAction(companyId, { action: 'decline', companyId, bookingRequestId: id })
      if (!result.ok) throw Error(result.error || result.code || 'Unable to decline')
      setMessage('Declined. Rescue follows the server rules.')
      setIncoming(null)
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to decline') }
    finally { setBusy(false) }
  }

  async function acceptRescue(rescueRequestId: string) {
    const offer = rescueOffers.find(o => o.rescue_request_id === rescueRequestId)
    if (!offer || !isActionableRescue(offer.status, offer.expires_at, Date.now())) { setMessage('This rescue offer has expired.'); return }
    if (demo) { setMessage('Preview only. Rescue was not sent to TAXIO.'); return }
    setBusy(true)
    try {
      const result = await sendOperatorAction(companyId, { action: 'accept', companyId, rescueRequestId })
      if (!result.ok) throw Error(result.error || result.code || 'Rescue no longer available')
      setMessage('Rescue claimed. Passenger details stay locked until the server confirms the passenger.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to claim rescue') }
    finally { setBusy(false) }
  }

  async function progress(action: 'mark_on_way' | 'mark_arrived' | 'complete_trip') {
    if (!current || demo) { setMessage(demo ? 'Preview only. Trip progress was not sent.' : 'No active trip.'); return }
    setBusy(true)
    try {
      const result = await sendOperatorAction(companyId, { action, companyId, bookingRequestId: current.id })
      if (!result.ok) throw Error(result.error || result.code || 'Unable to update the trip')
      setMessage(action === 'complete_trip' ? 'Completion sent. It is finished only after the server confirms it.' : 'Progress sent to TAXIO.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Update failed') }
    finally { setBusy(false) }
  }

  async function toggleAvailability() {
    const next = availability === 'offline' ? 'available' : 'offline'
    if (demo) { setMessage('Preview only. Availability was not changed.'); return }
    setBusy(true)
    try {
      await setCompanyAvailability(companyId, next)
      setAvailability(next)
      setMessage(next === 'offline' ? 'Company is offline for new bookings.' : 'Company is available for new bookings.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to update availability') }
    finally { setBusy(false) }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 28 }}>
        <Text style={{ color: theme.gold, fontWeight: '900', letterSpacing: 1 }}>TAXIO</Text>
        {logoUrl ? <Image source={{ uri: logoUrl }} accessibilityLabel="Company logo" style={{ width: 48, height: 48, borderRadius: 10 }} /> : null}
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: '900' }}>{companyName}</Text>
        {demo ? <Text style={{ color: theme.warn }}>OFFLINE PREVIEW — NO LIVE BOOKINGS</Text> : <Text style={{ color: actions ? theme.ok : theme.warn }}>{actions ? 'Staging actions enabled' : 'Read only — staging actions are not enabled'}</Text>}
        {syncError ? <Text style={{ color: theme.danger }}>{syncError}</Text> : <Text style={{ color: theme.faint }}>Connection follows the last server refresh.</Text>}
        {message ? <Text style={{ color: theme.muted }}>{message}</Text> : null}

        {tab === 'home' ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>{actionable[0] ? 'Incoming request' : current ? 'Trip in progress' : 'Waiting for requests'}</Text>
            <Text style={{ color: availability === 'offline' ? theme.warn : theme.ok }}>{availability === 'offline' ? 'Offline' : availability === 'busy' ? 'Busy' : 'Online'}</Text>
            <Text style={{ color: theme.muted }}>Requests {actionable.length} · Rescue {openRescue.length}</Text>
            {current ? <RouteDetails pickup={current.pickup_address} dropoff={current.dropoff_address} /> : <Text style={{ color: theme.muted }}>No current trip.</Text>}
            {upcoming ? <Text style={{ color: theme.muted }}>Next: {whenLabel(upcoming.ride_datetime)} · {upcoming.pickup_address}</Text> : null}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Toggle availability" disabled={busy} onPress={toggleAvailability} style={btn}><Text style={btnText}>{availability === 'offline' ? 'Go online' : 'Go offline'}</Text></TouchableOpacity>
          </View>
        ) : null}

        {tab === 'requests' ? (
          <View style={{ gap: 12 }}>
            {actionable.length === 0 ? <Text style={{ color: theme.muted }}>No actionable request. Expired and draft rows stay out of this list.</Text> : actionable.map(b => (
              <TouchableOpacity key={b.id} accessibilityRole="button" onPress={() => setIncoming(b)} style={{ backgroundColor: theme.card, borderRadius: 16, padding: 16, gap: 8 }}>
                <StatusBadge kind="actionable" />
                <Text style={{ color: theme.muted }}>{b.booking_reference || 'No reference'}</Text>
                <RouteDetails pickup={b.pickup_address} dropoff={b.dropoff_address} />
                <Text style={{ color: theme.gold, fontWeight: '800' }}>{secondsRemaining(b.decision_deadline_at, now) ?? 0}s left</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {tab === 'trip' ? (
          <View style={{ gap: 12 }}>
            {!current ? <Text style={{ color: theme.muted }}>No accepted trip.</Text> : (
              <>
                <StatusBadge kind="accepted" />
                <Text style={{ color: theme.muted }}>{current.booking_reference} · {current.driver_pickup_status || 'Accepted'}{current.completion_confirmation_status ? ' · ' + current.completion_confirmation_status : ''}</Text>
                <RouteDetails pickup={current.pickup_address} dropoff={current.dropoff_address} />
                <Text style={{ color: theme.text }}>{current.customer_name || 'Passenger name unavailable'}</Text>
                {current.customer_phone ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Call passenger" onPress={() => Linking.openURL('tel:' + current.customer_phone)} style={btn}><Text style={btnText}>Call passenger</Text></TouchableOpacity> : <Text style={{ color: theme.faint }}>Passenger phone is hidden until the trip is accepted.</Text>}
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Navigate with Waze" onPress={() => openNav(String(current.driver_pickup_status === 'arrived' ? current.dropoff_address : current.pickup_address), 'waze')} style={btn}><Text style={btnText}>Navigate with Waze</Text></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Navigate with Google Maps" onPress={() => openNav(String(current.driver_pickup_status === 'arrived' ? current.dropoff_address : current.pickup_address), 'google')} style={btn}><Text style={btnText}>Navigate with Google Maps</Text></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => progress('mark_on_way')} style={btn}><Text style={btnText}>On the way</Text></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => progress('mark_arrived')} style={btn}><Text style={btnText}>Arrived</Text></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => progress('complete_trip')} style={btn}><Text style={btnText}>Complete trip</Text></TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        {tab === 'rescue' ? (
          <View style={{ gap: 12 }}>
            {openRescue.length === 0 ? <Text style={{ color: theme.muted }}>No open rescue offer for this company.</Text> : openRescue.map(o => (
              <View key={o.id} style={{ backgroundColor: theme.card, borderRadius: 16, padding: 16, gap: 8 }}>
                <Text style={{ color: theme.gold, fontWeight: '800' }}>{secondsRemaining(o.expires_at, now) ?? 0}s</Text>
                <RouteDetails pickup={o.rescue?.preview_pickup_label} dropoff={o.rescue?.preview_dropoff_label} />
                <Text style={{ color: theme.faint }}>Passenger details stay on the server until you are the confirmed winner.</Text>
                <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => acceptRescue(o.rescue_request_id)} style={btn}><Text style={btnText}>Accept rescue</Text></TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        {tab === 'more' ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: theme.text, fontWeight: '800' }}>History</Text>
            {history.length === 0 ? <Text style={{ color: theme.muted }}>No earlier trips in this view.</Text> : history.slice(0, 12).map(b => (
              <View key={b.id} style={{ paddingVertical: 8 }}>
                <StatusBadge kind={classifyBooking(b, now)} />
                <Text style={{ color: theme.text }}>{b.pickup_address} → {b.dropoff_address}</Text>
              </View>
            ))}
            <Text style={{ color: theme.text, fontWeight: '800' }}>Booking QR</Text>
            {qr ? <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center' }}><QRCode value={qr} size={160} /><Text style={{ color: '#111', marginTop: 8 }}>{qr}</Text></View> : <Text style={{ color: theme.muted }}>QR is shown only for an isolated staging company address.</Text>}
            {qr ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Share booking page" onPress={() => Share.share({ message: qr })} style={btn}><Text style={btnText}>Share booking page</Text></TouchableOpacity> : null}
            <Text style={{ color: theme.faint }}>Closed-app alerts are not active until a device token is registered on a phone. This build does not send production notifications.</Text>
          </View>
        ) : null}
      </ScrollView>
      <IncomingOffer offer={incoming} now={now} busy={busy} actionsEnabled={actions} demo={demo} onAccept={() => incoming && acceptBooking(incoming.id)} onDecline={() => incoming && declineBooking(incoming.id)} onClose={() => setIncoming(null)} />
      <TabBar tab={tab} onChange={setTab} />
    </View>
  )
}

const btn = { backgroundColor: theme.card, borderRadius: 12, padding: 16, alignItems: 'center' as const }
const btnText = { color: theme.text, fontWeight: '800' as const }
