import React, { useEffect } from 'react'
import { BackHandler, Modal, Text, TouchableOpacity, View } from 'react-native'
import { secondsRemaining } from '../utils/bookingState'
import { theme } from '../theme/theme'
import { RouteDetails } from './RouteDetails'

export function FullScreenRequest({
  visible,
  title,
  pickup,
  dropoff,
  whenText,
  fareText,
  deadline,
  now,
  busy,
  error,
  acceptLabel,
  actionsEnabled,
  onAccept,
}: {
  visible: boolean
  title: string
  pickup?: string | null
  dropoff?: string | null
  whenText: string
  fareText: string
  deadline?: string | null
  now: number
  busy: boolean
  error?: string
  acceptLabel: string
  actionsEnabled: boolean
  onAccept: () => void
}) {
  const seconds = secondsRemaining(deadline, now)
  const expired = !visible || seconds == null || seconds <= 0

  useEffect(() => {
    if (!visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [visible])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 24, justifyContent: 'space-between' }}>
        <View style={{ gap: 18, marginTop: 28 }}>
          <Text style={{ color: theme.gold, fontWeight: '900', letterSpacing: 2, fontSize: 22 }}>TAXIO</Text>
          <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>{expired ? 'Request expired' : title}</Text>
          <RouteDetails pickup={pickup} dropoff={dropoff} />
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>{whenText}</Text>
          <Text style={{ color: theme.gold, fontSize: 22, fontWeight: '800' }}>{fareText}</Text>
          <Text style={{ color: expired ? theme.danger : theme.gold, fontSize: 72, fontWeight: '900' }}>
            {seconds == null ? '—' : expired ? '0' : seconds}
          </Text>
          {error ? <Text style={{ color: theme.danger, fontSize: 16 }}>{error}</Text> : null}
          {!actionsEnabled ? <Text style={{ color: theme.warn }}>This preview does not send the request to TAXIO.</Text> : null}
        </View>
        {expired ? (
          <Text style={{ color: theme.muted, fontSize: 18, marginBottom: 28 }}>This offer can no longer be accepted.</Text>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={acceptLabel}
            disabled={busy || !actionsEnabled}
            onPress={onAccept}
            style={{ backgroundColor: theme.gold, borderRadius: 18, minHeight: 72, alignItems: 'center', justifyContent: 'center', marginBottom: 20, opacity: busy || !actionsEnabled ? 0.55 : 1 }}
          >
            <Text style={{ color: theme.goldText, fontWeight: '900', fontSize: 28 }}>{busy ? 'Sending…' : acceptLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  )
}
