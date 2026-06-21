import { navigate } from '../nav.js'
import {
  getSession,
  listAllCompaniesForAdmin,
  approveCompany,
  rejectCompany,
  suspendCompany,
  reactivateCompany,
  countAllCarsAdmin,
  countCarsByCompanyIdsAdmin,
  listBookingRequestsForAdmin,
  listAbuseRateEventsForAdmin,
  setCompanySubscriptionPlan,
  updateCompanyAsAdmin,
  deleteCompanyAsAdmin,
  adminSendCommunicationEmail,
  devCleanupTestCompanies,
  fetchAdminCompanyAnalytics,
} from '../lib/api.js'
import { slugFromCompanyName } from '../lib/slug.js'
import { isPlatformAdmin, signOutEverywhere } from '../lib/auth.js'
import { escapeHtml } from '../lib/html.js'
import { icon } from '../lib/icons.js'
import { taxioLogoImg } from '../lib/taxioLogo.js'
import { absolutePublicBookingUrl } from '../lib/tenant.js'
import { getLocale } from '../lib/locale.js'
import { tAdminAnalytics, tAdminDashboard } from '../i18n.js'

const adminState = {
  tab: 'requests',
  editBaseline: null,
  analyticsRange: '30d',
  analyticsSort: 'whatsapp',
  activeSearch: '',
  analyticsSearch: '',
  /** approved | pending | inactive | all */
  commAudience: 'approved',
  commSelected: [],
  commSearch: '',
  commTemplate:
    'Hello {company_name},\n\nWe have an update for your TAXIO account.\nStatus: {status}\nCity: {city}\nBooking page: {booking_url}\nLogin: {login_url}',
  commSubject: 'Update from TAXIO',
  /** whatsapp | email */
  commChannel: 'whatsapp',
}
const TURNSTILE_SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()
const LOGIN_ACTION_URL = '/login/company'

const COMM_TEMPLATE_PRESETS = {
  welcome: `Hello {company_name},

Welcome to TAXIO — your partner platform is ready.

Company login: {login_url}
Public booking page: {booking_url}

If anything is unclear, reply to this message.

— TAXIO`,
  payment: `Hi {company_name},

This is a friendly reminder regarding your TAXIO subscription or invoice.

Status on file: {status}
Account login: {login_url}

Please let us know if you need an updated statement.

— TAXIO`,
  feature: `Hello {company_name},

We have a new feature on TAXIO we think you will find useful.

Log in to explore: {login_url}
Your booking link: {booking_url}

— TAXIO`,
  trial_end: `Hello {company_name},

Your trial or introductory period on TAXIO is ending soon.

Login to review your plan: {login_url}

Reply here if you need help.

— TAXIO`,
  missing_info: `Hello {company_name},

We need a few details to complete your TAXIO company profile.

Current status: {status}
City on file: {city}

Please reply with the missing information or use email if you prefer.

— TAXIO`,
  general: `Hello {company_name},

Quick update from TAXIO regarding your account.

Status: {status}
Booking page: {booking_url}
Login: {login_url}

— TAXIO`,
}

const COMM_PREVIEW_EMPTY_HTML = `<div class="flex min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-slate-600/80 bg-slate-900/40 px-5 py-10 text-center">
  <p class="text-sm font-medium text-slate-300">No recipient selected</p>
  <p class="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">Choose one or more companies from the list to preview merged variables and prepare your WhatsApp messages.</p>
</div>`

function admBtnSecondary(label, extra = '') {
  return `rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 ${extra}`
}

function admBtnDanger(label, extra = '') {
  return `rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-800 transition hover:bg-red-100 ${extra}`
}

function admBtnPrimary(label, extra = '') {
  return `inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 ${extra}`
}

function admSectionHeader(title, subtitle) {
  return `<div class="border-b border-slate-100 px-5 py-4 sm:px-6">
    <h2 class="text-base font-bold tracking-tight text-slate-900 sm:text-lg">${escapeHtml(title)}</h2>
    ${subtitle ? `<p class="mt-1 text-sm text-slate-500">${escapeHtml(subtitle)}</p>` : ''}
  </div>`
}

function admEmptyState(message, hint = '') {
  return `<div class="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">${icon.inbox('h-6 w-6')}</div>
    <p class="mt-4 text-sm font-medium text-slate-700">${escapeHtml(message)}</p>
    ${hint ? `<p class="mt-1 max-w-md text-xs leading-relaxed text-slate-500">${escapeHtml(hint)}</p>` : ''}
  </div>`
}

function admKpiCard({ label, value, helper, tone, iconName }) {
  const tones = {
    sky: 'from-sky-500/10 to-sky-500/5 border-sky-200/80 text-sky-700',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-200/80 text-emerald-700',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-200/80 text-amber-700',
    orange: 'from-orange-500/10 to-orange-500/5 border-orange-200/80 text-orange-700',
    violet: 'from-violet-500/10 to-violet-500/5 border-violet-200/80 text-violet-700',
  }
  const iconTones = {
    sky: 'bg-sky-500 text-white',
    emerald: 'bg-emerald-500 text-white',
    amber: 'bg-amber-500 text-white',
    orange: 'bg-orange-500 text-white',
    violet: 'bg-violet-500 text-white',
  }
  const iconFn = icon[iconName] || icon.building2
  return `<article class="rounded-2xl border bg-gradient-to-br ${tones[tone] || tones.sky} p-4 shadow-sm sm:p-5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-wide opacity-80">${escapeHtml(label)}</p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">${escapeHtml(String(value))}</p>
        ${helper ? `<p class="mt-1 text-xs text-slate-500">${escapeHtml(helper)}</p>` : ''}
      </div>
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconTones[tone] || iconTones.sky}">${iconFn('h-5 w-5')}</div>
    </div>
  </article>`
}

function admStatusBadgeHtml(status) {
  const label = statusLabel(status)
  const s = String(status || '').toLowerCase()
  let cls = 'bg-slate-100 text-slate-700 ring-slate-200'
  if (s === 'approved') cls = 'bg-emerald-100 text-emerald-800 ring-emerald-200'
  else if (s === 'pending') cls = 'bg-sky-100 text-sky-800 ring-sky-200'
  else if (s === 'suspended') cls = 'bg-amber-100 text-amber-800 ring-amber-200'
  else if (s === 'rejected') cls = 'bg-rose-100 text-rose-800 ring-rose-200'
  return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${cls}">${escapeHtml(label)}</span>`
}

function filterCompaniesBySearch(list, q) {
  const needle = String(q || '').trim().toLowerCase()
  if (!needle) return list
  return list.filter((c) => {
    const blob = [c.name, c.slug, c.email, c.phone, c.city, c.status, statusLabel(c.status)]
      .join(' ')
      .toLowerCase()
    return blob.includes(needle)
  })
}

function analyticsActivityLevel(r) {
  const visits = r.page_visits || 0
  const wa = r.whatsapp_clicks || 0
  const intent = r.booking_intent_rate || 0
  const qr = r.qr_scans || 0
  if (wa >= 5 || (intent >= 25 && visits >= 5)) return 'hot'
  if (visits >= 5 || qr >= 3) return 'active'
  if (visits > 0 || wa > 0 || qr > 0 || (r.share_visits || 0) > 0) return 'low'
  return 'dormant'
}

function analyticsActivityBadge(r, ta) {
  const level = analyticsActivityLevel(r)
  const map = {
    hot: ['bg-rose-50 text-rose-800 ring-rose-200', ta.activityHotLead],
    active: ['bg-emerald-50 text-emerald-800 ring-emerald-200', ta.activityActive],
    low: ['bg-amber-50 text-amber-800 ring-amber-200', ta.activityLow],
    dormant: ['bg-slate-100 text-slate-600 ring-slate-200', ta.activityDormant],
  }
  const [cls, label] = map[level] || map.dormant
  return `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${cls}">${escapeHtml(label)}</span>`
}

function sortAnalyticsRows(rows, sort) {
  const copy = [...rows]
  switch (sort) {
    case 'visits':
      copy.sort((a, b) => b.page_visits - a.page_visits || b.whatsapp_clicks - a.whatsapp_clicks)
      break
    case 'qr':
      copy.sort((a, b) => b.qr_scans - a.qr_scans || b.page_visits - a.page_visits)
      break
    case 'intent':
      copy.sort((a, b) => b.booking_intent_rate - a.booking_intent_rate || b.page_visits - a.page_visits)
      break
    case 'activity':
      copy.sort((a, b) =>
        String(b.last_activity_at || '').localeCompare(String(a.last_activity_at || ''))
      )
      break
    case 'name':
      copy.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      break
    default:
      copy.sort((a, b) => b.whatsapp_clicks - a.whatsapp_clicks || b.page_visits - a.page_visits)
  }
  return copy
}

function analyticsPlatformTotals(rows) {
  return {
    visits: rows.reduce((s, r) => s + (r.page_visits || 0), 0),
    qr: rows.reduce((s, r) => s + (r.qr_scans || 0), 0),
    share: rows.reduce((s, r) => s + (r.share_visits || 0), 0),
    wa: rows.reduce((s, r) => s + (r.whatsapp_clicks || 0), 0),
    call: rows.reduce((s, r) => s + (r.call_clicks || 0), 0),
    email: rows.reduce((s, r) => s + (r.email_clicks || 0), 0),
  }
}

function statusLabel(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'approved') return 'Approved'
  if (s === 'pending') return 'Pending'
  if (s === 'suspended') return 'Suspended'
  if (s === 'rejected') return 'Rejected'
  return status || '—'
}

function commStatusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'approved') return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/20'
  if (s === 'pending') return 'bg-sky-500/15 text-sky-300 ring-sky-500/20'
  if (s === 'suspended') return 'bg-amber-500/15 text-amber-300 ring-amber-500/20'
  if (s === 'rejected') return 'bg-rose-500/15 text-rose-300 ring-rose-500/20'
  return 'bg-slate-600/40 text-slate-300 ring-slate-500/25'
}

/** Digits-only for https://wa.me/<digits> (no +), minimum viable length. */
function waMeDigits(phone) {
  const d = normalizePhoneForWhatsApp(phone)
  if (!d || d.startsWith('0')) return ''
  if (d.length < 8 || d.length > 15) return ''
  return d
}

function formatAnalyticsLastActivity(iso, ta) {
  if (!iso) return ta.noActivity
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ta.noActivity
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (d >= todayStart) return ta.today
  return d.toISOString().slice(0, 10)
}

function fillCommTemplate(company, template, origin) {
  const loginUrl = `${origin}${LOGIN_ACTION_URL}`
  const bookingUrl =
    company.status === 'approved' && company.slug
      ? absolutePublicBookingUrl(company.slug)
      : '—'
  return String(template || '')
    .replaceAll('{company_name}', company.name || '')
    .replaceAll('{status}', statusLabel(company.status))
    .replaceAll('{booking_url}', bookingUrl)
    .replaceAll('{login_url}', loginUrl)
    .replaceAll('{city}', company.city || '—')
}

