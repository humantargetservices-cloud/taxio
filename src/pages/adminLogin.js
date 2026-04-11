import { navigate } from '../nav.js'
import { signInWithPassword } from '../lib/api.js'
import { isPlatformAdmin } from '../lib/auth.js'
import { icon } from '../lib/icons.js'

export function mountAdminLogin(root) {
  root.innerHTML = `
    <div class="min-h-screen bg-[#e8ecf9] px-4 py-10 md:py-16">
      <div class="mx-auto max-w-md">
        <a href="/" class="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          ${icon.arrowLeft('h-4 w-4')}
          Back to Home
        </a>

        <div class="mt-10 rounded-2xl border border-gray-200/80 bg-white p-8 shadow-xl md:p-10">
          <div class="mb-8 flex items-center gap-4">
            <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-violet-100 shadow-inner">
              ${icon.shield('h-8 w-8 text-violet-600')}
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Platform Admin</h1>
              <p class="mt-1 text-sm text-gray-500">Administrative access for platform management</p>
            </div>
          </div>

          <form id="adm-login-form" class="space-y-5">
            <div>
              <label class="text-sm font-bold text-gray-900">Admin Email</label>
              <input name="email" type="email" required autocomplete="email" placeholder="admin@taxio.be" class="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400" />
            </div>
            <div>
              <label class="text-sm font-bold text-gray-900">Admin Password</label>
              <input name="password" type="password" required autocomplete="current-password" placeholder="Enter admin password" class="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400" />
            </div>
            <p id="adm-login-err" class="hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"></p>
            <button type="submit" class="w-full rounded-lg bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md hover:bg-gray-800">Login as Admin</button>
          </form>

          <div class="my-8 border-t border-gray-200"></div>

          <p class="text-center text-sm text-gray-600">Show taxi companies what their website will look like:</p>
          <a href="/book/demo" class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-gray-200 bg-white py-3.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50">
            ${icon.car('h-5 w-5 text-gray-700')}
            View Demo Booking Page
            ${icon.externalLink('h-4 w-4 text-gray-400')}
          </a>
          <p class="mt-3 text-center text-xs text-gray-500">(This is how each company's subdomain will work)</p>
        </div>
      </div>
    </div>`

  const form = root.querySelector('#adm-login-form')
  const errEl = root.querySelector('#adm-login-err')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errEl.classList.add('hidden')
    const fd = new FormData(form)
    const btn = form.querySelector('button[type="submit"]')
    btn.disabled = true
    const { data, error } = await signInWithPassword(fd.get('email'), fd.get('password'))
    btn.disabled = false
    if (error) {
      errEl.textContent = error.message
      errEl.classList.remove('hidden')
      return
    }
    const ok = await isPlatformAdmin(data.user)
    if (!ok) {
      errEl.textContent = 'This account is not a platform administrator.'
      errEl.classList.remove('hidden')
      return
    }
    navigate('/admin/dashboard')
  })
}
