import { supabase } from '../lib/supabase.js'
import { icon } from '../lib/icons.js'

const NEUTRAL_SUCCESS =
  'If an account exists for this email, a password reset link has been sent.'

export function mountForgotPasswordCompany(root) {
  root.innerHTML = `
    <div class="min-h-screen bg-[#e8ecf9] px-4 py-10 md:py-16">
      <div class="mx-auto max-w-md">
        <a href="/login/company" class="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          ${icon.arrowLeft('h-4 w-4')}
          Back to login
        </a>

        <div class="mt-10 rounded-2xl border border-gray-200/80 bg-white p-8 shadow-xl md:p-10">
          <div class="mb-8 flex items-center gap-4">
            <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 shadow-inner">
              ${icon.car('h-8 w-8 text-emerald-700')}
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Reset password</h1>
              <p class="mt-1 text-sm text-gray-500">We will email you a secure link if this address is registered.</p>
            </div>
          </div>

          <div id="fp-success" class="hidden rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-900"></div>
          <div id="fp-err" class="hidden rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700"></div>

          <form id="fp-form" class="mt-5 space-y-5">
            <div>
              <label class="text-sm font-bold text-gray-900">Email address</label>
              <input name="email" type="email" required autocomplete="email" placeholder="company@example.com" class="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400" />
            </div>
            <button type="submit" class="w-full rounded-lg bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60">Send reset link</button>
          </form>
        </div>
      </div>
    </div>`

  const form = root.querySelector('#fp-form')
  const errEl = root.querySelector('#fp-err')
  const successEl = root.querySelector('#fp-success')
  const btn = form.querySelector('button[type="submit"]')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errEl.classList.add('hidden')
    successEl.classList.add('hidden')
    const fd = new FormData(form)
    const email = String(fd.get('email') || '').trim()

    btn.disabled = true
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    btn.disabled = false

    if (error) {
      errEl.textContent =
        'We could not send the email right now. Please try again in a few minutes.'
      errEl.classList.remove('hidden')
      return
    }

    successEl.textContent = NEUTRAL_SUCCESS
    successEl.classList.remove('hidden')
    form.classList.add('hidden')
  })
}
