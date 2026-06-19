import { navigate } from '../nav.js'
import { translations, tDashboard } from '../i18n.js'
import {
  getSession,
  getMyProfile,
  getCompanyForUser,
  listBookingRequestsForCompany,
  listCarsForCompany,
  insertCar,
  updateCar,
  deleteCar,
  updateCompanyByOwner,
  uploadCompanyLogo,
  removeCompanyLogo,
  DEFAULT_PRICING,
} from '../lib/api.js'
import { signOutEverywhere } from '../lib/auth.js'
import { formatDateTime } from '../lib/format.js'
import { escapeHtml } from '../lib/html.js'
import { icon } from '../lib/icons.js'
import { absolutePublicBookingUrl } from '../lib/tenant.js'
import { getLocale, setLocale, syncDocumentLang } from '../lib/locale.js'
import { isPublicDarkMode, setPublicDarkMode, syncPublicThemeClass } from '../lib/publicTheme.js'
import {
  BOOKING_CAR_TYPE_ORDER,
  pricingRowForType,
  resolveEnabledBookingCarTypes,
} from '../lib/bookingCarTypes.js'
import { companyHourlyFromRecord, pricingWithHourlyEmbed } from '../lib/companyHourly.js'
import {
  SETUP_PREVIEW_STORAGE_KEY,
  SETUP_QR_STORAGE_KEY,
  buildQrStickersWaUrl,
  buildTaxioSupportWaUrl,
  calculateCompanySetupProgress,
} from '../lib/companySetupProgress.js'

const dashState = {
  tab: 'overview',
  modal: null,
  editingCarId: null,
  drawerOpen: false,
  qrOpen: false,
}

const DASH_SHELL =
  'min-h-screen bg-gradient-to-b from-slate-100 via-[#eef0f3] to-slate-200/70 pb-10 dark:from-[#06080f] dark:via-slate-950 dark:to-[#0a0f1a]'
const DASH_HEADER =
  'border-b border-gray-200/80 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-950/90 dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]'
const DASH_TAB_BAR = 'border-t border-gray-100 bg-[#eef0f3] dark:border-slate-700/60 dark:bg-slate-900/50'
const DASH_CARD =
  'rounded-2xl border border-gray-200/60 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_32px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-slate-700/40 dark:bg-slate-900/70 dark:shadow-[0_8px_40px_rgba(0,0,0,0.35)]'
const DASH_HERO =
  'relative overflow-hidden rounded-2xl border border-gray-200/60 bg-gradient-to-br from-white via-white to-amber-50/35 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_rgba(15,23,42,0.06)] dark:border-slate-700/40 dark:from-slate-900 dark:via-slate-900/95 dark:to-amber-950/20 dark:shadow-[0_12px_48px_rgba(0,0,0,0.4)]'
const DASH_PANEL = `${DASH_CARD} p-5 sm:p-6`
const DASH_TEXT = 'text-gray-900 dark:text-slate-50'
const DASH_MUTED = 'text-gray-500 dark:text-slate-400'
const DASH_INPUT =
  'rounded-xl border border-gray-200/80 bg-gray-50/90 text-gray-800 shadow-inner transition-colors dark:border-slate-600/60 dark:bg-slate-950/60 dark:text-slate-200'
const DASH_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950'
const DASH_ICON_BTN = `flex shrink-0 items-center justify-center rounded-xl border border-gray-200/80 bg-white/90 text-gray-600 shadow-sm transition-all duration-200 hover:border-gray-300 hover:bg-white hover:shadow-md dark:border-slate-600/60 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800 active:scale-[0.97] ${DASH_FOCUS}`
const DASH_BTN_PRIMARY = `inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_14px_rgba(234,179,8,0.28)] transition-all duration-200 hover:bg-yellow-300 hover:shadow-[0_4px_18px_rgba(234,179,8,0.38)] active:scale-[0.98] dark:bg-amber-400 dark:text-gray-900 dark:hover:bg-amber-300 ${DASH_FOCUS}`
const DASH_BTN_SECONDARY = `inline-flex items-center justify-center rounded-xl border border-gray-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] dark:border-slate-600/70 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-700/80 ${DASH_FOCUS}`

function pricingOf(company) {
  const p = company?.pricing && typeof company.pricing === 'object' ? company.pricing : {}
  const out = {}
  for (const name of BOOKING_CAR_TYPE_ORDER) {
    const row = pricingRowForType(p, name)
    const def = DEFAULT_PRICING[name]
    out[name] = {
      enabled: row && typeof row === 'object' ? row.enabled === true : false,
      start: row && typeof row === 'object' ? row.start ?? def.start : def.start,
      per_km: row && typeof row === 'object' ? row.per_km ?? def.per_km : def.per_km,
      initial_km: row && typeof row === 'object' ? row.initial_km ?? def.initial_km : def.initial_km,
    }
  }
  return out
}

function setupHealthStatusSummary(td, progress, pendingCount) {
  if (progress.percent >= 100) return td.setupAllSet
  if (pendingCount > 0) {
    return fillDashTemplate(td.setupStepsRemaining, { count: String(pendingCount) })
  }
  return setupHealthSubtitle(td, progress.percent)
}

function renderPendingTaskRow(td, item) {
  const action = setupItemActionId(item)
  const label = setupActionButtonLabel(td, action)
  return `<button type="button" data-setup-action="${escapeHtml(action)}"
    class="group flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-white px-3.5 py-3 text-left shadow-sm transition-all duration-200 hover:border-amber-300/80 hover:shadow-md active:scale-[0.99] dark:border-amber-500/20 dark:from-amber-950/30 dark:to-slate-900/40 dark:hover:border-amber-400/30 dark:hover:from-amber-950/50 ${DASH_FOCUS}">
    <span class="text-sm font-semibold text-gray-900 dark:text-slate-100">${escapeHtml(label)}</span>
    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100/80 text-amber-700 transition-colors group-hover:bg-amber-200/90 dark:bg-amber-400/10 dark:text-amber-300 dark:group-hover:bg-amber-400/20">${icon.arrowRight('h-3.5 w-3.5')}</span>
  </button>`
}

function manageTile(opts) {
  const { id, title, subtitle, iconHtml, iconBg } = opts
  return `<button type="button" data-overview-card="${id}" class="group flex w-full items-center gap-3.5 rounded-2xl border border-gray-200/70 bg-white/95 p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300/80 hover:shadow-[0_4px_20px_rgba(15,23,42,0.08)] active:scale-[0.99] dark:border-slate-700/50 dark:bg-slate-900/60 dark:hover:border-slate-600/70 dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)] ${DASH_FOCUS}">
    <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-black/[0.04] transition-transform duration-200 group-hover:scale-105 dark:ring-white/[0.06] ${iconBg}">${iconHtml}</div>
    <div class="min-w-0 flex-1">
      <p class="text-[15px] font-semibold leading-snug ${DASH_TEXT}">${title}</p>
      ${subtitle ? `<p class="mt-0.5 text-xs leading-relaxed ${DASH_MUTED}">${subtitle}</p>` : ''}
    </div>
    <span class="text-gray-300 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-slate-600">${icon.arrowRight('h-4 w-4 shrink-0')}</span>
  </button>`
}

function drawerNavItem(tabId, label, current) {
  const active = tabId === current
  return `<button type="button" data-dash-tab="${tabId}" class="flex w-full items-center gap-3 rounded-xl py-2.5 pl-3 pr-3 text-left text-[15px] font-medium transition-all duration-200 ${DASH_FOCUS} ${
    active
      ? 'border-l-[3px] border-amber-400 bg-gradient-to-r from-amber-400/15 to-transparent pl-[calc(0.75rem-3px)] font-semibold text-amber-200'
      : 'border-l-[3px] border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
  }">${escapeHtml(label)}</button>`
}

