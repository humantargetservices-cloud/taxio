import React from 'react'
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native'
import { theme } from '../theme/theme'
import { RouteDetails } from './RouteDetails'
import { confirmationLabel, euro, navigationTarget, nextProgressAction, scheduleLabel, type DeskBooking, type ProgressAction } from '../utils/driverDesk'
import { navigationUrl } from '../utils/navigation'

const ACTION_LABEL: Record<ProgressAction, string> = {
  mark_on_way: 'On the way',
  mark_arrived: 'Arrived',
  complete_trip: 'Complete trip',
}

export function TripDetail({
  booking,
  companyName,
  now,
  busy,
  actionsEnabled,
  onBack,
  onProgress,
}: {
  booking: DeskBooking & { customer_phone?: string | null }
  companyName: string
  now: number
  busy: boolean
  actionsEnabled: boolean
  onBack: () => void
  onProgress: (action: ProgressAction) => void
}) {
  const action = nextProgressAction(booking, now)
  const target = navigationTarget(booking)
  const address = target === 'dropoff' ? booking.dropoff_address : booking.pickup_address
  const confirmation = confirmationLabel(booking)
  const fare = booking.estimated_price_eur

  async function openNav(provider: 'waze' | 'google') {
    const url = navigationUrl(String(address || ''), provider)
    if (!url) { Alert.alert('Navigation unavailable', 'This address is missing.'); return }
    try { await Linking.openURL(url) } catch { Alert.alert('Unable to open navigation', 'Install Waze or Google Maps and try again.') }
  }

  return (
    <View style={{ gap: 14 }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to trips" onPress={onBack}><Text style={{ color: theme.gold, fontWeight: '800' }}>Trips</Text></TouchableOpacity>
      <Text style={{ color: theme.text, fontSize: 24, fontWeight: '900' }}>{booking.booking_reference || 'Trip'}</Text>
      <Text style={{ color: theme.muted }}>{booking.customer_name || 'Passenger'} · {companyName}</Text>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>{scheduleLabel(booking.ride_datetime, now)}</Text>
      <RouteDetails pickup={booking.pickup_address} dropoff={booking.dropoff_address} />
      <Text style={{ color: theme.gold, fontWeight: '800' }}>{fare == null ? 'Fare estimate unavailable' : 'Estimated fare ' + euro(Number(fare))}</Text>
      <Text style={{ color: theme.faint }}>Estimated booking value. This is not a payment received by the company.</Text>
      {booking.customer_phone ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Call passenger" onPress={() => Linking.openURL('tel:' + booking.customer_phone)} style={btn}><Text style={btnText}>Call passenger</Text></TouchableOpacity> : <Text style={{ color: theme.faint }}>Passenger phone stays hidden until this trip is accepted.</Text>}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Navigate with Waze" onPress={() => openNav('waze')} style={btn}><Text style={btnText}>Waze · {target === 'dropoff' ? 'destination' : 'pickup'}</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Navigate with Google Maps" onPress={() => openNav('google')} style={btn}><Text style={btnText}>Google Maps · {target === 'dropoff' ? 'destination' : 'pickup'}</Text></TouchableOpacity>
      {confirmation ? <Text style={{ color: theme.warn, fontSize: 16 }}>{confirmation}</Text> : null}
      {action && !confirmation ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={ACTION_LABEL[action]} disabled={busy || !actionsEnabled} onPress={() => onProgress(action)} style={{ ...btn, backgroundColor: theme.gold, opacity: busy || !actionsEnabled ? 0.55 : 1 }}>
          <Text style={{ ...btnText, color: theme.goldText }}>{busy ? 'Sending…' : ACTION_LABEL[action]}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const btn = { backgroundColor: theme.card, borderRadius: 14, padding: 16, alignItems: 'center' as const }
const btnText = { color: theme.text, fontWeight: '800' as const }
