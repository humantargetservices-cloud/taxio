import { navigate } from '../nav.js'
import { registerCompanyOwner } from '../lib/api.js'
import { signOutEverywhere } from '../lib/auth.js'
import { translations } from '../i18n.js'
import { icon } from '../lib/icons.js'
import { slugFromCompanyName } from '../lib/slug.js'

function getLang() {
  return localStorage.getItem('language') || 'en'
}

function tr() {
  const lang = getLang()
  return translations[lang]?.registerPage || translations.en.registerPage
}

function inputCls(dark) {
  return dark
    ? 'w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2.5 text-white shadow-sm placeholder:text-gray-400 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/30'
    : 'w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30'
}

function isDark() {
  return document.documentElement.classList.contains('dark')
}

export function mountRegister(root) {
  const dark = isDark()
  const R = tr()
  const ic = inputCls(dark)

  root.innerHTML = `
<div class="min-h-screen ${dark ? 'bg-slate-900' : 'bg-[#eef2f6]'} py-8 md:py-12 px-4">
  <div class="container mx-auto max-w-4xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <a href="/" class="inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium ${dark ? 'text-white hover:bg-slate-800' : 'text-slate-700 hover:bg-white/60'}">
        ${icon.arrowLeft('h-4 w-4')}
        ${R.backHome}
      </a>
      <div class="flex items-center gap-2">
        <div class="flex rounded-full p-1 shadow-md ${dark ? 'bg-slate-800' : 'bg-white'}">
          <button type="button" data-reg-lang="en" class="rounded-full px-3 py-1.5 text-xs font-semibold ${getLang() === 'en' ? 'bg-slate-900 text-white dark:bg-yellow-400 dark:text-slate-900' : dark ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}">EN</button>
          <button type="button" data-reg-lang="fr" class="rounded-full px-3 py-1.5 text-xs font-semibold ${getLang() === 'fr' ? 'bg-slate-900 text-white dark:bg-yellow-400 dark:text-slate-900' : dark ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}">FR</button>
          <button type="button" data-reg-lang="nl" class="rounded-full px-3 py-1.5 text-xs font-semibold ${getLang() === 'nl' ? 'bg-slate-900 text-white dark:bg-yellow-400 dark:text-slate-900' : dark ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}">NL</button>
        </div>
        <button type="button" id="reg-toggle-dark" class="rounded-full p-2.5 shadow-md ${dark ? 'bg-slate-800 text-gray-300' : 'bg-white text-gray-600'}" aria-label="Toggle dark mode">
          ${dark ? icon.moon('h-5 w-5') : icon.sun('h-5 w-5')}
        </button>
      </div>
    </div>

    <div class="mx-auto max-w-2xl">
      <div class="rounded-xl border-2 ${dark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white'} p-6 shadow-2xl md:p-8">
        <div class="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg ${dark ? 'bg-yellow-400' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}">
            ${icon.building2(dark ? 'h-7 w-7 text-slate-900' : 'h-7 w-7 text-white')}
          </div>
          <div>
            <h1 class="text-2xl font-bold tracking-tight md:text-3xl ${dark ? 'text-white' : 'text-slate-900'}">${R.title}</h1>
            <p class="mt-1 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}">${R.subtitle}</p>
          </div>
        </div>

        <form id="reg-form" class="space-y-5">
          <div class="space-y-2">
            <label for="companyName" class="text-sm font-medium ${dark ? 'text-white' : 'text-slate-900'}">${R.companyName} <span class="${dark ? 'text-yellow-400' : 'text-blue-600'}">*</span></label>
            <input id="companyName" name="companyName" required autocomplete="organization" placeholder="${R.phCompany}" class="${ic}" />
          </div>
          <div class="space-y-2">
            <label for="vatNumber" class="text-sm font-medium ${dark ? 'text-white' : 'text-slate-900'}">${R.vatNumber} <span class="${dark ? 'text-yellow-400' : 'text-blue-600'}">*</span></label>
            <input id="vatNumber" name="vatNumber" required placeholder="${R.phVat}" class="${ic}" />
          </div>
          <div class="space-y-2">
            <label for="phone" class="text-sm font-medium ${dark ? 'text-white' : 'text-slate-900'}">${R.phone} <span class="${dark ? 'text-yellow-400' : 'text-blue-600'}">*</span></label>
            <input id="phone" name="phone" type="tel" required placeholder="${R.phPhone}" class="${ic}" />
          </div>
          <div class="space-y-2">
            <label for="email" class="text-sm font-medium ${dark ? 'text-white' : 'text-slate-900'}">${R.email} <span class="${dark ? 'text-yellow-400' : 'text-blue-600'}">*</span></label>
            <input id="email" name="email" type="email" required autocomplete="email" placeholder="${R.phEmail}" class="${ic}" />
          </div>
          <div class="space-y-2">
            <label for="city" class="text-sm font-medium ${dark ? 'text-white' : 'text-slate-900'}">${R.city} <span class="${dark ? 'text-yellow-400' : 'text-blue-600'}">*</span></label>
            <input id="city" name="city" required placeholder="${R.phCity}" class="${ic}" />
          </div>

          <div id="reg-preview" class="hidden rounded-lg border p-4 ${dark ? 'border-slate-600 bg-slate-700/50' : 'border-blue-200 bg-blue-50'}">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold ${dark ? 'text-white' : 'text-slate-900'}">
              ${icon.eye('h-4 w-4')}
              ${R.previewTitle}
            </h3>
            <div class="space-y-2 text-sm ${dark ? 'text-gray-300' : 'text-gray-600'}">
              <p><strong class="${dark ? 'text-white' : 'text-slate-900'}">${R.previewCompany}</strong> <span id="pv-company">—</span></p>
              <p><strong class="${dark ? 'text-white' : 'text-slate-900'}">${R.previewVat}</strong> <span id="pv-vat">—</span></p>
              <p><strong class="${dark ? 'text-white' : 'text-slate-900'}">${R.previewPhone}</strong> <span id="pv-phone">—</span></p>
              <p><strong class="${dark ? 'text-white' : 'text-slate-900'}">${R.previewEmail}</strong> <span id="pv-email">—</span></p>
              <p><strong class="${dark ? 'text-white' : 'text-slate-900'}">${R.previewCity}</strong> <span id="pv-city">—</span></p>
              <p class="mt-3 border-t pt-3 ${dark ? 'border-slate-600' : 'border-blue-200'}">
                <strong class="${dark ? 'text-white' : 'text-slate-900'}">${R.previewSubdomain}</strong>
                <span id="pv-sub" class="font-mono font-semibold ${dark ? 'text-yellow-400' : 'text-blue-600'}">companyname.taxio.be</span>
              </p>
            </div>
          </div>

          <div id="terms-wrap" class="flex items-start gap-3 rounded-lg border-2 p-4 transition-colors ${dark ? 'border-slate-600 bg-slate-700/50' : 'border-gray-200 bg-gray-50'}">
            <input type="checkbox" id="terms" name="terms" class="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 dark:border-slate-500 dark:bg-slate-700" />
            <label for="terms" class="cursor-pointer text-sm leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-600'}">
              ${R.termsLead}
              <a href="/terms" class="font-semibold ${dark ? 'text-yellow-400 hover:text-yellow-300' : 'text-blue-600 hover:text-blue-800'}">${R.termsLink}</a>
              ${R.termsMid}
              <a href="/privacy" class="font-semibold ${dark ? 'text-yellow-400 hover:text-yellow-300' : 'text-blue-600 hover:text-blue-800'}">${R.privacyLink}</a>
            </label>
          </div>

          <p id="reg-err" class="hidden rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"></p>

          <div class="flex flex-col gap-3 pt-2 sm:flex-row">
            <button type="button" id="btn-preview" class="flex flex-1 items-center justify-center gap-2 rounded-md border-2 px-4 py-3 text-sm font-semibold shadow-sm ${dark ? 'border-slate-600 text-white hover:bg-slate-700' : 'border-gray-300 bg-white text-slate-900 hover:bg-gray-50'}">
              ${icon.eye('h-4 w-4')}
              ${R.preview}
            </button>
            <button type="submit" id="btn-submit" disabled class="flex flex-1 items-center justify-center rounded-md px-4 py-3 text-sm font-semibold shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${dark ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-500' : 'bg-blue-600 text-white hover:bg-blue-700'}">
              ${R.btnSubmit}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div id="reg-success-overlay" class="fixed inset-0 z-[100] hidden items-center justify-center bg-black/50 p-4" aria-hidden="true">
    <div class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-2xl ${dark ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-white'}">
      <button type="button" id="succ-close" class="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Close">${icon.x('h-5 w-5')}</button>
      <div class="mb-4 flex justify-center pt-2">
        <div class="flex h-24 w-24 items-center justify-center rounded-full bg-green-500 shadow-lg ring-4 ring-green-200 dark:ring-green-900/40">
          ${icon.check('h-14 w-14 text-white stroke-[3]')}
        </div>
      </div>
      <h2 class="text-center text-2xl font-bold ${dark ? 'text-green-400' : 'text-green-600'}">${R.successTitle}</h2>
      <div class="mt-4 space-y-4 text-center ${dark ? 'text-gray-300' : 'text-gray-600'}">
        <p class="text-lg ${dark ? 'text-white' : 'text-slate-900'}">${R.successThanks} <strong class="${dark ? 'text-yellow-400' : 'text-blue-600'}">TAXIO</strong>!</p>
        <p class="text-sm">${R.successP1}</p>
        <div class="rounded-xl border-2 p-4 text-left ${dark ? 'border-blue-500/30 bg-slate-700/50' : 'border-blue-200 bg-blue-50'}">
          <p class="text-xs font-semibold uppercase tracking-wide ${dark ? 'text-gray-400' : 'text-gray-600'}">${R.successAddrLabel}</p>
          <p id="succ-subdomain" class="mt-2 text-center font-mono text-xl font-bold ${dark ? 'text-yellow-400' : 'text-blue-600'}"></p>
          <p class="mt-2 text-xs ${dark ? 'text-gray-400' : 'text-gray-600'}">${R.successReservedNote}</p>
        </div>
        <div class="rounded-xl border-2 p-4 text-left ${dark ? 'border-slate-600 bg-slate-700/40' : 'border-gray-200 bg-gray-50'}">
          <p class="mb-2 text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}">${R.successNextTitle}</p>
          <ul class="space-y-2 text-left text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}">
            <li class="flex gap-2"><span>•</span><span>${R.successNext1}</span></li>
            <li class="flex gap-2"><span>•</span><span>${R.successNext2Lead} <strong id="succ-email-inline" class="${dark ? 'text-yellow-400' : 'text-blue-600'}"></strong>${R.successNext2Tail}</span></li>
            <li class="flex gap-2 text-xs opacity-90"><span>⏱️</span><span>${R.successFoot3}</span></li>
          </ul>
        </div>
        <div class="rounded-xl border-2 p-4 text-left ${dark ? 'border-amber-700/40 bg-amber-950/30' : 'border-amber-200 bg-amber-50'}">
          <p class="mb-3 text-sm font-bold ${dark ? 'text-amber-200' : 'text-amber-900'}">📩 ${R.successAfterApprovalTitle}</p>
          <ul class="space-y-2 text-left text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}">
            <li class="flex gap-2"><span>•</span><span>${R.successAfterBulletEmail}</span></li>
            <li class="flex gap-2"><span>•</span><span>${R.successAfterBulletLogin}</span></li>
            <li class="flex gap-2"><span>•</span><span>${R.successAfterBulletLinks}</span></li>
            <li class="flex gap-2"><span>•</span><span>${R.successAfterBulletPassword}</span></li>
          </ul>
        </div>
        <p class="text-xs">${R.successEmailNote}</p>
      </div>
      <div class="mt-6 flex justify-center">
        <button type="button" id="succ-gotit" class="rounded-xl px-10 py-3.5 text-sm font-bold text-white shadow-md ${dark ? 'bg-green-500 hover:bg-green-400' : 'bg-green-600 hover:bg-green-700'}">${R.gotIt}</button>
      </div>
    </div>
  </div>
</div>`

  const form = root.querySelector('#reg-form')
  const errEl = root.querySelector('#reg-err')
  const previewEl = root.querySelector('#reg-preview')
  const termsWrap = root.querySelector('#terms-wrap')
  const termsCb = root.querySelector('#terms')
  const overlay = root.querySelector('#reg-success-overlay')

  function refreshPreviewText() {
    const fd = new FormData(form)
    const cn = fd.get('companyName') || ''
    const slug = slugFromCompanyName(cn)
    root.querySelector('#pv-company').textContent = cn || '—'
    root.querySelector('#pv-vat').textContent = fd.get('vatNumber') || '—'
    root.querySelector('#pv-phone').textContent = fd.get('phone') || '—'
    root.querySelector('#pv-email').textContent = fd.get('email') || '—'
    root.querySelector('#pv-city').textContent = fd.get('city') || '—'
    root.querySelector('#pv-sub').textContent = slug ? `${slug}.taxio.be` : 'companyname.taxio.be'
  }

  function updateTermsStyle() {
    const on = termsCb.checked
    termsWrap.className =
      'flex items-start gap-3 rounded-lg border-2 p-4 transition-colors ' +
      (on
        ? dark
          ? 'border-yellow-400 bg-yellow-400/10'
          : 'border-blue-400 bg-blue-50'
        : dark
          ? 'border-slate-600 bg-slate-700/50'
          : 'border-gray-200 bg-gray-50')
  }

  root.querySelector('#btn-preview').addEventListener('click', () => {
    refreshPreviewText()
    previewEl.classList.toggle('hidden')
  })

  const submitBtn = root.querySelector('#btn-submit')
  function syncSubmitEnabled() {
    updateTermsStyle()
    submitBtn.disabled = !termsCb.checked
  }
  termsCb.addEventListener('change', syncSubmitEnabled)
  syncSubmitEnabled()

  form.querySelector('#companyName')?.addEventListener('input', () => {
    if (!previewEl.classList.contains('hidden')) refreshPreviewText()
  })

  root.querySelector('#reg-toggle-dark').addEventListener('click', () => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('darkMode', String(next))
    mountRegister(root)
  })

  root.querySelectorAll('[data-reg-lang]').forEach((b) => {
    b.addEventListener('click', () => {
      localStorage.setItem('language', b.getAttribute('data-reg-lang'))
      mountRegister(root)
    })
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errEl.classList.add('hidden')
    if (!termsCb.checked) {
      errEl.textContent = R.termsError
      errEl.classList.remove('hidden')
      return
    }
    const fd = new FormData(form)
    const payload = {
      companyName: fd.get('companyName'),
      vatNumber: fd.get('vatNumber'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      city: fd.get('city'),
      country: null,
    }
    const btn = root.querySelector('#btn-submit')
    btn.disabled = true
    btn.textContent = R.btnSubmitting
    const { data, error } = await registerCompanyOwner(payload)
    btn.textContent = R.btnSubmit
    btn.disabled = !termsCb.checked
    if (error) {
      errEl.textContent = error.message || String(error)
      errEl.classList.remove('hidden')
      return
    }
    const slug = data.slug
    // Registration is request submission only; ensure no stale auth session can
    // route user into authenticated flows (dashboard/change-password).
    try {
      await signOutEverywhere()
    } catch {
      /* no-op */
    }
    root.querySelector('#succ-subdomain').textContent = `${slug}.taxio.be`
    root.querySelector('#succ-email-inline').textContent = payload.email
    localStorage.removeItem('pendingRegistration')
    overlay.classList.remove('hidden')
    overlay.classList.add('flex')
    overlay.setAttribute('aria-hidden', 'false')
  })

  function closeSuccess() {
    overlay.classList.add('hidden')
    overlay.classList.remove('flex')
    overlay.setAttribute('aria-hidden', 'true')
  }

  root.querySelector('#succ-gotit').addEventListener('click', () => {
    closeSuccess()
    navigate('/')
  })
  root.querySelector('#succ-close').addEventListener('click', () => {
    closeSuccess()
  })
}
