import { escapeHtml } from './html.js'

const DISMISS_MS = 14 * 24 * 60 * 60 * 1000
const SHOW_DELAY_MS = 4000
const SHOW_AFTER_INTERACT_MS = 1500

let deferredInstallPrompt = null
let beforeInstallBound = false
let activeCleanup = null

function bindBeforeInstallPrompt() {
  if (beforeInstallBound || typeof window === 'undefined') return
  beforeInstallBound = true
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredInstallPrompt = e
  })
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null
    removePromptEl()
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

export function getInstallStorageKey(context, companyIdOrSlug) {
  if (context === 'operator') return 'taxio_pwa_prompt_operator_dismissed'
  const slug = String(companyIdOrSlug || 'default')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
  return `taxio_pwa_prompt_booking_${slug || 'default'}_dismissed`
}

export function isPromptDismissed(context, companyIdOrSlug) {
  try {
    const raw = localStorage.getItem(getInstallStorageKey(context, companyIdOrSlug))
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
    localStorage.setItem(getInstallStorageKey(context, companyIdOrSlug), String(Date.now()))
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

function renderPromptIcon(iconUrl) {
  const fallback = !iconUrl || iconUrl.includes('pwa-fallback-icon')
  if (fallback) {
    return `<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-yellow-400 text-base font-black text-slate-900 shadow-sm ring-1 ring-amber-400/40">T</div>`
  }
  return `<img src="${escapeHtml(iconUrl)}" alt="" class="h-11 w-11 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-gray-200/80 dark:ring-slate-600/60" loading="lazy" decoding="async" />`
}

function renderBanner({ strings, context, slug, iconUrl, onDismiss }) {
  const platform = detectInstallPlatform()
  const canNative = !!deferredInstallPrompt
  const primaryLabel = canNative ? strings.addShortcut : strings.howToAdd

  const el = document.createElement('div')
  el.id = 'taxio-pwa-prompt'
  el.className =
    'pointer-events-none fixed bottom-3 left-3 right-3 z-[35] mx-auto max-w-lg translate-y-3 opacity-0 transition-all duration-500 ease-out sm:bottom-4'
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
        <button type="button" class="taxio-pwa-install min-h-[44px] flex-1 rounded-xl bg-yellow-400 px-3 py-2.5 text-sm font-bold text-gray-900 shadow-sm transition hover:bg-yellow-300 active:scale-[0.98] dark:bg-amber-400 dark:hover:bg-amber-300">${escapeHtml(primaryLabel)}</button>
        <button type="button" class="taxio-pwa-later min-h-[44px] flex-1 rounded-xl border border-gray-200/90 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">${escapeHtml(strings.notNow)}</button>
      </div>
    </div>`

  const dismiss = () => {
    setPromptDismissed(context, slug)
    onDismiss?.()
    removePromptEl()
  }

  el.querySelector('.taxio-pwa-later')?.addEventListener('click', dismiss)

  el.querySelector('.taxio-pwa-install')?.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      try {
        await deferredInstallPrompt.prompt()
        const choice = await deferredInstallPrompt.userChoice
        deferredInstallPrompt = null
        removePromptEl()
        if (choice?.outcome === 'dismissed') {
          setPromptDismissed(context, slug)
        }
      } catch {
        renderInstructionsSheet(strings, platform, null)
      }
      return
    }
    renderInstructionsSheet(strings, platform, null)
  })

  document.body.appendChild(el)
  requestAnimationFrame(() => {
    el.classList.remove('translate-y-3', 'opacity-0')
    el.classList.add('translate-y-0', 'opacity-100')
  })
}

function renderInstructionsSheet(strings, platform, onClose) {
  const isIOS = platform === 'ios'
  const steps = isIOS
    ? [strings.iosStep1, strings.iosStep2, strings.iosStep3]
    : [strings.androidStep1, strings.androidStep2, strings.androidStep3]

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
    </div>`

  const close = () => {
    sheet.remove()
    onClose?.()
  }
  sheet.querySelector('.taxio-pwa-instr-backdrop')?.addEventListener('click', close)
  sheet.querySelector('.taxio-pwa-instr-close')?.addEventListener('click', close)
  document.body.appendChild(sheet)
}

/**
 * @param {{ context: 'operator'|'booking', slug?: string, iconUrl?: string, strings: Record<string,string>, variant?: 'operator'|'booking' }} options
 */
export function initPwaInstallPrompt(options) {
  if (document.getElementById('taxio-pwa-prompt')) {
    return () => {}
  }

  activeCleanup?.()
  activeCleanup = null

  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}

  bindBeforeInstallPrompt()

  const { context, slug, strings: rawStrings, iconUrl } = options
  const variant = options.variant || context
  const strings = pickStrings(rawStrings, variant)

  if (isStandaloneMode()) return () => {}
  if (isPromptDismissed(context, slug)) return () => {}

  let shown = false
  let timers = []
  let interactHandler = null

  const show = () => {
    if (shown) return
    shown = true
    timers.forEach(clearTimeout)
    timers = []
    if (interactHandler) {
      document.removeEventListener('click', interactHandler, true)
      document.removeEventListener('touchstart', interactHandler, true)
      document.removeEventListener('keydown', interactHandler, true)
    }
    renderBanner({
      strings,
      context,
      slug,
      iconUrl,
      onDismiss: () => {
        activeCleanup = null
      },
    })
  }

  const scheduleAfterInteract = () => {
    timers.push(window.setTimeout(show, SHOW_AFTER_INTERACT_MS))
  }

  interactHandler = () => scheduleAfterInteract()
  document.addEventListener('click', interactHandler, { once: true, capture: true })
  document.addEventListener('touchstart', interactHandler, { once: true, capture: true, passive: true })
  document.addEventListener('keydown', interactHandler, { once: true, capture: true })

  timers.push(window.setTimeout(show, SHOW_DELAY_MS))

  const cleanup = () => {
    timers.forEach(clearTimeout)
    timers = []
    if (interactHandler) {
      document.removeEventListener('click', interactHandler, true)
      document.removeEventListener('touchstart', interactHandler, true)
      document.removeEventListener('keydown', interactHandler, true)
    }
    if (!shown) removePromptEl()
    if (activeCleanup === cleanup) activeCleanup = null
  }

  activeCleanup = cleanup
  return cleanup
}
