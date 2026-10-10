/**
 * ONE Rescue notification controller per dashboard session.
 * Owns overlays only — never remounts the company dashboard.
 * Browser timers are DISPLAY ONLY; pg_cron owns deadlines.
 */
import { tDashboard } from '../i18n.js'
import { escapeHtml } from './html.js'
import { getLocale } from './locale.js'
import { listBookingRequestsForCompany, updateBookingRequestStatus } from './api.js'
import {
  ORIGINAL_COMPANY_DECISION_SECONDS,
  RESCUE_OPPORTUNITY_SECONDS,
  acceptRescueRequest,
  activateRescueRequest,
  fetchRescueGloballyEnabled,
  fetchRescueWinnerDetails,
  listRescueOpportunitiesForCompany,
  secondsRemaining,
  startRescueLiveUpdates,
  stopRescueLiveUpdates,
} from './rescue.js'
import {
  overlayRemaining,
  pickOpenOpportunity,
  pickPendingDecisionBooking,
  pickWonRescue,
  renderNewTripDecisionOverlay,
  renderRescueOpportunityOverlay,
  renderWinnerStatusPanel,
} from './rescueMvpUi.js'

/** @type {string[]} */
let dismissedIds = []
/** @type {string[]} */
let dismissedWinnerIds = []
/** @type {string | null} */
let flashMessage = null
/** @type {ReturnType<typeof setTimeout> | null} */
let flashTimer = null
/** @type {ReturnType<typeof setInterval> | null} */
let countdownTimer = null
/** @type {boolean} */
let expireFired = false
/** @type {string} */
let lastSig = ''
/** @type {{ companyId: string, accessToken: string, companyName: string, portal: HTMLElement } | null} */
let session = null
let refreshInflight = false
/** @type {Map<string, object>} */
const winnerDetailsCache = new Map()

function td() {
  return tDashboard(getLocale())
}

function ensurePortal() {
  let el = document.getElementById('rescue-notification-root')
  if (!el) {
    el = document.createElement('div')
    el.id = 'rescue-notification-root'
    document.body.appendChild(el)
  }
  return el
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function showFlash(message, ms = 2800) {
  flashMessage = message
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    if (flashMessage === message) flashMessage = null
    void refreshNotifications()
  }, ms)
}

function renderFlashHtml() {
  if (!flashMessage) return ''
  return `<div id="rescue-flash" class="fixed inset-x-0 top-4 z-[80] flex justify-center px-4 pointer-events-none">
    <p class="rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-900 shadow-lg dark:border-amber-500/40 dark:bg-slate-900 dark:text-amber-100">${escapeHtml(flashMessage)}</p>
  </div>`
}

function startCountdown(deadlineIso, totalSec, onExpire) {
  stopCountdown()
  expireFired = false
  const total = Math.max(1, Number(totalSec) || 1)
  const tick = () => {
    const left = overlayRemaining(deadlineIso, 0)
    const pct = Math.max(0, Math.min(100, (left / total) * 100))
    const bar = document.querySelector('#rescue-notification-root [data-mvp-progress]')
    const label = document.querySelector('#rescue-notification-root [data-mvp-countdown]')
    if (bar) bar.style.width = `${pct}%`
    if (label) label.textContent = `${left}s`
    if (left <= 0) {
      stopCountdown()
      if (!expireFired) {
        expireFired = true
        onExpire()
      }
    }
  }
  tick()
  countdownTimer = setInterval(tick, 250)
}

