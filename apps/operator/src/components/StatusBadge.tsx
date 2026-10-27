import React from 'react'
import { Text } from 'react-native'
import { theme } from '../theme/theme'
import type { BookingClass } from '../utils/bookingState'

const label: Record<BookingClass, string> = {
  draft: 'Draft',
  actionable: 'New request',
  accepted: 'Accepted',
  expired: 'Expired',
  declined: 'Closed',
  completed: 'Completed',
  other: 'Update',
}

export function StatusBadge({ kind }: { kind: BookingClass }) {
  const color = kind === 'actionable' ? theme.gold : kind === 'accepted' ? theme.ok : theme.muted
  return <Text style={{ color, fontSize: 12, fontWeight: '800' }}>{label[kind]}</Text>
}
