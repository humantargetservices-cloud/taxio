import { escapeHtml } from './html.js'

const DISMISS_MS = 14 * 24 * 60 * 60 * 1000
const OPERATOR_SNOOZE_MS = 8 * 60 * 60 * 1000
const SHOW_DELAY_MS = 4000
const DEBUG_SHOW_DELAY_MS = 1000
const SHOW_AFTER_INTERACT_MS = 1500
const DEBUG_SHOW_AFTER_INTERACT_MS = 300
const CHROMIUM_NATIVE_WAIT_MS = 10000
const DEBUG_CHROMIUM_NATIVE_WAIT_MS = 1000
const DESKTOP_CHROMIUM_NATIVE_WAIT_MS = 8000
const PREPARING_BANNER_DELAY_MS = 2000
const DEBUG_PREPARING_BANNER_DELAY_MS = 300
const PREREQUISITE_POLL_MS = 100

let deferredInstallPrompt = null
let pendingInstallPrompt = null
let beforeInstallBound = false
let activeCleanup = null
let pwaManifestReady = false
let serviceWorkerReady = false
let serviceWorkerReadyPromise = null
let activeInitSignature = null
let activeOperatorCompanyKey = null
const installPromptListeners = new Set()

/** @returns {'native'|'preparing'|'fallback'} */
function resolveInstallButtonMode(platform) {
  if (deferredInstallPrompt) return 'native'
  if (platform === 'ios') return 'fallback'
  if (isChromiumInstallBrowser()) return 'preparing'
  return 'fallback'
}

export function setPwaManifestReady(ready = true) {
  if (!ready) {
    pwaManifestReady = false
    deferredInstallPrompt = null
    pendingInstallPrompt = null
    return
  }
  const firstReady = !pwaManifestReady
  pwaManifestReady = true
  if (firstReady) {
    deferredInstallPrompt = null
  }
  if (pendingInstallPrompt) {
    deferredInstallPrompt = pendingInstallPrompt
    pendingInstallPrompt = null
    notifyInstallPromptCaptured()
  }
  pwaLog('manifestReady:', true)
}

export function isPwaManifestReady() {
  return pwaManifestReady
}

export function resetPwaManifestReady() {
  pwaManifestReady = false
  deferredInstallPrompt = null
  pendingInstallPrompt = null
}

export function setServiceWorkerReady(ready = true) {
  serviceWorkerReady = ready
  pwaLog('serviceWorkerReady:', ready)
}

export function isServiceWorkerReady() {
  return serviceWorkerReady
}

export function waitForServiceWorkerReady() {
  if (serviceWorkerReady) return Promise.resolve()
  if (serviceWorkerReadyPromise) return serviceWorkerReadyPromise.then(() => undefined)
  return Promise.resolve()
}

/** Register SW and mark ready (or ready-on-failure so install logic is not blocked forever). */
export function initServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) {
    setServiceWorkerReady(true)
    return Promise.resolve(null)
  }
  if (serviceWorkerReadyPromise) return serviceWorkerReadyPromise

  serviceWorkerReadyPromise = navigator.serviceWorker
    .register('/sw.js')
    .then((reg) => {
      setServiceWorkerReady(true)
      return reg
    })
    .catch(() => {
      setServiceWorkerReady(true)
      return null
    })

  return serviceWorkerReadyPromise
}

export function isPwaDebugMode() {
  if (typeof window === 'undefined') return false
  try {
    return new URLSearchParams(window.location.search).get('taxioPwaDebug') === '1'
  } catch {
    return false
  }
}

function pwaLog(message, detail) {
  if (!isPwaDebugMode() || typeof console === 'undefined') return
  if (detail !== undefined) console.log(`[taxio-pwa] ${message}`, detail)
  else console.log(`[taxio-pwa] ${message}`)
}

function showDelayMs() {
  return isPwaDebugMode() ? DEBUG_SHOW_DELAY_MS : SHOW_DELAY_MS
}

function showAfterInteractMs() {
  return isPwaDebugMode() ? DEBUG_SHOW_AFTER_INTERACT_MS : SHOW_AFTER_INTERACT_MS
}