function bindHandlers(ctx) {
  const { companyId, accessToken, portal } = ctx
  const copy = td()

  portal.querySelectorAll('[data-mvp-dismiss-winner]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-mvp-dismiss-winner')
      if (id && !dismissedWinnerIds.includes(id)) dismissedWinnerIds = [...dismissedWinnerIds, id]
      lastSig = ''
      void refreshNotifications()
    })
  })

  portal.querySelectorAll('[data-mvp-accept-booking]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const bookingId = btn.getAttribute('data-mvp-accept-booking')
      if (!bookingId) return
      btn.disabled = true
      const msg = portal.querySelector('#rescue-a-msg')
      const { error } = await updateBookingRequestStatus(companyId, bookingId, 'accepted')
      if (error) {
        const gone = /no longer available/i.test(error.message || '')
        btn.disabled = false
        if (msg) {
          msg.textContent = gone
            ? copy.bookingAcceptGone || error.message
            : copy.bookingAcceptError || error.message
          msg.classList.remove('hidden')
        }
        if (gone) {
          if (!dismissedIds.includes(bookingId)) dismissedIds = [...dismissedIds, bookingId]
          showFlash(copy.rescueActiveLooking || copy.rescueActivateSuccess)
          void refreshNotifications()
        }
        return
      }
      if (!dismissedIds.includes(bookingId)) dismissedIds = [...dismissedIds, bookingId]
      void refreshNotifications()
    })
  })

  portal.querySelectorAll('[data-mvp-decline-booking]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const bookingId = btn.getAttribute('data-mvp-decline-booking')
      if (!bookingId) return
      btn.disabled = true
      const msg = portal.querySelector('#rescue-a-msg')
      try {
        const flags = await fetchRescueGloballyEnabled()
        if (flags.enabled) {
          const result = await activateRescueRequest({
            bookingRequestId: bookingId,
            companyId,
            accessToken,
          })
          if (!result.ok && result.body?.code !== 'RESCUE_ALREADY_EXISTS') {
            if (
              result.body?.code === 'RESCUE_GLOBALLY_DISABLED' ||
              result.body?.code === 'COMPANY_RESCUE_DISABLED'
            ) {
              const { error } = await updateBookingRequestStatus(companyId, bookingId, 'rejected')
              if (error) {
                btn.disabled = false
                if (msg) {
                  msg.textContent = copy.bookingRefuseError || error.message
                  msg.classList.remove('hidden')
                }
                return
              }
              if (!dismissedIds.includes(bookingId)) dismissedIds = [...dismissedIds, bookingId]
              void refreshNotifications()
              return
            }
            btn.disabled = false
            if (msg) {
              msg.textContent = result.body?.error || copy.rescueActivateError
              msg.classList.remove('hidden')
            }
            return
          }
          if (!dismissedIds.includes(bookingId)) dismissedIds = [...dismissedIds, bookingId]
          showFlash(copy.rescueActiveLooking || copy.rescueActivateSuccess)
          void refreshNotifications()
          return
        }
        const { error } = await updateBookingRequestStatus(companyId, bookingId, 'rejected')
        if (error) {
          btn.disabled = false
          if (msg) {
            msg.textContent = copy.bookingRefuseError || error.message
            msg.classList.remove('hidden')
          }
          return
        }
        if (!dismissedIds.includes(bookingId)) dismissedIds = [...dismissedIds, bookingId]
        void refreshNotifications()
      } catch {
        btn.disabled = false
        if (msg) {
          msg.textContent = copy.rescueActivateError
          msg.classList.remove('hidden')
        }
      }
    })
  })

  portal.querySelectorAll('[data-mvp-accept-rescue]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const rescueId = btn.getAttribute('data-mvp-accept-rescue')
      if (!rescueId) return
      btn.disabled = true
      const msg = portal.querySelector('#rescue-b-msg')
      try {
        const result = await acceptRescueRequest({
          rescueRequestId: rescueId,
          companyId,
          accessToken,
        })
        if (
          result.body?.code === 'ALREADY_TAKEN' ||
          result.body?.code === 'ALREADY_ASSIGNED' ||
          result.body?.code === 'OPPORTUNITY_EXPIRED'
        ) {
          showFlash(copy.rescueAlreadyTakenShort || 'Trip already accepted.')
          void refreshNotifications()
          return
        }
        if (!result.ok) {
          btn.disabled = false
          if (msg) {
            msg.textContent = result.body?.error || copy.rescueAcceptError
            msg.classList.remove('hidden')
          }
          return
        }
        showFlash(copy.rescueReservedBadge || 'Trip reserved for you')
        void refreshNotifications()
      } catch {
        btn.disabled = false
        if (msg) {
          msg.textContent = copy.rescueAcceptError
          msg.classList.remove('hidden')
        }
      }
    })
  })
}