function monthlyRevenueEuro(companies, carMap) {
  let total = 0
  for (const c of companies) {
    if (c.status !== 'approved') continue
    const n = carMap[c.id] || 0
    const base = c.subscription_plan === 'premium' ? 50 : 30
    total += base + 5 * n
  }
  return total
}

function planBadge(plan) {
  const p = plan === 'premium' ? 'Premium' : 'Basic'
  const cls =
    plan === 'premium'
      ? 'bg-gray-900 text-white'
      : 'bg-gray-200 text-gray-800'
  return `<span class="rounded-full px-3 py-0.5 text-xs font-bold ${cls}">${p}</span>`
}

function normalizePhoneForWhatsApp(phone) {
  const clean = String(phone || '')
    .trim()
    .replace(/[\s().-]/g, '')
  if (!clean) return ''
  if (clean.startsWith('+')) return clean.slice(1).replace(/\D/g, '')
  if (clean.startsWith('00')) return clean.slice(2).replace(/\D/g, '')
  const digits = clean.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) return `32${digits.slice(1)}`
  return digits
}

function isMobileWhatsAppTarget() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent || '')
}

function whatsappDraftUrl(phoneDigits, message) {
  const encoded = encodeURIComponent(message)
  if (isMobileWhatsAppTarget()) {
    return `https://wa.me/${phoneDigits}?text=${encoded}`
  }
  return `https://web.whatsapp.com/send?phone=${phoneDigits}&text=${encoded}`
}