function renderDrawer(td, currentTab, companyName, avail, open) {
  const workspace = [
    { id: 'overview', label: td.tabOverview },
    { id: 'cars', label: td.tabCars },
    { id: 'pricing', label: td.tabPricing },
    { id: 'essential', label: td.tabEssential },
  ]
  const operations = [
    { id: 'drivers', label: td.tabDrivers },
    { id: 'ride-requests', label: td.tabRides },
    { id: 'license', label: td.tabLicense },
  ]
  const availLabel =
    avail === 'available' ? td.availAvailable : avail === 'busy' ? td.availBusy : td.availOffline

  return `<div id="dash-drawer-root" class="${open ? '' : 'pointer-events-none'}">
    <div id="dash-drawer-backdrop" class="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}" aria-hidden="true"></div>
    <aside id="dash-drawer" class="fixed left-0 top-0 z-50 flex h-full w-[min(100%,19rem)] flex-col border-r border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900 to-[#0a0f1a] shadow-[4px_0_48px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? 'translate-x-0' : '-translate-x-full'}" aria-label="${escapeHtml(td.drawerNavLabel)}">
      <div class="border-b border-slate-800/90 px-5 py-5">
        <p class="text-[11px] font-bold tracking-[0.18em] text-amber-400">TAXIO</p>
        <p class="mt-1.5 truncate text-lg font-bold tracking-tight text-white">${escapeHtml(companyName)}</p>
        <p class="mt-0.5 text-sm text-slate-500">${escapeHtml(td.dashOperatorLabel)}</p>
      </div>
      <nav class="flex-1 overflow-y-auto px-3 py-5">
        <p class="mb-2.5 px-3 text-xs font-semibold text-slate-500">${escapeHtml(td.drawerWorkspace)}</p>
        <div class="space-y-0.5">${workspace.map((item) => drawerNavItem(item.id, item.label, currentTab)).join('')}</div>
        <p class="mb-2.5 mt-6 px-3 text-xs font-semibold text-slate-500">${escapeHtml(td.drawerOperations)}</p>
        <div class="space-y-0.5">${operations.map((item) => drawerNavItem(item.id, item.label, currentTab)).join('')}</div>
      </nav>
      <div class="space-y-3 border-t border-slate-800/90 p-5">
        <label class="block">
          <span class="mb-2 block text-xs font-semibold text-slate-500">${escapeHtml(td.availLabel)}</span>
          <select id="co-avail" class="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 px-3.5 py-2.5 text-sm font-medium text-slate-100 shadow-inner transition-colors focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/30">
            <option value="available" ${avail === 'available' ? 'selected' : ''}>● ${td.availAvailable}</option>
            <option value="busy" ${avail === 'busy' ? 'selected' : ''}>${td.availBusy}</option>
            <option value="offline" ${avail === 'offline' ? 'selected' : ''}>${td.availOffline}</option>
          </select>
        </label>
        <button type="button" id="co-logout" class="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/50 px-3.5 py-2.5 text-sm font-semibold text-slate-300 transition-all duration-200 hover:border-slate-600 hover:bg-slate-800 hover:text-white active:scale-[0.98] ${DASH_FOCUS}">${icon.logOut('h-4 w-4')}${td.logout}</button>
      </div>
    </aside>
  </div>`
}

function renderQrSheet(td, bookPublicUrl, bookingQrSrc, open) {
  return `<div id="dash-qr-sheet" class="fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none hidden'}" role="dialog" aria-modal="true" aria-label="${escapeHtml(td.shareQrTitle)}">
    <div id="dash-qr-backdrop" class="absolute inset-0 bg-slate-950/60 backdrop-blur-[3px] transition-opacity"></div>
    <div class="absolute bottom-0 left-0 right-0 mx-auto max-w-lg rounded-t-[1.75rem] border border-gray-200/70 bg-white/98 p-5 shadow-[0_-8px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/98 dark:shadow-[0_-12px_48px_rgba(0,0,0,0.5)] sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 dark:bg-slate-700" aria-hidden="true"></div>
      <div class="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold tracking-tight ${DASH_TEXT}">${escapeHtml(td.shareQrTitle)}</h2>
          <p class="mt-0.5 text-xs ${DASH_MUTED}">${escapeHtml(td.shareSubtitle)}</p>
        </div>
        <button type="button" id="dash-qr-close" class="${DASH_ICON_BTN} h-9 w-9" aria-label="${escapeHtml(td.closeQr)}">${icon.x('h-4 w-4')}</button>
      </div>
      <div class="flex flex-col items-center gap-4">
        <div class="rounded-2xl border border-gray-100/90 bg-gradient-to-b from-white to-gray-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_24px_rgba(15,23,42,0.06)] dark:border-slate-700/60 dark:from-slate-800 dark:to-slate-950">
          <img src="${escapeHtml(bookingQrSrc)}" width="200" height="200" alt="" class="h-44 w-44 rounded-xl sm:h-48 sm:w-48" loading="lazy" decoding="async" />
        </div>
        <div class="w-full">
          <p class="mb-1.5 text-xs font-medium ${DASH_MUTED}">${escapeHtml(td.bookingUrlLabel)}</p>
          <input type="text" readonly value="${escapeHtml(bookPublicUrl)}" id="dash-booking-url-field" class="w-full ${DASH_INPUT} px-3.5 py-2.5 text-xs sm:text-sm" />
        </div>
        <div class="flex w-full flex-col gap-2 sm:flex-row">
          <button type="button" data-dash-copy class="${DASH_BTN_PRIMARY} min-h-[44px] flex-1">${td.copyLink}</button>
          <a href="${escapeHtml(bookingQrSrc)}" download="taxio-booking-qr.png" target="_blank" rel="noopener noreferrer" class="${DASH_BTN_SECONDARY} min-h-[44px] flex-1 text-center">${td.downloadQr}</a>
        </div>
        <button type="button" data-setup-action="qr" class="w-full min-h-[44px] rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-amber-100/60 px-4 py-2.5 text-sm font-semibold text-amber-950 transition-all duration-200 hover:border-amber-300 hover:from-amber-100 active:scale-[0.98] dark:border-amber-500/25 dark:from-amber-950/40 dark:to-amber-900/20 dark:text-amber-200 dark:hover:border-amber-400/35 ${DASH_FOCUS}">${td.setupBtnQr}</button>
        <p id="dash-copy-feedback" class="hidden text-xs font-medium text-emerald-600 dark:text-emerald-400">${td.copied}</p>
      </div>
    </div>
  </div>`
}

