import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { theme } from '../theme/theme'
import { IconQr, IconShare } from './icons'

export function BrandBar({ onShare }: { onShare: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8 }}>
      <Text style={{ color: theme.text, fontWeight: '800', letterSpacing: 0.6, fontSize: 16 }}>
        <Text style={{ color: theme.gold, fontWeight: '900' }}>TAXIO</Text>
        {' / DRIVER'}
      </Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Share booking page" onPress={onShare} style={iconBtn}>
        <IconShare />
      </TouchableOpacity>
    </View>
  )
}

export function CompanyCard({
  name,
  slogan,
  vatNumber,
  phone,
  availability,
  onQr,
  onShare,
}: {
  name: string
  slogan?: string | null
  vatNumber?: string | null
  phone?: string | null
  availability?: string | null
  onQr: () => void
  onShare: () => void
}) {
  const online = availability !== 'offline'
  const label = availability === 'busy' ? 'Busy' : online ? 'Online' : 'Offline'
  const dot = availability === 'available' ? theme.ok : availability === 'busy' ? theme.gold : theme.faint
  return (
    <View style={{ backgroundColor: theme.card, borderRadius: 22, padding: 16, marginHorizontal: 16, marginTop: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>{name}</Text>
          {slogan ? <Text style={{ color: theme.gold, fontStyle: 'italic', fontWeight: '700' }}>{slogan}</Text> : null}
          {vatNumber ? <Text style={{ color: theme.muted, marginTop: 6 }}>BTW: {vatNumber}</Text> : null}
          {phone ? <Text style={{ color: theme.muted }}>{phone}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
            <Text style={{ color: dot, fontWeight: '700' }}>{label}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Booking QR code" onPress={onQr} style={iconBtn}><IconQr /></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Share booking page" onPress={onShare} style={iconBtn}><IconShare /></TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  )
}

const iconBtn = { width: 42, height: 42, borderRadius: 14, backgroundColor: '#1c2740', alignItems: 'center' as const, justifyContent: 'center' as const }
