/**
 * Foreground offers repeat one signature until the server deadline.
 * Background and lock-screen alerts play that signature once.
 * Android does not allow this app to take over the lock screen.
 */

export type AlertStopReason =
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'replaced'
  | 'expired'
  | 'background'
  | 'cleanup'

export type AlertSurface = 'foreground' | 'background' | 'locked'

export type PlaybackEffect = 'start' | 'restart' | 'stop' | 'keep'

export type PlaybackSession = {
  generation: number
  offerId: string | null
  playing: boolean
}

export type PlaybackInput = {
  appActive: boolean
  offerId: string | null
  secondsRemaining: number | null
  stopReason?: AlertStopReason | null
}

export type AlertPlayer = {
  playing: boolean
  loop: boolean
  play: () => void
  pause: () => void
  seekTo: (seconds: number) => Promise<void>
}

export function offerShouldSound(input: PlaybackInput): boolean {
  return input.appActive
    && !!input.offerId
    && input.secondsRemaining != null
    && input.secondsRemaining > 0
    && !input.stopReason
}

/** Heads-up once outside the app. The tap refreshes server state before any offer screen. */
export function remoteAlertExperience(surface: AlertSurface) {
  if (surface === 'foreground') {
    return {
      fullScreen: true,
      sound: 'repeat-until-server-deadline' as const,
      headsUp: false,
      automaticLockScreenTakeover: false,
      tapRefreshesBeforeScreen: true,
    }
  }
  return {
    fullScreen: false,
    sound: 'once' as const,
    headsUp: true,
    automaticLockScreenTakeover: false,
    tapRefreshesBeforeScreen: true,
  }
}

export function stepOfferPlayback(session: PlaybackSession, input: PlaybackInput): {
  session: PlaybackSession
  effect: PlaybackEffect
  reason: AlertStopReason | 'playing' | 'idle'
} {
  const replaced = session.playing
    && !!session.offerId
    && !!input.offerId
    && session.offerId !== input.offerId
    && offerShouldSound({ ...input, stopReason: null })
  const stopReason = input.stopReason
    || (!input.appActive ? 'background' : null)
    || (input.secondsRemaining != null && input.secondsRemaining <= 0 ? 'expired' : null)
    || (!input.offerId ? 'cleanup' : null)

  if (replaced) {
    return {
      session: { generation: session.generation + 1, offerId: input.offerId, playing: true },
      effect: 'restart',
      reason: 'replaced',
    }
  }
  if (stopReason) {
    if (!session.playing && session.offerId == null) {
      return { session, effect: 'keep', reason: 'idle' }
    }
    return {
      session: { generation: session.generation + 1, offerId: null, playing: false },
      effect: 'stop',
      reason: stopReason,
    }
  }
  if (session.playing && session.offerId === input.offerId) {
    return { session, effect: 'keep', reason: 'playing' }
  }
  return {
    session: { generation: session.generation + 1, offerId: input.offerId, playing: true },
    effect: 'start',
    reason: 'playing',
  }
}

export function createOfferAlertController(player: AlertPlayer) {
  let session: PlaybackSession = { generation: 0, offerId: null, playing: false }
  let chain = Promise.resolve()

  function dispatch(input: PlaybackInput) {
    const step = stepOfferPlayback(session, input)
    session = step.session
    const generation = session.generation
    const effect = step.effect
    chain = chain.then(async () => {
      if (effect === 'keep') return
      player.loop = false
      if (player.playing) player.pause()
      try { await player.seekTo(0) } catch { /* a failed rewind still counts as stopped */ }
      if (generation !== session.generation) return
      if (effect === 'stop' || !session.playing) {
        player.loop = false
        if (player.playing) player.pause()
        return
      }
      player.loop = true
      if (!player.playing) player.play()
    }).catch(() => {
      player.loop = false
      if (player.playing) player.pause()
    })
    return chain
  }

  return {
    dispatch,
    snapshot: () => session,
  }
}
