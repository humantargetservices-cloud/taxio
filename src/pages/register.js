import { navigate } from '../nav.js'
import { registerCompanyOwner } from '../lib/api.js'
import { REGISTRATION_TERMS_BUNDLE } from '../lib/legalVersions.js'
import { signOutEverywhere } from '../lib/auth.js'
import { translations } from '../i18n.js'
import { getLocale, setLocale, syncDocumentLang } from '../lib/locale.js'
import { icon } from '../lib/icons.js'
import { slugFromCompanyName } from '../lib/slug.js'

const TURNSTILE_SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()
const TURNSTILE_FRONT_ENABLED =
  String(import.meta.env.VITE_TURNSTILE_ENABLED || '')
    .trim()
    .toLowerCase() === 'true'
const REG_MIN_SUBMIT_MS = 1000

function tr() {
  const lang = getLocale()
  return translations[lang]?.registerPage || translations.nl.registerPage
}

function inputCls(dark) {
  return dark
    ? 'w-full rounded-xl border border-slate-600 bg-slate-700/90 px-4 py-3 text-white shadow-sm placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25'
    : 'w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20'
}

function isDark() {
  return document.documentElement.classList.contains('dark')
}

function cleanPhoneInput(raw) {
  return String(raw || '')
    .trim()
    .replace(/[\s().-]/g, '')
}

function normalizeBelgianPhoneToE164(rawPhone) {
  const clean = cleanPhoneInput(rawPhone)
  if (!clean) return ''
  if (clean.startsWith('+')) {
    const digits = clean.slice(1).replace(/\D/g, '')
    if (!digits.startsWith('32')) return ''
    const nsn = digits.slice(2).replace(/^0+/, '')
    if (!isValidBelgianNationalNumber(nsn)) return ''
    return `+32${nsn}`
  }
  if (clean.startsWith('00')) return normalizeBelgianPhoneToE164(`+${clean.slice(2)}`)
  const digits = clean.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('32')) return normalizeBelgianPhoneToE164(`+${digits}`)
  if (!digits.startsWith('0')) return ''
  const nsn = digits.slice(1)
  if (!isValidBelgianNationalNumber(nsn)) return ''
  return `+32${nsn}`
}

function isValidBelgianNationalNumber(nsn) {
  return /^[1-9]\d{7,8}$/.test(String(nsn || ''))
}

function isValidBelgianE164(phone) {
  const s = String(phone || '').trim()
  if (!/^\+32\d{8,9}$/.test(s)) return false
  const nsn = s.slice(3)
  return isValidBelgianNationalNumber(nsn)
}

