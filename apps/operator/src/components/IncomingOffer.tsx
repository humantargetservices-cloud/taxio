import React from 'react'
import { Modal, Text, TouchableOpacity, View } from 'react-native'
import { theme } from '../theme/theme'
import { CountdownTimer } from './CountdownTimer'
import { RouteDetails } from './RouteDetails'

type Offer = {
  pickup_address?: string | null
  dropoff_address?: string | null
  booking_reference?: string | null
  customer_name?: string | null
  estimated_price_eur?: number | null
  decision_deadline_at?: string | null
  ride_datetime?: string | null
}

export function IncomingOffer({
  offer,
  now,
  busy,
  actionsEnabled,
  demo,
  onAccept,
  onDecline,
  onClose,
}: {
  offer: Offer | null
  now: number
  busy: boolean
  actionsEnabled: boolean
  demo: boolean
  onAccept: () => void
  onDecline: () => void
  onClose: () => void
}) {
  return (
    <Modal visible={!!offer} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 22, justifyContent: 'space-between' }}>
        <View style={{ gap: 14, marginTop: 24 }}>
          <Text style={{ color: theme.gold, fontWeight: '900', letterSpacing: 1 }}>TAXIO TRIP REQUEST</Text>
          {offer?.booking_reference ? <Text style={{ color: theme.muted }}>{offer.booking_reference}</Text> : null}
          <RouteDetails pickup={offer?.pickup_address} dropoff={offer?.dropoff_address} />
          {offer?.customer_name ? <Text style={{ color: theme.text, fontSize: 16 }}>Passenger: {offer.customer_name}</Text> : null}
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
            {offer?.estimated_price_eur != null ? 'Fare €' + Number(offer.estimated_price_eur).toFixed(2) : 'Fare not on this offer'}
          </Text>
          <CountdownTimer deadline={offer?.decision_deadline_at} now={now} />
          {demo ? <Text style={{ color: theme.warn }}>Preview only. Nothing is sent to TAXIO.</Text> : null}
          {!actionsEnabled && !demo ? <Text style={{ color: theme.warn }}>Accept stays off until this build is pointed at isolated staging and live actions are approved.</Text> : null}
        </View>
        <View style={{ gap: 10, marginBottom: 12 }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Accept trip" disabled={busy || (!demo && !actionsEnabled)} onPress={onAccept} style={{ backgroundColor: theme.gold, borderRadius: 14, padding: 18, alignItems: 'center', opacity: busy || (!demo && !actionsEnabled) ? 0.55 : 1 }}>
            <Text style={{ color: theme.goldText, fontWeight: '900', fontSize: 18 }}>{busy ? 'Sending…' : 'Accept'}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Decline trip" disabled={busy || (!demo && !actionsEnabled)} onPress={onDecline} style={{ borderColor: theme.cardBorder, borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center' }}>
            <Text style={{ color: theme.text, fontWeight: '800' }}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={onClose} style={{ padding: 12, alignItems: 'center' }}>
            <Text style={{ color: theme.muted }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
