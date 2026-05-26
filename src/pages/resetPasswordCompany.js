import { navigate } from '../nav.js'
import { supabase } from '../lib/supabase.js'
import { icon } from '../lib/icons.js'

const INVALID_COPY =
  'This reset link is invalid or expired. Please request a new one.'
const RECOVERY_CHECK_TIMEOUT_MS = 1800

function recoveryParamsFromUrl() {
  const merged = new URLSearchParams(window.location.search || '')
  let hash = String(window.location.hash || '').replace(/^#/, '')
  if (hash) {
    const queryIdx = hash.indexOf('?')
    if (queryIdx >= 0) hash = hash.slice(queryIdx + 1)
    const hashIdx = hash.indexOf('#')
    if (hashIdx >= 0) hash = hash.slice(hashIdx + 1)
    const hashParams = new URLSearchParams(hash)
    for (const [key, value] of hashParams.entries()) {
      if (!merged.has(key)) merged.set(key, value)
    }
  }
  return merged
}

function recoveryUrlHint(params = recoveryParamsFromUrl()) {
  return (
    params.get('type') === 'recovery' ||
    params.has('code') ||
    params.has('access_token') ||
    params.has('refresh_token')
  )
}

function cleanRecoveryUrl() {
  window.history.replaceState({}, '', '/reset-password')
}

function waitForRecoveryAuthEvent(timeoutMs) {
  return new Promise((resolve) => {
    let done = false
    let subscription = null
    const finish = (session) => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      subscription?.unsubscribe()
      resolve(session || null)
    }

    const timer = window.setTimeout(() => finish(null), timeoutMs)
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        finish(session)
      }
    })
    subscription = data?.subscription
  })
}

/**
 * Establish a Supabase recovery session from PKCE `?code=...`, hash tokens, or the
 * PASSWORD_RECOVERY auth event. This supports mobile mail clients that preserve either
 * query or hash parameters when opening the SPA route.
 */
async function establishRecoverySession(timeoutMs = RECOVERY_CHECK_TIMEOUT_MS) {
  const params = recoveryParamsFromUrl()
  const hasRecoveryParams = recoveryUrlHint(params)
  const eventSessionPromise = hasRecoveryParams ? waitForRecoveryAuthEvent(timeoutMs) : null

  const code = params.get('code')
  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error && data?.session) {
        cleanRecoveryUrl()
        return data.session
      }
    } catch {
      /* fall through to getSession/event fallback */
    }
  }

  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (accessToken && refreshToken) {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (!error && data?.session) {
        cleanRecoveryUrl()
        return data.session
      }
    } catch {
      /* fall through to getSession/event fallback */
    }
  }

  try {
    const { data } = await supabase.auth.getSession()
    if (data?.session) {
      if (hasRecoveryParams) cleanRecoveryUrl()
      return data.session
    }
  } catch {
    /* fall through to event fallback */
  }

  if (eventSessionPromise) {
    const eventSession = await eventSessionPromise
    if (eventSession) {
      cleanRecoveryUrl()
      return eventSession
    }
  }

  return null
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

  establishRecoverySession().then((session) => {
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