function renderHeroCard(td, ctx) {
  const { progress, bookPublicUrl, availLabel, availDotClass } = ctx
  const pct = progress.percent
  const optionalItems = progress.items.filter((item) => item.key !== 'live')
  const pendingItems = optionalItems.filter((item) => !item.completed)
  const completedItems = [
    ...(progress.live ? [progress.items.find((i) => i.key === 'live')].filter(Boolean) : []),
    ...optionalItems.filter((item) => item.completed),
  ]
  const statusSummary = setupHealthStatusSummary(td, progress, pendingItems.length)

  const pendingHtml =
    pendingItems.length > 0
      ? `<div class="space-y-2">${pendingItems.map((item) => renderPendingTaskRow(td, item)).join('')}</div>`
      : `<p class="rounded-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50/90 to-white px-3.5 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-800/40 dark:from-emerald-950/40 dark:to-slate-900/40 dark:text-emerald-300">${escapeHtml(td.setupAllSet)}</p>`

  const completedHtml =
    completedItems.length > 0
      ? `<details class="group mt-3">
          <summary class="cursor-pointer text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-300">${escapeHtml(td.setupCompletedSection)} (${completedItems.length})</summary>
          <div class="mt-2.5 flex flex-wrap gap-2">${completedItems.map((item) => renderSetupActionCard(td, item, progress, 'completed')).join('')}</div>
        </details>`
      : ''

  return `<section id="dash-hero-card" class="${DASH_HERO} p-5 sm:p-6">
    <div class="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl dark:bg-amber-400/5" aria-hidden="true"></div>
    <button type="button" id="dash-qr-open" class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200/70 bg-white/90 text-amber-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-amber-300 hover:bg-amber-50 hover:shadow-md active:scale-[0.97] dark:border-amber-500/25 dark:bg-slate-800/90 dark:text-amber-300 dark:hover:bg-amber-950/50 ${DASH_FOCUS}" aria-label="${escapeHtml(td.shareQrTitle)}">${icon.qrCode('h-[18px] w-[18px]')}</button>
    <div class="relative flex items-start gap-4 pr-11 sm:pr-12">
      ${renderSetupHealthRing(pct, 'sm')}
      <div class="min-w-0 flex-1 pt-0.5">
        <p class="text-xs font-medium text-gray-500 dark:text-slate-400">${escapeHtml(td.setupHealthTitle)}</p>
        <p class="mt-1 text-lg font-bold leading-tight tracking-tight ${DASH_TEXT} sm:text-xl">${escapeHtml(statusSummary)}</p>
        <p class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gray-100/80 px-2.5 py-1 text-xs font-medium dark:bg-slate-800/80 ${availDotClass}">
          <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
          ${escapeHtml(availLabel)}
        </p>
      </div>
    </div>
    <div class="relative mt-4 rounded-xl border border-gray-100/90 bg-gray-50/60 px-3.5 py-2.5 dark:border-slate-700/50 dark:bg-slate-950/40">
      <p class="text-xs font-medium text-gray-500 dark:text-slate-500">${escapeHtml(td.bookingUrlLabel)}</p>
      <p class="mt-0.5 truncate font-mono text-xs text-gray-700 dark:text-slate-300 sm:text-sm">${escapeHtml(bookPublicUrl)}</p>
    </div>
    <div class="relative mt-4 flex flex-wrap gap-2">
      <button type="button" data-setup-action="preview" class="${DASH_BTN_PRIMARY} min-h-[44px] flex-1 sm:flex-none">${icon.eye('h-4 w-4')}${td.previewPage}</button>
      <button type="button" data-dash-copy-hero class="${DASH_BTN_SECONDARY} min-h-[44px] flex-1 sm:flex-none">${td.copyLink}</button>
    </div>
    <p id="dash-hero-copy-feedback" class="relative mt-2 hidden text-xs font-medium text-emerald-600 dark:text-emerald-400">${td.copied}</p>
    <div class="relative mt-5 border-t border-gray-100/90 pt-4 dark:border-slate-700/50">
      <p class="mb-2.5 text-xs font-semibold text-gray-600 dark:text-slate-400">${escapeHtml(td.setupNextActions)}</p>
      ${pendingHtml}
      ${completedHtml}
    </div>
  </section>`
}

function renderOverviewBody(td, ctx) {
  const { bookingStats } = ctx

  const activityHtml =
    bookingStats.total === 0
      ? `<p class="text-sm leading-relaxed ${DASH_MUTED}">${escapeHtml(td.requestsEmptyHint)}</p>`
      : `<div class="grid grid-cols-3 gap-2.5 sm:gap-3">
          <div class="rounded-xl border border-gray-100/90 bg-gradient-to-b from-gray-50/90 to-white px-2 py-3.5 text-center shadow-sm dark:border-slate-700/50 dark:from-slate-800/50 dark:to-slate-900/40">
            <p class="text-2xl font-bold tabular-nums tracking-tight ${DASH_TEXT}">${bookingStats.today}</p>
            <p class="mt-1 text-xs font-medium ${DASH_MUTED}">${escapeHtml(td.requestsToday)}</p>
          </div>
          <div class="rounded-xl border border-amber-200/60 bg-gradient-to-b from-amber-50/80 to-white px-2 py-3.5 text-center shadow-sm dark:border-amber-500/20 dark:from-amber-950/30 dark:to-slate-900/40">
            <p class="text-2xl font-bold tabular-nums tracking-tight text-amber-600 dark:text-amber-400">${bookingStats.pending}</p>
            <p class="mt-1 text-xs font-medium ${DASH_MUTED}">${escapeHtml(td.requestsPending)}</p>
          </div>
          <div class="rounded-xl border border-gray-100/90 bg-gradient-to-b from-gray-50/90 to-white px-2 py-3.5 text-center shadow-sm dark:border-slate-700/50 dark:from-slate-800/50 dark:to-slate-900/40">
            <p class="text-2xl font-bold tabular-nums tracking-tight ${DASH_TEXT}">${bookingStats.total}</p>
            <p class="mt-1 text-xs font-medium ${DASH_MUTED}">${escapeHtml(td.requestsTotal)}</p>
          </div>
        </div>`

  return `<div class="mx-auto max-w-3xl space-y-4 sm:space-y-5">
    ${renderHeroCard(td, ctx)}

    <section class="${DASH_CARD} p-5 sm:p-6">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-base font-bold tracking-tight ${DASH_TEXT}">${escapeHtml(td.todayActivityTitle)}</h2>
        <button type="button" data-overview-card="requests" class="rounded-lg px-2 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30 dark:hover:text-amber-300 ${DASH_FOCUS}">${escapeHtml(td.viewRequests)} →</button>
      </div>
      <div class="mt-3.5">${activityHtml}</div>
    </section>

    <section>
      <h2 class="mb-3 text-base font-semibold tracking-tight ${DASH_TEXT}">${escapeHtml(td.manageTitle)}</h2>
      <div class="grid gap-2.5 sm:grid-cols-2">
        ${manageTile({ id: 'add-car', title: td.cardAddCar, subtitle: td.carsSub, iconBg: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400', iconHtml: icon.plus('h-5 w-5') })}
        ${manageTile({ id: 'pricing', title: td.cardPricing, subtitle: td.qaPricingDesc, iconBg: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400', iconHtml: `<span class="text-lg font-bold">€</span>` })}
        ${manageTile({ id: 'customize', title: td.cardCustomize, subtitle: td.qaCompanyDesc, iconBg: 'bg-yellow-400/20 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300', iconHtml: icon.palette('h-5 w-5') })}
        ${manageTile({ id: 'company', title: td.cardEssential, subtitle: td.essentialSub, iconBg: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', iconHtml: icon.building2('h-5 w-5') })}
        ${manageTile({ id: 'vehicle-types', title: td.cardCarTypes, subtitle: td.pricingSub, iconBg: 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400', iconHtml: icon.car('h-5 w-5') })}
      </div>
    </section>
  </div>`
}

function computeBookingStats(bookings) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(todayStart)
  tomorrow.setDate(tomorrow.getDate() + 1)
  let today = 0
  let pending = 0
  for (const b of bookings) {
    const created = b.created_at ? new Date(b.created_at) : null
    if (created && created >= todayStart && created < tomorrow) today += 1
    if (String(b.status || 'new') === 'new') pending += 1
  }
  return { today, pending, total: bookings.length }
}

function fillDashTemplate(template, vars) {
  let s = String(template || '')
  for (const [key, val] of Object.entries(vars)) {
    s = s.split(`{${key}}`).join(String(val ?? ''))
  }
  return s
}


function setupActionButtonLabel(td, key) {
  const map = {
    pricing: td.setupBtnPricing,
    photo: td.setupBtnPhoto,
    motto: td.setupBtnMotto,
    whatsapp: td.setupBtnWhatsApp,
    preview: td.previewPage,
    qr: td.setupBtnQr,
  }
  return map[key] || td.setupStatusTodo
}

function setupItemActionId(item) {
  return item.actionId || item.key
}

function setupChipLabel(td, item) {
  const map = {
    live: td.setupChipLive,
    pricing: td.setupChipPricing,
    photo: td.setupChipPhoto,
    motto: td.setupChipMotto,
    whatsapp: td.setupChipWhatsApp,
    preview: td.setupChipPreview,
    qr: td.setupChipQr,
  }
  return map[item.key] || item.key
}

