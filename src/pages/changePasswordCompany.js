import { navigate } from '../nav.js'
import { getSession, getMyProfile } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'
import { icon } from '../lib/icons.js'

export async function mountChangePasswordCompany(root) {
  root.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-[#e8ecf9] px-4 py-10">
      <p class="text-sm text-gray-500">Loading…</p>
    </div>`

  const session = await getSession()
  if (!session?.user) {
    navigate('/login/company')
    return
  }

  const profile = await getMyProfile(session.user.id)
  if (!profile?.first_login_required) {
    navigate('/dashboard/company')
    return
  }

  root.innerHTML = `
    <div class="min-h-screen bg-[#e8ecf9] px-4 py-10 md:py-16">
      <div class="mx-auto max-w-md">
        <a href="/" class="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          ${icon.arrowLeft('h-4 w-4')}
          Back to Home
        </a>
        <div class="mt-10 rounded-2xl border border-gray-200/80 bg-white p-8 shadow-xl md:p-10">
          <div class="mb-6 flex items-center gap-4">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-yellow-100">
              ${icon.shield('h-7 w-7 text-yellow-700')}
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Change your password</h1>
              <p class="mt-1 text-sm text-gray-500">Required on first login for security.</p>
            </div>
          </div>
          <form id="cp-form" class="space-y-5">
            <div>
              <label class="text-sm font-bold text-gray-900">New password</label>
              <input type="password" name="password" required minlength="8" class="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400" />
            </div>
            <div>
              <label class="text-sm font-bold text-gray-900">Confirm new password</label>
              <input type="password" name="confirm" required minlength="8" class="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400" />
            </div>
            <p id="cp-err" class="hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"></p>
            <button type="submit" class="w-full rounded-lg bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md hover:bg-gray-800">Update password</button>
          </form>
        </div>
      </div>
    </div>`

  const form = root.querySelector('#cp-form')
  const errEl = root.querySelector('#cp-err')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errEl.classList.add('hidden')
    const fd = new FormData(form)
    const password = String(fd.get('password') || '')
    const confirm = String(fd.get('confirm') || '')
    if (password !== confirm) {
      errEl.textContent = 'Passwords do not match.'
      errEl.classList.remove('hidden')
      return
    }
    const btn = form.querySelector('button[type="submit"]')
    btn.disabled = true

    const { error: passErr } = await supabase.auth.updateUser({ password })
    if (passErr) {
      btn.disabled = false
      errEl.textContent = passErr.message || 'Could not update password.'
      errEl.classList.remove('hidden')
      return
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ first_login_required: false })
      .eq('id', session.user.id)
    btn.disabled = false
    if (profileErr) {
      errEl.textContent = profileErr.message || 'Password updated, but profile update failed.'
      errEl.classList.remove('hidden')
      return
    }
    navigate('/dashboard/company')
  })
}
