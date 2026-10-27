import React from 'react'
import { Text, View } from 'react-native'
import { secondsRemaining } from '../utils/bookingState'
import { theme } from '../theme/theme'

export function CountdownTimer({ deadline, now }: { deadline?: string | null; now: number }) {
  const seconds = secondsRemaining(deadline, now)
  const expired = seconds == null || seconds <= 0
  return (
    <View>
      <Text style={{ color: expired ? theme.danger : theme.gold, fontSize: 28, fontWeight: '900' }}>
        {seconds == null ? 'No server deadline' : expired ? 'Offer expired' : seconds + 's'}
      </Text>
      <Text style={{ color: theme.muted, fontSize: 12 }}>Time left is the server deadline, not a timer started by this phone.</Text>
    </View>
  )
}