function preparingBannerDelayMs() {
  return isPwaDebugMode() ? DEBUG_PREPARING_BANNER_DELAY_MS : PREPARING_BANNER_DELAY_MS
}

export function isMobileInstallTarget() {
  const platform = detectInstallPlatform()
  return platform === 'ios' || platform === 'android'
}

function getDismissDebugInfo(context, companyIdOrSlug) {
  const key = getInstallStorageKey(context, companyIdOrSlug)
  if (context === 'operator') {
    const raw = sessionStorage.getItem(key)
    return { key, store: 'sessionStorage', raw, snoozed: isPromptDismissed(context, companyIdOrSlug) }
  }
  const raw = localStorage.getItem(key)
  return { key, store: 'localStorage', raw, snoozed: isPromptDismissed(context, companyIdOrSlug) }
}

function logPromptAudit(context, slug, reason, extra) {
  if (!isPwaDebugMode() || typeof console === 'undefined') return
  console.log('[taxio-pwa] audit:', reason, {
    isStandalone: isStandaloneMode(),
    platform: detectInstallPlatform(),
    isIOS: detectInstallPlatform() === 'ios',
    isMobile: isMobileInstallTarget(),
    hasBeforeInstallPrompt: !!deferredInstallPrompt,
    hasPendingBeforeInstallPrompt: !!pendingInstallPrompt,
    manifestReady: isPwaManifestReady(),
    serviceWorkerReady: isServiceWorkerReady(),
    dismiss: getDismissDebugInfo(context, slug),
    activeInitSignature,
    hasActiveCleanup: !!activeCleanup,
    ...extra,
  })
}

/** Call once at app bootstrap — before booking manifest is applied. */
export function initPwaInstallListener() {
  bindBeforeInstallPrompt()
}

function notifyInstallPromptCaptured() {
  pwaLog('beforeinstallprompt captured:', true)
  installPromptListeners.forEach((cb) => {
    try {
      cb()
    } catch {
      /* listener error */
    }
  })
}

function bindBeforeInstallPrompt() {
  if (beforeInstallBound || typeof window === 'undefined') return
  beforeInstallBound = true
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    if (!pwaManifestReady) {
      pendingInstallPrompt = e
      pwaLog('beforeinstallprompt queued (manifest not ready yet)')
      return
    }
    deferredInstallPrompt = e
    notifyInstallPromptCaptured()
  })
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null
    removePromptEl()
    if (activeOperatorCompanyKey) {
      setOperatorShortcutComplete(activeOperatorCompanyKey)
    }
  })
}

export function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)')?.matches) return true
  if (window.matchMedia?.('(display-mode: fullscreen)')?.matches) return true
  if (window.navigator.standalone === true) return true
  return false
}

export function detectInstallPlatform() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIOS) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

/** Android Chrome / Edge / Chromium — browsers that may fire beforeinstallprompt. */
export function isChromiumInstallBrowser() {
  if (typeof navigator === 'undefined') return false
  const platform = detectInstallPlatform()
  if (platform === 'ios') return false
  const ua = navigator.userAgent || ''
  if (platform === 'android') return true
  if (/Edg\//i.test(ua)) return true
  if (/Chrome|Chromium/i.test(ua) && !/OPR|Opera/i.test(ua)) return true
  return false
}

function chromiumNativeWaitMs(platform) {
  if (isPwaDebugMode()) return DEBUG_CHROMIUM_NATIVE_WAIT_MS
  if (platform === 'android') return CHROMIUM_NATIVE_WAIT_MS
  return DESKTOP_CHROMIUM_NATIVE_WAIT_MS
}

export function setActiveOperatorPwaCompany(companyIdOrSlug) {
  activeOperatorCompanyKey = String(companyIdOrSlug || '').trim() || null
}

export function getOperatorShortcutStorageKey(companyIdOrSlug) {
  const id = String(companyIdOrSlug || 'default')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
  return `taxio_pwa_shortcut_operator_${id || 'default'}`
}

export function isOperatorShortcutComplete(companyIdOrSlug) {
  if (isStandaloneMode()) return true
  try {
    return localStorage.getItem(getOperatorShortcutStorageKey(companyIdOrSlug)) === '1'
  } catch {
    return false
  }
}

export function setOperatorShortcutComplete(companyIdOrSlug) {
  if (!companyIdOrSlug) return
  try {
    localStorage.setItem(getOperatorShortcutStorageKey(companyIdOrSlug), '1')
  } catch {
    /* private mode */
  }
}

export function getInstallStorageKey(context, companyIdOrSlug) {
  if (context === 'operator') {
    const id = String(companyIdOrSlug || 'default')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '')
    return `taxio_pwa_prompt_operator_dismissed_${id || 'default'}`
  }
  const slug = String(companyIdOrSlug || 'default')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
  return `taxio_pwa_prompt_booking_${slug || 'default'}_dismissed`
}

