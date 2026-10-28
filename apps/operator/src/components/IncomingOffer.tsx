import React from 'react'
import { FullScreenRequest } from './FullScreenRequest'
import { euro, scheduleLabel } from '../utils/driverDesk'

type Offer = {
  pickup_address?: string | null
  dropoff_address?: string | null
  estimated_price_eur?: number | null
  decision_deadline_at?: string | null
  ride_datetime?: string | null
}

/** Accept-only full-screen request. There is no dismiss control on this screen. */
export function IncomingOffer({
  offer,
  now,
  busy,
  actionsEnabled,
  error,
  onAccept,
}: {
  offer: Offer | null
  now: number
  busy: boolean
  actionsEnabled: boolean
  error?: string
  onAccept: () => void
}) {
  const fare = offer?.estimated_price_eur
  return (
    <FullScreenRequest
      visible={!!offer}
      title="New trip request"
      pickup={offer?.pickup_address}
      dropoff={offer?.dropoff_address}
      whenText={scheduleLabel(offer?.ride_datetime, now)}
      fareText={fare == null ? 'Fare estimate unavailable' : 'Estimated fare ' + euro(Number(fare))}
      deadline={offer?.decision_deadline_at}
      now={now}
      busy={busy}
      error={error}
      acceptLabel="ACCEPT"
      actionsEnabled={actionsEnabled}
      onAccept={onAccept}
    />
  )
}
