import { navigate } from '../nav.js'
import { supabase } from '../lib/supabase.js'
import { icon } from '../lib/icons.js'

const INVALID_COPY =
  'This reset link is invalid or expired. Please request a new one.'

function recoveryUrlHint() {
  const h = window.location.hash || ''
  const q = window.location.search || ''
  return /type=recovery/.test(h) || /type=recovery/.test(q) || /[?&]code=/.test(q)
}

/**
 * Wait for a Supabase recovery session (email link with type=recovery or PASSWORD_RECOVERY event).
 */
async function awaitRecoverySession(timeoutMs = 12000) {
  const params = new URLSearchParams(window.location.search || '')
  const code = params.get('code')
  if (code) {
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    if (data?.session) {
      window.history.replaceState({}, '', '/reset-password')
      return data.session
    }
  }

  const existing = await supabase.auth.getSession()
  if (existing?.data?.session && recoveryUrlHint()) return existing.data.session

  return new Promise((resolve) => {
    let settled = false
    let subscription = null

    const finish = (session) => {
      if (settled) return
      settled = true
      clearTimeout(tid)
      clearInterval(iv)
      subscription?.unsubscribe()
      resolve(session)
    }

    const tid = setTimeout(() => finish(null), timeoutMs)

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) finish(session)
    })
    subscription = data.subscription

    const iv = setInterval(async () => {
      if (!recoveryUrlHint()) return
      const { data } = await supabase.auth.getSession()
      if (data.session) finish(data.session)
    }, 200)

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && recoveryUrlHint()) finish(data.session)
    })
  })
}

function renderInvalid(root) {
  root.innerHTML = `
    <div class="min-h-screen bg-[#e8ecf9] px-4 py-10 md:py-16">
      <div class="mx-auto max-w-md">
        <a href="/login/company" class="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          ${icon.arrowLeft('h-4 w-4')}
          Back to login
        </a>
        <div class="mt-10 rounded-2xl border border-gray-200/80 bg-white p-8 shadow-xl md:p-10">
          <div class="mb-6 flex items-center gap-4">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-100">
              ${icon.shield('h-7 w-7 text-red-700')}
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Link problem</h1>
              <p class="mt-1 text-sm text-gray-600">${INVALID_COPY}</p>
            </div>
          </div>
          <a href="/forgot-password" class="inline-flex w-full items-center justify-center rounded-lg bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md hover:bg-gray-800">Request a new link</a>
        </div>
      </div>
    </div>`
}

export function mountResetPasswordCompany(root) {
  root.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-[#e8ecf9] px-4 py-10">
      <p class="text-sm text-gray-500">Checking your link…</p>
    </div>`

  awaitRecoverySession().then((session) => {
    if (!session) {
      renderInvalid(root)
      return
    }

    root.innerHTML = `
      <div class="min-h-screen bg-[#e8ecf9] px-4 py-10 md:py-16">
        <div class="mx-auto max-w-md">
          <a href="/login/company" class="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            ${icon.arrowLeft('h-4 w-4')}
            Back to login
          </a>
          <div class="mt-10 rounded-2xl border border-gray-200/80 bg-white p-8 shadow-xl md:p-10">
            <div class="mb-6 flex items-center gap-4">
              <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                ${icon.shield('h-7 w-7 text-emerald-700')}
              </div>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">Choose a new password</h1>
                <p class="mt-1 text-sm text-gray-500">At least 8 characters.</p>
              </div>
            </div>
            <form id="rp-form" class="space-y-5">
              <div>
                <label class="text-sm font-bold text-gray-900">New password</label>
                <input type="password" name="password" required minlength="8" autocomplete="new-password" class="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400" />
              </div>
              <div>
                <label class="text-sm font-bold text-gray-900">Confirm new password</label>
                <input type="password" name="confirm" required minlength="8" autocomplete="new-password" class="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400" />
              </div>
              <p id="rp-err" class="hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"></p>
              <button type="submit" class="w-full rounded-lg bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60">Update password</button>
            </form>
          </div>
        </div>
      </div>`

    const form = root.querySelector('#rp-form')
    const errEl = root.querySelector('#rp-err')
    const submitBtn = form.querySelector('button[type="submit"]')

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      errEl.classList.add('hidden')
      const fd = new FormData(form)
      const password = String(fd.get('password') || '')
      const confirm = String(fd.get('confirm') || '')

      if (password.length < 8) {
        errEl.textContent = 'Password must be at least 8 characters.'
        errEl.classList.remove('hidden')
        return
      }
      if (password !== confirm) {
        errEl.textContent = 'Passwords do not match.'
        errEl.classList.remove('hidden')
        return
      }

      submitBtn.disabled = true
      const { error: passErr } = await supabase.auth.updateUser({ password })
      if (passErr) {
        submitBtn.disabled = false
        errEl.textContent = passErr.message || 'Could not update password.'
        errEl.classList.remove('hidden')
        return
      }

      await supabase.auth.signOut()

      root.innerHTML = `
        <div class="min-h-screen bg-[#e8ecf9] px-4 py-10 md:py-16">
          <div class="mx-auto max-w-md">
            <div class="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-xl md:p-10 text-center">
              <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                ${icon.shield('h-7 w-7 text-emerald-700')}
              </div>
              <h1 class="text-xl font-bold text-gray-900">Password updated</h1>
              <p class="mt-2 text-sm text-gray-600">You can sign in with your new password. Redirecting to login…</p>
            </div>
          </div>
        </div>`

      setTimeout(() => navigate('/login/company'), 2500)
    })
  })
}