export function isPromptDismissed(context, companyIdOrSlug) {
  if (isPwaDebugMode()) return false
  try {
    const key = getInstallStorageKey(context, companyIdOrSlug)
    if (context === 'operator') {
      try {
        localStorage.removeItem(key)
      } catch {
        /* migrate away from 14-day operator dismiss */
      }
      const raw = sessionStorage.getItem(key)
      if (!raw) return false
      const at = Number(raw)
      if (!Number.isFinite(at)) return false
      if (Date.now() - at >= OPERATOR_SNOOZE_MS) {
        sessionStorage.removeItem(key)
        return false
      }
      return true
    }
    const raw = localStorage.getItem(key)
    if (!raw) return false
    const at = Number(raw)
    if (!Number.isFinite(at)) return false
    return Date.now() - at < DISMISS_MS
  } catch {
    return false
  }
}

export function setPromptDismissed(context, companyIdOrSlug) {
  try {
    const key = getInstallStorageKey(context, companyIdOrSlug)
    if (context === 'operator') {
      sessionStorage.setItem(key, String(Date.now()))
      return
    }
    localStorage.setItem(key, String(Date.now()))
  } catch {
    /* private mode */
  }
}

function removePromptEl() {
  document.getElementById('taxio-pwa-prompt')?.remove()
  document.getElementById('taxio-pwa-instructions')?.remove()
}

function pickStrings(strings, variant) {
  const v = variant === 'booking' ? 'booking' : 'operator'
  return {
    title: strings.title || strings[`${v}Title`] || strings.operatorTitle || 'TAXIO',
    body: strings.body || strings[`${v}Body`] || strings.operatorBody || '',
    addShortcut: strings.addShortcut || 'Add shortcut',
    preparingShortcut: strings.preparingShortcut || 'Preparing shortcut…',
    addedIt: strings.addedIt || 'I added it',
    howToAdd: strings.howToAdd || strings.how || 'How to add',
    notNow: strings.notNow || 'Not now',
    instructionsTitle: strings.instructionsTitle || 'Add to home screen',
    iosStep1: strings.iosStep1 || '',
    iosStep2: strings.iosStep2 || '',
    iosStep3: strings.iosStep3 || '',
    androidStep1: strings.androidStep1 || '',
    androidStep2: strings.androidStep2 || '',
    androidStep3: strings.androidStep3 || '',
    close: strings.close || 'Close',
  }
}

function primaryLabelForMode(strings, mode) {
  if (mode === 'native') return strings.addShortcut
  if (mode === 'preparing') return strings.preparingShortcut
  return strings.howToAdd
}

function renderPromptIcon(iconUrl) {
  const fallback = !iconUrl || iconUrl.includes('pwa-fallback-icon')
  if (fallback) {
    return `<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-yellow-400 text-base font-black text-slate-900 shadow-sm ring-1 ring-amber-400/40">T</div>`
  }
  return `<img src="${escapeHtml(iconUrl)}" alt="" class="h-11 w-11 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-gray-200/80 dark:ring-slate-600/60" loading="lazy" decoding="async" />`
}

function applyBannerInstallMode(el, strings, mode) {
  const btn = el?.querySelector('.taxio-pwa-install')
  if (!btn) return
  const label = primaryLabelForMode(strings, mode)
  btn.textContent = label
  if (mode === 'preparing') {
    btn.disabled = true
    btn.setAttribute('aria-disabled', 'true')
    btn.classList.add('opacity-80', 'cursor-wait')
  } else {
    btn.disabled = false
    btn.removeAttribute('aria-disabled')
    btn.classList.remove('opacity-80', 'cursor-wait')
  }
  el.dataset.taxioPwaMode = mode
}

