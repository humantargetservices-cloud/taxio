import React from 'react'
import { Text, View } from 'react-native'
import { theme } from '../theme/theme'

export function RouteDetails({ pickup, dropoff }: { pickup?: string | null; dropoff?: string | null }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.faint, fontSize: 11, fontWeight: '800' }}>PICKUP</Text>
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>{pickup || 'Pickup not set'}</Text>
      <Text style={{ color: theme.faint, fontSize: 11, fontWeight: '800' }}>DESTINATION</Text>
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>{dropoff || 'Destination not set'}</Text>
    </View>
  )
}
