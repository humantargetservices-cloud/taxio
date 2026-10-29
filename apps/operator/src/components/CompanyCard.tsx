import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { theme } from '../theme/theme'
import { IconQr, IconSettings, IconShare } from './icons'

export function BrandBar({ onSettings, hidden }: { onSettings: () => void; hidden?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, gap: 8 }}>
      <Text style={{ color: theme.gold, fontWeight: '700', letterSpacing: 2, fontSize: 14 }}>
        TAXIO <Text style={{ color: theme.muted, fontSize: 12, letterSpacing: 0, fontWeight: '400' }}>/ DRIVER</Text>
      </Text>
      {hidden ? <View style={{ width: 44, height: 44 }} /> : (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Language, appearance and help" onPress={onSettings} style={iconBtn}>
          <IconSettings />
        </TouchableOpacity>
      )}
    </View>
  )
}

export function CompanyCard({
  name,
  slogan,
  vatNumber,
  phone,
  statusText,
  hideActions,
  onQr,
  onShare,
}: {
  name: string
  slogan?: string | null
  vatNumber?: string | null
  phone?: string | null
  statusText: string
  hideActions?: boolean
  onQr: () => void
  onShare: () => void
}) {
  return (
    <View style={{ backgroundColor: theme.company, borderRadius: 18, padding: 16, marginHorizontal: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 19, fontWeight: '700' }}>{name}</Text>
          {slogan ? <Text style={{ color: theme.gold, fontStyle: 'italic', fontSize: 12, marginTop: 3, marginBottom: 7 }}>{slogan}</Text> : null}
        </View>
        <Text style={{ color: theme.ok, fontSize: 12 }}>{statusText}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          {vatNumber ? <Text style={{ color: theme.muted, fontSize: 12 }}>BTW: {vatNumber}</Text> : null}
          {phone ? <Text style={{ color: theme.muted, fontSize: 12 }}>{phone}</Text> : null}
        </View>
        {hideActions ? null : (
          <View style={{ flexDirection: 'row', gap: 7 }}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Show company booking QR code" onPress={onQr} style={iconBtn}><IconQr size={19} /></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Share company booking link" onPress={onShare} style={iconBtn}><IconShare size={19} /></TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

const iconBtn = { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: theme.iconBg, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 10 }