function renderBanner({ strings, context, slug, iconUrl, mode, onDismiss, onInstallClick, fixedBottomClass }) {
  const platform = detectInstallPlatform()
  const resolvedMode = mode || resolveInstallButtonMode(platform)
  const primaryLabel = primaryLabelForMode(strings, resolvedMode)
  const bottomPos = fixedBottomClass || 'bottom-3 sm:bottom-4'
  const zClass = fixedBottomClass ? 'z-[45]' : 'z-[35]'

  if (resolvedMode === 'native') pwaLog('showing native install button')
  if (resolvedMode === 'fallback') pwaLog('showing fallback instructions after timeout')

  const el = document.createElement('div')
  el.id = 'taxio-pwa-prompt'
  el.dataset.taxioPwaMode = resolvedMode
  el.className =
    `pointer-events-none fixed left-3 right-3 ${zClass} mx-auto max-w-lg translate-y-3 opacity-0 transition-all duration-500 ease-out ${bottomPos}`
  el.setAttribute('role', 'region')
  el.setAttribute('aria-label', strings.title)
  el.innerHTML = `
    <div class="pointer-events-auto rounded-2xl border border-gray-200/70 bg-white/95 p-4 shadow-[0_8px_32px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-900/95 dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      <div class="flex gap-3">
        ${renderPromptIcon(iconUrl)}
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold leading-snug text-gray-900 dark:text-slate-50">${escapeHtml(strings.title)}</p>
          <p class="mt-0.5 text-xs leading-relaxed text-gray-600 dark:text-slate-400">${escapeHtml(strings.body)}</p>
        </div>
      </div>
      <div class="mt-3 flex gap-2">
        <button type="button" class="taxio-pwa-install min-h-[44px] flex-1 rounded-xl bg-yellow-400 px-3 py-2.5 text-sm font-bold text-gray-900 shadow-sm transition hover:bg-yellow-300 active:scale-[0.98] dark:bg-amber-400 dark:hover:bg-amber-300" ${resolvedMode === 'preparing' ? 'disabled aria-disabled="true"' : ''}>${escapeHtml(primaryLabel)}</button>
        <button type="button" class="taxio-pwa-later min-h-[44px] flex-1 rounded-xl border border-gray-200/90 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">${escapeHtml(strings.notNow)}</button>
      </div>
    </div>`

  if (resolvedMode === 'preparing') {
    el.querySelector('.taxio-pwa-install')?.classList.add('opacity-80', 'cursor-wait')
  }

  const dismiss = () => {
    setPromptDismissed(context, slug)
    onDismiss?.()
    removePromptEl()
  }

  el.querySelector('.taxio-pwa-later')?.addEventListener('click', dismiss)
  el.querySelector('.taxio-pwa-install')?.addEventListener('click', () => onInstallClick(el))

  document.body.appendChild(el)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.remove('translate-y-3', 'opacity-0')
      el.classList.add('translate-y-0', 'opacity-100')
    })
  })
  return el
}