export async function mountAdminDashboard(root) {
  root.innerHTML = `<div class="min-h-screen flex flex-col items-center justify-center bg-violet-950/20">
    <div class="h-10 w-10 animate-pulse rounded-full border-2 border-violet-300 border-t-violet-600"></div>
    <p class="mt-3 text-sm text-gray-500">Loading…</p>
  </div>`

  const session = await getSession()
  if (!session) {
    navigate('/admin/login')
    return
  }

  const admin = await isPlatformAdmin(session.user)
  if (!admin) {
    navigate('/admin/login')
    return
  }

  let companies = []
  let companiesLoadError = false
  let totalCars = 0
  let carMap = {}
  let recentBookings = []
  let abuseEvents = []
  let analyticsCompanies = []
  let analyticsError = null
  const ta = tAdminAnalytics(getLocale())
  const td = tAdminDashboard(getLocale())
  try {
    companies = await listAllCompaniesForAdmin()
  } catch {
    companies = []
    companiesLoadError = true
  }
  try {
    totalCars = await countAllCarsAdmin()
  } catch {
    totalCars = 0
  }
  try {
    carMap = await countCarsByCompanyIdsAdmin()
  } catch {
    carMap = {}
  }
  try {
    recentBookings = await listBookingRequestsForAdmin()
  } catch {
    recentBookings = []
  }
  try {
    abuseEvents = await listAbuseRateEventsForAdmin(24)
  } catch {
    abuseEvents = []
  }

  const tabPrefetch = adminState.tab
  if (tabPrefetch === 'analytics') {
    try {
      const { companies: rows, error } = await fetchAdminCompanyAnalytics(adminState.analyticsRange)
      if (error) {
        analyticsError = error.message || 'Failed to load analytics.'
        analyticsCompanies = []
      } else {
        analyticsCompanies = rows || []
      }
    } catch (e) {
      analyticsError = e?.message || 'Failed to load analytics.'
      analyticsCompanies = []
    }
  }

  const pending = companies.filter((c) => c.status === 'pending')
  const active = companies.filter((c) => c.status === 'approved')
  const suspended = companies.filter((c) => c.status === 'suspended')
  const revenue = monthlyRevenueEuro(companies, carMap)
  const regIpCounts = {}
  const bookingIpCounts = {}
  const bookingContactCounts = {}
  let turnstileFailCount = 0
  let turnstileMissingCount = 0
  for (const c of pending) {
    const ip = String(c.ip_address || '').trim()
    if (ip) regIpCounts[ip] = (regIpCounts[ip] || 0) + 1
    if (c.turnstile_passed === false) turnstileFailCount += 1
    if (TURNSTILE_SITE_KEY && c.turnstile_passed == null) turnstileMissingCount += 1
  }
  for (const b of recentBookings) {
    const ip = String(b.ip_address || '').trim()
    if (ip) bookingIpCounts[ip] = (bookingIpCounts[ip] || 0) + 1
    const key =
      String(b.customer_phone || '').trim() || String(b.customer_email || '').trim().toLowerCase()
    if (key) bookingContactCounts[key] = (bookingContactCounts[key] || 0) + 1
    if (b.turnstile_passed === false) turnstileFailCount += 1
    if (TURNSTILE_SITE_KEY && b.turnstile_passed == null) turnstileMissingCount += 1
  }
  const riskyRegistrationIps = Object.values(regIpCounts).filter((n) => n >= 3).length
  const riskyBookingIps = Object.values(bookingIpCounts).filter((n) => n >= 10).length
  const riskyBookingContacts = Object.values(bookingContactCounts).filter((n) => n >= 5).length
  const warningBadge = (label, tone = 'amber') =>
    `<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
      tone === 'red'
        ? 'bg-red-100 text-red-800'
        : tone === 'blue'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-amber-100 text-amber-800'
    }">${escapeHtml(label)}</span>`
  const warningBadges = [
    riskyRegistrationIps > 0
      ? warningBadge(`${riskyRegistrationIps} registration IP(s) hit abuse threshold`, 'amber')
      : '',
    riskyBookingIps > 0
      ? warningBadge(`${riskyBookingIps} booking IP(s) hit abuse threshold`, 'amber')
      : '',
    riskyBookingContacts > 0
      ? warningBadge(`${riskyBookingContacts} rider contact(s) hit abuse threshold`, 'blue')
      : '',
    turnstileFailCount > 0
      ? warningBadge(`${turnstileFailCount} Turnstile failed/missing`, 'red')
      : '',
    turnstileMissingCount > 0
      ? warningBadge(`${turnstileMissingCount} Turnstile token missing`, 'red')
      : '',
  ]
    .filter(Boolean)
    .join('')
  const registrationsBlocked24h = abuseEvents.filter(
    (e) => e.action === 'company_registration_blocked'
  ).length
  const bookingsBlocked24h = abuseEvents.filter((e) => e.action === 'rider_booking_blocked').length
  const topIpMap = {}
  const topCompanyMap = {}
  for (const e of abuseEvents) {
    const ip = String(e.ip_address || '').trim()
    if (ip) topIpMap[ip] = (topIpMap[ip] || 0) + 1
    const cid = String(e.company_id || '').trim()
    if (cid) topCompanyMap[cid] = (topCompanyMap[cid] || 0) + 1
  }
  const topIps = Object.entries(topIpMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const topCompanies = Object.entries(topCompanyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const c = companies.find((x) => x.id === id)
      return { name: c?.name || id.slice(0, 8), count }
    })

  if (!['requests', 'active', 'subscriptions', 'analytics', 'communication'].includes(adminState.tab)) {
    adminState.tab = 'requests'
  }
  if (!['7d', '30d', 'all'].includes(adminState.analyticsRange)) {
    adminState.analyticsRange = '30d'
  }
  if (!['whatsapp', 'visits', 'qr', 'intent', 'activity', 'name'].includes(adminState.analyticsSort)) {
    adminState.analyticsSort = 'whatsapp'
  }
  if (!['approved', 'pending', 'inactive', 'all'].includes(adminState.commAudience)) {
    adminState.commAudience = 'approved'
  }
  if (adminState.commChannel !== 'whatsapp' && adminState.commChannel !== 'email') {
    adminState.commChannel = 'whatsapp'
  }
  if (!String(adminState.commSubject || '').trim()) {
    adminState.commSubject = 'Update from TAXIO'
  }
  const tab = adminState.tab
  const tabBtn = (id, label) =>
    `<button type="button" data-adm-tab="${id}" class="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
      tab === id
        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }">${escapeHtml(label)}</button>`

  let mainHtml = ''

  if (tab === 'requests') {
    const rows =
      pending.length === 0
        ? `<tr><td colspan="8">${admEmptyState('No pending requests yet.')}</td></tr>`
        : pending
            .map((c) => {
              const created = c.created_at ? String(c.created_at).slice(0, 10) : '—'
              const city = c.city || '—'
              const ncars = carMap[c.id] || 0
              return `
          <tr class="border-b border-slate-100 transition hover:bg-slate-50/80">
            <td class="px-4 py-3.5">
              <p class="font-semibold text-slate-900">${escapeHtml(c.name)}</p>
              <p class="mt-0.5 text-xs text-slate-500">${escapeHtml(c.phone || '—')}</p>
            </td>
            <td class="px-4 py-3.5 text-sm text-slate-600">${escapeHtml(c.vat_number || '—')}</td>
            <td class="px-4 py-3.5 text-sm text-slate-600">${escapeHtml(c.email)}</td>
            <td class="px-4 py-3.5 text-sm text-slate-600"><span class="inline-flex items-center gap-1">${icon.mapPin('h-3.5 w-3.5 shrink-0 text-slate-400')}${escapeHtml(city)}</span></td>
            <td class="px-4 py-3.5"><span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">${icon.car('h-3.5 w-3.5')}${ncars}</span></td>
            <td class="px-4 py-3.5 text-sm tabular-nums text-slate-600">${escapeHtml(created)}</td>
            <td class="px-4 py-3.5">${admStatusBadgeHtml('pending')}</td>
            <td class="px-4 py-3.5">
              <div class="flex flex-wrap gap-1.5">
                <button type="button" data-adm="edit" data-id="${escapeHtml(c.id)}" class="${admBtnSecondary()}">Edit</button>
                <button type="button" data-adm="delete" data-id="${escapeHtml(c.id)}" class="${admBtnDanger()}">Delete</button>
                <button type="button" data-adm="approve" data-id="${escapeHtml(c.id)}" class="${admBtnPrimary()}">${icon.check('h-3.5 w-3.5')}Approve</button>
                <button type="button" data-adm="reject" data-id="${escapeHtml(c.id)}" class="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-500">${icon.x('h-3.5 w-3.5')}Reject</button>
              </div>
            </td>
          </tr>`
            })
            .join('')
    mainHtml = `
      <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5">
        ${admSectionHeader(td.requestsTitle, td.requestsSubtitle)}
        <div class="overflow-x-auto">
          <table class="w-full min-w-[960px] text-left text-sm">
            <thead class="bg-slate-50/80">
              <tr class="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th class="px-4 py-3">${escapeHtml(td.company)}</th>
                <th class="px-4 py-3">${escapeHtml(td.vat)}</th>
                <th class="px-4 py-3">Email</th>
                <th class="px-4 py-3">City</th>
                <th class="px-4 py-3">${escapeHtml(td.cars)}</th>
                <th class="px-4 py-3">${escapeHtml(td.requestDate)}</th>
                <th class="px-4 py-3">${escapeHtml(td.status)}</th>
                <th class="px-4 py-3">${escapeHtml(td.actions)}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`
  } else if (tab === 'active') {
    const activeQ = (adminState.activeSearch || '').trim()
    const activeFiltered = filterCompaniesBySearch([...active, ...suspended], activeQ)
    const rows =
      activeFiltered.length === 0
        ? `<tr><td colspan="7">${admEmptyState(
            activeQ ? td.noSearchResults : 'No active companies found.',
            activeQ ? '' : 'Approved and suspended tenants appear here.'
          )}</td></tr>`
        : activeFiltered
            .map((c) => {
              const ncars = carMap[c.id] || 0
              const booking =
                c.status === 'approved' && c.slug ? absolutePublicBookingUrl(c.slug) : ''
              return `
          <tr class="border-b border-slate-100 transition hover:bg-slate-50/80">
            <td class="px-4 py-3.5">
              <p class="font-semibold text-slate-900">${escapeHtml(c.name)}</p>
              <p class="mt-0.5 font-mono text-xs text-slate-500">/${escapeHtml(c.slug || '—')}</p>
            </td>
            <td class="px-4 py-3.5 text-sm text-slate-600">${escapeHtml(c.email)}</td>
            <td class="px-4 py-3.5 text-sm text-slate-600">${escapeHtml(c.phone || '—')}</td>
            <td class="px-4 py-3.5">${admStatusBadgeHtml(c.status)}</td>
            <td class="px-4 py-3.5">${planBadge(c.subscription_plan)}</td>
            <td class="px-4 py-3.5 text-sm tabular-nums font-semibold text-slate-700">${ncars}</td>
            <td class="px-4 py-3.5">
              <div class="flex flex-wrap gap-1.5">
                ${
                  booking
                    ? `<a href="${escapeHtml(booking)}" target="_blank" rel="noopener noreferrer" class="${admBtnSecondary()} inline-flex items-center gap-1">${icon.externalLink('h-3 w-3')}Open</a>`
                    : ''
                }
                <button type="button" data-adm="edit" data-id="${escapeHtml(c.id)}" class="${admBtnSecondary()}">Edit</button>
                <button type="button" data-adm="delete" data-id="${escapeHtml(c.id)}" class="${admBtnDanger()}">Delete</button>
                <button type="button" data-adm="copy" data-slug="${escapeHtml(c.slug)}" class="${admBtnSecondary()}">Copy link</button>
                ${
                  c.status === 'suspended'
                    ? `<button type="button" data-adm="reactivate" data-id="${escapeHtml(c.id)}" class="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100">Reactivate</button>`
                    : `<button type="button" data-adm="suspend" data-id="${escapeHtml(c.id)}" class="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100">Suspend</button>`
                }
              </div>
            </td>
          </tr>`
            })
            .join('')
    mainHtml = `
      <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5">
        ${admSectionHeader(td.activeTitle, td.activeSubtitle)}
        <div class="border-b border-slate-100 px-5 py-3 sm:px-6">
          <div class="relative max-w-md">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">${icon.search('h-4 w-4')}</span>
            <input id="adm-active-search" type="search" value="${escapeHtml(activeQ)}" placeholder="${escapeHtml(td.searchCompanies)}" autocomplete="off" class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[900px] text-left text-sm">
            <thead class="bg-slate-50/80">
              <tr class="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th class="px-4 py-3">${escapeHtml(td.company)}</th>
                <th class="px-4 py-3">Email</th>
                <th class="px-4 py-3">Phone</th>
                <th class="px-4 py-3">${escapeHtml(td.status)}</th>
                <th class="px-4 py-3">${escapeHtml(td.plan)}</th>
                <th class="px-4 py-3">${escapeHtml(td.cars)}</th>
                <th class="px-4 py-3">${escapeHtml(td.actions)}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`
  } else if (tab === 'subscriptions') {
    const premiumCount = active.filter((c) => c.subscription_plan === 'premium').length
    const basicCount = active.filter((c) => c.subscription_plan !== 'premium').length
    const rows =
      active.length === 0
        ? `<tr><td colspan="9" class="px-4 py-12 text-center text-gray-500">No subscriptions to show.</td></tr>`
        : active
            .map((c) => {
              const n = carMap[c.id] || 0
              const base = c.subscription_plan === 'premium' ? 50 : 30
              const carFee = 5 * n
              const total = base + carFee
              const trips = '—'
              const inv = '—'
              return `
          <tr class="border-b border-gray-100">
            <td class="px-4 py-3 font-semibold text-gray-900">${escapeHtml(c.name)}</td>
            <td class="px-4 py-3">${planBadge(c.subscription_plan)}</td>
            <td class="px-4 py-3 text-sm">${n}</td>
            <td class="px-4 py-3 text-sm">€${base}</td>
            <td class="px-4 py-3 text-sm">€${carFee}</td>
            <td class="px-4 py-3 text-sm font-bold text-green-600">€${total}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${trips}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${inv}</td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-2">
                <button type="button" data-adm="toggleplan" data-id="${escapeHtml(c.id)}" data-plan="${escapeHtml(c.subscription_plan || 'basic')}" class="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold">Toggle plan</button>
                <button type="button" data-adm="sendinv" class="rounded-lg bg-green-600 px-2 py-1 text-xs font-bold text-white">Send</button>
              </div>
            </td>
          </tr>`
            })
            .join('')
    mainHtml = `
      <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5">
        ${admSectionHeader(td.subscriptionsTitle, td.subscriptionsSubtitle)}
        <div class="mx-5 mb-4 rounded-xl border border-violet-200/80 bg-violet-50/80 px-4 py-3 text-sm text-violet-900 sm:mx-6">
          <span class="font-semibold">Note:</span> ${escapeHtml(td.subscriptionsPrepNote)}
        </div>
        <div class="overflow-x-auto px-1 pb-2">
          <table class="w-full min-w-[1000px] text-left text-sm">
            <thead class="bg-slate-50/80">
              <tr class="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th class="px-4 py-3">${escapeHtml(td.company)}</th>
                <th class="px-4 py-3">${escapeHtml(td.plan)}</th>
                <th class="px-4 py-3">${escapeHtml(td.cars)}</th>
                <th class="px-4 py-3">Base</th>
                <th class="px-4 py-3">Car fee</th>
                <th class="px-4 py-3">Total / mo</th>
                <th class="px-4 py-3">Trips</th>
                <th class="px-4 py-3">Next invoice</th>
                <th class="px-4 py-3">${escapeHtml(td.actions)}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="grid gap-3 border-t border-slate-100 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
          <div class="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-violet-700">Premium plans</p>
            <p class="mt-1 text-xl font-bold tabular-nums text-violet-900">${premiumCount}</p>
          </div>
          <div class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Basic plans</p>
            <p class="mt-1 text-xl font-bold tabular-nums text-emerald-900">${basicCount}</p>
          </div>
          <div class="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-orange-700">${escapeHtml(td.kpiCars)}</p>
            <p class="mt-1 text-xl font-bold tabular-nums text-orange-900">${totalCars}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-600">${escapeHtml(td.kpiRevenue)}</p>
            <p class="mt-1 text-xl font-bold tabular-nums text-slate-900">€${revenue}</p>
          </div>
        </div>
        <div class="mx-5 mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:mx-6">
          <p class="font-bold text-slate-900">Pricing structure</p>
          <ul class="mt-2 list-inside list-disc space-y-1 text-xs sm:text-sm">
            <li>Basic plan: €30/month base</li>
            <li>Premium plan: €50/month base</li>
            <li>Additional cars: €5 per car per month</li>
            <li>Example: Premium + 8 cars = €50 + €40 = €90/month</li>
          </ul>
        </div>
      </div>`
  } else if (tab === 'analytics') {
    const range = adminState.analyticsRange
    const sort = adminState.analyticsSort
    const analyticsQ = (adminState.analyticsSearch || '').trim()
    let rows = sortAnalyticsRows(analyticsCompanies, sort)
    if (analyticsQ) {
      rows = filterCompaniesBySearch(rows, analyticsQ)
    }
    const totals = analyticsPlatformTotals(analyticsCompanies)
    const avgIntent =
      analyticsCompanies.length > 0
        ? Math.round(
            analyticsCompanies.reduce((s, r) => s + (r.booking_intent_rate || 0), 0) /
              analyticsCompanies.length
          )
        : 0

    const rangeBtn = (value, label) =>
      `<button type="button" data-adm-analytics-range="${value}" class="rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
        range === value
          ? 'bg-slate-900 text-white shadow-sm'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }">${escapeHtml(label)}</button>`

    const sortBtn = (value, label) =>
      `<button type="button" data-adm-analytics-sort="${value}" class="rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition sm:text-xs ${
        sort === value
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
      }">${escapeHtml(label)}</button>`

    const topWa = [...analyticsCompanies].sort((a, b) => b.whatsapp_clicks - a.whatsapp_clicks)[0]
    const topQr = [...analyticsCompanies].sort((a, b) => b.qr_scans - a.qr_scans)[0]
    const topIntent = [...analyticsCompanies].sort(
      (a, b) => b.booking_intent_rate - a.booking_intent_rate
    )[0]
    const noActivityCount = analyticsCompanies.filter(
      (r) =>
        (r.page_visits || 0) === 0 &&
        (r.whatsapp_clicks || 0) === 0 &&
        (r.qr_scans || 0) === 0 &&
        (r.share_visits || 0) === 0
    ).length

    const tableBody =
      rows.length === 0
        ? `<tr><td colspan="11">${admEmptyState(ta.empty)}</td></tr>`
        : rows
            .map((r) => {
              const booking =
                r.status === 'approved' && r.slug ? absolutePublicBookingUrl(r.slug) : ''
              return `
          <tr class="border-b border-slate-100 transition hover:bg-slate-50/80">
            <td class="px-3 py-3">
              <p class="font-semibold text-slate-900">${escapeHtml(r.name || '—')}</p>
              <p class="mt-0.5 font-mono text-[11px] text-slate-500">${r.slug ? `/${escapeHtml(r.slug)}` : '—'}</p>
              <div class="mt-1.5">${analyticsActivityBadge(r, ta)}</div>
            </td>
            <td class="px-3 py-3">${admStatusBadgeHtml(r.status)}</td>
            <td class="px-3 py-3 tabular-nums font-medium text-slate-800">${r.page_visits || 0}</td>
            <td class="px-3 py-3 tabular-nums text-slate-700">${r.qr_scans || 0}</td>
            <td class="px-3 py-3 tabular-nums text-slate-700">${r.share_visits || 0}</td>
            <td class="px-3 py-3 tabular-nums font-semibold text-emerald-700">${r.whatsapp_clicks || 0}</td>
            <td class="px-3 py-3 tabular-nums text-slate-700">${r.call_clicks || 0}</td>
            <td class="px-3 py-3 tabular-nums text-slate-700">${r.email_clicks || 0}</td>
            <td class="px-3 py-3 tabular-nums font-semibold text-violet-700">${r.booking_intent_rate || 0}%</td>
            <td class="px-3 py-3 text-xs text-slate-600">${escapeHtml(formatAnalyticsLastActivity(r.last_activity_at, ta))}</td>
            <td class="px-3 py-3">
              ${
                booking
                  ? `<a href="${escapeHtml(booking)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">${icon.externalLink('h-3 w-3')}${escapeHtml(ta.bookingLink)}</a>`
                  : `<span class="text-xs text-slate-400">${escapeHtml(ta.none)}</span>`
              }
            </td>
          </tr>`
            })
            .join('')

    mainHtml = `
      <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5">
        ${
          analyticsError
            ? `<div class="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-6">${escapeHtml(ta.loadError)}</div>`
            : ''
        }
        <div class="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 class="text-lg font-bold tracking-tight text-slate-900">${escapeHtml(ta.title)}</h2>
              <p class="mt-1 max-w-2xl text-sm text-slate-500">${escapeHtml(ta.subtitle)}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              ${rangeBtn('7d', ta.range7d)}
              ${rangeBtn('30d', ta.range30d)}
              ${rangeBtn('all', ta.rangeAll)}
            </div>
          </div>
        </div>

        <div class="grid gap-3 border-b border-slate-100 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 sm:px-6">
          ${admKpiCard({ label: ta.totalVisits, value: totals.visits, helper: ta.range30d, tone: 'sky', iconName: 'eye' })}
          ${admKpiCard({ label: ta.qrScans, value: totals.qr, helper: 'QR redirect scans', tone: 'violet', iconName: 'qrCode' })}
          ${admKpiCard({ label: ta.shareVisits, value: totals.share, helper: 'Shared links', tone: 'orange', iconName: 'globe' })}
          ${admKpiCard({ label: ta.whatsappClicks, value: totals.wa, helper: 'High intent signal', tone: 'emerald', iconName: 'whatsapp' })}
          ${admKpiCard({ label: ta.bookingIntent, value: `${avgIntent}%`, helper: 'Platform average', tone: 'amber', iconName: 'trending' })}
          ${admKpiCard({ label: ta.activeCompanies, value: active.length, helper: 'Approved tenants', tone: 'sky', iconName: 'building2' })}
        </div>

        <div class="border-b border-slate-100 px-5 py-4 sm:px-6">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">${escapeHtml(ta.insightTitle)}</p>
          <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
              <p class="text-[11px] font-medium text-slate-500">${escapeHtml(ta.insightTopWa)}</p>
              <p class="mt-0.5 font-semibold text-slate-900">${escapeHtml(topWa?.name || ta.none)} <span class="text-xs font-normal text-slate-500">(${topWa?.whatsapp_clicks || 0})</span></p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
              <p class="text-[11px] font-medium text-slate-500">${escapeHtml(ta.insightTopQr)}</p>
              <p class="mt-0.5 font-semibold text-slate-900">${escapeHtml(topQr?.name || ta.none)} <span class="text-xs font-normal text-slate-500">(${topQr?.qr_scans || 0})</span></p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
              <p class="text-[11px] font-medium text-slate-500">${escapeHtml(ta.insightTopIntent)}</p>
              <p class="mt-0.5 font-semibold text-slate-900">${escapeHtml(topIntent?.name || ta.none)} <span class="text-xs font-normal text-slate-500">(${topIntent?.booking_intent_rate || 0}%)</span></p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
              <p class="text-[11px] font-medium text-slate-500">${escapeHtml(ta.insightNoActivity)}</p>
              <p class="mt-0.5 font-semibold tabular-nums text-slate-900">${noActivityCount}</p>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div class="relative min-w-0 flex-1 max-w-md">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">${icon.search('h-4 w-4')}</span>
            <input id="adm-analytics-search" type="search" value="${escapeHtml(analyticsQ)}" placeholder="${escapeHtml(ta.searchPlaceholder)}" autocomplete="off" class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${sortBtn('whatsapp', ta.sortWhatsapp)}
            ${sortBtn('visits', ta.sortVisits)}
            ${sortBtn('qr', ta.sortQr)}
            ${sortBtn('intent', ta.sortIntent)}
            ${sortBtn('activity', ta.sortActivity)}
            ${sortBtn('name', ta.sortName)}
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[1100px] text-left text-sm">
            <thead class="bg-slate-50/90">
              <tr class="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th class="px-3 py-3">${escapeHtml(td.company)}</th>
                <th class="px-3 py-3">${escapeHtml(td.status)}</th>
                <th class="px-3 py-3">${escapeHtml(ta.totalVisits)}</th>
                <th class="px-3 py-3">${escapeHtml(ta.qrScans)}</th>
                <th class="px-3 py-3">${escapeHtml(ta.shareVisits)}</th>
                <th class="px-3 py-3">${escapeHtml(ta.whatsappClicks)}</th>
                <th class="px-3 py-3">${escapeHtml(ta.callClicks)}</th>
                <th class="px-3 py-3">${escapeHtml(ta.emailClicks)}</th>
                <th class="px-3 py-3">${escapeHtml(ta.bookingIntent)}</th>
                <th class="px-3 py-3">${escapeHtml(ta.lastActivity)}</th>
                <th class="px-3 py-3">${escapeHtml(ta.bookingLink)}</th>
              </tr>
            </thead>
            <tbody>${tableBody}</tbody>
          </table>
        </div>
      </div>`
  } else if (tab === 'communication') {
    const rejected = companies.filter((c) => c.status === 'rejected')
    let audienceList = []
    if (adminState.commAudience === 'approved') audienceList = active
    else if (adminState.commAudience === 'pending') audienceList = pending
    else if (adminState.commAudience === 'inactive') audienceList = [...suspended, ...rejected]
    else audienceList = [...companies]

    const audienceIds = new Set(audienceList.map((c) => c.id))
    adminState.commSelected = (adminState.commSelected || []).filter((id) => audienceIds.has(id))

    const q = (adminState.commSearch || '').trim().toLowerCase()
    const visible = !q
      ? audienceList
      : audienceList.filter((c) => {
          const blob = [
            c.name,
            c.email,
            c.phone,
            c.city,
            c.status,
            statusLabel(c.status),
          ]
            .join(' ')
            .toLowerCase()
          return blob.includes(q)
        })

    const selectedSet = new Set(adminState.commSelected)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''

    const commListEmptyHtml = `<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-600/70 bg-slate-800/25 px-5 py-12 text-center">
          <p class="text-sm font-medium text-slate-300">No companies match this view</p>
          <p class="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">Try another audience segment or clear your search to see more results.</p>
        </div>`

    const commRows =
      visible.length === 0
        ? commListEmptyHtml
        : visible
            .map((c) => {
              const st = escapeHtml(statusLabel(c.status))
              const booking =
                c.status === 'approved' && c.slug ? absolutePublicBookingUrl(c.slug) : ''
              const badgeCls = commStatusBadgeClass(c.status)
              const noWa = !waMeDigits(c.phone)
              const waHint = noWa
                ? '<span class="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 ring-2 ring-amber-400/30" title="Phone not usable for WhatsApp"></span>'
                : ''
              const bookingLink = booking
                ? `<a href="${escapeHtml(booking)}" target="_blank" rel="noopener noreferrer" class="text-xs font-medium text-slate-500 underline decoration-slate-600 underline-offset-2 hover:text-amber-400/90 hover:decoration-amber-400/40">Booking page</a>`
                : '<span class="text-xs text-slate-600">No public booking link</span>'
              return `
        <label class="flex cursor-pointer gap-3 rounded-2xl border border-slate-700/55 bg-slate-800/35 p-3.5 shadow-sm shadow-black/10 transition hover:border-amber-500/25 hover:bg-slate-800/65">
          <input type="checkbox" data-adm-comm-row="${escapeHtml(c.id)}" class="adm-comm-cb mt-0.5 h-4 w-4 shrink-0 rounded border-slate-500 bg-slate-900 text-amber-500 focus:ring-amber-500/40" ${selectedSet.has(c.id) ? 'checked' : ''} />
          <div class="min-w-0 flex-1 space-y-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-semibold text-white">${escapeHtml(c.name || '')}</span>
              <span class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${badgeCls}">${st}</span>
              ${waHint}
            </div>
            <p class="text-xs text-slate-400">${escapeHtml(c.city || '—')}</p>
            <p class="text-[11px] leading-relaxed text-slate-500"><span class="text-slate-600">Phone</span> ${escapeHtml(c.phone || '—')} · <span class="text-slate-600">Email</span> ${escapeHtml(c.email || '—')}</p>
            <div>${bookingLink}</div>
          </div>
        </label>`
            })
            .join('')

    let firstPreview = null
    for (const id of adminState.commSelected || []) {
      firstPreview = companies.find((c) => c.id === id)
      if (firstPreview) break
    }
    const previewRaw = firstPreview
      ? fillCommTemplate(firstPreview, adminState.commTemplate, origin)
      : ''
    const previewHtml = firstPreview
      ? escapeHtml(previewRaw).replace(/\n/g, '<br />')
      : COMM_PREVIEW_EMPTY_HTML

    const selCount = (adminState.commSelected || []).length
    const aud = adminState.commAudience
    const totalCompanies = companies.length
    const approvedCount = active.length
    const pendingCount = pending.length

    const audienceSeg = (value, checked, label, title = '') =>
      `<label class="relative min-w-0 flex-1 cursor-pointer sm:min-w-[4.5rem]"${title ? ` title="${escapeHtml(title)}"` : ''}>
          <input type="radio" name="adm-comm-audience" value="${escapeHtml(value)}" class="peer sr-only" ${checked ? 'checked' : ''} />
          <span class="flex w-full items-center justify-center rounded-xl px-2 py-2 text-center text-[11px] font-semibold text-slate-400 transition hover:text-slate-200 peer-checked:bg-amber-400 peer-checked:text-slate-900 peer-checked:shadow-md peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400/50 sm:text-xs">${escapeHtml(label)}</span>
        </label>`

    mainHtml = `
      <div class="overflow-hidden rounded-2xl border border-slate-600/75 bg-slate-900 shadow-2xl ring-1 ring-slate-700/55">
        <div class="border-b border-slate-700/60 bg-slate-900/90 px-4 py-5 sm:px-6">
          <h2 class="text-lg font-semibold tracking-tight text-white sm:text-xl">Communication center</h2>
          <p class="mt-1 text-sm text-slate-400">Templates, audience filters, and manual WhatsApp sends for your partner companies.</p>
        </div>

        <div class="grid grid-cols-2 gap-3 border-b border-slate-800/90 bg-slate-950/35 px-4 py-4 sm:grid-cols-4 sm:px-6">
          <div class="rounded-2xl border border-slate-700/55 bg-slate-900/55 px-3 py-3 shadow-sm">
            <p class="text-[11px] font-medium text-slate-500">Total companies</p>
            <p class="mt-0.5 text-lg font-semibold tabular-nums text-white">${totalCompanies}</p>
          </div>
          <div class="rounded-2xl border border-slate-700/55 bg-slate-800/35 px-3 py-3 shadow-sm">
            <p class="text-[11px] font-medium text-slate-500">Approved</p>
            <p class="mt-0.5 text-lg font-semibold tabular-nums text-emerald-300/95">${approvedCount}</p>
          </div>
          <div class="rounded-2xl border border-slate-700/55 bg-slate-800/40 px-3 py-3 shadow-sm">
            <p class="text-[11px] font-medium text-slate-500">Pending</p>
            <p class="mt-0.5 text-lg font-semibold tabular-nums text-sky-300/95">${pendingCount}</p>
          </div>
          <div class="rounded-2xl border border-amber-500/20 bg-slate-800/45 px-3 py-3 shadow-sm ring-1 ring-amber-500/10">
            <p class="text-[11px] font-medium text-slate-500">Selected recipients</p>
            <p class="mt-0.5 text-lg font-semibold tabular-nums text-amber-200">${selCount}</p>
          </div>
        </div>

        <div class="px-4 py-5 sm:px-6">
          <div class="mb-4 rounded-2xl border border-amber-400/25 bg-amber-950/35 px-3 py-2.5 text-xs leading-relaxed text-amber-100/95 sm:text-sm">
            <span class="font-semibold text-amber-200">Safety:</span> WhatsApp requires manual confirmation. TAXIO opens each draft; you tap Send on your device.
          </div>

          <div class="grid gap-6 lg:grid-cols-12 lg:gap-8">
            <div class="space-y-4 lg:col-span-5">
              <section class="rounded-2xl border border-slate-700/60 bg-slate-800/30 p-4 sm:p-5">
                <h3 class="text-sm font-semibold text-white">Audience</h3>
                <p class="mt-0.5 text-xs text-slate-500">Choose which companies appear in the recipient list.</p>
                <div class="mt-3 flex w-full flex-wrap gap-1 rounded-2xl bg-slate-950/55 p-1 ring-1 ring-slate-600/55 sm:flex-nowrap" role="group" aria-label="Audience">
                  ${audienceSeg('approved', aud === 'approved', 'Approved')}
                  ${audienceSeg('pending', aud === 'pending', 'Pending')}
                  ${audienceSeg('inactive', aud === 'inactive', 'Suspended', 'Suspended and rejected accounts')}
                  ${audienceSeg('all', aud === 'all', 'All')}
                </div>
              </section>

              <section class="rounded-2xl border border-slate-700/55 bg-slate-900/45 p-4 sm:p-5">
                <h3 class="text-sm font-semibold text-white">Search &amp; selection</h3>
                <p class="mt-0.5 text-xs text-slate-500">Find by name, email, phone, city, or status.</p>
                <div class="relative mt-3">
                  <span class="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-500">${icon.search('h-4 w-4 shrink-0')}</span>
                  <input id="adm-comm-search" type="search" value="${escapeHtml(adminState.commSearch || '')}" placeholder="Search companies…" autocomplete="off" class="w-full rounded-xl border border-slate-600 bg-slate-900 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25" />
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button type="button" id="adm-comm-select-visible" class="rounded-lg border border-slate-600/90 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-700">Select all</button>
                  <button type="button" id="adm-comm-unselect-all" class="rounded-lg border border-slate-600/90 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-700">Unselect all</button>
                </div>
                <p class="mt-2 text-xs text-slate-500"><span class="tabular-nums">${visible.length}</span> in list · <span class="tabular-nums">${selCount}</span> selected</p>
              </section>

              <section class="rounded-2xl border border-slate-700/55 bg-slate-800/25 p-4 sm:p-5">
                <h3 class="text-sm font-semibold text-white">Companies</h3>
                <p class="mt-0.5 text-xs text-slate-500">Click a row or checkbox to include in this send.</p>
                <div class="mt-3 max-h-[min(28rem,52vh)] space-y-2 overflow-y-auto overscroll-contain pr-0.5">${commRows}</div>
              </section>
            </div>

            <div class="flex flex-col gap-4 max-lg:pb-28 lg:col-span-7">
              <section class="rounded-2xl border border-amber-500/25 bg-gradient-to-b from-slate-800/65 via-slate-900/75 to-slate-900/90 p-4 shadow-xl shadow-black/25 ring-1 ring-slate-700/45 sm:p-5">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 class="text-base font-semibold text-white">Message composer</h3>
                    <p class="mt-0.5 text-xs text-slate-500">Edit your template; preview updates when recipients change.</p>
                  </div>
                  <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200/95 ring-1 ring-amber-500/15" title="Recipients in current send">
                    <span class="text-slate-400">To</span>
                    <strong id="adm-comm-selected-count" class="tabular-nums text-amber-100">${selCount}</strong>
                  </span>
                </div>

                <p class="mt-4 text-[11px] font-medium text-slate-500">Channel</p>
                <div class="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <label class="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 ${adminState.commChannel === 'whatsapp' ? 'border-amber-400/45 bg-slate-800/70 ring-1 ring-amber-400/20' : ''}">
                    <input type="radio" name="adm-comm-channel" value="whatsapp" class="text-amber-500 focus:ring-amber-400/40" ${adminState.commChannel === 'whatsapp' ? 'checked' : ''} />
                    WhatsApp
                  </label>
                  <label class="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-500 transition hover:border-slate-500 ${adminState.commChannel === 'email' ? 'border-amber-400/45 bg-slate-800/70 text-slate-300 ring-1 ring-amber-400/20' : ''}">
                    <input type="radio" name="adm-comm-channel" value="email" class="text-amber-500 focus:ring-amber-400/40" ${adminState.commChannel === 'email' ? 'checked' : ''} />
                    Email
                  </label>
                </div>

                ${
                  adminState.commChannel === 'email'
                    ? `<label class="mt-4 block">
                  <span class="text-[11px] font-medium text-slate-500">Email subject</span>
                  <input id="adm-comm-subject" type="text" maxlength="160" value="${escapeHtml(adminState.commSubject || '')}" class="mt-1.5 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" placeholder="Update from TAXIO" />
                </label>`
                    : ''
                }

                <label class="mt-4 block">
                  <span class="text-[11px] font-medium text-slate-500">Template preset</span>
                  <select id="adm-comm-preset" class="mt-1.5 w-full cursor-pointer rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20">
                    <option value="">Choose a starter template…</option>
                    <option value="welcome">Welcome / onboarding</option>
                    <option value="payment">Payment reminder</option>
                    <option value="feature">New feature announcement</option>
                    <option value="trial_end">Trial ending reminder</option>
                    <option value="missing_info">Missing information request</option>
                    <option value="general">General update</option>
                  </select>
                </label>

                <label class="mt-4 block">
                  <span class="text-[11px] font-medium text-slate-500">Message body</span>
                  <textarea id="adm-comm-template" rows="14" class="mt-1.5 w-full resize-y rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 font-mono text-sm leading-relaxed text-slate-100 shadow-inner focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20">${escapeHtml(
                    adminState.commTemplate || ''
                  )}</textarea>
                </label>

                <div class="mt-3">
                  <p class="text-[11px] font-medium text-slate-500">Variables</p>
                  <div class="mt-1.5 flex flex-wrap gap-1.5">
                    <span class="inline-flex items-center rounded-lg bg-slate-800/90 px-2 py-1 font-mono text-[10px] text-amber-200/90 ring-1 ring-slate-600/60">{company_name}</span>
                    <span class="inline-flex items-center rounded-lg bg-slate-800/90 px-2 py-1 font-mono text-[10px] text-amber-200/90 ring-1 ring-slate-600/60">{status}</span>
                    <span class="inline-flex items-center rounded-lg bg-slate-800/90 px-2 py-1 font-mono text-[10px] text-amber-200/90 ring-1 ring-slate-600/60">{booking_url}</span>
                    <span class="inline-flex items-center rounded-lg bg-slate-800/90 px-2 py-1 font-mono text-[10px] text-amber-200/90 ring-1 ring-slate-600/60">{login_url}</span>
                    <span class="inline-flex items-center rounded-lg bg-slate-800/90 px-2 py-1 font-mono text-[10px] text-amber-200/90 ring-1 ring-slate-600/60">{city}</span>
                  </div>
                </div>
              </section>

              <section class="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-700/55 bg-slate-800/30 p-4 sm:p-5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h3 class="text-sm font-semibold text-white">Live preview</h3>
                  <span class="text-[11px] text-slate-500">First selected company</span>
                </div>
                <div id="adm-comm-preview-body" class="mt-3 min-h-[12rem] flex-1 rounded-xl border border-slate-700/70 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-200 shadow-inner">${previewHtml}</div>
                <p id="adm-comm-skipped" class="mt-3 hidden text-xs text-amber-200/90"></p>
              </section>

              <div class="max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:z-40 max-lg:border-t max-lg:border-slate-700/80 max-lg:bg-slate-900/95 max-lg:px-4 max-lg:py-3 max-lg:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-lg:backdrop-blur-md lg:static lg:border-0 lg:bg-transparent lg:p-0">
                <button type="button" id="adm-comm-open-wa" ${adminState.commChannel !== 'whatsapp' ? 'disabled' : ''} class="w-full rounded-2xl bg-amber-400 py-3.5 text-base font-bold tracking-tight text-slate-900 shadow-lg shadow-amber-900/30 transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-45">Open WhatsApp Messages</button>
                ${
                  adminState.commChannel === 'email'
                    ? '<button type="button" id="adm-comm-send-email" class="mt-2 w-full rounded-2xl bg-sky-500 py-3.5 text-base font-bold tracking-tight text-white shadow-lg shadow-sky-900/30 transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">Send Email</button>'
                    : ''
                }
                ${
                  adminState.commChannel === 'email'
                    ? '<p class="mt-2 text-center text-[11px] text-slate-500">Sends one personalized email per selected company via server-side Resend.</p>'
                    : '<p class="mt-2 hidden text-center text-[11px] text-slate-500 max-lg:block">Opens one WhatsApp draft at a time.</p><p class="mt-2 text-center text-[11px] text-slate-500 max-lg:hidden">Opens <code class="rounded bg-slate-800 px-1 py-0.5 font-mono text-slate-400">web.whatsapp.com/send</code> one company at a time.</p>'
                }
              </div>
              <div id="adm-wa-sender-root"></div>
            </div>
          </div>
        </div>
      </div>`
  } else {
    mainHtml = `<div class="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">${escapeHtml(td.selectTab)}</div>`
  }

  const showDevCleanupPanel =
    import.meta.env.DEV || String(import.meta.env.VITE_ENABLE_DEV_CLEANUP || '').trim() === 'true'
  const devCleanupPanelHtml = showDevCleanupPanel
    ? `<div id="adm-dev-cleanup-wrap" class="mt-10 rounded-2xl border-2 border-dashed border-amber-400/90 bg-amber-50/95 p-5 text-gray-900 shadow-sm">
          <h3 class="text-sm font-bold uppercase tracking-wide text-amber-900">Development — test company cleanup</h3>
          <p class="mt-2 text-xs leading-relaxed text-amber-950/85">Requires <code class="rounded bg-white px-1 py-0.5 text-[11px]">TAXIO_DEV_CLEANUP_ENABLED=true</code> on the server. Deletes only slug prefix <strong>test</strong> or <strong>dev_fixture</strong> rows (see <code class="text-[11px]">migration_companies_dev_fixture.sql</code>). Cascades members, cars, booking requests. Best-effort storage logo removal. Orphan owners: resets onboarding profile flags unless <code class="text-[11px]">TAXIO_DEV_CLEANUP_DELETE_AUTH=true</code>.</p>
          <p class="mt-2 text-xs font-semibold text-red-800">Does not appear to public users. Run Preview before delete.</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" id="adm-dev-cleanup-preview" class="rounded-lg border border-amber-800/40 bg-white px-4 py-2 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-100">Preview eligible rows</button>
          </div>
          <div id="adm-dev-cleanup-list" class="mt-3 max-h-48 overflow-y-auto rounded-lg border border-amber-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-gray-800">Click Preview to load candidates.</div>
          <div class="mt-4 flex flex-col gap-3 sm:max-w-lg">
            <label class="text-xs font-semibold text-amber-950">Confirmation phrase
              <input id="adm-dev-cleanup-phrase" type="text" autocomplete="off" placeholder="DELETE TEST COMPANIES" class="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm" />
            </label>
            <button type="button" id="adm-dev-cleanup-run" class="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50" disabled>Delete listed companies</button>
          </div>
        </div>`
    : ''

  root.innerHTML = `
    <div class="min-h-screen bg-slate-100 pb-16">
      <header class="border-b border-slate-800/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-6 shadow-xl">
        <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            ${taxioLogoImg('h-10 w-10 rounded-xl ring-1 ring-white/10')}
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-widest text-amber-400/90">TAXIO Platform</p>
              <h1 class="text-xl font-bold text-white md:text-2xl">${escapeHtml(td.headerTitle)}</h1>
              <p class="text-sm text-slate-400">${escapeHtml(td.headerSubtitle)}</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" id="adm-qr" class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">${icon.qrCode('h-4 w-4')}QR Codes</button>
            <button type="button" id="adm-logout" class="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-100">${icon.logOut('h-4 w-4')}${escapeHtml('Logout')}</button>
          </div>
        </div>
      </header>

      <div class="mx-auto max-w-7xl px-4 pt-6">
        ${
          companiesLoadError
            ? `<div class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">${escapeHtml(td.loadError)}</div>`
            : ''
        }
        ${
          warningBadges
            ? `<div class="mb-4 flex flex-wrap gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">${warningBadges}</div>`
            : ''
        }
        <div class="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-sm font-bold text-slate-900">Abuse stats (last 24h)</h3>
            <div class="flex flex-wrap gap-2">
              <span class="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">Registrations blocked: ${registrationsBlocked24h}</span>
              <span class="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">Bookings blocked: ${bookingsBlocked24h}</span>
            </div>
          </div>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-600">Top IPs</p>
              <div class="mt-2 text-xs text-slate-800">
                ${
                  topIps.length
                    ? topIps
                        .map(
                          ([ip, count]) =>
                            `<p class="flex items-center justify-between gap-2"><span class="font-mono">${escapeHtml(ip)}</span><span class="rounded-full bg-slate-200 px-2 py-0.5 font-semibold">${count}</span></p>`
                        )
                        .join('')
                    : '<p class="text-slate-500">No abuse events in last 24h.</p>'
                }
              </div>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-600">Top targeted companies</p>
              <div class="mt-2 text-xs text-slate-800">
                ${
                  topCompanies.length
                    ? topCompanies
                        .map(
                          (row) =>
                            `<p class="flex items-center justify-between gap-2"><span>${escapeHtml(row.name)}</span><span class="rounded-full bg-slate-200 px-2 py-0.5 font-semibold">${row.count}</span></p>`
                        )
                        .join('')
                    : '<p class="text-slate-500">No company-targeted abuse events in last 24h.</p>'
                }
              </div>
            </div>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          ${admKpiCard({ label: td.kpiPending, value: pending.length, helper: td.kpiPendingHelper, tone: 'sky', iconName: 'inbox' })}
          ${admKpiCard({ label: td.kpiActive, value: active.length, helper: td.kpiActiveHelper, tone: 'emerald', iconName: 'building2' })}
          ${admKpiCard({ label: td.kpiSuspended, value: suspended.length, helper: td.kpiSuspendedHelper, tone: 'amber', iconName: 'shield' })}
          ${admKpiCard({ label: td.kpiCars, value: totalCars, helper: td.kpiCarsHelper, tone: 'orange', iconName: 'car' })}
          ${admKpiCard({ label: td.kpiRevenue, value: `€${revenue}`, helper: td.kpiRevenueHelper, tone: 'violet', iconName: 'euro' })}
        </div>

        <div class="mt-6 overflow-x-auto pb-1">
          <div class="flex min-w-max gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:min-w-0 sm:flex-wrap">
          ${tabBtn('requests', td.tabRequests)}
          ${tabBtn('active', td.tabActive)}
          ${tabBtn('subscriptions', td.tabSubscriptions)}
          ${tabBtn('analytics', ta.tab)}
          ${tabBtn('communication', td.tabCommunication)}
          </div>
        </div>

        <p id="adm-msg" class="mt-4 hidden rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"></p>

        <dialog id="adm-company-edit" class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-0 shadow-xl">
          <form id="adm-edit-form" class="p-6">
            <h3 class="text-lg font-bold text-gray-900">Edit company</h3>
            <input type="hidden" id="adm-edit-id" />
            <div class="mt-4 grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2">
              <label class="block text-xs font-semibold text-gray-600 sm:col-span-2">Company name
                <input id="adm-edit-name" required class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </label>
              <label class="block text-xs font-semibold text-gray-600 sm:col-span-2">Slug (subdomain)
                <input id="adm-edit-slug" required class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900" />
              </label>
              <label class="block text-xs font-semibold text-gray-600 sm:col-span-2">Email
                <input id="adm-edit-email" type="email" required class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                <span class="mt-1 block text-[11px] font-medium text-amber-700">Changing this updates company contact email only. Login email remains unchanged.</span>
              </label>
              <label class="block text-xs font-semibold text-gray-600">Phone
                <input id="adm-edit-phone" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </label>
              <label class="block text-xs font-semibold text-gray-600">VAT number
                <input id="adm-edit-vat" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </label>
              <label class="block text-xs font-semibold text-gray-600">City
                <input id="adm-edit-city" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </label>
              <label class="block text-xs font-semibold text-gray-600">Country
                <input id="adm-edit-country" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </label>
              <label class="block text-xs font-semibold text-gray-600 sm:col-span-2">Slogan
                <input id="adm-edit-slogan" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </label>
              <label class="block text-xs font-semibold text-gray-600 sm:col-span-2">Availability
                <select id="adm-edit-availability" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                  <option value="available">available</option>
                  <option value="busy">busy</option>
                  <option value="offline">offline</option>
                </select>
              </label>
              <label class="block text-xs font-semibold text-gray-600 sm:col-span-2">Pricing (JSON)
                <textarea id="adm-edit-pricing" rows="4" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs text-gray-900"></textarea>
              </label>
            </div>
            <div class="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button type="button" id="adm-edit-cancel" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800">Cancel</button>
              <button type="submit" id="adm-edit-submit" class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white">Save</button>
            </div>
          </form>
        </dialog>

        <div class="mt-6">${mainHtml}</div>
        ${devCleanupPanelHtml}
      </div>
    </div>`

  function showMsg(t, tone = 'info') {
    const el = root.querySelector('#adm-msg')
    const toneClass =
      tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
        : tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-amber-200 bg-amber-50 text-amber-900'
    el.className = `mt-4 rounded-lg border px-4 py-2 text-sm ${toneClass}`
    el.textContent = t
    el.classList.remove('hidden')
    setTimeout(() => el.classList.add('hidden'), tone === 'error' ? 7000 : 5000)
  }

  let devCleanupCandidateIds = []

  function normalizePricingTextForCompare(s) {
    const t = String(s || '').trim()
    if (!t) return ''
    try {
      return JSON.stringify(JSON.parse(t))
    } catch {
      return t
    }
  }

  function openEditCompany(c) {
    root.querySelector('#adm-edit-id').value = c.id
    root.querySelector('#adm-edit-name').value = c.name || ''
    root.querySelector('#adm-edit-slug').value = c.slug || ''
    root.querySelector('#adm-edit-email').value = c.email || ''
    root.querySelector('#adm-edit-phone').value = c.phone || ''
    root.querySelector('#adm-edit-city').value = c.city || ''
    root.querySelector('#adm-edit-country').value = c.country || ''
    root.querySelector('#adm-edit-vat').value = c.vat_number || ''
    root.querySelector('#adm-edit-slogan').value = c.slogan || ''
    root.querySelector('#adm-edit-availability').value = c.availability_status || 'available'
    const pr = c.pricing
    const pricingText = pr && typeof pr === 'object' ? JSON.stringify(pr, null, 2) : ''
    root.querySelector('#adm-edit-pricing').value = pricingText
    adminState.editBaseline = {
      id: c.id,
      name: String(c.name || '').trim(),
      slug: slugFromCompanyName(c.slug || ''),
      email: String(c.email || '').trim(),
      phone: String(c.phone || '').trim(),
      city: String(c.city || '').trim(),
      country: String(c.country || '').trim(),
      vat_number: String(c.vat_number || '').trim(),
      slogan: String(c.slogan || '').trim(),
      availability_status: c.availability_status || 'available',
      pricingCompare: normalizePricingTextForCompare(pricingText),
    }
    root.querySelector('#adm-company-edit')?.showModal()
  }

  root.querySelectorAll('[data-adm-tab]').forEach((b) => {
    b.addEventListener('click', () => {
      adminState.tab = b.getAttribute('data-adm-tab')
      mountAdminDashboard(root)
    })
  })

  root.querySelectorAll('[data-adm-analytics-range]').forEach((b) => {
    b.addEventListener('click', () => {
      adminState.analyticsRange = b.getAttribute('data-adm-analytics-range')
      mountAdminDashboard(root)
    })
  })

  root.querySelectorAll('[data-adm-analytics-sort]').forEach((b) => {
    b.addEventListener('click', () => {
      adminState.analyticsSort = b.getAttribute('data-adm-analytics-sort')
      mountAdminDashboard(root)
    })
  })

  let activeSearchTimer
  root.querySelector('#adm-active-search')?.addEventListener('input', (e) => {
    clearTimeout(activeSearchTimer)
    activeSearchTimer = setTimeout(() => {
      adminState.activeSearch = e.target.value
      mountAdminDashboard(root)
    }, 280)
  })

  let analyticsSearchTimer
  root.querySelector('#adm-analytics-search')?.addEventListener('input', (e) => {
    clearTimeout(analyticsSearchTimer)
    analyticsSearchTimer = setTimeout(() => {
      adminState.analyticsSearch = e.target.value
      mountAdminDashboard(root)
    }, 280)
  })

  root.querySelector('#adm-logout')?.addEventListener('click', async () => {
    await signOutEverywhere()
    navigate('/')
  })

  root.querySelector('#adm-qr')?.addEventListener('click', () => {
    window.alert('QR batch tools — connect to your operational workflow when ready.')
  })

  root.querySelector('#adm-dev-cleanup-preview')?.addEventListener('click', async () => {
    const listEl = root.querySelector('#adm-dev-cleanup-list')
    const runBtn = root.querySelector('#adm-dev-cleanup-run')
    if (listEl) listEl.textContent = 'Loading…'
    devCleanupCandidateIds = []
    if (runBtn) runBtn.disabled = true
    const { data, error } = await devCleanupTestCompanies({ action: 'preview' })
    if (error) {
      showMsg(error.message)
      if (listEl) listEl.textContent = error.message
      return
    }
    const rows = data?.companies || []
    devCleanupCandidateIds = rows.map((c) => c.id)
    if (listEl) {
      listEl.innerHTML =
        rows.length === 0
          ? '<p class="text-gray-600">No eligible test companies found.</p>'
          : `<ul class="list-inside list-disc space-y-1">${rows
              .map(
                (c) =>
                  `<li>${escapeHtml(c.name || '')} · ${escapeHtml(c.slug || '')} · <span class="text-gray-500">${escapeHtml(c.id)}</span></li>`
              )
              .join('')}</ul>`
    }
    if (runBtn) runBtn.disabled = rows.length === 0
  })

  root.querySelector('#adm-dev-cleanup-run')?.addEventListener('click', async () => {
    const phrase = String(root.querySelector('#adm-dev-cleanup-phrase')?.value || '').trim()
    if (phrase !== 'DELETE TEST COMPANIES') {
      showMsg('Type exactly: DELETE TEST COMPANIES')
      return
    }
    if (!devCleanupCandidateIds.length) {
      showMsg('Run Preview first.')
      return
    }
    if (
      !window.confirm(
        `Permanently delete ${devCleanupCandidateIds.length} test company row(s) and related members, cars, and bookings?`
      )
    )
      return
    const runBtn = root.querySelector('#adm-dev-cleanup-run')
    if (runBtn) runBtn.disabled = true
    const { data, error } = await devCleanupTestCompanies({
      action: 'delete',
      confirmation: phrase,
      companyIds: devCleanupCandidateIds,
    })
    if (runBtn) runBtn.disabled = false
    if (error) {
      showMsg(error.message)
      return
    }
    const n = data?.deletedIds?.length ?? 0
    const au = (data?.authUsersDeleted || []).length
    showMsg(`Deleted ${n} test companies.${au ? ` Removed ${au} auth user(s).` : ''}`)
    devCleanupCandidateIds = []
    await mountAdminDashboard(root)
  })

  function refreshCommPreview() {
    if ((adminState.tab || '') !== 'communication') return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const selectedIds = adminState.commSelected || []
    const countEl = root.querySelector('#adm-comm-selected-count')
    if (countEl) countEl.textContent = String(selectedIds.length)
    const bodyEl = root.querySelector('#adm-comm-preview-body')
    if (!bodyEl) return
    let row = null
    for (const id of selectedIds) {
      row = companies.find((c) => c.id === id)
      if (row) break
    }
    if (!row) {
      bodyEl.innerHTML = COMM_PREVIEW_EMPTY_HTML
      return
    }
    const text = fillCommTemplate(row, adminState.commTemplate, origin)
    bodyEl.innerHTML = escapeHtml(text).replace(/\n/g, '<br />')
  }

  root.querySelectorAll('input[name="adm-comm-audience"]').forEach((r) => {
    r.addEventListener('change', () => {
      if (r.checked) {
        adminState.commAudience = r.value
        mountAdminDashboard(root)
      }
    })
  })

  root.querySelectorAll('input[name="adm-comm-channel"]').forEach((r) => {
    r.addEventListener('change', () => {
      if (r.checked) {
        adminState.commChannel = r.value
        mountAdminDashboard(root)
      }
    })
  })

  let commSearchTimer = null
  root.querySelector('#adm-comm-search')?.addEventListener('input', (e) => {
    adminState.commSearch = String(e.target.value || '')
    window.clearTimeout(commSearchTimer)
    commSearchTimer = window.setTimeout(() => mountAdminDashboard(root), 220)
  })

  root.querySelector('#adm-comm-select-visible')?.addEventListener('click', () => {
    const ids = [...root.querySelectorAll('[data-adm-comm-row]')]
      .map((el) => el.getAttribute('data-adm-comm-row'))
      .filter(Boolean)
    adminState.commSelected = [...new Set([...(adminState.commSelected || []), ...ids])]
    mountAdminDashboard(root)
  })

  root.querySelector('#adm-comm-unselect-all')?.addEventListener('click', () => {
    adminState.commSelected = []
    mountAdminDashboard(root)
  })

  root.querySelectorAll('.adm-comm-cb').forEach((cb) => {
    cb.addEventListener('change', () => {
      const id = cb.getAttribute('data-adm-comm-row')
      if (!id) return
      const next = new Set(adminState.commSelected || [])
      if (cb.checked) next.add(id)
      else next.delete(id)
      adminState.commSelected = [...next]
      mountAdminDashboard(root)
    })
  })

  root.querySelector('#adm-comm-preset')?.addEventListener('change', (e) => {
    const key = e.target.value
    if (key && COMM_TEMPLATE_PRESETS[key]) {
      adminState.commTemplate = COMM_TEMPLATE_PRESETS[key]
      mountAdminDashboard(root)
    }
  })

  root.querySelector('#adm-comm-template')?.addEventListener('input', (e) => {
    adminState.commTemplate = String(e.target.value || '')
    refreshCommPreview()
  })

  root.querySelector('#adm-comm-subject')?.addEventListener('input', (e) => {
    adminState.commSubject = String(e.target.value || '')
  })

  function renderWhatsAppSender(state) {
    const mount = root.querySelector('#adm-wa-sender-root')
    if (!mount) return

    const current = state.recipients[state.index] || null
    const total = state.recipients.length
    const done = state.opened.length + state.manualSkipped.length
    const skippedInvalidText = state.invalidSkipped.length
      ? `Invalid phone skipped: ${state.invalidSkipped.join('; ')}`
      : ''

    if (!current) {
      mount.innerHTML = `
        <div class="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="adm-wa-sender-title">
          <div class="w-full max-w-2xl rounded-t-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 id="adm-wa-sender-title" class="text-lg font-bold text-white">WhatsApp drafts prepared</h3>
                <p class="mt-1 text-sm text-slate-400">Opened ${state.opened.length} draft(s). Skipped ${state.manualSkipped.length + state.invalidSkipped.length} recipient(s).</p>
              </div>
              <button type="button" data-wa-close class="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">${icon.x('h-5 w-5')}</button>
            </div>
            ${skippedInvalidText ? `<p class="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-100">${escapeHtml(skippedInvalidText)}</p>` : ''}
            <button type="button" data-wa-close class="mt-5 w-full rounded-2xl bg-amber-400 py-3 text-sm font-bold text-slate-900 hover:bg-amber-300">Done</button>
          </div>
        </div>`
      mount.querySelectorAll('[data-wa-close]').forEach((btn) => {
        btn.addEventListener('click', () => {
          mount.innerHTML = ''
          const parts = []
          if (state.opened.length) parts.push(`Opened ${state.opened.length} WhatsApp draft(s).`)
          if (state.invalidSkipped.length) parts.push(`Invalid phone skipped: ${state.invalidSkipped.join('; ')}`)
          if (state.manualSkipped.length) parts.push(`Manually skipped ${state.manualSkipped.length}.`)
          showMsg(parts.join(' ') || 'WhatsApp sender closed.')
        })
      })
      return
    }

    const escapedMessage = escapeHtml(current.message).replace(/\n/g, '<br />')
    const fallbackHtml = state.popupBlocked
      ? `<a href="${escapeHtml(current.url)}" target="_blank" rel="noopener noreferrer" data-wa-fallback class="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-slate-900 shadow hover:bg-amber-100">Click here to open WhatsApp</a>`
      : ''

    mount.innerHTML = `
      <div class="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="adm-wa-sender-title">
        <div class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:rounded-3xl sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-amber-300">Recipient ${state.index + 1} of ${total}</p>
              <h3 id="adm-wa-sender-title" class="mt-1 text-lg font-bold text-white">${escapeHtml(current.company.name || '')}</h3>
              <p class="mt-1 text-sm text-slate-400">${escapeHtml(current.company.phone || '')}</p>
            </div>
            <button type="button" data-wa-close class="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">${icon.x('h-5 w-5')}</button>
          </div>
          <div class="mt-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm leading-relaxed text-slate-200 shadow-inner">${escapedMessage}</div>
          ${state.popupBlocked ? `<p class="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-100">Popup blocked. Use the fallback link below.</p>` : ''}
          ${fallbackHtml}
          ${skippedInvalidText ? `<p class="mt-3 text-xs text-amber-200/90">${escapeHtml(skippedInvalidText)}</p>` : ''}
          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" data-wa-open class="rounded-2xl bg-[#25D366] py-3 text-sm font-bold text-white shadow hover:bg-[#20bd5a]">Open in WhatsApp</button>
            <button type="button" data-wa-skip class="rounded-2xl border border-slate-600 bg-slate-800 py-3 text-sm font-bold text-slate-100 hover:bg-slate-700">Skip</button>
          </div>
          <p class="mt-3 text-center text-[11px] text-slate-500">${done} completed · Manual sending only, TAXIO does not auto-send messages.</p>
        </div>
      </div>`

    const advance = (kind) => {
      if (kind === 'opened') state.opened.push(current.company.name || current.company.id)
      else state.manualSkipped.push(current.company.name || current.company.id)
      state.index += 1
      state.popupBlocked = false
      renderWhatsAppSender(state)
    }

    mount.querySelector('[data-wa-open]')?.addEventListener('click', () => {
      const openedWindow = window.open(current.url, '_blank', 'noopener,noreferrer')
      if (!openedWindow) {
        state.popupBlocked = true
        renderWhatsAppSender(state)
        return
      }
      advance('opened')
    })
    mount.querySelector('[data-wa-fallback]')?.addEventListener('click', () => {
      advance('opened')
    })
    mount.querySelector('[data-wa-skip]')?.addEventListener('click', () => {
      advance('skipped')
    })
    mount.querySelector('[data-wa-close]')?.addEventListener('click', () => {
      mount.innerHTML = ''
      showMsg('WhatsApp sender closed.')
    })
  }

  root.querySelector('#adm-comm-open-wa')?.addEventListener('click', async () => {
    if (adminState.commChannel !== 'whatsapp') {
      showMsg('Email sending is not available yet. Choose WhatsApp.')
      return
    }
    const template = String(adminState.commTemplate || '').trim()
    if (!template) {
      showMsg('Message template cannot be empty.')
      return
    }
    const selectedIds = [...(adminState.commSelected || [])]
    if (!selectedIds.length) {
      showMsg('Select at least one company.')
      return
    }
    const origin = window.location.origin
    const invalidSkipped = []
    const recipients = []
    for (const id of selectedIds) {
      const company = companies.find((c) => c.id === id)
      if (!company) continue
      const digits = waMeDigits(company.phone)
      if (!digits) {
        invalidSkipped.push(String(company.name || id).trim())
        continue
      }
      const message = fillCommTemplate(company, template, origin)
      recipients.push({
        company,
        digits,
        message,
        url: whatsappDraftUrl(digits, message),
      })
    }
    const skipEl = root.querySelector('#adm-comm-skipped')
    if (skipEl) {
      if (invalidSkipped.length) {
        skipEl.textContent = `Skipped (no valid WhatsApp number): ${invalidSkipped.join('; ')}`
        skipEl.classList.remove('hidden')
      } else {
        skipEl.classList.add('hidden')
        skipEl.textContent = ''
      }
    }
    if (!recipients.length) {
      showMsg(
        invalidSkipped.length
          ? `Skipped ${invalidSkipped.length} row(s). No valid WhatsApp numbers selected.`
          : 'No WhatsApp recipients to open.'
      )
      return
    }
    renderWhatsAppSender({
      recipients,
      invalidSkipped,
      index: 0,
      opened: [],
      manualSkipped: [],
      popupBlocked: false,
    })
  })

  root.querySelector('#adm-comm-send-email')?.addEventListener('click', async () => {
    if (adminState.commChannel !== 'email') {
      showMsg('Choose Email channel first.')
      return
    }
    const subject = String(adminState.commSubject || '').trim()
    if (!subject) {
      showMsg('Email subject cannot be empty.')
      return
    }
    const template = String(adminState.commTemplate || '').trim()
    if (!template) {
      showMsg('Message template cannot be empty.')
      return
    }
    const selectedIds = [...(adminState.commSelected || [])]
    if (!selectedIds.length) {
      showMsg('Select at least one company.')
      return
    }

    const origin = window.location.origin
    const recipients = []
    const preSkipped = []
    for (const id of selectedIds) {
      const company = companies.find((c) => c.id === id)
      if (!company) continue
      const email = String(company.email || '').trim()
      if (!email) {
        preSkipped.push(String(company.name || id))
        continue
      }
      recipients.push({
        email,
        subject,
        message: fillCommTemplate(company, template, origin),
      })
    }
    if (!recipients.length) {
      showMsg('No selected company has a valid email.')
      return
    }
    if (
      !window.confirm(
        `Send ${recipients.length} email(s)?\n\nSubject: ${subject}\n\nThis sends individual emails to selected companies.`
      )
    )
      return

    const btn = root.querySelector('#adm-comm-send-email')
    if (btn) btn.disabled = true
    const { data, error } = await adminSendCommunicationEmail({
      recipients,
      subject,
      message: template,
    })
    if (btn) btn.disabled = false
    if (error) {
      showMsg(error.message)
      return
    }

    const sent = Number(data?.sent || 0)
    const failed = Array.isArray(data?.failed) ? data.failed : []
    const skipped = Array.isArray(data?.skipped) ? data.skipped : []
    const retried = Number(data?.retried || 0)
    const totalSkipped = preSkipped.length + skipped.length
    showMsg(
      `Sent: ${sent}. Skipped: ${totalSkipped}. Failed: ${failed.length}. Retried (rate limit): ${retried}.`
    )

    const skipEl = root.querySelector('#adm-comm-skipped')
    if (skipEl) {
      const parts = []
      if (preSkipped.length) {
        parts.push(`Missing company email: ${preSkipped.join('; ')}`)
      }
      if (skipped.length) {
        parts.push(
          `Skipped by API: ${skipped
            .map((s) => `${s.email || 'unknown'} (${s.reason || 'skipped'})`)
            .join('; ')}`
        )
      }
      if (failed.length) {
        parts.push(
          `Failed: ${failed
            .map((f) => `${f.email || 'unknown'} (${f.error || 'send_failed'})`)
            .join('; ')}`
        )
      }
      if (parts.length) {
        skipEl.textContent = parts.join(' | ')
        skipEl.classList.remove('hidden')
      } else {
        skipEl.classList.add('hidden')
        skipEl.textContent = ''
      }
    }
  })

  root.querySelectorAll('[data-adm]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.getAttribute('data-adm')
      const id = btn.getAttribute('data-id')
      const slug = btn.getAttribute('data-slug')
      const plan = btn.getAttribute('data-plan')

      if (action === 'copy' && slug) {
        const url = absolutePublicBookingUrl(slug)
        try {
          await navigator.clipboard.writeText(url)
          showMsg('Booking link copied.')
        } catch {
          showMsg(url)
        }
        return
      }

      if (action === 'edit' && id) {
        const c = companies.find((x) => x.id === id)
        if (!c) return
        openEditCompany(c)
        return
      }

      if (action === 'delete' && id) {
        const c = companies.find((x) => x.id === id)
        if (!c) return
        if (
          !window.confirm(
            `Delete company "${c.name}"? This removes the company, fleet, members, and booking requests. This cannot be undone.`
          )
        )
          return
        btn.disabled = true
        const { error } = await deleteCompanyAsAdmin(id)
        btn.disabled = false
        if (error) showMsg(error.message)
        else {
          await mountAdminDashboard(root)
          showMsg('Company deleted.')
        }
        return
      }

      if (action === 'approve') {
        btn.disabled = true
        const { error, data } = await approveCompany(id)
        btn.disabled = false
        if (error) {
          showMsg(error.message)
          return
        }
        adminState.tab = 'active'
        await mountAdminDashboard(root)
        if (data?.emailWarning) {
          showMsg('Company approved but email failed to send.')
          console.warn('[adminDashboard:approve]', data.emailWarning)
        } else {
          showMsg('Company approved — open Active Companies to see the green Approved badge.')
        }
        return
      }
      if (action === 'reject') {
        if (!window.confirm('Reject this company?')) return
        const { error } = await rejectCompany(id)
        if (error) showMsg(error.message)
        else mountAdminDashboard(root)
        return
      }
      if (action === 'suspend') {
        if (!window.confirm('Suspend this company?')) return
        const { error } = await suspendCompany(id)
        if (error) showMsg(error.message)
        else mountAdminDashboard(root)
        return
      }
      if (action === 'reactivate') {
        if (!window.confirm('Reactivate this company?')) return
        const { error } = await reactivateCompany(id)
        if (error) showMsg(error.message)
        else mountAdminDashboard(root)
        return
      }
      if (action === 'toggleplan') {
        const next = plan === 'premium' ? 'basic' : 'premium'
        const { error } = await setCompanySubscriptionPlan(id, next)
        if (error) showMsg(error.message)
        else mountAdminDashboard(root)
        return
      }
      if (action === 'sendinv') {
        window.alert('Invoice send — hook to email/WhatsApp in production.')
      }
    })
  })

  root.querySelector('#adm-edit-cancel')?.addEventListener('click', () => {
    root.querySelector('#adm-company-edit')?.close()
  })

  root.querySelector('#adm-edit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const id = root.querySelector('#adm-edit-id')?.value
    if (!id) return

    const b = adminState.editBaseline
    if (!b || b.id !== id) {
      showMsg('Edit session expired. Close and open Edit again.')
      return
    }

    const slug = slugFromCompanyName(root.querySelector('#adm-edit-slug')?.value || '')
    const name = String(root.querySelector('#adm-edit-name')?.value || '').trim()
    const email = String(root.querySelector('#adm-edit-email')?.value || '').trim()
    const phone = String(root.querySelector('#adm-edit-phone')?.value || '').trim()
    const city = String(root.querySelector('#adm-edit-city')?.value || '').trim()
    const country = String(root.querySelector('#adm-edit-country')?.value || '').trim()
    const vat_number = String(root.querySelector('#adm-edit-vat')?.value || '').trim()
    const slogan = String(root.querySelector('#adm-edit-slogan')?.value || '').trim()
    const availability_status =
      root.querySelector('#adm-edit-availability')?.value ?? 'available'
    const pricingRaw = root.querySelector('#adm-edit-pricing')?.value ?? ''
    const pricingCompare = normalizePricingTextForCompare(pricingRaw)

    const patch = {}
    if (name !== b.name) patch.name = name
    if (slug !== b.slug) patch.slug = slug
    if (email !== b.email) patch.email = email
    if (phone !== b.phone) patch.phone = phone
    if (city !== b.city) patch.city = city
    if (country !== b.country) patch.country = country
    if (vat_number !== b.vat_number) patch.vat_number = vat_number
    if (slogan !== b.slogan) patch.slogan = slogan
    if (availability_status !== b.availability_status) patch.availability_status = availability_status
    if (pricingCompare !== b.pricingCompare) {
      patch.pricing = pricingRaw.trim() === '' ? {} : pricingRaw
    }

    if (Object.keys(patch).length === 0) {
      showMsg('No changes to save.')
      return
    }

    if ('name' in patch && !patch.name) {
      showMsg('Name cannot be empty.')
      return
    }
    if ('email' in patch && !patch.email) {
      showMsg('Email cannot be empty.')
      return
    }
    if ('slug' in patch && (!patch.slug || patch.slug.length < 2)) {
      showMsg('Slug must be at least 2 letters or numbers.')
      return
    }

    const submitBtn = root.querySelector('#adm-edit-submit')
    submitBtn.disabled = true
    const { error, data } = await updateCompanyAsAdmin(id, patch)
    submitBtn.disabled = false
    if (error) {
      showMsg(error.message, 'error')
      return
    }
    root.querySelector('#adm-company-edit')?.close()
    await mountAdminDashboard(root)
    const warnings = Array.isArray(data?.warnings) ? data.warnings : []
    showMsg(
      warnings.length ? `Company updated. ${warnings.join(' ')}` : 'Company updated successfully.',
      warnings.length ? 'info' : 'success'
    )
  })
}
