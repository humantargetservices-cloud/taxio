import { setAudioModeAsync, useAudioPlayer } from 'expo-audio'
import { useEffect, useRef } from 'react'
import { createOfferAlertController } from '../utils/offerAlertPlayback'

/**
 * One foreground loop for the open offer. A newer offer replaces it.
 * Leaving the app, expiry, and unmount all stop playback before another loop can start.
 */
export function OfferSound({ active, offerId }: { active: boolean; offerId: string | null }) {
  const player = useAudioPlayer(require('../../assets/taxio_offer.wav'))
  const controller = useRef<ReturnType<typeof createOfferAlertController> | null>(null)
  if (!controller.current) controller.current = createOfferAlertController(player)

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'doNotMix',
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const ctl = controller.current
    if (!ctl) return
    void ctl.dispatch({
      appActive: active,
      offerId: active ? offerId : null,
      secondsRemaining: active ? 1 : 0,
    })
    return () => {
      void ctl.dispatch({
        appActive: false,
        offerId: null,
        secondsRemaining: 0,
        stopReason: 'cleanup',
      })
    }
  }, [active, offerId])

  return null
}
