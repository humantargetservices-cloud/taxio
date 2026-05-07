import { navigate } from '../nav.js'
import { translations, tBooking } from '../i18n.js'
import { getLocale, setLocale, syncDocumentLang } from '../lib/locale.js'
import { signInWithPassword, getCompanyForUser, getMyProfile } from '../lib/api.js'
import { icon } from '../lib/icons.js'
import { escapeHtml } from '../lib/html.js'

export function mountLoginCompany(root) {
  syncDocumentLang(getLocale())
  const L = translations[getLocale()] || translations.nl
  const LP = L.loginCompanyPage || translations.nl.loginCompanyPage

  root.innerHTML = `
    <div class="min-h-screen bg-gradient-to-b from-slate-100/90 via-[#e8ecf9] to-slate-50 px-4 py-10 md:py-16">
      <div class="mx-auto max-w-md">
        <a href="/" class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900">
          ${icon.arrowLeft('h-4 w-4')}
          ${LP.backHome}
        </a>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="text-xs font-medium text-slate-500">${escapeHtml(tBooking(getLocale()).langLabel)}</span>
          <div class="flex rounded-full border border-slate-200 bg-white p-0.5 shadow-sm">
            ${['nl', 'fr', 'en']
              .map(
                (lc) =>
                  `<button type="button" data-taxio-locale="${lc}" class="rounded-full px-2.5 py-1 text-xs font-semibold ${getLocale() === lc ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}">${lc.toUpperCase()}</button>`
              )
              .join('')}
          </div>
        </div>

        <div class="mt-8 rounded-2xl border border-slate-200/90 bg-white p-8 shadow-lg ring-1 ring-slate-900/[0.04] md:mt-10 md:p-10">
          <div class="mb-8 flex items-start gap-4">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-50 shadow-sm ring-1 ring-emerald-100">
              ${icon.car('h-7 w-7 text-emerald-700')}
            </div>
            <div class="min-w-0 pt-0.5">
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">${LP.eyebrow}</p>
              <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900">${LP.title}</h1>
              <p class="mt-1 text-sm leading-relaxed text-slate-600">${LP.subtitle}</p>
            </div>
          </div>

          <form id="login-form" class="space-y-5">
            <div>
              <label class="text-sm font-semibold text-slate-900">${L.registerPage?.email || 'Email'}</label>
              <input name="email" type="email" required autocomplete="email" placeholder="company@example.com" class="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
            </div>
            <div>
              <div class="flex flex-wrap items-end justify-between gap-2">
                <label class="text-sm font-semibold text-slate-900">${L.registerPage?.password || 'Password'}</label>
                <a href="/forgot-password" class="text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900 hover:decoration-slate-500">${LP.forgotPassword || 'Forgot password?'}</a>
              </div>
              <input name="password" type="password" required autocomplete="current-password" placeholder="Enter your password" class="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
            </div>
            <p id="login-err" class="hidden rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-100"></p>
            <button type="submit" class="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800">${LP.login || 'Log in'}</button>
          </form>
        </div>

        <p class="mt-8 text-center text-sm text-slate-600">
          ${LP.newPrompt}
          <a href="/register" class="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600">${LP.registerCta}</a>
        </p>
        <nav class="mt-6 flex flex-wrap items-center justify-center gap-x-1 gap-y-2 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-center shadow-sm" aria-label="Legal">
          <a href="/terms" class="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">${L.footerTerms}</a>
          <span class="text-slate-300" aria-hidden="true">·</span>
          <a href="/company-terms" class="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">${L.footerCompanyTerms}</a>
          <span class="text-slate-300" aria-hidden="true">·</span>
          <a href="/privacy" class="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">${L.footerPrivacy}</a>
          <span class="text-slate-300" aria-hidden="true">·</span>
          <a href="/contact" class="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">${L.footerContact}</a>
        </nav>
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
    if (profile?.company_onboarding_completed === false) {
      navigate('/onboarding/company')
      return
    }
    navigate('/dashboard/company')
  })

  root.querySelectorAll('[data-taxio-locale]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lc = btn.getAttribute('data-taxio-locale')
      if (lc) {
        setLocale(lc)
        mountLoginCompany(root)
      }
    })
  })
}