function setupHealthSubtitle(td, pct) {
  if (pct >= 100) return td.setupHealthCompleteLine
  if (pct <= 55) return td.setupHealthDefaultLine
  return td.setupHealthProgressLine
}

function renderSetupHealthRing(pct, size = 'md') {
  const dark = isPublicDarkMode()
  const track = dark ? '#1e293b' : '#e8eaee'
  const glow = dark ? 'shadow-[0_0_24px_rgba(250,204,21,0.12)]' : 'shadow-[0_0_20px_rgba(250,204,21,0.22)]'
  const textCls = dark ? 'text-slate-50' : 'text-gray-900'
  const mutedCls = dark ? 'text-slate-500' : 'text-gray-400'
  const dim =
    size === 'sm'
      ? `relative h-[4.5rem] w-[4.5rem] shrink-0 rounded-full bg-white/60 ring-1 ring-gray-200/60 dark:bg-slate-800/40 dark:ring-slate-700/50 ${glow}`
      : `relative h-[5.5rem] w-[5.5rem] shrink-0 rounded-full sm:h-24 sm:w-24 ${glow}`
  const pctCls = size === 'sm' ? 'text-xl font-bold' : 'text-2xl font-bold sm:text-[1.65rem]'
  return `<div class="${dim}" aria-hidden="true">
    <svg class="h-full w-full -rotate-90" viewBox="0 0 36 36">
      <defs>
        <linearGradient id="dash-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fde047" />
          <stop offset="100%" stop-color="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="15.915" fill="none" stroke="${track}" stroke-width="2.75" />
      <circle cx="18" cy="18" r="15.915" fill="none" stroke="url(#dash-ring-grad)" stroke-width="2.75"
        stroke-dasharray="${pct} ${100 - pct}" pathLength="100" stroke-linecap="round"
        class="transition-all duration-700 ease-out" />
    </svg>
    <span class="absolute inset-0 flex flex-col items-center justify-center ${textCls}">
      <span class="${pctCls} leading-none tracking-tight tabular-nums">${pct}</span>
      <span class="mt-0.5 text-[10px] font-semibold ${mutedCls}">%</span>
    </span>
  </div>`
}

function renderSetupActionCard(td, item, progress, variant) {
  const action = setupItemActionId(item)
  if (variant === 'pending') {
    const pillLabel = setupActionButtonLabel(td, action)
    return `<button type="button" data-setup-action="${escapeHtml(action)}"
      class="inline-flex items-center gap-2 rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50 to-amber-100/60 px-4 py-2.5 text-sm font-semibold text-amber-950 shadow-sm transition hover:border-amber-300 hover:from-amber-100 hover:to-amber-50 hover:shadow-md active:scale-[0.98] dark:border-amber-500/30 dark:from-amber-950/40 dark:to-amber-900/20 dark:text-amber-100 dark:hover:border-amber-400/40">
      <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
      ${escapeHtml(pillLabel)}
    </button>`
  }
  const label = setupChipLabel(td, item)
  return `<button type="button" data-setup-action="${escapeHtml(action)}"
    title="${escapeHtml(td.setupEdit)}"
    class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50/90 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/70 transition hover:bg-emerald-100 hover:ring-emerald-300 active:scale-[0.98] dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/60 dark:hover:bg-emerald-900/50">
    ${escapeHtml(label)}
    <span class="text-emerald-600">${icon.check('h-3 w-3')}</span>
  </button>`
}

