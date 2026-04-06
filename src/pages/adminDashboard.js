import { navigate } from '../nav.js'
import {
  getSession,
  listAllCompaniesForAdmin,
  approveCompany,
  rejectCompany,
  countAllCarsAdmin,
  countCarsByCompanyIdsAdmin,
  setCompanySubscriptionPlan,
} from '../lib/api.js'
import { isPlatformAdmin, signOutEverywhere } from '../lib/auth.js'
import { escapeHtml } from '../lib/html.js'
import { icon } from '../lib/icons.js'
import { bookPathFromSlug } from '../lib/tenant.js'

const adminState = { tab: 'requests' }

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

  const pending = companies.filter((c) => c.status === 'pending')
  const active = companies.filter((c) => c.status === 'approved')
  const revenue = monthlyRevenueEuro(companies, carMap)

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
      active.length === 0
        ? `<tr><td colspan="6" class="px-4 py-12 text-center text-gray-500">No active companies.</td></tr>`
        : active
            .map((c) => {
              const ncars = carMap[c.id] || 0
              const url = `${window.location.origin}${bookPathFromSlug(c.slug)}`
              return `
          <tr class="border-b border-gray-100">
            <td class="px-4 py-3 font-semibold text-gray-900">${escapeHtml(c.name)}</td>
            <td class="px-4 py-3 font-mono text-sm text-gray-600">${escapeHtml(c.slug)}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(c.email)}</td>
            <td class="px-4 py-3 text-sm">${planBadge(c.subscription_plan)}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${ncars}</td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-2">
                <button type="button" data-adm="copy" data-slug="${escapeHtml(c.slug)}" class="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold">Copy link</button>
                <button type="button" data-adm="suspend" data-id="${escapeHtml(c.id)}" class="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">Suspend</button>
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
                <th class="py-3 pr-4">Plan</th>
                <th class="py-3 pr-4">Cars</th>
                <th class="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`
  } else {
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
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <div class="mt-6 flex flex-wrap justify-center gap-1 rounded-full bg-gray-200/80 p-1 shadow-inner">
          ${tabBtn('requests', 'Company Requests')}
          ${tabBtn('active', 'Active Companies')}
          ${tabBtn('subscriptions', 'Subscriptions & Revenue')}
        </div>

        <p id="adm-msg" class="mt-4 hidden rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"></p>

        <div class="mt-6">${mainHtml}</div>
      </div>
    </div>`

  function showMsg(t) {
    const el = root.querySelector('#adm-msg')
    el.textContent = t
    el.classList.remove('hidden')
    setTimeout(() => el.classList.add('hidden'), 4000)
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

  root.querySelectorAll('[data-adm]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.getAttribute('data-adm')
      const id = btn.getAttribute('data-id')
      const slug = btn.getAttribute('data-slug')
      const plan = btn.getAttribute('data-plan')

      if (action === 'copy' && slug) {
        const url = `${window.location.origin}${bookPathFromSlug(slug)}`
        try {
          await navigator.clipboard.writeText(url)
          showMsg('Booking link copied.')
        } catch {
          showMsg(url)
        }
        return
      }

      if (action === 'approve') {
        const { error } = await approveCompany(id)
        if (error) showMsg(error.message)
        else mountAdminDashboard(root)
        return
      }
      if (action === 'reject' || action === 'suspend') {
        if (!window.confirm('Reject this company?')) return
        const { error } = await rejectCompany(id)
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
}
