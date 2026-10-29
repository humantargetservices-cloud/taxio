import React, { useEffect } from 'react'
import { BackHandler, Modal, Text, TouchableOpacity, View } from 'react-native'
import { secondsRemaining } from '../utils/bookingState'
import { theme } from '../theme/theme'
import { BrandBar, CompanyCard } from './CompanyCard'

export function FullScreenRequest({
  visible,
  title,
  pickup,
  dropoff,
  whenText,
  fareText,
  fareNote,
  passenger,
  deadline,
  now,
  busy,
  error,
  acceptLabel,
  actionsEnabled,
  onAccept,
  companyName,
  slogan,
  vatNumber,
  phone,
  availability,
}: {
  visible: boolean
  title: string
  pickup?: string | null
  dropoff?: string | null
  whenText: string
  fareText: string
  fareNote?: string
  passenger?: string | null
  deadline?: string | null
  now: number
  busy: boolean
  error?: string
  acceptLabel: string
  actionsEnabled: boolean
  onAccept: () => void
  companyName?: string
  slogan?: string | null
  vatNumber?: string | null
  phone?: string | null
  availability?: string | null
}) {
  const seconds = secondsRemaining(deadline, now)
  const expired = !visible || seconds == null || seconds <= 0
  const width = seconds == null ? 0 : Math.max(0, Math.min(100, (seconds / 45) * 100))

  useEffect(() => {
    if (!visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [visible])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: 18 }}>
        <BrandBar onShare={() => {}} />
        {companyName ? <CompanyCard name={companyName} slogan={slogan} vatNumber={vatNumber} phone={phone} availability={availability} onQr={() => {}} onShare={() => {}} /> : null}
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 16, justifyContent: 'space-between' }}>
          <View style={{ gap: 10 }}>
            <Text style={{ color: theme.gold, fontWeight: '800', letterSpacing: 1.1, fontSize: 13 }}>{title}</Text>
            <Text style={{ color: theme.text, fontSize: 32, fontWeight: '900', lineHeight: 38 }}>{expired ? 'This request expired' : 'A passenger needs a ride'}</Text>
            <Text style={{ color: theme.gold, fontSize: 40, fontWeight: '900' }}>{fareText}</Text>
            {fareNote ? <Text style={{ color: theme.faint }}>{fareNote}</Text> : null}
            <View style={{ borderLeftWidth: 3, borderLeftColor: theme.gold, paddingLeft: 12, gap: 6, marginTop: 8 }}>
              <Text style={{ color: theme.faint, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 }}>PICKUP</Text>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{pickup || 'Pickup not set'}</Text>
              <Text style={{ color: theme.faint, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginTop: 6 }}>DESTINATION</Text>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{dropoff || 'Destination not set'}</Text>
            </View>
            <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 14, marginTop: 8, gap: 4 }}>
              <Text style={{ color: theme.faint, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 }}>PICKUP TIME</Text>
              <Text style={{ color: theme.gold, fontSize: 20, fontWeight: '800' }}>{whenText}</Text>
              {passenger ? <Text style={{ color: theme.muted }}>Passenger · {passenger}</Text> : null}
            </View>
          </View>
          <View style={{ gap: 12 }}>
            {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.muted }}>Time to accept</Text>
              <Text style={{ color: theme.text, fontWeight: '800' }}>{seconds == null ? '—' : seconds + 's'}</Text>
            </View>
            <View style={{ height: 6, borderRadius: 4, backgroundColor: '#2a3548', overflow: 'hidden' }}>
              <View style={{ width: `${width}%`, height: 6, backgroundColor: theme.gold }} />
            </View>
            {expired ? <Text style={{ color: theme.muted }}>This offer can no longer be accepted.</Text> : (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={acceptLabel} disabled={busy || !actionsEnabled} onPress={onAccept} style={{ backgroundColor: theme.gold, borderRadius: 16, minHeight: 56, alignItems: 'center', justifyContent: 'center', opacity: busy || !actionsEnabled ? 0.55 : 1 }}>
                <Text style={{ color: theme.goldText, fontWeight: '900', fontSize: 18 }}>{busy ? 'Sending…' : acceptLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}
