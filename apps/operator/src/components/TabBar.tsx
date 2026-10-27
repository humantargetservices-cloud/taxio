import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { theme } from '../theme/theme'

export type DriverTab = 'home' | 'requests' | 'trip' | 'rescue' | 'more'

const ITEMS: { id: DriverTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'requests', label: 'Requests' },
  { id: 'trip', label: 'Trip' },
  { id: 'rescue', label: 'Rescue' },
  { id: 'more', label: 'More' },
]

export function TabBar({ tab, onChange }: { tab: DriverTab; onChange: (tab: DriverTab) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#0c1428', borderTopWidth: 1, borderTopColor: theme.cardBorder, paddingBottom: 10, paddingTop: 8 }}>
      {ITEMS.map(item => (
        <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => onChange(item.id)} style={{ flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: tab === item.id ? theme.gold : theme.faint, fontWeight: '800', fontSize: 12 }}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