export function mountRegister(root) {
  syncDocumentLang(getLocale())
  const dark = isDark()
  const R = tr()
  const ic = inputCls(dark)
  const lang = getLocale()
  const vehicleTypes = [
    { key: 'Standard', label: R.vehicleTypeStandard || 'Standard' },
    { key: 'Van', label: R.vehicleTypeVan || 'Van' },
    { key: 'Luxury', label: R.vehicleTypeLuxury || 'Luxury' },
  ]

  root.innerHTML = `
<div class="min-h-screen ${dark ? 'bg-slate-900' : 'bg-gradient-to-b from-slate-100/80 to-[#eef2f6]'} py-8 md:py-14 px-4">
  <div class="container mx-auto max-w-4xl">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <a href="/" class="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition ${dark ? 'text-white hover:bg-slate-800' : 'text-slate-700 hover:bg-white/90'}">
        ${icon.arrowLeft('h-4 w-4')}
        ${R.backHome}
      </a>
      <div class="flex items-center gap-2">
        <div class="flex rounded-full border border-black/5 p-1 shadow-sm ${dark ? 'border-slate-600 bg-slate-800' : 'bg-white'}">
          <button type="button" data-reg-lang="nl" class="rounded-full px-3 py-1.5 text-xs font-semibold ${lang === 'nl' ? 'bg-slate-900 text-white dark:bg-yellow-400 dark:text-slate-900' : dark ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}">NL</button>
          <button type="button" data-reg-lang="fr" class="rounded-full px-3 py-1.5 text-xs font-semibold ${lang === 'fr' ? 'bg-slate-900 text-white dark:bg-yellow-400 dark:text-slate-900' : dark ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}">FR</button>
          <button type="button" data-reg-lang="en" class="rounded-full px-3 py-1.5 text-xs font-semibold ${lang === 'en' ? 'bg-slate-900 text-white dark:bg-yellow-400 dark:text-slate-900' : dark ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}">EN</button>
        </div>
        <button type="button" id="reg-toggle-dark" class="rounded-full border border-black/5 p-2.5 shadow-sm ${dark ? 'border-slate-600 bg-slate-800 text-gray-300' : 'bg-white text-gray-600'}" aria-label="Toggle dark mode">
          ${dark ? icon.moon('h-5 w-5') : icon.sun('h-5 w-5')}
        </button>
      </div>
    </div>

    <div class="mx-auto max-w-2xl">
      <div class="rounded-2xl border ${dark ? 'border-slate-700/80 bg-slate-800/90' : 'border-slate-200/90 bg-white'} p-6 shadow-lg ring-1 ring-black/[0.04] md:p-9">
        <div class="mb-8 flex flex-col gap-4 md:flex-row md:items-center">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5 ${dark ? 'bg-amber-400' : 'bg-gradient-to-br from-slate-800 to-slate-900'}">
            ${icon.building2(dark ? 'h-7 w-7 text-slate-900' : 'h-7 w-7 text-white')}
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider ${dark ? 'text-amber-400/90' : 'text-amber-800/80'}">${R.registerEyebrow || 'TAXIO'}</p>
            <h1 class="mt-1 text-2xl font-bold tracking-tight md:text-3xl ${dark ? 'text-white' : 'text-slate-900'}">${R.title}</h1>
            <p class="mt-2 text-sm leading-relaxed ${dark ? 'text-gray-400' : 'text-slate-600'}">${R.subtitle}</p>
          </div>
        </div>

        <form id="reg-form" class="space-y-6">
          <div class="space-y-2">
            <label for="companyName" class="text-sm font-semibold ${dark ? 'text-white' : 'text-slate-900'}">${R.companyName} <span class="${dark ? 'text-amber-400' : 'text-amber-700'}">*</span></label>
            <input id="companyName" name="companyName" required autocomplete="organization" placeholder="${R.phCompany}" class="${ic}" />
          </div>
          <div class="space-y-2">
            <label for="vatNumber" class="text-sm font-semibold ${dark ? 'text-white' : 'text-slate-900'}">${R.vatNumber} <span class="${dark ? 'text-amber-400' : 'text-amber-700'}">*</span></label>
            <input id="vatNumber" name="vatNumber" required placeholder="${R.phVat}" class="${ic}" />
          </div>
          <div class="space-y-2">
            <label for="phone" class="text-sm font-semibold ${dark ? 'text-white' : 'text-slate-900'}">${R.phone} <span class="${dark ? 'text-amber-400' : 'text-amber-700'}">*</span></label>
            <div class="relative">
              <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold ${dark ? 'text-slate-200' : 'text-slate-600'}">+32</span>
              <input id="phone" name="phone" type="tel" required inputmode="tel" autocomplete="tel" placeholder="470 12 34 56" class="${ic} pl-14" />
            </div>
          </div>
          <div class="space-y-2">
            <label for="email" class="text-sm font-semibold ${dark ? 'text-white' : 'text-slate-900'}">${R.email} <span class="${dark ? 'text-amber-400' : 'text-amber-700'}">*</span></label>
            <input id="email" name="email" type="email" required autocomplete="email" placeholder="${R.phEmail}" class="${ic}" />
          </div>
          <div class="space-y-2">
            <label for="city" class="text-sm font-semibold ${dark ? 'text-white' : 'text-slate-900'}">${R.city} <span class="${dark ? 'text-amber-400' : 'text-amber-700'}">*</span></label>
            <input id="city" name="city" required placeholder="${R.phCity}" class="${ic}" />
          </div>

          <div id="reg-vehicle-types-wrap" class="rounded-2xl border-2 p-4 sm:p-5 ${dark ? 'border-slate-600 bg-slate-700/50' : 'border-slate-200 bg-slate-50/90'}">
            <div class="mb-3">
              <p class="text-sm font-semibold ${dark ? 'text-white' : 'text-slate-900'}">${R.vehicleTypesTitle || 'Vehicle types'} <span class="${dark ? 'text-amber-400' : 'text-amber-700'}">*</span></p>
              <p class="mt-1 text-xs ${dark ? 'text-gray-400' : 'text-slate-500'}">${R.vehicleTypesHint || 'Select only the vehicle types your company offers.'}</p>
            </div>
            <div class="grid gap-2 sm:grid-cols-3">
              ${vehicleTypes
                .map(
                  (v) => `
                    <label class="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${dark ? 'border-slate-600 bg-slate-800/60 text-gray-200 has-[:checked]:border-amber-400 has-[:checked]:bg-amber-400/10' : 'border-slate-200 bg-white text-slate-800 has-[:checked]:border-amber-400 has-[:checked]:bg-amber-50'}">
                      <input type="checkbox" data-reg-type="${v.key}" name="vehicleTypes" value="${v.key}" class="h-4 w-4 shrink-0 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 dark:border-slate-500 dark:bg-slate-700" />
                      <span>${v.label}</span>
                    </label>`
                )
                .join('')}
            </div>
          </div>

          <div id="reg-preview" class="hidden rounded-xl border p-4 sm:p-5 ${dark ? 'border-slate-600 bg-slate-700/50' : 'border-slate-200 bg-slate-50'}">
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
              <p><strong class="${dark ? 'text-white' : 'text-slate-900'}">${R.vehicleTypesTitle || 'Vehicle types'}:</strong> <span id="pv-vehicle-types">—</span></p>
              <p class="mt-3 border-t pt-3 ${dark ? 'border-slate-600' : 'border-blue-200'}">
                <strong class="${dark ? 'text-white' : 'text-slate-900'}">${R.previewSubdomain}</strong>
                <span id="pv-sub" class="font-mono font-semibold ${dark ? 'text-yellow-400' : 'text-blue-600'}">companyname.taxio.be</span>
              </p>
            </div>
          </div>

          <div id="terms-wrap" class="flex items-start gap-3 rounded-2xl border-2 p-4 sm:p-5 transition-colors ${dark ? 'border-slate-600 bg-slate-700/50' : 'border-slate-200 bg-slate-50/90'}">
            <input type="checkbox" id="terms" name="terms" class="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 dark:border-slate-500 dark:bg-slate-700" />
            <label for="terms" class="cursor-pointer text-sm leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-600'}">
              ${R.acceptCompanyLead}<a href="/company-terms" class="font-semibold ${dark ? 'text-yellow-400 hover:text-yellow-300' : 'text-blue-600 hover:text-blue-800'}">${R.acceptCompanyTerms}</a>${R.acceptCompanyAnd}<a href="/privacy" class="font-semibold ${dark ? 'text-yellow-400 hover:text-yellow-300' : 'text-blue-600 hover:text-blue-800'}">${R.acceptCompanyPrivacy}</a>
            </label>
          </div>

          <div id="human-wrap" class="flex items-start gap-3 rounded-2xl border-2 p-4 sm:p-5 transition-colors ${dark ? 'border-slate-600 bg-slate-700/50' : 'border-slate-200 bg-slate-50/90'}">
            <input type="checkbox" id="reg-human" name="humanConfirmed" required class="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 dark:border-slate-500 dark:bg-slate-700" />
            <label for="reg-human" class="cursor-pointer text-sm font-medium leading-relaxed ${dark ? 'text-gray-200' : 'text-gray-700'}">${R.humanConfirmLabel}</label>
          </div>

          <p id="reg-err" class="hidden rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/30"></p>
          <input type="text" id="reg-hp" name="companyWebsite" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true" />
          <div id="reg-turnstile-wrap" class="hidden">
            <div id="reg-turnstile-widget"></div>
          </div>

          <div class="flex flex-col gap-3 pt-1 sm:flex-row sm:gap-4">
            <button type="button" id="btn-preview" class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300/90 px-4 py-3.5 text-sm font-semibold shadow-sm transition ${dark ? 'border-slate-600 text-white hover:bg-slate-700/80' : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'}">
              ${icon.eye('h-4 w-4')}
              ${R.preview}
            </button>
            <button type="submit" id="btn-submit" disabled class="flex flex-1 items-center justify-center rounded-xl px-4 py-3.5 text-sm font-semibold shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 ${dark ? 'bg-amber-400 text-slate-900 hover:bg-amber-500' : 'bg-slate-900 text-white hover:bg-slate-800'}">
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
  const humanWrap = root.querySelector('#human-wrap')
  const termsCb = root.querySelector('#terms')
  const humanCb = root.querySelector('#reg-human')
  const overlay = root.querySelector('#reg-success-overlay')
  const phoneInput = root.querySelector('#phone')
  const minSubmitAt = Date.now() + REG_MIN_SUBMIT_MS
  let turnstileToken = ''

  function selectedVehicleTypes() {
    return [...root.querySelectorAll('[data-reg-type]')]
      .filter((el) => el instanceof HTMLInputElement && el.checked)
      .map((el) => el.getAttribute('data-reg-type'))
      .filter(Boolean)
  }

  function refreshPreviewText() {
    const fd = new FormData(form)
    const cn = fd.get('companyName') || ''
    const slug = slugFromCompanyName(cn)
    root.querySelector('#pv-company').textContent = cn || '—'
    root.querySelector('#pv-vat').textContent = fd.get('vatNumber') || '—'
    root.querySelector('#pv-phone').textContent = fd.get('phone') || '—'
    root.querySelector('#pv-email').textContent = fd.get('email') || '—'
    root.querySelector('#pv-city').textContent = fd.get('city') || '—'
    root.querySelector('#pv-vehicle-types').textContent = selectedVehicleTypes().join(', ') || '—'
    root.querySelector('#pv-sub').textContent = slug ? `${slug}.taxio.be` : 'companyname.taxio.be'
  }

  function updateLegalCheckboxStyle(wrap, checked) {
    const on = checked
    wrap.className =
      'flex items-start gap-3 rounded-2xl border-2 p-4 sm:p-5 transition-colors ' +
      (on
        ? dark
          ? 'border-amber-400 bg-amber-400/10'
          : 'border-amber-400/80 bg-amber-50/80'
        : dark
          ? 'border-slate-600 bg-slate-700/50'
          : 'border-slate-200 bg-slate-50/90')
  }

  function updateTermsStyle() {
    updateLegalCheckboxStyle(termsWrap, termsCb.checked)
    updateLegalCheckboxStyle(humanWrap, humanCb.checked)
  }

  root.querySelector('#btn-preview').addEventListener('click', () => {
    refreshPreviewText()
    previewEl.classList.toggle('hidden')
  })

  const submitBtn = root.querySelector('#btn-submit')
  function syncSubmitEnabled() {
    updateTermsStyle()
    submitBtn.disabled = !(termsCb.checked && humanCb.checked && selectedVehicleTypes().length > 0)
  }
  termsCb.addEventListener('change', syncSubmitEnabled)
  humanCb.addEventListener('change', syncSubmitEnabled)
  root.querySelectorAll('[data-reg-type]').forEach((el) => {
    el.addEventListener('change', () => {
      syncSubmitEnabled()
      if (!previewEl.classList.contains('hidden')) refreshPreviewText()
    })
  })
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
      setLocale(b.getAttribute('data-reg-lang'))
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
    if (!humanCb.checked) {
      errEl.textContent = R.humanError
      errEl.classList.remove('hidden')
      return
    }
    const vehicleTypesSelected = selectedVehicleTypes()
    if (vehicleTypesSelected.length === 0) {
      errEl.textContent = R.vehicleTypesError || 'Please select at least one vehicle type.'
      errEl.classList.remove('hidden')
      return
    }
    const fd = new FormData(form)
    if (Date.now() < minSubmitAt) {
      errEl.textContent = R.waitBeforeSubmitError
      errEl.classList.remove('hidden')
      return
    }
    const normalizedPhone = normalizeBelgianPhoneToE164(fd.get('phone'))
    if (!isValidBelgianE164(normalizedPhone)) {
      errEl.textContent =
        'Please enter a valid Belgian phone number (e.g. 0470 12 34 56 or 02 123 45 67).'
      errEl.classList.remove('hidden')
      return
    }
    const companyName = String(fd.get('companyName') || '').trim().toLowerCase()
    const vatNumber = String(fd.get('vatNumber') || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
    if (TURNSTILE_FRONT_ENABLED && TURNSTILE_SITE_KEY && !turnstileToken) {
      errEl.textContent = 'Please complete the security check before submitting.'
      errEl.classList.remove('hidden')
      return
    }
    const payload = {
      companyName: fd.get('companyName'),
      vatNumber: fd.get('vatNumber'),
      phone: normalizedPhone,
      email: fd.get('email'),
      city: fd.get('city'),
      country: null,
      termsAcceptedAt: new Date().toISOString(),
      termsVersion: REGISTRATION_TERMS_BUNDLE,
      locale: getLocale(),
      turnstileToken: turnstileToken || null,
      companyWebsite: String(fd.get('companyWebsite') || ''),
      formStartedAt: minSubmitAt - REG_MIN_SUBMIT_MS,
      humanConfirmed: true,
      vehicleTypes: vehicleTypesSelected,
    }
    const btn = root.querySelector('#btn-submit')
    btn.disabled = true
    btn.textContent = R.btnSubmitting
    const { data, error } = await registerCompanyOwner(payload)
    btn.textContent = R.btnSubmit
    btn.disabled = !(termsCb.checked && humanCb.checked && selectedVehicleTypes().length > 0)
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

  phoneInput?.addEventListener('blur', () => {
    const normalized = normalizeBelgianPhoneToE164(phoneInput.value)
    if (normalized) phoneInput.value = normalized
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

  if (TURNSTILE_FRONT_ENABLED && TURNSTILE_SITE_KEY) {
    const wrap = root.querySelector('#reg-turnstile-wrap')
    const widgetEl = root.querySelector('#reg-turnstile-widget')
    wrap?.classList.remove('hidden')
    if (!document.querySelector('script[data-taxio-turnstile]')) {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.defer = true
      s.setAttribute('data-taxio-turnstile', 'true')
      document.head.appendChild(s)
    }
    const render = () => {
      if (!window.turnstile || !widgetEl || widgetEl.dataset.ready === '1') return
      window.turnstile.render(widgetEl, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => {
          turnstileToken = String(token || '')
        },
        'expired-callback': () => {
          turnstileToken = ''
        },
        'error-callback': () => {
          turnstileToken = ''
        },
      })
      widgetEl.dataset.ready = '1'
    }
    let tries = 0
    const timer = window.setInterval(() => {
      tries += 1
      render()
      if (widgetEl?.dataset.ready === '1' || tries > 25) window.clearInterval(timer)
    }, 200)
  }
}
