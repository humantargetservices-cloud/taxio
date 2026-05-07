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
} from '../lib/api.js'
import { slugFromCompanyName } from '../lib/slug.js'
import { isPlatformAdmin, signOutEverywhere } from '../lib/auth.js'
import { escapeHtml } from '../lib/html.js'
import { icon } from '../lib/icons.js'
import { absolutePublicBookingUrl } from '../lib/tenant.js'

const adminState = {
  tab: 'requests',
  editBaseline: null,
  /** approved | pending | inactive | all */
  commAudience: 'approved',
  commSelected: [],
  commSearch: '',
  commTemplate:
    'Hello {company_name},\n\nWe have an update for your TAXIO account.\nStatus: {status}\nCity: {city}\nBooking page: {booking_url}\nLogin: {login_url}',
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

function statusLabel(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'approved') return 'Approved'
  if (s === 'pending') return 'Pending'
  if (s === 'suspended') return 'Suspended'
  if (s === 'rejected') return 'Rejected'
  return status || '—'
}

/** Digits-only for https://wa.me/<digits> (no +), minimum viable length. */
function waMeDigits(phone) {
  const d = normalizePhoneForWhatsApp(phone)
  if (!d || d.startsWith('0')) return ''
  if (d.length < 8 || d.length > 15) return ''
  return d
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
  let totalCars = 0
  let carMap = {}
  let recentBookings = []
  let abuseEvents = []
  try {
    companies = await listAllCompaniesForAdmin()
  } catch {
    companies = []
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

  if (!['requests', 'active', 'subscriptions', 'communication'].includes(adminState.tab)) {
    adminState.tab = 'requests'
  }
  if (!['approved', 'pending', 'inactive', 'all'].includes(adminState.commAudience)) {
    adminState.commAudience = 'approved'
  }
  if (adminState.commChannel !== 'whatsapp' && adminState.commChannel !== 'email') {
    adminState.commChannel = 'whatsapp'
  }
  const tab = adminState.tab
  const tabBtn = (id, label) =>
    `<button type="button" data-adm-tab="${id}" class="rounded-full px-5 py-2 text-sm font-semibold transition ${
      tab === id ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
    }">${label}</button>`

  let mainHtml = ''

  if (tab === 'requests') {
    const rows =
      pending.length === 0
        ? `<tr><td colspan="8" class="px-4 py-12 text-center text-gray-500">No pending company requests.</td></tr>`
        : pending
            .map((c) => {
              const created = c.created_at ? String(c.created_at).slice(0, 10) : '—'
              const city = c.city || '—'
              const ncars = carMap[c.id] || 0
              return `
          <tr class="border-b border-gray-100">
            <td class="px-4 py-3 font-semibold text-gray-900">${escapeHtml(c.name)}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(c.vat_number || '—')}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(c.email)}</td>
            <td class="px-4 py-3 text-sm text-gray-600"><span class="inline-flex items-center gap-1">${icon.mapPin('h-3.5 w-3.5 shrink-0 text-gray-400')}${escapeHtml(city)}</span></td>
            <td class="px-4 py-3"><span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">${icon.car('h-3.5 w-3.5')}${ncars}</span></td>
            <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(created)}</td>
            <td class="px-4 py-3"><span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Pending</span></td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-2">
                <button type="button" data-adm="edit" data-id="${escapeHtml(c.id)}" class="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold">Edit</button>
                <button type="button" data-adm="delete" data-id="${escapeHtml(c.id)}" class="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800">Delete</button>
                <button type="button" data-adm="approve" data-id="${escapeHtml(c.id)}" class="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800">${icon.check('h-3.5 w-3.5')}Approve</button>
                <button type="button" data-adm="reject" data-id="${escapeHtml(c.id)}" class="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500">${icon.x('h-3.5 w-3.5')}Reject</button>
              </div>
            </td>
          </tr>`
            })
            .join('')
    mainHtml = `
      <div class="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
        <h2 class="text-lg font-bold text-gray-900">New Company Requests</h2>
        <p class="text-sm text-gray-500">Review and approve company registration requests</p>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th class="py-3 pr-4">Company Name</th>
                <th class="py-3 pr-4">VAT Number</th>
                <th class="py-3 pr-4">Email</th>
                <th class="py-3 pr-4">City</th>
                <th class="py-3 pr-4">Cars</th>
                <th class="py-3 pr-4">Request Date</th>
                <th class="py-3 pr-4">Status</th>
                <th class="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`
  } else if (tab === 'active') {
    const rows =
      active.length + suspended.length === 0
        ? `<tr><td colspan="7" class="px-4 py-12 text-center text-gray-500">No approved or suspended companies.</td></tr>`
        : [...active, ...suspended]
            .map((c) => {
              const ncars = carMap[c.id] || 0
              const statusBadge =
                c.status === 'suspended'
                  ? '<span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Suspended</span>'
                  : '<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Approved</span>'
              return `
          <tr class="border-b border-gray-100">
            <td class="px-4 py-3 font-semibold text-gray-900">${escapeHtml(c.name)}</td>
            <td class="px-4 py-3 font-mono text-sm text-gray-600">${escapeHtml(c.slug)}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(c.email)}</td>
            <td class="px-4 py-3 text-sm">${statusBadge}</td>
            <td class="px-4 py-3 text-sm">${planBadge(c.subscription_plan)}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${ncars}</td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-2">
                <button type="button" data-adm="edit" data-id="${escapeHtml(c.id)}" class="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold">Edit</button>
                <button type="button" data-adm="delete" data-id="${escapeHtml(c.id)}" class="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800">Delete</button>
                <button type="button" data-adm="copy" data-slug="${escapeHtml(c.slug)}" class="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold">Copy link</button>
                ${
                  c.status === 'suspended'
                    ? `<button type="button" data-adm="reactivate" data-id="${escapeHtml(c.id)}" class="rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">Reactivate</button>`
                    : `<button type="button" data-adm="suspend" data-id="${escapeHtml(c.id)}" class="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Suspend</button>`
                }
              </div>
            </td>
          </tr>`
            })
            .join('')
    mainHtml = `
      <div class="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
        <h2 class="text-lg font-bold text-gray-900">Active Companies</h2>
        <p class="text-sm text-gray-500">Approved tenants on the platform</p>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th class="py-3 pr-4">Company</th>
                <th class="py-3 pr-4">Slug</th>
                <th class="py-3 pr-4">Email</th>
                <th class="py-3 pr-4">Status</th>
                <th class="py-3 pr-4">Plan</th>
                <th class="py-3 pr-4">Cars</th>
                <th class="py-3">Actions</th>
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
      <div class="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
        <h2 class="text-lg font-bold text-gray-900">Subscription Status &amp; Revenue</h2>
        <p class="text-sm text-gray-500">Monitor company subscriptions and calculate fees.</p>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th class="py-3 pr-4">Company</th>
                <th class="py-3 pr-4">Plan</th>
                <th class="py-3 pr-4">Cars</th>
                <th class="py-3 pr-4">Base</th>
                <th class="py-3 pr-4">Car fee</th>
                <th class="py-3 pr-4">Total / mo</th>
                <th class="py-3 pr-4">Trips</th>
                <th class="py-3 pr-4">Next invoice</th>
                <th class="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p class="text-xs font-semibold text-blue-800">Premium Plans</p>
            <p class="text-lg font-bold text-blue-900">${premiumCount} companies</p>
          </div>
          <div class="rounded-xl border border-green-200 bg-green-50 p-4">
            <p class="text-xs font-semibold text-green-800">Basic Plans</p>
            <p class="text-lg font-bold text-green-900">${basicCount} companies</p>
          </div>
          <div class="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p class="text-xs font-semibold text-orange-800">Total Cars</p>
            <p class="text-lg font-bold text-orange-900">${totalCars} fleet</p>
          </div>
          <div class="rounded-xl border border-violet-200 bg-violet-50 p-4">
            <p class="text-xs font-semibold text-violet-800">Total Revenue</p>
            <p class="text-lg font-bold text-violet-900">€${revenue} / mo</p>
          </div>
        </div>
        <div class="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <p class="font-bold text-gray-900">Pricing Structure</p>
          <ul class="mt-2 list-inside list-disc space-y-1">
            <li>Basic Plan: €30/month base</li>
            <li>Premium Plan: €50/month base</li>
            <li>Additional cars: €5 per car per month</li>
            <li>Example: Premium + 8 cars = €50 + €40 = €90/month</li>
          </ul>
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

    const commRows =
      visible.length === 0
        ? `<tr><td colspan="7" class="px-4 py-10 text-center text-slate-400">No companies match this audience or search.</td></tr>`
        : visible
            .map((c) => {
              const st = escapeHtml(statusLabel(c.status))
              const booking =
                c.status === 'approved' && c.slug ? absolutePublicBookingUrl(c.slug) : ''
              const bookingCell = booking
                ? `<a href="${escapeHtml(booking)}" target="_blank" rel="noopener noreferrer" class="break-all font-mono text-xs text-amber-400 underline decoration-amber-400/40 hover:text-amber-300">${escapeHtml(booking)}</a>`
                : '<span class="text-slate-500">—</span>'
              const noWa = !waMeDigits(c.phone)
              const waHint = noWa
                ? '<span class="ml-1 text-amber-400" title="Not usable for WhatsApp">●</span>'
                : ''
              return `
          <tr class="border-b border-slate-700/50 transition hover:bg-slate-800/50">
            <td class="px-2 py-2.5 align-top sm:px-3">
              <input type="checkbox" data-adm-comm-row="${escapeHtml(c.id)}" class="adm-comm-cb mt-0.5 h-4 w-4 rounded border-slate-500 bg-slate-800 text-amber-500 focus:ring-amber-500/40" ${selectedSet.has(c.id) ? 'checked' : ''} />
            </td>
            <td class="px-2 py-2.5 text-sm font-semibold text-slate-100 sm:px-3">${escapeHtml(c.name || '')}</td>
            <td class="px-2 py-2.5 sm:px-3"><span class="inline-flex rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-200">${st}</span></td>
            <td class="px-2 py-2.5 text-xs text-slate-300 break-all sm:px-3 sm:text-sm">${escapeHtml(c.email || '—')}</td>
            <td class="px-2 py-2.5 text-xs text-slate-300 sm:px-3 sm:text-sm">${escapeHtml(c.phone || '—')}${waHint}</td>
            <td class="px-2 py-2.5 text-xs text-slate-300 sm:px-3 sm:text-sm">${escapeHtml(c.city || '—')}</td>
            <td class="px-2 py-2.5 text-xs sm:px-3 sm:text-sm">${bookingCell}</td>
          </tr>`
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
      : '<span class="italic text-slate-500">Select companies to preview a filled message.</span>'

    const selCount = (adminState.commSelected || []).length
    const aud = adminState.commAudience

    mainHtml = `
      <div class="rounded-2xl border border-slate-600/90 bg-slate-900 p-4 shadow-xl ring-1 ring-slate-700/60 sm:p-6">
        <div class="flex flex-col gap-2 border-b border-slate-700/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-lg font-bold tracking-tight text-white sm:text-xl">B2B Communication</h2>
            <p class="mt-1 text-sm text-slate-400">Contact companies using templates. WhatsApp opens manually — no bulk auto-send.</p>
          </div>
        </div>

        <div class="mt-4 rounded-xl border border-amber-400/30 bg-amber-950/40 px-3 py-2.5 text-xs leading-relaxed text-amber-100/95 sm:text-sm">
          <strong class="text-amber-200">Safety:</strong> WhatsApp requires manual confirmation. TAXIO will open each message, but you must press Send yourself.
        </div>

        <div class="mt-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Audience</p>
          <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <label class="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${aud === 'approved' ? 'border-amber-400/50 bg-slate-800' : 'border-slate-600 bg-slate-800/60'}">
              <input type="radio" name="adm-comm-audience" value="approved" class="text-amber-500" ${aud === 'approved' ? 'checked' : ''} />
              Approved companies
            </label>
            <label class="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${aud === 'pending' ? 'border-amber-400/50 bg-slate-800' : 'border-slate-600 bg-slate-800/60'}">
              <input type="radio" name="adm-comm-audience" value="pending" class="text-amber-500" ${aud === 'pending' ? 'checked' : ''} />
              Pending requests
            </label>
            <label class="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${aud === 'inactive' ? 'border-amber-400/50 bg-slate-800' : 'border-slate-600 bg-slate-800/60'}">
              <input type="radio" name="adm-comm-audience" value="inactive" class="text-amber-500" ${aud === 'inactive' ? 'checked' : ''} />
              Suspended / rejected
            </label>
            <label class="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${aud === 'all' ? 'border-amber-400/50 bg-slate-800' : 'border-slate-600 bg-slate-800/60'}">
              <input type="radio" name="adm-comm-audience" value="all" class="text-amber-500" ${aud === 'all' ? 'checked' : ''} />
              All companies
            </label>
          </div>
        </div>

        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label class="min-w-0 flex-1 text-xs font-semibold text-slate-400">Search
            <input id="adm-comm-search" type="search" value="${escapeHtml(adminState.commSearch || '')}" placeholder="Name, email, phone, city, status…" class="mt-1 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
          </label>
          <div class="flex flex-wrap gap-2">
            <button type="button" id="adm-comm-select-visible" class="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700">Select all visible</button>
            <button type="button" id="adm-comm-unselect-all" class="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700">Unselect all</button>
          </div>
        </div>

        <p class="mt-2 text-xs text-slate-500">${visible.length} shown · ${selCount} selected</p>

        <div class="mt-3 overflow-x-auto rounded-xl border border-slate-700/80">
          <table class="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr class="border-b border-slate-700 bg-slate-800/90 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th class="w-10 py-3 pl-2 pr-1 sm:pl-3"></th>
                <th class="py-3 pr-2">Company</th>
                <th class="py-3 pr-2">Status</th>
                <th class="py-3 pr-2">Email</th>
                <th class="py-3 pr-2">Phone</th>
                <th class="py-3 pr-2">City</th>
                <th class="py-3 pr-3">Booking URL</th>
              </tr>
            </thead>
            <tbody>${commRows}</tbody>
          </table>
        </div>

        <div class="mt-6 grid gap-5 lg:grid-cols-2">
          <div class="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Channel</p>
            <div class="mt-3 flex flex-col gap-2 sm:flex-row">
              <label class="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm ${adminState.commChannel === 'whatsapp' ? 'border-amber-400/40 bg-slate-800' : ''}">
                <input type="radio" name="adm-comm-channel" value="whatsapp" class="text-amber-500" ${adminState.commChannel === 'whatsapp' ? 'checked' : ''} />
                WhatsApp
              </label>
              <label class="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-500 ${adminState.commChannel === 'email' ? 'border-amber-400/40 bg-slate-800 text-slate-300' : ''}">
                <input type="radio" name="adm-comm-channel" value="email" class="text-amber-500" ${adminState.commChannel === 'email' ? 'checked' : ''} />
                Email <span class="text-xs font-normal">(coming soon)</span>
              </label>
            </div>

            <label class="mt-4 block text-xs font-semibold text-slate-400">Ready templates</label>
            <select id="adm-comm-preset" class="mt-1 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20">
              <option value="">— Choose a template —</option>
              <option value="welcome">Welcome / onboarding</option>
              <option value="payment">Payment reminder</option>
              <option value="feature">New feature announcement</option>
              <option value="trial_end">Trial ending reminder</option>
              <option value="missing_info">Missing information request</option>
              <option value="general">General update</option>
            </select>

            <label class="mt-4 block text-xs font-semibold text-slate-400">Message template</label>
            <textarea id="adm-comm-template" rows="10" class="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20">${escapeHtml(
              adminState.commTemplate || ''
            )}</textarea>
            <p class="mt-2 text-xs text-slate-500">Variables: <code class="text-amber-400/90">{company_name}</code> <code class="text-amber-400/90">{status}</code> <code class="text-amber-400/90">{booking_url}</code> <code class="text-amber-400/90">{login_url}</code> <code class="text-amber-400/90">{city}</code></p>
          </div>
          <div class="flex flex-col rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Preview</p>
            <p class="mt-2 text-sm text-slate-300">Selected: <strong id="adm-comm-selected-count" class="text-white">${selCount}</strong></p>
            <div id="adm-comm-preview-body" class="mt-3 flex min-h-[12rem] flex-1 flex-col rounded-lg border border-slate-700/80 bg-slate-900/80 p-3 text-sm leading-relaxed text-slate-200">${previewHtml}</div>
            <p id="adm-comm-skipped" class="mt-3 hidden text-xs text-amber-200/90"></p>
            <button type="button" id="adm-comm-open-wa" ${adminState.commChannel !== 'whatsapp' ? 'disabled' : ''} class="mt-4 w-full rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:opacity-40">Open WhatsApp messages</button>
            <p class="mt-2 text-center text-xs text-slate-500">Opens <code class="text-slate-400">https://wa.me/&lt;number&gt;?text=…</code> one company at a time.</p>
          </div>
        </div>
      </div>`
  } else {
    mainHtml = '<div class="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">Select a tab above.</div>'
  }

  root.innerHTML = `
    <div class="min-h-screen bg-[#e8e4f0] pb-16">
      <header class="bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 px-4 py-6 shadow-lg">
        <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            ${icon.shield('h-10 w-10 text-white')}
            <div>
              <h1 class="text-xl font-bold text-white md:text-2xl">Platform Admin Dashboard</h1>
              <p class="text-sm text-white/80">Subscription &amp; company management</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" id="adm-qr" class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow hover:bg-gray-100">${icon.sparkles('h-4 w-4')}QR Codes</button>
            <button type="button" id="adm-logout" class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow hover:bg-gray-100">${icon.logOut('h-4 w-4')}Logout</button>
          </div>
        </div>
      </header>

      <div class="mx-auto max-w-6xl px-4 -mt-4">
        ${
          warningBadges
            ? `<div class="mb-4 flex flex-wrap gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">${warningBadges}</div>`
            : ''
        }
        <div class="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-sm font-bold text-gray-900">Abuse stats (last 24h)</h3>
            <div class="flex flex-wrap gap-2">
              <span class="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">Registrations blocked: ${registrationsBlocked24h}</span>
              <span class="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">Bookings blocked: ${bookingsBlocked24h}</span>
            </div>
          </div>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-600">Top IPs</p>
              <div class="mt-2 text-xs text-gray-800">
                ${
                  topIps.length
                    ? topIps
                        .map(
                          ([ip, count]) =>
                            `<p class="flex items-center justify-between gap-2"><span class="font-mono">${escapeHtml(ip)}</span><span class="rounded-full bg-gray-200 px-2 py-0.5 font-semibold">${count}</span></p>`
                        )
                        .join('')
                    : '<p class="text-gray-500">No abuse events in last 24h.</p>'
                }
              </div>
            </div>
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-600">Top targeted companies</p>
              <div class="mt-2 text-xs text-gray-800">
                ${
                  topCompanies.length
                    ? topCompanies
                        .map(
                          (row) =>
                            `<p class="flex items-center justify-between gap-2"><span>${escapeHtml(row.name)}</span><span class="rounded-full bg-gray-200 px-2 py-0.5 font-semibold">${row.count}</span></p>`
                        )
                        .join('')
                    : '<p class="text-gray-500">No company-targeted abuse events in last 24h.</p>'
                }
              </div>
            </div>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div class="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-md">
            <div>
              <p class="text-xs font-semibold uppercase text-gray-500">Pending Requests</p>
              <p class="text-3xl font-bold text-blue-600">${pending.length}</p>
            </div>
            ${icon.building2('h-10 w-10 text-gray-200')}
          </div>
          <div class="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-md">
            <div>
              <p class="text-xs font-semibold uppercase text-gray-500">Active Companies</p>
              <p class="text-3xl font-bold text-green-600">${active.length}</p>
            </div>
            ${icon.building2('h-10 w-10 text-gray-200')}
          </div>
          <div class="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-md">
            <div>
              <p class="text-xs font-semibold uppercase text-gray-500">Suspended Companies</p>
              <p class="text-3xl font-bold text-amber-600">${suspended.length}</p>
            </div>
            ${icon.building2('h-10 w-10 text-gray-200')}
          </div>
          <div class="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-md">
            <div>
              <p class="text-xs font-semibold uppercase text-gray-500">Total Cars</p>
              <p class="text-3xl font-bold text-orange-500">${totalCars}</p>
            </div>
            ${icon.car('h-10 w-10 text-gray-200')}
          </div>
          <div class="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-md">
            <div>
              <p class="text-xs font-semibold uppercase text-gray-500">Monthly Revenue</p>
              <p class="text-3xl font-bold text-violet-600">€${revenue}</p>
            </div>
            ${icon.credit('h-10 w-10 text-gray-200')}
          </div>
        </div>

        <div class="mt-6 overflow-x-auto pb-1">
          <div class="flex min-w-max justify-center gap-1 rounded-full bg-gray-200/80 p-1 shadow-inner sm:min-w-0">
          ${tabBtn('requests', 'Company Requests')}
          ${tabBtn('active', 'Active Companies')}
          ${tabBtn('subscriptions', 'Subscriptions & Revenue')}
          ${tabBtn('communication', 'Communication')}
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
      </div>
    </div>`

  function showMsg(t) {
    const el = root.querySelector('#adm-msg')
    el.textContent = t
    el.classList.remove('hidden')
    setTimeout(() => el.classList.add('hidden'), 4000)
  }

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

  root.querySelector('#adm-logout')?.addEventListener('click', async () => {
    await signOutEverywhere()
    navigate('/')
  })

  root.querySelector('#adm-qr')?.addEventListener('click', () => {
    window.alert('QR batch tools — connect to your operational workflow when ready.')
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
      bodyEl.innerHTML =
        '<span class="italic text-slate-500">Select companies to preview a filled message.</span>'
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
    const skipped = []
    let opened = 0
    for (const id of selectedIds) {
      const company = companies.find((c) => c.id === id)
      if (!company) continue
      const digits = waMeDigits(company.phone)
      if (!digits) {
        skipped.push(String(company.name || id).trim())
        continue
      }
      const message = fillCommTemplate(company, template, origin)
      const ok = window.confirm(
        `Open WhatsApp for ${company.name}?\n\nPhone: ${company.phone}\n\nMessage:\n${message}`
      )
      if (!ok) continue
      const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
      window.open(waUrl, '_blank', 'noopener,noreferrer')
      opened += 1
      await new Promise((resolve) => window.setTimeout(resolve, 350))
    }
    const skipEl = root.querySelector('#adm-comm-skipped')
    if (skipEl) {
      if (skipped.length) {
        skipEl.textContent = `Skipped (no valid WhatsApp number): ${skipped.join('; ')}`
        skipEl.classList.remove('hidden')
      } else {
        skipEl.classList.add('hidden')
        skipEl.textContent = ''
      }
    }
    if (opened > 0) showMsg(`Opened ${opened} WhatsApp draft(s). Remember to press Send in each chat.`)
    else if (!skipped.length) showMsg('No WhatsApp tabs opened.')
    else showMsg(`Skipped ${skipped.length} row(s). See list below the preview.`)
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
    const { error } = await updateCompanyAsAdmin(id, patch)
    submitBtn.disabled = false
    if (error) {
      showMsg(error.message)
      return
    }
    root.querySelector('#adm-company-edit')?.close()
    await mountAdminDashboard(root)
    showMsg('Company updated.')
  })
}
