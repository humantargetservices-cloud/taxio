import React from 'react'
import { FullScreenRequest } from './FullScreenRequest'
import { euro, pickupWhen } from '../utils/driverDesk'

type Offer = {
  pickup_address?: string | null
  dropoff_address?: string | null
  estimated_price_eur?: number | null
  decision_deadline_at?: string | null
  ride_datetime?: string | null
  customer_name?: string | null
}

/** Accept-only full-screen request. There is no dismiss control on this screen. */
export function IncomingOffer({
  offer,
  now,
  busy,
  actionsEnabled,
  error,
  onAccept,
  companyName,
  slogan,
  vatNumber,
  phone,
  availability,
}: {
  offer: Offer | null
  now: number
  busy: boolean
  actionsEnabled: boolean
  error?: string
  onAccept: () => void
  companyName?: string
  slogan?: string | null
  vatNumber?: string | null
  phone?: string | null
  availability?: string | null
}) {
  const fare = offer?.estimated_price_eur
  return (
    <FullScreenRequest
      visible={!!offer}
      title="NEW TRIP REQUEST"
      pickup={offer?.pickup_address}
      dropoff={offer?.dropoff_address}
      whenText={pickupWhen(offer?.ride_datetime, now)}
      fareText={fare == null ? 'Fare estimate unavailable' : euro(Number(fare))}
      fareNote="Trip fare · direct booking"
      passenger={offer?.customer_name}
      deadline={offer?.decision_deadline_at}
      now={now}
      busy={busy}
      error={error}
      acceptLabel="Accept trip"
      actionsEnabled={actionsEnabled}
      onAccept={onAccept}
      companyName={companyName}
      slogan={slogan}
      vatNumber={vatNumber}
      phone={phone}
      availability={availability}
    />
  )
}