function renderInstructionsSheet(strings, platform, onClose, opts = {}) {
  const isIOS = platform === 'ios'
  const steps = isIOS
    ? [strings.iosStep1, strings.iosStep2, strings.iosStep3]
    : [strings.androidStep1, strings.androidStep2, strings.androidStep3]
  const showManualComplete = typeof opts.onManualComplete === 'function'

  const sheet = document.createElement('div')
  sheet.id = 'taxio-pwa-instructions'
  sheet.className = 'fixed inset-0 z-[70] flex items-end justify-center sm:items-center'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.innerHTML = `
    <button type="button" class="taxio-pwa-instr-backdrop absolute inset-0 border-0 bg-slate-950/55 backdrop-blur-[2px]" aria-label="${escapeHtml(strings.close)}"></button>
    <div class="relative z-10 mx-auto w-full max-w-md rounded-t-2xl border border-gray-200/70 bg-white p-5 shadow-2xl dark:border-slate-700/60 dark:bg-slate-900 sm:rounded-2xl sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 dark:bg-slate-700 sm:hidden" aria-hidden="true"></div>
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-base font-bold text-gray-900 dark:text-slate-50">${escapeHtml(strings.instructionsTitle)}</h2>
        <button type="button" class="taxio-pwa-instr-close flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200/80 text-gray-600 dark:border-slate-600 dark:text-slate-300" aria-label="${escapeHtml(strings.close)}">✕</button>
      </div>
      <ol class="mt-4 space-y-3 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
        ${steps.map((step) => `<li class="flex gap-2"><span class="font-bold text-amber-600 dark:text-amber-400">•</span><span>${escapeHtml(step)}</span></li>`).join('')}
      </ol>
      ${
        showManualComplete
          ? `<button type="button" class="taxio-pwa-instr-done mt-5 min-h-[44px] w-full rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-gray-900 shadow-sm transition hover:bg-yellow-300 active:scale-[0.98] dark:bg-amber-400 dark:hover:bg-amber-300">${escapeHtml(strings.addedIt)}</button>`
          : ''
      }
    </div>`

  const close = () => {
    sheet.remove()
    onClose?.()
  }
  sheet.querySelector('.taxio-pwa-instr-backdrop')?.addEventListener('click', close)
  sheet.querySelector('.taxio-pwa-instr-close')?.addEventListener('click', close)
  sheet.querySelector('.taxio-pwa-instr-done')?.addEventListener('click', () => {
    opts.onManualComplete?.()
    close()
  })
  document.body.appendChild(sheet)
}

async function handleInstallClick({ el, strings, context, slug, platform }) {
  if (el?.dataset?.taxioPwaMode === 'preparing') return
  await triggerPwaInstallAction({ context, slug, strings, platform })
}

/** Whether native Chromium install prompt is currently available. */
export function hasNativeInstallPrompt() {
  return !!deferredInstallPrompt
}

/** Try native install; on failure or unavailable, open manual instructions sheet. */
export async function triggerPwaInstallAction({
  context,
  slug,
  companyId,
  strings,
  platform,
  variant = 'operator',
  onComplete,
}) {
  const resolvedPlatform = platform || detectInstallPlatform()
  const picked = pickStrings(strings, variant)
  const operatorKey = companyId || slug

  const markOperatorComplete = () => {
    if (context === 'operator' && operatorKey) {
      setOperatorShortcutComplete(operatorKey)
      onComplete?.('complete')
    }
  }

  if (deferredInstallPrompt) {
    try {
      await deferredInstallPrompt.prompt()
      const choice = await deferredInstallPrompt.userChoice
      deferredInstallPrompt = null
      removePromptEl()
      if (choice?.outcome === 'accepted') {
        markOperatorComplete()
        return 'native-accepted'
      }
      if (choice?.outcome === 'dismissed') {
        setPromptDismissed(context, operatorKey || slug)
      }
      return 'native-dismissed'
    } catch {
      renderInstructionsSheet(picked, resolvedPlatform, null, {
        onManualComplete: context === 'operator' ? markOperatorComplete : null,
      })
      return 'instructions'
    }
  }

  renderInstructionsSheet(picked, resolvedPlatform, null, {
    onManualComplete: context === 'operator' ? markOperatorComplete : null,
  })
  return 'instructions'
}

/** Inline dashboard card visibility (mobile, not standalone, not snoozed). */
export function shouldShowOperatorDashboardPwaCard(companyIdOrSlug) {
  if (!isMobileInstallTarget()) return false
  if (isStandaloneMode()) return false
  if (isOperatorShortcutComplete(companyIdOrSlug)) return false
  if (!isPwaDebugMode() && isPromptDismissed('operator', companyIdOrSlug)) return false
  return true
}

export function logDashboardPwaDebug(reason, extra) {
  if (!isPwaDebugMode() || typeof console === 'undefined') return
  console.log('[taxio-pwa-dashboard]', reason, {
    isStandalone: isStandaloneMode(),
    isMobile: isMobileInstallTarget(),
    platform: detectInstallPlatform(),
    hasNativeInstallPrompt: hasNativeInstallPrompt(),
    manifestReady: isPwaManifestReady(),
    dismissed: isPromptDismissed('operator', ''),
    ...extra,
  })
}

