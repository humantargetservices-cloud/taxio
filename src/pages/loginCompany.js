import { navigate } from '../nav.js'
import { signInWithPassword, getCompanyForUser, getMyProfile } from '../lib/api.js'
import { icon } from '../lib/icons.js'

export function mountLoginCompany(root) {
  root.innerHTML = `
    <div class="min-h-screen bg-[#e8ecf9] px-4 py-10 md:py-16">
      <div class="mx-auto max-w-md">
        <a href="/" class="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          ${icon.arrowLeft('h-4 w-4')}
          Back to Home
        </a>

        <div class="mt-10 rounded-2xl border border-gray-200/80 bg-white p-8 shadow-xl md:p-10">
          <div class="mb-8 flex items-center gap-4">
            <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 shadow-inner">
              ${icon.car('h-8 w-8 text-emerald-700')}
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Company Login</h1>
              <p class="mt-1 text-sm text-gray-500">Access your taxi company dashboard</p>
            </div>
          </div>

          <form id="login-form" class="space-y-5">
            <div>
              <label class="text-sm font-bold text-gray-900">Email Address</label>
              <input name="email" type="email" required autocomplete="email" placeholder="company@example.com" class="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400" />
            </div>
            <div>
              <label class="text-sm font-bold text-gray-900">Password</label>
              <input name="password" type="password" required autocomplete="current-password" placeholder="Enter your password" class="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400" />
            </div>
            <p id="login-err" class="hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"></p>
            <button type="submit" class="w-full rounded-lg bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md hover:bg-gray-800">Login</button>
          </form>
        </div>

        <p class="mt-8 text-center text-sm text-gray-600">
          Don't have an account?
          <a href="/register" class="font-semibold text-blue-600 hover:underline">Register here</a>
        </p>
      </div>
    </div>`

  const form = root.querySelector('#login-form')
  const errEl = root.querySelector('#login-err')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errEl.classList.add('hidden')
    const fd = new FormData(form)
    const email = fd.get('email')
    const password = fd.get('password')
    const btn = form.querySelector('button[type="submit"]')
    btn.disabled = true
    const { data, error } = await signInWithPassword(email, password)
    btn.disabled = false
    if (error) {
      errEl.textContent = error.message
      errEl.classList.remove('hidden')
      return
    }
    const user = data.user
    const company = await getCompanyForUser(user.id)
    if (!company) {
      errEl.textContent = 'No company linked to this account.'
      errEl.classList.remove('hidden')
      return
    }
    if (company.status === 'pending') {
      navigate('/pending-approval')
      return
    }
    if (company.status === 'suspended') {
      errEl.textContent =
        'Your company access is temporarily suspended. Contact support for reactivation.'
      errEl.classList.remove('hidden')
      return
    }
    if (company.status === 'rejected') {
      errEl.textContent =
        'Your application was not approved. Contact support if you believe this is an error.'
      errEl.classList.remove('hidden')
      return
    }
    if (company.status !== 'approved') {
      errEl.textContent = 'Your account is not ready for login yet.'
      errEl.classList.remove('hidden')
      return
    }
    const profile = await getMyProfile(user.id)
    if (profile?.first_login_required) {
      navigate('/change-password/company')
      return
    }
    navigate('/dashboard/company')
  })
}