async function refreshNotifications() {
  if (!session) return
  if (refreshInflight) return
  refreshInflight = true
  const { companyId, accessToken, companyName, portal } = session
  try {
    const [flags, opportunities, bookings] = await Promise.all([
      fetchRescueGloballyEnabled(),
      listRescueOpportunitiesForCompany(companyId),
      listBookingRequestsForCompany(companyId).catch(() => []),
    ])

    const newIds = new Set((bookings || []).filter((b) => String(b.status || 'new') === 'new').map((b) => b.id))
    dismissedIds = dismissedIds.filter((id) => newIds.has(id))

    const pendingDecision = pickPendingDecisionBooking(bookings, dismissedIds)
    const openOpp = pickOpenOpportunity(opportunities)
    const won = pickWonRescue(opportunities, companyId)
    const pcs = won?.rescue?.passenger_confirm_status || ''
    const wonId = won?.rescue_request_id || won?.rescue?.id || ''
    const winnerDismissed = wonId && dismissedWinnerIds.includes(wonId)

    let winnerPhase = null
    if (won && !winnerDismissed) {
      if (pcs === 'WAITING_PASSENGER_CONFIRMATION') winnerPhase = 'waiting'
      else if (pcs === 'CONFIRMED') winnerPhase = 'confirmed'
      else if (pcs === 'CANCELLED_BY_PASSENGER') winnerPhase = 'cancelled'
    }

    let winnerDetails = null
    if (winnerPhase === 'confirmed' && wonId) {
      winnerDetails = winnerDetailsCache.get(wonId) || null
      if (!winnerDetails) {
        const det = await fetchRescueWinnerDetails({ rescueRequestId: wonId, accessToken })
        if (det.ok) {
          winnerDetails = det.body
          winnerDetailsCache.set(wonId, det.body)
        }
      }
    }

    const copy = td()

    const sig = JSON.stringify({
      g: flags.enabled,
      d: pendingDecision ? [pendingDecision.id, pendingDecision.decision_deadline_at] : null,
      o: openOpp ? [openOpp.id, openOpp.status, openOpp.expires_at] : null,
      w: wonId ? [wonId, pcs, winnerPhase, !!winnerDetails] : null,
      x: dismissedIds,
      dw: dismissedWinnerIds,
      f: flashMessage,
    })

    // Always re-bind if overlay structure changed; skip identical paint
    if (sig === lastSig && portal.childElementCount > 0 && !flashMessage) {
      return
    }
    lastSig = sig

    stopCountdown()

    let overlayHtml = ''
    // Decision / opportunity overlays take priority over winner panel
    if (openOpp) {
      overlayHtml = renderRescueOpportunityOverlay(
        copy,
        openOpp,
        overlayRemaining(openOpp.expires_at, flags.opportunitySeconds || RESCUE_OPPORTUNITY_SECONDS),
        flags.opportunitySeconds || RESCUE_OPPORTUNITY_SECONDS
      )
    } else if (pendingDecision) {
      overlayHtml = renderNewTripDecisionOverlay(
        copy,
        pendingDecision,
        overlayRemaining(
          pendingDecision.decision_deadline_at,
          flags.decisionSeconds || ORIGINAL_COMPANY_DECISION_SECONDS
        ),
        flags.decisionSeconds || ORIGINAL_COMPANY_DECISION_SECONDS
      )
    } else if (winnerPhase) {
      overlayHtml = renderWinnerStatusPanel(copy, {
        phase: winnerPhase,
        opportunity: won,
        details: winnerDetails,
        companyName: companyName || '',
      })
    }

    portal.innerHTML = `${renderFlashHtml()}${overlayHtml}`
    bindHandlers({ companyId, accessToken, portal })

    if (openOpp) {
      startCountdown(openOpp.expires_at, flags.opportunitySeconds || RESCUE_OPPORTUNITY_SECONDS, () => {
        // Display-only expiry — close quietly; server cron owns opportunity withdraw
        lastSig = ''
        void refreshNotifications()
      })
    } else if (pendingDecision) {
      startCountdown(
        pendingDecision.decision_deadline_at,
        flags.decisionSeconds || ORIGINAL_COMPANY_DECISION_SECONDS,
        () => {
          const bookingId = pendingDecision.id
          if (bookingId && !dismissedIds.includes(bookingId)) {
            dismissedIds = [...dismissedIds, bookingId]
          }
          // Close locally — do NOT activate Rescue from the browser
          showFlash(copy.rescueActiveLooking || copy.rescueActivateSuccess)
          lastSig = ''
          void refreshNotifications()
        }
      )
    }
  } catch (e) {
    console.warn('[rescue-notify] refresh failed soft', e?.message || e)
  } finally {
    refreshInflight = false
  }
}

/**
 * Start the single Rescue notification controller after the dashboard has painted.
 * Failures never throw — dashboard remains usable.
 * Idempotent for the same companyId (tab remounts must not tear overlays down).
 */
export function startRescueNotifications({ companyId, accessToken, companyName }) {
  if (!companyId || !accessToken) return
  if (session?.companyId === companyId && session?.accessToken === accessToken) {
    session.portal = ensurePortal()
    if (companyName) session.companyName = companyName
    void refreshNotifications()
    return
  }
  stopRescueNotifications()
  const portal = ensurePortal()
  session = { companyId, accessToken, companyName: companyName || '', portal }
  lastSig = ''
  void refreshNotifications()
  startRescueLiveUpdates(companyId, () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    void refreshNotifications()
  })
}

export function stopRescueNotifications() {
  stopRescueLiveUpdates()
  stopCountdown()
  if (flashTimer) {
    clearTimeout(flashTimer)
    flashTimer = null
  }
  flashMessage = null
  lastSig = ''
  session = null
  winnerDetailsCache.clear()
  const portal = document.getElementById('rescue-notification-root')
  if (portal) portal.innerHTML = ''
}

export function secondsLeftForTests(deadlineIso) {
  return secondsRemaining(deadlineIso)
}