/**
 * @param {{ context: 'operator'|'booking', slug?: string, iconUrl?: string, strings: Record<string,string>, variant?: 'operator'|'booking', requireManifestReady?: boolean }} options
 */
export function initPwaInstallPrompt(options) {
  const sig = `${options.context}:${options.slug || ''}:${options.requireManifestReady !== false}`

  if (options.context === 'operator') {
    logPromptAudit(options.context, options.slug, 'skip:operator-dashboard-uses-inline-card')
    return () => {}
  }

  if (document.getElementById('taxio-pwa-prompt')) {
    logPromptAudit(options.context, options.slug, 'skip:banner-already-in-dom')
    return () => {}
  }

  if (activeInitSignature === sig) {
    if (activeCleanup) {
      logPromptAudit(options.context, options.slug, 'reuse:in-flight-init')
      return activeCleanup
    }
    if (!isPromptDismissed(options.context, options.slug || '')) {
      logPromptAudit(options.context, options.slug, 'restart:prior-init-ended-without-banner')
      activeInitSignature = null
    } else {
      logPromptAudit(options.context, options.slug, 'skip:snoozed')
      return () => {}
    }
  }

  activeCleanup?.()
  activeCleanup = null
  activeInitSignature = sig

  let innerCleanup = null
  const outerCleanup = () => {
    innerCleanup?.()
  }
  activeCleanup = outerCleanup

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    activeInitSignature = null
    activeCleanup = null
    logPromptAudit(options.context, options.slug, 'abort:no-window')
    return () => {}
  }

  const { context, slug, strings: rawStrings, iconUrl, fixedBottomClass } = options
  const variant = options.variant || context
  const strings = pickStrings(rawStrings, variant)
  const requireManifestReady = options.requireManifestReady !== false
  const platform = detectInstallPlatform()
  const chromium = isChromiumInstallBrowser()
  const mobile = isMobileInstallTarget()

  logPromptAudit(context, slug, 'init:start', {
    sig,
    requireManifestReady,
    chromium,
    fixedBottomClass: fixedBottomClass || null,
  })

  if (isStandaloneMode()) {
    activeInitSignature = null
    activeCleanup = null
    logPromptAudit(context, slug, 'abort:standalone')
    return () => {}
  }
  if (isPromptDismissed(context, slug)) {
    activeInitSignature = null
    activeCleanup = null
    logPromptAudit(context, slug, 'abort:snoozed')
    return () => {}
  }
  if (!mobile) {
    activeInitSignature = null
    activeCleanup = null
    logPromptAudit(context, slug, 'abort:desktop-not-mobile')
    return () => {}
  }

  let shown = false
  let nativeWaitDone = false
  let prerequisitesMet = false
  let bannerEl = null
  let timers = []
  let interactHandler = null
  let visibilityHandler = null
  let uninstallPromptListener = null

  const clearTimers = () => {
    timers.forEach(clearTimeout)
    timers = []
  }

  const onInstallClick = (el) => {
    handleInstallClick({ el, strings, context, slug, platform })
  }

  const showBanner = (mode) => {
    if (shown && bannerEl) {
      applyBannerInstallMode(bannerEl, strings, mode)
      return bannerEl
    }
    if (shown) return bannerEl
    shown = true
    logPromptAudit(context, slug, 'show:banner', { mode })
    clearTimers()
    if (interactHandler) {
      document.removeEventListener('click', interactHandler, true)
      document.removeEventListener('touchstart', interactHandler, true)
      document.removeEventListener('keydown', interactHandler, true)
      interactHandler = null
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
    bannerEl = renderBanner({
      strings,
      context,
      slug,
      iconUrl,
      mode,
      fixedBottomClass,
      onDismiss: () => {
        activeCleanup = null
        bannerEl = null
      },
      onInstallClick,
    })
    return bannerEl
  }

  const upgradeToNative = () => {
    if (!prerequisitesMet) return
    showBanner('native')
  }

  const finalizeChromiumMode = () => {
    if (nativeWaitDone) return
    nativeWaitDone = true
    if (deferredInstallPrompt) {
      upgradeToNative()
      return
    }
    if (shown) {
      applyBannerInstallMode(bannerEl, strings, 'fallback')
    } else {
      showBanner('fallback')
    }
  }

  const startChromiumNativeWait = () => {
    const waitMs = chromiumNativeWaitMs(platform)
    pwaLog('beforeinstallprompt captured:', !!deferredInstallPrompt)

    if (deferredInstallPrompt) {
      showBanner('native')
      return
    }

    timers.push(
      window.setTimeout(() => {
        if (!shown && chromium) {
          showBanner('preparing')
        }
      }, preparingBannerDelayMs())
    )

    timers.push(window.setTimeout(finalizeChromiumMode, waitMs))
  }

  const startPromptFlow = () => {
    if (prerequisitesMet) return
    prerequisitesMet = true

    logPromptAudit(context, slug, 'flow:start', {
      manifestReady: isPwaManifestReady(),
      serviceWorkerReady: isServiceWorkerReady(),
      hasBeforeInstallPrompt: !!deferredInstallPrompt,
    })

    uninstallPromptListener = () => {
      if (deferredInstallPrompt) upgradeToNative()
    }
    installPromptListeners.add(uninstallPromptListener)

    if (platform === 'ios') {
      showBanner('fallback')
      return
    }

    if (chromium) {
      startChromiumNativeWait()
      return
    }

    showBanner(deferredInstallPrompt ? 'native' : 'fallback')
  }

  const maybeStartAfterPrerequisites = () => {
    if (prerequisitesMet) return
    if (requireManifestReady && !isPwaManifestReady()) {
      logPromptAudit(context, slug, 'wait:manifest-not-ready')
      timers.push(window.setTimeout(maybeStartAfterPrerequisites, PREREQUISITE_POLL_MS))
      return
    }
    if (!isServiceWorkerReady()) {
      logPromptAudit(context, slug, 'wait:service-worker-not-ready')
      waitForServiceWorkerReady().then(() => {
        timers.push(window.setTimeout(maybeStartAfterPrerequisites, PREREQUISITE_POLL_MS))
      })
      return
    }
    if (document.visibilityState === 'hidden') {
      logPromptAudit(context, slug, 'wait:document-hidden')
      return
    }
    startPromptFlow()
  }

  const onUserEngagement = () => {
    timers.push(window.setTimeout(maybeStartAfterPrerequisites, showAfterInteractMs()))
  }

  const armEngagementListeners = () => {
    logPromptAudit(context, slug, 'arm:engagement-listeners', { showDelayMs: showDelayMs() })
    interactHandler = () => onUserEngagement()
    document.addEventListener('click', interactHandler, { once: true, capture: true })
    document.addEventListener('touchstart', interactHandler, { once: true, capture: true, passive: true })
    document.addEventListener('keydown', interactHandler, { once: true, capture: true })

    visibilityHandler = () => {
      if (document.visibilityState === 'visible') maybeStartAfterPrerequisites()
    }
    document.addEventListener('visibilitychange', visibilityHandler)

    timers.push(window.setTimeout(maybeStartAfterPrerequisites, showDelayMs()))
  }

  const waitForPrerequisites = () => {
    if (requireManifestReady && !isPwaManifestReady()) {
      timers.push(window.setTimeout(waitForPrerequisites, PREREQUISITE_POLL_MS))
      return
    }
    waitForServiceWorkerReady().then(() => {
      armEngagementListeners()
      maybeStartAfterPrerequisites()
    })
  }

  initServiceWorkerRegistration()
  waitForPrerequisites()

  const cleanup = () => {
    clearTimers()
    if (interactHandler) {
      document.removeEventListener('click', interactHandler, true)
      document.removeEventListener('touchstart', interactHandler, true)
      document.removeEventListener('keydown', interactHandler, true)
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
    }
    if (uninstallPromptListener) {
      installPromptListeners.delete(uninstallPromptListener)
    }
    if (!shown) removePromptEl()
    if (activeCleanup === outerCleanup) {
      activeCleanup = null
      activeInitSignature = null
    }
  }

  innerCleanup = cleanup
  return outerCleanup
}
