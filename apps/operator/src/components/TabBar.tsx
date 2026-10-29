import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { theme } from '../theme/theme'
import { IconAccount, IconEuro, IconHome, IconTrips } from './icons'

export type DriverTab = 'home' | 'trips' | 'earnings' | 'account'

const ITEMS: { id: DriverTab; label: string; Icon: typeof IconHome }[] = [
  { id: 'home', label: 'Home', Icon: IconHome },
  { id: 'trips', label: 'Trips', Icon: IconTrips },
  { id: 'earnings', label: 'Earnings', Icon: IconEuro },
  { id: 'account', label: 'Account', Icon: IconAccount },
]

export function TabBar({ tab, onChange }: { tab: DriverTab; onChange: (tab: DriverTab) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#0c1322', borderTopWidth: 1, borderTopColor: '#1c2740', paddingBottom: 8, paddingTop: 8 }}>
      {ITEMS.map(item => {
        const active = tab === item.id
        const color = active ? theme.gold : theme.faint
        return (
          <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => onChange(item.id)} style={{ flex: 1, alignItems: 'center', minHeight: 52, justifyContent: 'center', gap: 4 }}>
            <item.Icon color={color} />
            <Text style={{ color, fontWeight: '700', fontSize: 12 }}>{item.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
