import React from 'react'
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native'
import { theme } from '../theme/theme'
import { confirmationLabel, euro, navigationTarget, nextProgressAction, pickupProgress, pickupWhen, type DeskBooking, type ProgressAction } from '../utils/driverDesk'
import { navigationUrl } from '../utils/navigation'
import { IconNavigate, IconPhone } from './icons'

const ACTION_LABEL: Record<ProgressAction, string> = {
  mark_on_way: "I'm on my way",
  mark_arrived: "I've arrived",
  complete_trip: 'Complete trip',
}

export function TripDetail({
  booking,
  now,
  busy,
  actionsEnabled,
  onHome,
  onProgress,
}: {
  booking: DeskBooking & { customer_phone?: string | null }
  now: number
  busy: boolean
  actionsEnabled: boolean
  onHome: () => void
  onProgress: (action: ProgressAction) => void
}) {
  const action = nextProgressAction(booking, now)
  const target = navigationTarget(booking)
  const address = target === 'dropoff' ? booking.dropoff_address : booking.pickup_address
  const confirmation = confirmationLabel(booking)
  const fare = booking.estimated_price_eur
  const stage = pickupProgress(booking.driver_pickup_status)
  const active = booking.completed_at ? 3 : stage === 'arrived' ? 2 : stage === 'on_way' ? 1 : 0
  const stageLabel = confirmation ? 'FINISHED' : ['CONFIRMED', 'ON THE WAY', 'ARRIVED'][Math.min(active, 2)]
  const headline = confirmation || (stage === 'on_way' ? 'On the way' : stage === 'arrived' ? 'Arrived' : 'Confirmed')

  async function openNav(provider: 'waze' | 'google') {
    const url = navigationUrl(String(address || ''), provider)
    if (!url) { Alert.alert('Navigation unavailable', 'This address is missing.'); return }
    try { await Linking.openURL(url) } catch { Alert.alert('Unable to open navigation', 'Install Waze or Google Maps and try again.') }
  }

  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingBottom: 20, paddingTop: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.faint, fontWeight: '800', letterSpacing: 0.6, fontSize: 12 }}>TRIP #{booking.booking_reference || '—'}</Text>
          <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>{headline}</Text>
        </View>
        <Text style={{ color: theme.gold, fontSize: 28, fontWeight: '900' }}>{fare == null ? '—' : euro(Number(fare))}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[0, 1, 2].map(index => <View key={index} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: !confirmation && index <= active ? theme.gold : '#2a3548' }} />)}
      </View>
      <View style={{ alignSelf: 'flex-start', backgroundColor: '#24304a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
        <Text style={{ color: theme.gold, fontSize: 11, fontWeight: '800' }}>{stageLabel}</Text>
      </View>
      <Text style={{ color: theme.faint, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 }}>PICKUP</Text>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', marginTop: -6 }}>{booking.pickup_address || 'Pickup not set'}</Text>
      <Text style={{ color: theme.faint, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 }}>DESTINATION</Text>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', marginTop: -6 }}>{booking.dropoff_address || 'Destination not set'}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.faint, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 }}>PASSENGER</Text>
          <Text style={{ color: theme.text, fontWeight: '700' }}>{booking.customer_name || 'Passenger'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: theme.faint, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 }}>PICKUP TIME</Text>
          <Text style={{ color: theme.gold, fontWeight: '800' }}>{pickupWhen(booking.ride_datetime, now)}</Text>
        </View>
      </View>
      {confirmation ? <Text style={{ color: theme.warn }}>{confirmation}. Estimated fare, not a recorded payment.</Text> : null}
      {action && !confirmation ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={ACTION_LABEL[action]} disabled={busy || !actionsEnabled} onPress={() => onProgress(action)} style={{ backgroundColor: theme.gold, borderRadius: 16, minHeight: 56, alignItems: 'center', justifyContent: 'center', opacity: busy || !actionsEnabled ? 0.55 : 1 }}>
          <Text style={{ color: theme.goldText, fontWeight: '900', fontSize: 18 }}>{busy ? 'Sending…' : ACTION_LABEL[action]}</Text>
        </TouchableOpacity>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Navigate" onPress={() => Alert.alert('Navigate', target === 'dropoff' ? 'Open the destination' : 'Open the pickup', [{ text: 'Waze', onPress: () => { void openNav('waze') } }, { text: 'Google Maps', onPress: () => { void openNav('google') } }, { text: 'Cancel', style: 'cancel' }])} style={sideBtn}>
          <IconNavigate /><Text style={sideText}>Navigate</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Contact passenger" onPress={() => booking.customer_phone ? Linking.openURL('tel:' + booking.customer_phone) : Alert.alert('Contact unavailable', 'Passenger phone is hidden until this trip is accepted.')} style={sideBtn}>
          <IconPhone /><Text style={sideText}>Contact</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Home" onPress={onHome} style={{ alignItems: 'center', padding: 8 }}>
        <Text style={{ color: theme.muted, fontWeight: '700' }}>← Home</Text>
      </TouchableOpacity>
    </View>
  )
}

const sideBtn = { flex: 1, backgroundColor: theme.card, borderRadius: 16, minHeight: 64, alignItems: 'center' as const, justifyContent: 'center' as const, flexDirection: 'row' as const, gap: 8 }
const sideText = { color: theme.text, fontWeight: '800' as const, fontSize: 16 }