export async function mountDashboardCompany(root) {
  syncDocumentLang(getLocale())
  syncPublicThemeClass()
  const dashDark = isPublicDarkMode()
  const loadLang = getLocale()
  root.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center bg-[#eef0f3] dark:bg-slate-950">
      <div class="h-10 w-10 animate-pulse rounded-full border-2 border-gray-300 border-t-yellow-500 dark:border-slate-600 dark:border-t-amber-400"></div>
      <p class="mt-3 text-sm text-gray-500 dark:text-slate-400">${tDashboard(loadLang).loading}</p>
    </div>`

  const session = await getSession()
  if (!session) {
    navigate('/login/company')
    return
  }
  const profile = await getMyProfile(session.user.id)
  if (profile?.first_login_required) {
    navigate('/change-password/company')
    return
  }

  if (profile?.company_onboarding_completed === false) {
    navigate('/onboarding/company')
    return
  }

  const company = await getCompanyForUser(session.user.id)
  if (!company) {
    navigate('/register')
    return
  }
  if (company.status === 'pending') {
    navigate('/pending-approval')
    return
  }
  if (company.status === 'suspended') {
    navigate('/pending-approval')
    return
  }
  if (company.status === 'rejected') {
    navigate('/pending-approval')
    return
  }

  let cars = []
  let bookings = []
  try {
    cars = await listCarsForCompany(company.id)
  } catch {
    cars = []
  }
  try {
    bookings = await listBookingRequestsForCompany(company.id)
  } catch {
    bookings = []
  }

  const dashLang = getLocale()
  const td = tDashboard(dashLang)

  const vatLine = company.vat_number
    ? `${td.vatLine} ${escapeHtml(company.vat_number)}`
    : `${td.vatLine} —`
  const bookPublicUrl = absolutePublicBookingUrl(company.slug)
  const bookingQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(bookPublicUrl)}`
  let previewDone = false
  let qrRequested = false
  try {
    if (typeof localStorage !== 'undefined') {
      previewDone = localStorage.getItem(SETUP_PREVIEW_STORAGE_KEY(company.id)) === '1'
      qrRequested = localStorage.getItem(SETUP_QR_STORAGE_KEY(company.id)) === '1'
    }
  } catch {
    /* private mode */
  }
  const setupProgress = calculateCompanySetupProgress(company, {
    previewDone,
    qrRequested,
    bookingUrl: bookPublicUrl,
  })
  const bookingStats = computeBookingStats(bookings)
  const pricing = pricingOf(company)
  const avail = company.availability_status || 'available'
  const pricingStatus = setupProgress.pricingConfigured
    ? setupProgress.pricingSummary
    : td.qaPricingDefault
  const availLabel =
    avail === 'available' ? td.availAvailable : avail === 'busy' ? td.availBusy : td.availOffline
  const availDotClass =
    avail === 'available'
      ? 'text-emerald-600 dark:text-emerald-400'
      : avail === 'busy'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-gray-500 dark:text-slate-400'
  const logoRaw = String(company.logo_url || '').trim()
  const logoOk = /^https?:\/\//i.test(logoRaw)
  const logoSrcEsc = logoOk ? escapeHtml(logoRaw) : ''

  let bodyHtml = ''
  const t = dashState.tab

  if (t === 'overview') {
    bodyHtml = renderOverviewBody(td, {
      progress: setupProgress,
      bookPublicUrl,
      bookingQrSrc,
      avail,
      availLabel,
      availDotClass,
      bookingStats,
      pricingStatus,
      carCount: cars.length,
    })
  } else if (t === 'cars') {
    const rows =
      cars.length === 0
        ? `<p class="py-8 text-center text-sm text-gray-500">${td.noCars}</p>`
        : cars
            .map(
              (c) => `
      <div class="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
          ${icon.car('h-6 w-6')}
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-bold text-gray-900 dark:text-slate-100">${escapeHtml(c.model)}</p>
          <p class="text-xs text-gray-600 dark:text-slate-400">${escapeHtml(c.license_plate)} · ${escapeHtml(String(c.year || ''))}${c.driver_name ? ` · ${escapeHtml(c.driver_name)}` : ''}</p>
        </div>
        <span class="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-bold text-gray-900">${escapeHtml(c.car_type)}</span>
        <button type="button" data-edit-car="${escapeHtml(c.id)}" class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
          ${icon.pencil('h-3.5 w-3.5')}
          ${td.edit}
        </button>
      </div>`
            )
            .join('')
    bodyHtml = `
      <div class="${DASH_PANEL}">
        <h2 class="text-lg font-bold ${DASH_TEXT}">${td.carsHead}</h2>
        <p class="text-sm ${DASH_MUTED}">${td.carsSub}</p>
        <div class="mt-6 space-y-3">${rows}</div>
        <button type="button" id="open-add-car" class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3.5 text-sm font-bold text-gray-900 shadow hover:bg-yellow-500">
          ${icon.plus('h-5 w-5')}
          ${td.addCar}
        </button>
      </div>`
  } else if (t === 'pricing') {
    const hourly = companyHourlyFromRecord(company)
    bodyHtml = `
      <div class="space-y-6">
        <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-md dark:border-slate-700/60 dark:bg-slate-800/90">
          <h2 class="text-lg font-bold ${DASH_TEXT}">${td.pricingHead}</h2>
          <p class="text-sm ${DASH_MUTED}">${td.pricingSub}</p>
          <p class="mt-1 text-xs ${DASH_MUTED}">${escapeHtml(td.pricingCarTypesHint)}</p>
          <div id="pricing-form-mount" class="mt-6 space-y-4"></div>
          <button type="button" id="save-pricing" class="mt-6 w-full rounded-xl bg-yellow-400 py-3.5 text-sm font-bold text-gray-900 shadow hover:bg-yellow-500">${td.savePricing}</button>
        </div>
        <div class="${DASH_PANEL}">
          <h2 class="text-lg font-bold ${DASH_TEXT}">${escapeHtml(td.hourlyHead)}</h2>
          <p class="text-sm leading-relaxed ${DASH_MUTED}">${escapeHtml(td.hourlySub)}</p>
          <div class="mt-6 space-y-4">
            <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
              <input type="checkbox" id="dash-hourly-enabled" class="mt-1 h-5 w-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400" ${hourly.enabled ? 'checked' : ''} />
              <span class="text-sm font-semibold text-gray-900">${escapeHtml(td.hourlyEnable)}</span>
            </label>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="text-xs font-semibold text-gray-500" for="dash-hourly-rate">${escapeHtml(td.hourlyRateLabel)}</label>
                <input type="number" id="dash-hourly-rate" min="1" step="1" value="${escapeHtml(String(hourly.rateEur))}" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-500" for="dash-hourly-min">${escapeHtml(td.hourlyMinLabel)}</label>
                <input type="number" id="dash-hourly-min" min="1" step="1" value="${escapeHtml(String(hourly.minHours))}" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
          <p id="dash-hourly-status" class="${hourly.enabled ? '' : 'hidden '}mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800" role="status">${hourly.enabled ? escapeHtml(td.hourlySavedOn) : ''}</p>
          <button type="button" id="save-hourly" class="mt-4 w-full rounded-xl border-2 border-gray-900 bg-gray-900 py-3.5 text-sm font-bold text-white shadow hover:bg-gray-800">${escapeHtml(td.saveHourly)}</button>
        </div>
      </div>`
  } else if (t === 'essential') {
    const enabledTypeBadges = resolveEnabledBookingCarTypes(company)
      .map(
        (tName) =>
          `<span class="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-gray-900">${escapeHtml(tName)}</span>`
      )
      .join('')
    const slogan = company.slogan || 'Fast & Reliable Service'
    const logoPreviewInner = logoOk
      ? `<img id="dash-logo-preview-img" src="${logoSrcEsc}" alt="" class="h-full w-full object-cover" decoding="async" />`
      : `<div class="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500">${icon.building2('h-10 w-10')}</div>`
    bodyHtml = `
      <div class="${DASH_PANEL}">
        <h2 class="text-lg font-bold ${DASH_TEXT}">${td.essentialHead}</h2>
        <p class="text-sm ${DASH_MUTED}">${td.essentialSub}</p>
        <div class="mt-6 space-y-4">
          <div class="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div class="flex shrink-0 justify-center sm:justify-start">
                <div id="dash-logo-preview-wrap" class="relative flex h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-inner">
                  ${logoPreviewInner}
                </div>
              </div>
              <div class="min-w-0 flex-1 space-y-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">${escapeHtml(td.logoHead)}</p>
                <p class="text-sm leading-relaxed text-gray-600">${escapeHtml(td.logoSub)}</p>
                <div class="flex flex-wrap items-center gap-2 pt-1">
                  <input type="file" id="dash-logo-input" accept="image/jpeg,image/png,image/webp" class="sr-only" />
                  <label for="dash-logo-input" class="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-gray-900 shadow hover:bg-yellow-500">${escapeHtml(td.logoChoose)}</label>
                  ${
                    logoOk
                      ? `<button type="button" id="dash-logo-remove" class="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">${escapeHtml(td.logoRemove)}</button>`
                      : ''
                  }
                </div>
                <p class="text-xs text-gray-400">${escapeHtml(td.logoHint)}</p>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <div class="flex items-start gap-3">
              <span class="text-emerald-600">${icon.helpCircle('h-5 w-5')}</span>
              <div>
                <p class="text-xs text-gray-500">${td.companyName}</p>
                <p class="font-bold text-gray-900">${escapeHtml(company.name)}</p>
              </div>
            </div>
            <button type="button" data-edit-field="name" class="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">${icon.pencil('h-3 w-3')}${td.edit}</button>
          </div>
          <div class="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <div>
              <p class="text-xs text-gray-500">${td.slogan}</p>
              <p class="font-bold text-gray-900">${escapeHtml(slogan)}</p>
            </div>
            <button type="button" data-edit-field="slogan" class="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">${icon.pencil('h-3 w-3')}${td.edit}</button>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl border border-gray-100 bg-white p-4">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-gray-500">${td.phone}</p>
                  <p class="mt-1 text-sm font-semibold text-gray-900">${escapeHtml(company.phone || '—')}</p>
                </div>
                <span class="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Locked</span>
              </div>
              <p class="mt-2 text-[11px] text-gray-400">${td.lockedHint}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-white p-4">
              <p class="text-xs text-gray-500">${td.email}</p>
              <p class="mt-1 text-sm font-semibold text-gray-900 break-all">${escapeHtml(company.email)}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-white p-4">
              <p class="text-xs text-gray-500">${td.city}</p>
              <p class="mt-1 text-sm font-semibold text-gray-900">${escapeHtml(company.city || '—')}</p>
            </div>
          </div>
          <div class="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs text-gray-500">${td.vatLine}</p>
                <p class="font-bold text-gray-900">${escapeHtml(company.vat_number || '—')}</p>
              </div>
              <span class="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500">Locked</span>
            </div>
            <p class="mt-2 text-[11px] text-gray-400">${td.lockedHintVat}</p>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <div>
              <p class="text-xs text-gray-500 mb-2">${td.carTypes}</p>
              <div class="flex flex-wrap gap-2">${enabledTypeBadges || `<span class="text-xs font-semibold text-gray-500">${escapeHtml(td.noCars)}</span>`}</div>
            </div>
            <button type="button" data-edit-field="contact" class="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">${icon.pencil('h-3 w-3')}${td.edit}</button>
          </div>
        </div>
      </div>`
  } else if (t === 'drivers') {
    bodyHtml = `
      <div class="${DASH_PANEL} text-center">
        <p class="font-semibold ${DASH_TEXT}">${td.driversHead}</p>
        <p class="mt-2 text-sm ${DASH_MUTED}">${td.driversSub}</p>
      </div>`
  } else if (t === 'ride-requests') {
    const filtered = [...bookings]
    bodyHtml = `
      <div class="${DASH_PANEL}">
        <h2 class="text-lg font-bold ${DASH_TEXT}">${td.ridesHead}</h2>
        <p class="text-sm ${DASH_MUTED}">${td.ridesSub}</p>
        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="search" id="ride-search" placeholder="${escapeHtml(td.ridesSearch)}" class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm" />
          <button type="button" disabled title="Coming soon" class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-400">
            ${td.exportSoon}
          </button>
        </div>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th class="py-3 pr-4">${td.thPassenger}</th>
                <th class="py-3 pr-4">${td.thFrom}</th>
                <th class="py-3 pr-4">${td.thTo}</th>
                <th class="py-3 pr-4">${td.thWhen}</th>
                <th class="py-3">${td.thActions}</th>
              </tr>
            </thead>
            <tbody id="ride-tbody">
              ${filtered
                .map((b) => {
                  const wa = company.phone
                    ? `https://wa.me/${String(company.phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Regarding booking from ${b.pickup_address}`)}`
                    : ''
                  const em = `mailto:${encodeURIComponent(company.email)}?subject=${encodeURIComponent('Booking')}&body=${encodeURIComponent(`Passenger: ${b.customer_name || '—'}\nFrom: ${b.pickup_address}\nTo: ${b.dropoff_address}`)}`
                  return `
                <tr class="border-b border-gray-100 ride-row" data-search="${escapeHtml(`${b.customer_name} ${b.pickup_address} ${b.dropoff_address} ${b.ride_datetime}`.toLowerCase())}">
                  <td class="py-3 pr-4 font-medium text-gray-900">${escapeHtml(b.customer_name || '—')}</td>
                  <td class="py-3 pr-4 text-gray-600">${escapeHtml(b.pickup_address)}</td>
                  <td class="py-3 pr-4 text-gray-600">${escapeHtml(b.dropoff_address)}</td>
                  <td class="py-3 pr-4 whitespace-nowrap text-gray-600">${escapeHtml(formatDateTime(b.ride_datetime))}</td>
                  <td class="py-3">
                    <div class="flex flex-wrap gap-2">
                      <a href="${wa ? escapeHtml(wa) : '#'}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50 ${!company.phone ? 'pointer-events-none opacity-40' : ''}">${icon.messageCircle('h-3.5 w-3.5')}${td.wa}</a>
                      <a href="${escapeHtml(em)}" class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50">${icon.mail('h-3.5 w-3.5')}${td.mail}</a>
                    </div>
                  </td>
                </tr>`
                })
                .join('')}
            </tbody>
          </table>
          ${filtered.length === 0 ? `<p class="py-8 text-center text-sm text-gray-500">${td.noRides}</p>` : ''}
        </div>
      </div>`
  } else if (t === 'license') {
    const plan = company.subscription_plan === 'premium' ? 'Premium' : 'Basic'
    bodyHtml = `
      <div class="${DASH_PANEL}">
        <h2 class="text-lg font-bold ${DASH_TEXT}">${td.licenseHead}</h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-slate-300"><span class="rounded-full bg-gray-900 px-3 py-0.5 text-xs font-bold text-white dark:bg-amber-400 dark:text-gray-900">${plan}</span></p>
        <p class="mt-4 text-sm ${DASH_MUTED}">${td.licenseSub}</p>
      </div>`
  }

  root.innerHTML = `
    <div class="${DASH_SHELL}">
      ${renderDrawer(td, t, company.name, avail, dashState.drawerOpen)}
      <header class="${DASH_HEADER} sticky top-0 z-30">
        <div class="mx-auto flex h-[3.25rem] max-w-6xl items-center justify-between gap-1.5 px-3 sm:h-14 sm:gap-2 sm:px-4">
          <button type="button" id="dash-menu-btn" class="${DASH_ICON_BTN} h-10 w-10" aria-label="${escapeHtml(dashState.drawerOpen ? td.closeMenu : td.openMenu)}">${icon.menu('h-5 w-5')}</button>
          <div class="min-w-0 flex-1 px-1 text-center sm:px-2">
            <p class="text-[10px] font-semibold tracking-wide text-amber-600 dark:text-amber-400 sm:text-[11px]">${escapeHtml(td.dashOperatorLabel)}</p>
            <p class="truncate text-sm font-bold leading-tight tracking-tight ${DASH_TEXT}">${escapeHtml(company.name)}</p>
          </div>
          <div class="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <div class="flex rounded-full border border-gray-200/80 bg-white/90 p-0.5 shadow-sm dark:border-slate-600/60 dark:bg-slate-800/90">
              ${['nl', 'fr', 'en']
                .map(
                  (lc) =>
                    `<button type="button" data-dash-lang="${lc}" class="rounded-full px-1.5 py-1 text-[10px] font-bold transition-colors sm:px-2 sm:py-1 sm:text-xs ${dashLang === lc ? 'bg-gray-900 text-white shadow-sm dark:bg-amber-400 dark:text-gray-900' : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-700'} ${DASH_FOCUS}">${lc.toUpperCase()}</button>`
                )
                .join('')}
            </div>
            <button type="button" id="co-toggle-dark" class="${DASH_ICON_BTN} h-9 w-9" title="${escapeHtml(td.themeToggle)}" aria-label="${escapeHtml(td.themeToggle)}">
              ${dashDark ? icon.moon('h-4 w-4') : icon.sun('h-4 w-4')}
            </button>
            <button type="button" data-help class="${DASH_ICON_BTN} h-9 w-9" aria-label="${escapeHtml(td.help)}">${icon.helpCircle('h-4 w-4')}</button>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <p id="dash-msg" class="mb-4 hidden rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"></p>
        ${bodyHtml}
      </main>

      <footer class="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-gray-500 dark:text-slate-500">
        <p>© 2026 TAXIO</p>
        <p class="mt-2">
          <a href="/terms" class="font-medium text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-gray-900 dark:text-slate-300 dark:decoration-slate-600 dark:hover:text-white">${translations[dashLang]?.footerTerms || 'Terms'}</a>
        </p>
        <p class="mt-2 font-medium text-amber-700/90 dark:text-amber-400/90">${td.footerPowered}</p>
      </footer>

      ${renderQrSheet(td, bookPublicUrl, bookingQrSrc, dashState.qrOpen)}
      <div id="dash-modal-root"></div>
    </div>`

  root.querySelectorAll('[data-dash-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      dashState.tab = btn.getAttribute('data-dash-tab')
      dashState.modal = null
      dashState.drawerOpen = false
      mountDashboardCompany(root)
    })
  })

  root.querySelector('#dash-menu-btn')?.addEventListener('click', () => {
    dashState.drawerOpen = !dashState.drawerOpen
    mountDashboardCompany(root)
  })

  root.querySelector('#dash-drawer-backdrop')?.addEventListener('click', () => {
    dashState.drawerOpen = false
    mountDashboardCompany(root)
  })

  root.querySelector('#dash-qr-open')?.addEventListener('click', () => {
    dashState.qrOpen = true
    mountDashboardCompany(root)
  })

  root.querySelector('#dash-qr-close')?.addEventListener('click', () => {
    dashState.qrOpen = false
    mountDashboardCompany(root)
  })

  root.querySelector('#dash-qr-backdrop')?.addEventListener('click', () => {
    dashState.qrOpen = false
    mountDashboardCompany(root)
  })

  root.querySelector('#co-toggle-dark')?.addEventListener('click', () => {
    setPublicDarkMode(!isPublicDarkMode())
    syncPublicThemeClass()
    mountDashboardCompany(root)
  })

  root.querySelector('#co-logout')?.addEventListener('click', async () => {
    await signOutEverywhere()
    navigate('/')
  })

  root.querySelector('[data-help]')?.addEventListener('click', () => {
    navigate('/contact')
  })

  root.querySelectorAll('[data-dash-lang]').forEach((b) => {
    b.addEventListener('click', () => {
      const lc = b.getAttribute('data-dash-lang')
      if (lc) setLocale(lc)
      mountDashboardCompany(root)
    })
  })

  function handleSetupAction(action) {
    const locale = dashLang
    if (action === 'pricing') {
      dashState.tab = 'pricing'
      dashState.drawerOpen = false
      mountDashboardCompany(root)
      return
    }
    if (action === 'photo' || action === 'motto' || action === 'whatsapp') {
      dashState.tab = 'essential'
      dashState.drawerOpen = false
      mountDashboardCompany(root)
      return
    }
    if (action === 'preview') {
      try {
        localStorage.setItem(SETUP_PREVIEW_STORAGE_KEY(company.id), '1')
      } catch {
        /* ignore */
      }
      window.open(bookPublicUrl, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => mountDashboardCompany(root), 400)
      return
    }
    if (action === 'qr') {
      try {
        localStorage.setItem(SETUP_QR_STORAGE_KEY(company.id), '1')
      } catch {
        /* ignore */
      }
      const url = buildQrStickersWaUrl({
        companyName: company.name,
        bookingUrl: bookPublicUrl,
        locale,
      })
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => mountDashboardCompany(root), 400)
      return
    }
    if (action === 'support') {
      const url = buildTaxioSupportWaUrl({
        companyName: company.name,
        bookingUrl: bookPublicUrl,
        locale,
      })
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  root.onclick = (e) => {
    const el = e.target.closest('[data-setup-action]')
    if (!el) return
    e.preventDefault()
    handleSetupAction(el.getAttribute('data-setup-action'))
  }

  async function copyBookingUrl(feedbackId) {
    const el = root.querySelector('#dash-booking-url-field')
    const fb = feedbackId ? root.querySelector(feedbackId) : root.querySelector('#dash-copy-feedback')
    const url = el?.value || bookPublicUrl
    try {
      await navigator.clipboard.writeText(url)
      fb?.classList.remove('hidden')
      window.setTimeout(() => fb?.classList.add('hidden'), 2000)
    } catch {
      if (el) {
        el.removeAttribute('readonly')
        el.select()
        document.execCommand('copy')
        el.setAttribute('readonly', '')
      } else {
        await navigator.clipboard.writeText(url).catch(() => {})
      }
      fb?.classList.remove('hidden')
      window.setTimeout(() => fb?.classList.add('hidden'), 2000)
    }
  }

  root.querySelectorAll('[data-dash-copy]').forEach((btn) => {
    btn.addEventListener('click', () => copyBookingUrl())
  })

  root.querySelector('[data-dash-copy-hero]')?.addEventListener('click', () => copyBookingUrl('#dash-hero-copy-feedback'))

  root.querySelector('#co-avail')?.addEventListener('change', async (e) => {
    const v = e.target.value
    const { error } = await updateCompanyByOwner(company.id, { availability_status: v })
    if (error) {
      const m = root.querySelector('#dash-msg')
      m.textContent = error.message
      m.classList.remove('hidden')
    } else {
      mountDashboardCompany(root)
    }
  })

  root.querySelectorAll('[data-overview-card]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-overview-card')
      if (id === 'requests') {
        dashState.tab = 'ride-requests'
        dashState.drawerOpen = false
        mountDashboardCompany(root)
        return
      }
      if (id === 'add-car') {
        dashState.tab = 'cars'
        dashState.modal = 'add-car'
        dashState.drawerOpen = false
        mountDashboardCompany(root)
        return
      }
      if (id === 'pricing' || id === 'vehicle-types') {
        dashState.tab = 'pricing'
        dashState.drawerOpen = false
        mountDashboardCompany(root)
        return
      }
      if (id === 'company' || id === 'customize') {
        dashState.tab = 'essential'
        dashState.drawerOpen = false
        mountDashboardCompany(root)
        return
      }
      if (id === 'help') {
        handleSetupAction('support')
      }
    })
  })

  if (t === 'pricing') {
    const mount = root.querySelector('#pricing-form-mount')

    function syncPricingFieldPanels() {
      BOOKING_CAR_TYPE_ORDER.forEach((name) => {
        const on = !!root.querySelector(`[data-pricing-enable="${name}"]`)?.checked
        const panel = root.querySelector(`[data-pricing-fields="${name}"]`)
        if (!panel) return
        panel.classList.toggle('hidden', !on)
        panel.querySelectorAll('input[data-pcat]').forEach((inp) => {
          inp.disabled = !on
        })
      })
    }

    if (mount) {
      mount.innerHTML = BOOKING_CAR_TYPE_ORDER.map((name) => {
        const p = pricingRowForType(company.pricing, name) || { enabled: false, ...DEFAULT_PRICING[name] }
        const enabled = p.enabled === true
        return `
        <div class="rounded-xl border border-gray-200 p-4">
          <label class="flex cursor-pointer items-center gap-3">
            <input type="checkbox" data-pricing-enable="${name}" class="h-5 w-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400" ${enabled ? 'checked' : ''} />
            <span class="text-base font-bold text-gray-900">${escapeHtml(name)}</span>
          </label>
          <div data-pricing-fields="${name}" class="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label class="text-xs text-gray-500">Start</label>
              <input type="text" data-pcat="${name}" data-pfield="start" value="${escapeHtml(p.start)}" class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm" />
            </div>
            <div>
              <label class="text-xs text-gray-500">Per Km</label>
              <input type="text" data-pcat="${name}" data-pfield="per_km" value="${escapeHtml(p.per_km)}" class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm" />
            </div>
            <div>
              <label class="text-xs text-gray-500">Initial Km</label>
              <input type="text" data-pcat="${name}" data-pfield="initial_km" value="${escapeHtml(p.initial_km)}" class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm" />
            </div>
          </div>
        </div>`
      }).join('')
      BOOKING_CAR_TYPE_ORDER.forEach((name) => {
        root.querySelector(`[data-pricing-enable="${name}"]`)?.addEventListener('change', syncPricingFieldPanels)
      })
      syncPricingFieldPanels()
    }

    root.querySelector('#save-pricing')?.addEventListener('click', async () => {
      const next = {}
      let anyEnabled = false
      for (const name of BOOKING_CAR_TYPE_ORDER) {
        const cb = root.querySelector(`[data-pricing-enable="${name}"]`)
        const start = root.querySelector(`[data-pcat="${name}"][data-pfield="start"]`)?.value ?? ''
        const per_km = root.querySelector(`[data-pcat="${name}"][data-pfield="per_km"]`)?.value ?? ''
        const initial_km =
          root.querySelector(`[data-pcat="${name}"][data-pfield="initial_km"]`)?.value ?? ''
        const enabled = cb?.checked === true
        if (!enabled) continue
        anyEnabled = true
        next[name] = { enabled: true, start, per_km, initial_km }
      }
      if (!anyEnabled) {
        const m = root.querySelector('#dash-msg')
        m.className = 'mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
        m.textContent = 'Please enable at least one vehicle type.'
        m.classList.remove('hidden')
        return
      }
      const existing =
        company.pricing && typeof company.pricing === 'object' ? company.pricing : {}
      if (existing.__hourly) next.__hourly = existing.__hourly

      const { error } = await updateCompanyByOwner(company.id, { pricing: next })
      const m = root.querySelector('#dash-msg')
      if (error) {
        m.className = 'mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
        m.textContent = error.message
        m.classList.remove('hidden')
      } else {
        m.className = 'mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800'
        m.textContent = td.pricingSaved
        m.classList.remove('hidden')
        dashState.tab = 'pricing'
        setTimeout(() => mountDashboardCompany(root), 500)
      }
    })

    root.querySelector('#save-hourly')?.addEventListener('click', async () => {
      const enabled = !!root.querySelector('#dash-hourly-enabled')?.checked
      const rateEur = Number(root.querySelector('#dash-hourly-rate')?.value)
      const minHours = parseInt(String(root.querySelector('#dash-hourly-min')?.value || ''), 10)
      const hourlyCfg = { enabled, rateEur, minHours }
      const pricingPatch = pricingWithHourlyEmbed(company.pricing, hourlyCfg)
      const { error } = await updateCompanyByOwner(company.id, {
        hourly_enabled: enabled,
        hourly_rate_eur: rateEur,
        hourly_min_hours: minHours,
        pricing: pricingPatch,
      })
      const m = root.querySelector('#dash-msg')
      const statusEl = root.querySelector('#dash-hourly-status')
      if (error) {
        m.className = 'mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
        m.textContent = error.message
        m.classList.remove('hidden')
        if (statusEl) statusEl.classList.add('hidden')
      } else {
        m.className = 'mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800'
        m.textContent = td.hourlySaveSuccess
        m.classList.remove('hidden')
        if (statusEl) {
          statusEl.textContent = enabled ? td.hourlySavedOn : td.hourlySavedOff
          statusEl.className =
            'mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800'
          statusEl.classList.remove('hidden')
        }
        dashState.tab = 'pricing'
        setTimeout(() => mountDashboardCompany(root), 500)
      }
    })
  }

  if (t === 'ride-requests') {
    root.querySelector('#ride-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase()
      root.querySelectorAll('.ride-row').forEach((tr) => {
        const hay = tr.getAttribute('data-search') || ''
        tr.style.display = !q || hay.includes(q) ? '' : 'none'
      })
    })
  }

  root.querySelector('.dash-header-logo-img')?.addEventListener('error', (e) => {
    const img = e.target
    img.classList.add('hidden')
    const fb = img.nextElementSibling
    if (fb?.classList.contains('dash-header-logo-fallback')) {
      fb.classList.remove('hidden')
      fb.classList.add('flex')
    }
  })

  if (t === 'essential') {
    const logoInput = root.querySelector('#dash-logo-input')
    const logoRemove = root.querySelector('#dash-logo-remove')
    logoInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      let objUrl = null
      const msgEl = root.querySelector('#dash-msg')
      try {
        objUrl = URL.createObjectURL(file)
        const wrap = root.querySelector('#dash-logo-preview-wrap')
        if (wrap) {
          wrap.innerHTML =
            '<img id="dash-logo-preview-img" alt="" class="h-full w-full object-cover" decoding="async" />'
          const im = wrap.querySelector('#dash-logo-preview-img')
          if (im) im.src = objUrl
        }
        const { error } = await uploadCompanyLogo(company.id, file)
        if (objUrl) URL.revokeObjectURL(objUrl)
        if (error) {
          if (msgEl) {
            msgEl.textContent = error.message
            msgEl.className =
              'mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
            msgEl.classList.remove('hidden')
          }
          mountDashboardCompany(root)
          return
        }
        mountDashboardCompany(root)
      } catch (err) {
        if (objUrl) URL.revokeObjectURL(objUrl)
        if (msgEl) {
          msgEl.textContent = err?.message || 'Upload failed.'
          msgEl.className =
            'mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
          msgEl.classList.remove('hidden')
        }
        mountDashboardCompany(root)
      }
    })
    logoRemove?.addEventListener('click', async () => {
      const msgEl = root.querySelector('#dash-msg')
      const { error } = await removeCompanyLogo(company.id)
      if (error) {
        if (msgEl) {
          msgEl.textContent = error.message
          msgEl.className =
            'mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
          msgEl.classList.remove('hidden')
        }
        return
      }
      mountDashboardCompany(root)
    })
  }

  root.querySelectorAll('[data-edit-field]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.getAttribute('data-edit-field')
      if (f === 'name') {
        const v = window.prompt('Company name', company.name)
        if (v == null) return
        updateCompanyByOwner(company.id, { name: v }).then(() => mountDashboardCompany(root))
      } else if (f === 'slogan') {
        const v = window.prompt('Slogan', company.slogan || '')
        if (v == null) return
        updateCompanyByOwner(company.id, { slogan: v }).then(() => mountDashboardCompany(root))
      } else if (f === 'contact') {
        const em = window.prompt('Email', company.email || '')
        if (em == null) return
        const city = window.prompt('City', company.city || '')
        if (city == null) return
        updateCompanyByOwner(company.id, { email: em, city }).then(() =>
          mountDashboardCompany(root)
        )
      }
    })
  })

  function openCarModal(editId) {
    const modalRoot = root.querySelector('#dash-modal-root')
    const edit = editId ? cars.find((c) => c.id === editId) : null
    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" id="car-modal-backdrop">
        <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div class="mb-4 flex items-start justify-between">
            <div>
              <h3 class="text-lg font-bold text-gray-900">${edit ? 'Edit Car' : 'Add Car'}</h3>
              <p class="text-sm text-gray-500">${edit ? 'Update vehicle details' : 'Add a new vehicle to your fleet'}</p>
            </div>
            <button type="button" id="car-modal-x" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100">${icon.x('h-5 w-5')}</button>
          </div>
          <form id="car-modal-form" class="space-y-4">
            <input type="hidden" name="car_id" value="${edit ? escapeHtml(edit.id) : ''}" />
            <div>
              <label class="text-sm font-semibold text-gray-900">Model</label>
              <input name="model" required class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Mercedes E-Class" value="${edit ? escapeHtml(edit.model) : ''}" />
            </div>
            <div>
              <label class="text-sm font-semibold text-gray-900">License Plate</label>
              <input name="license_plate" required class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="1-ABC-123" value="${edit ? escapeHtml(edit.license_plate) : ''}" />
            </div>
            <div>
              <label class="text-sm font-semibold text-gray-900">Year</label>
              <input name="year" type="number" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="2022" value="${edit ? escapeHtml(String(edit.year || '')) : ''}" />
            </div>
            <div>
              <label class="text-sm font-semibold text-gray-900">Car Type *</label>
              <select name="car_type" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                ${['Standard', 'Van', 'Luxury']
                  .map(
                    (o) =>
                      `<option value="${o}" ${edit && edit.car_type === o ? 'selected' : ''}>${o}</option>`
                  )
                  .join('')}
              </select>
            </div>
            <div>
              <label class="text-sm font-semibold text-gray-900">Driver name (optional)</label>
              <input name="driver_name" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="John Doe" value="${edit ? escapeHtml(edit.driver_name || '') : ''}" />
            </div>
            <button type="submit" class="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3.5 text-sm font-bold text-gray-900 shadow hover:bg-yellow-500">
              ${icon.plus('h-5 w-5')}
              ${edit ? 'Save Car' : 'Add Car'}
            </button>
          </form>
        </div>
      </div>`
    const close = () => {
      modalRoot.innerHTML = ''
      dashState.modal = null
    }
    modalRoot.querySelector('#car-modal-x')?.addEventListener('click', close)
    modalRoot.querySelector('#car-modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'car-modal-backdrop') close()
    })
    modalRoot.querySelector('#car-modal-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const carId = fd.get('car_id')
      const row = {
        company_id: company.id,
        model: fd.get('model'),
        license_plate: fd.get('license_plate'),
        year: fd.get('year') ? parseInt(fd.get('year'), 10) : null,
        car_type: fd.get('car_type'),
        driver_name: fd.get('driver_name') || null,
      }
      const { error } = carId
        ? await updateCar(carId, company.id, {
            model: row.model,
            license_plate: row.license_plate,
            year: row.year,
            car_type: row.car_type,
            driver_name: row.driver_name,
          })
        : await insertCar(row)
      if (!error) {
        close()
        mountDashboardCompany(root)
      } else {
        window.alert(error.message)
      }
    })
  }

  if (t === 'cars') {
    if (dashState.modal === 'add-car') {
      openCarModal(null)
      dashState.modal = null
    }
    root.querySelector('#open-add-car')?.addEventListener('click', () => openCarModal(null))
    root.querySelectorAll('[data-edit-car]').forEach((b) => {
      b.addEventListener('click', () => openCarModal(b.getAttribute('data-edit-car')))
    })
  }
}
