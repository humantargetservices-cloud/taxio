import { navigate } from '../nav.js'
import { getSession, getCompanyForUser } from '../lib/api.js'
import { escapeHtml } from '../lib/html.js'
import { icon } from '../lib/icons.js'
import { absolutePublicBookingUrl } from '../lib/tenant.js'

function loadingShell() {
  const dark = document.documentElement.classList.contains('dark')
  return `
    <div class="min-h-screen flex flex-col items-center justify-center px-4 ${dark ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}">
      <div class="h-10 w-10 animate-pulse rounded-full border-2 ${dark ? 'border-yellow-400/40 border-t-yellow-400' : 'border-blue-200 border-t-blue-600'}"></div>
      <p class="mt-4 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}">Loading your account…</p>
    </div>`
}

export async function mountPendingApproval(root) {
  root.innerHTML = loadingShell()

  const session = await getSession()
  if (!session) {
    const pendingRaw = localStorage.getItem('pendingRegistration')
    let pending = null
    try {
      pending = pendingRaw ? JSON.parse(pendingRaw) : null
    } catch {
      pending = null
    }
    if (!pending?.companyName) {
      navigate('/')
      return
    }
    const dark = document.documentElement.classList.contains('dark')
    root.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center px-4 py-10 ${dark ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}">
        <div class="max-w-lg rounded-xl border-2 ${dark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white'} p-8 text-center shadow-2xl">
          <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ${dark ? 'bg-yellow-400' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}">
            ${icon.building2(dark ? 'h-8 w-8 text-slate-900' : 'h-8 w-8 text-white')}
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Pending approval</h1>
          <p class="mt-3 text-gray-600 dark:text-gray-400">
            Thanks for registering <strong class="text-slate-800 dark:text-gray-200">${escapeHtml(pending.companyName)}</strong>.
            A platform administrator will review your request shortly.
          </p>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-500">
            We will email your credentials to <strong>${escapeHtml(pending.email || '')}</strong> once approved.
          </p>
          <div class="mt-8 flex justify-center">
            <a href="/" class="inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold shadow-md ${dark ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-500' : 'bg-blue-600 text-white hover:bg-blue-700'}">Back home</a>
          </div>
        </div>
      </div>`
    return
  }

  const company = await getCompanyForUser(session.user.id)
  if (!company) {
    navigate('/register')
    return
  }
  if (company.status === 'approved') {
    navigate('/dashboard/company')
    return
  }
  if (company.status === 'suspended') {
    root.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-900">
        <div class="max-w-md rounded-xl border-2 border-amber-200 bg-white p-8 text-center shadow-xl dark:border-amber-900/50 dark:bg-slate-800">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/50">
            ${icon.helpCircle('h-8 w-8 text-amber-700 dark:text-amber-400')}
          </div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Company suspended</h1>
          <p class="mt-3 text-gray-600 dark:text-gray-400">Your company account is temporarily suspended. Please contact support for reactivation.</p>
          <a href="/" class="mt-6 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-700">Back home</a>
        </div>
      </div>`
    return
  }
  if (company.status === 'rejected') {
    root.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-900">
        <div class="max-w-md rounded-xl border-2 border-red-200 bg-white p-8 text-center shadow-xl dark:border-red-900/50 dark:bg-slate-800">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/50">
            ${icon.x('h-8 w-8 text-red-600 dark:text-red-400')}
          </div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Application not approved</h1>
          <p class="mt-3 text-gray-600 dark:text-gray-400">Your company registration was not approved.</p>
          <a href="/" class="mt-6 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-700">Back home</a>
        </div>
      </div>`
    return
  }

  const bookUrl = absolutePublicBookingUrl(company.slug)
  const dark = document.documentElement.classList.contains('dark')

  root.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center px-4 py-10 ${dark ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}">
      <div class="max-w-lg rounded-xl border-2 ${dark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white'} p-8 text-center shadow-2xl">
        <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ${dark ? 'bg-yellow-400' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}">
          ${icon.building2(dark ? 'h-8 w-8 text-slate-900' : 'h-8 w-8 text-white')}
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Pending approval</h1>
        <p class="mt-3 text-gray-600 dark:text-gray-400">
          Thanks for registering <strong class="text-slate-800 dark:text-gray-200">${escapeHtml(company.name)}</strong>.
          A platform administrator will review your request shortly.
        </p>
        <div class="mt-4 rounded-lg border p-4 text-left text-sm ${dark ? 'border-slate-600 bg-slate-700/40' : 'border-blue-200 bg-blue-50'}">
          <p class="text-xs font-semibold uppercase ${dark ? 'text-gray-400' : 'text-slate-600'}">Your booking page (live after approval)</p>
          <p class="mt-1 break-all font-mono text-sm font-semibold ${dark ? 'text-yellow-400' : 'text-blue-700'}">${escapeHtml(bookUrl)}</p>
        </div>
        <p class="mt-3 text-sm text-gray-500 dark:text-gray-500">You will receive login credentials by email after approval.</p>
        <div class="mt-8 flex justify-center">
          <a href="/" class="inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold shadow-md ${dark ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-500' : 'bg-blue-600 text-white hover:bg-blue-700'}">Back home</a>
        </div>
      </div>
    </div>`
}
