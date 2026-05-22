import { navigate } from '../nav.js'
import {
  getSession,
  getMyProfile,
  getCompanyForUser,
  updateCompanyByOwner,
  uploadCompanyLogo,
  markCompanyOnboardingComplete,
  DEFAULT_PRICING,
  insertCar,
  listCarsForCompany,
} from '../lib/api.js'
import { normalizeFleetCarType } from '../lib/bookingCarTypes.js'
import { absolutePublicBookingUrl } from '../lib/tenant.js'
import { escapeHtml } from '../lib/html.js'
import { icon } from '../lib/icons.js'

const PRESETS = [
  { key: 'Standard', title: 'Standard Taxi', hint: 'Everyday city rides' },
  { key: 'Van', title: 'Van / 7 seats', hint: 'Groups & extra luggage' },
  { key: 'Luxury', title: 'Business class', hint: 'Executive comfort' },
]

function plateSuffix() {
  try {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
  } catch {
    return String(Date.now()).slice(-8)
  }
}

function defaultEnabledFromFleet(cars) {
  const fromFleet = new Set((cars || []).map((c) => normalizeFleetCarType(c.car_type)))
  if (fromFleet.size > 0) {
    return {
      Standard: fromFleet.has('Standard'),
      Van: fromFleet.has('Van'),
      Luxury: fromFleet.has('Luxury'),
    }
  }
  return { Standard: true, Van: true, Luxury: false }
}

function progressRow(current) {
  return `<div class="mb-8 flex items-center justify-center gap-2" role="presentation" aria-hidden="true">
    ${[1, 2, 3, 4]
      .map(
        (n) =>
          `<div class="h-2 w-8 rounded-full transition-colors sm:w-10 ${n <= current ? 'bg-yellow-400' : 'bg-gray-200'}"></div>`
      )
      .join('')}
  </div>`
}

function footerNav(showSkip) {
  return `<div class="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
    ${
      showSkip
        ? `<button type="button" id="onb-skip" class="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 sm:w-auto">Skip for now</button>`
        : '<span class="hidden sm:block sm:w-auto"></span>'
    }
    <button type="button" id="onb-continue" class="w-full rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-bold text-white shadow-md hover:bg-gray-800 sm:min-w-[180px]">Continue</button>
  </div>`
}

export async function mountOnboardingCompany(root) {
  root.innerHTML = `<div class="flex min-h-screen flex-col items-center justify-center bg-[#eef0f3] px-4">
    <div class="h-10 w-10 animate-pulse rounded-full border-2 border-gray-300 border-t-yellow-500"></div>
    <p class="mt-3 text-sm text-gray-500">Loading setup…</p>
  </div>`

  const session = await getSession()
  if (!session?.user) {
    navigate('/login/company')
    return
  }

  const profile = await getMyProfile(session.user.id)
  if (profile?.first_login_required) {
    navigate('/change-password/company')
    return
  }
  if (profile?.company_onboarding_completed !== false) {
    navigate('/dashboard/company')
    return
  }

  const company = await getCompanyForUser(session.user.id)
  if (!company) {
    navigate('/register')
    return
  }
  if (company.status !== 'approved') {
    navigate('/pending-approval')
    return
  }

  let cars = []
  try {
    cars = await listCarsForCompany(company.id)
  } catch {
    cars = []
  }

  const bookingUrl = absolutePublicBookingUrl(company.slug)
  const bookingQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(bookingUrl)}`
  const waShareUrl = `https://wa.me/?text=${encodeURIComponent(`Book our taxi: ${bookingUrl}`)}`

  const ui = {
    step: 1,
    markedDone: false,
    enabledTypes: defaultEnabledFromFleet(cars),
  }

  async function markDoneOnce() {
    if (ui.markedDone) return
    const { error } = await markCompanyOnboardingComplete(session.user.id)
    if (error) {
      window.alert(error.message || 'Could not save setup status. Please try again or go to the dashboard.')
      return
    }
    ui.markedDone = true
  }

  function readEnabledFromForm() {
    const enabled = { Standard: false, Van: false, Luxury: false }
    root.querySelectorAll('[data-onb-type]').forEach((el) => {
      const k = el.getAttribute('data-onb-type')
      if (k in enabled && el instanceof HTMLInputElement) enabled[k] = el.checked
    })
    return enabled
  }

  async function applyStep3(enabled) {
    const any = Object.values(enabled).some(Boolean)
    if (!any) {
      const err = root.querySelector('#onb-err')
      if (err) {
        err.textContent = 'Turn on at least one vehicle type, or use Skip for now.'
        err.classList.remove('hidden')
      }
      return false
    }

    const nextPricing = {
      ...(company.pricing && typeof company.pricing === 'object' ? company.pricing : {}),
    }
    for (const k of ['Standard', 'Van', 'Luxury']) {
      if (enabled[k]) nextPricing[k] = { enabled: true, ...DEFAULT_PRICING[k] }
      else delete nextPricing[k]
    }
    const { error: pErr } = await updateCompanyByOwner(company.id, { pricing: nextPricing })
    if (pErr) {
      window.alert(pErr.message || 'Could not save pricing.')
      return false
    }

    const modelFor = (k) =>
      k === 'Van' ? 'Passenger van' : k === 'Luxury' ? 'Executive vehicle' : 'Taxi'

    for (const k of ['Standard', 'Van', 'Luxury']) {
      if (!enabled[k]) continue
      const has = cars.some((c) => normalizeFleetCarType(c.car_type) === k)
      if (has) continue
      const { error: cErr } = await insertCar({
        company_id: company.id,
        model: modelFor(k),
        license_plate: `TAXIO-${k}-${plateSuffix()}`,
        year: new Date().getFullYear(),
        car_type: k,
        driver_name: null,
      })
      if (cErr) {
        window.alert(cErr.message || 'Could not add a starter vehicle.')
        return false
      }
    }

    try {
      cars = await listCarsForCompany(company.id)
    } catch {
      /* keep previous */
    }
    return true
  }

  async function bind() {
    root.querySelector('#onb-exit')?.addEventListener('click', async () => {
      await markDoneOnce()
      if (!ui.markedDone) return
      navigate('/dashboard/company')
    })

    const errEl = root.querySelector('#onb-err')

    root.querySelector('#onb-continue')?.addEventListener('click', async () => {
      errEl?.classList.add('hidden')
      if (ui.step === 1) {
        ui.step = 2
        render()
        return
      }
      if (ui.step === 2) {
        const emailEl = root.querySelector('#onb-email')
        const cityEl = root.querySelector('#onb-city')
        const fileEl = root.querySelector('#onb-logo')
        const email = emailEl instanceof HTMLInputElement ? emailEl.value.trim() : ''
        const city = cityEl instanceof HTMLInputElement ? cityEl.value.trim() : ''
        if (!email) {
          errEl?.classList.remove('hidden')
          if (errEl) errEl.textContent = 'Please enter a contact email.'
          return
        }
        const { error } = await updateCompanyByOwner(company.id, { email, city })
        if (error) {
          errEl?.classList.remove('hidden')
          if (errEl) errEl.textContent = error.message || 'Could not save profile.'
          return
        }
        const file = fileEl instanceof HTMLInputElement ? fileEl.files?.[0] : null
        if (file) {
          const { error: upErr } = await uploadCompanyLogo(company.id, file)
          if (upErr) {
            errEl?.classList.remove('hidden')
            if (errEl) errEl.textContent = upErr.message || 'Logo upload failed.'
            return
          }
        }
        ui.step = 3
        render()
        return
      }
      if (ui.step === 3) {
        ui.enabledTypes = readEnabledFromForm()
        const ok = await applyStep3(ui.enabledTypes)
        if (!ok) return
        await markDoneOnce()
        if (!ui.markedDone) return
        ui.step = 4
        render()
      }
    })

    root.querySelector('#onb-skip')?.addEventListener('click', async () => {
      errEl?.classList.add('hidden')
      if (ui.step < 3) {
        ui.step += 1
        render()
        return
      }
      if (ui.step === 3) {
        await markDoneOnce()
        if (!ui.markedDone) return
        ui.step = 4
        render()
      }
    })

    root.querySelector('#onb-copy-url')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(bookingUrl)
        const fb = root.querySelector('#onb-copy-fb')
        if (fb) {
          fb.textContent = 'Copied!'
          fb.classList.remove('hidden')
          window.setTimeout(() => fb.classList.add('hidden'), 2500)
        }
      } catch {
        window.prompt('Copy your booking link:', bookingUrl)
      }
    })
  }

  function render() {
    const step = ui.step
    const topBar = `<div class="mb-6 flex items-center justify-between gap-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Quick setup</p>
      <button type="button" id="onb-exit" class="text-xs font-semibold text-gray-600 underline decoration-gray-300 underline-offset-2 hover:text-gray-900">Exit setup</button>
    </div>`

    let inner = ''
    if (step === 1) {
      inner = `
        ${topBar}
        ${progressRow(1)}
        <div class="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-lg md:p-8">
          <div class="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
            ${icon.check('h-8 w-8 text-yellow-700')}
          </div>
          <h1 class="text-2xl font-bold text-gray-900">You&apos;re in</h1>
          <p class="mt-2 text-sm leading-relaxed text-gray-600">Your password is set. Let&apos;s finish a quick setup so your public booking page is ready—about three minutes.</p>
          <p id="onb-err" class="mt-4 hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"></p>
          ${footerNav(true)}
        </div>`
    } else if (step === 2) {
      const logoHint = /^https?:\/\//i.test(String(company.logo_url || '').trim())
        ? `<p class="mt-2 text-xs text-gray-500">Current logo will stay unless you upload a new image.</p>`
        : ''
      inner = `
        ${topBar}
        ${progressRow(2)}
        <div class="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-lg md:p-8">
          <h1 class="text-xl font-bold text-gray-900">Company profile</h1>
          <p class="mt-1 text-sm text-gray-600">Shown to riders on your booking page.</p>
          <div class="mt-6 space-y-4">
            <div>
              <label class="text-sm font-semibold text-gray-900">Logo <span class="font-normal text-gray-500">(optional)</span></label>
              <input id="onb-logo" type="file" accept="image/jpeg,image/png,image/webp" class="mt-2 block w-full text-sm text-gray-600" />
              ${logoHint}
            </div>
            <div>
              <label class="text-sm font-semibold text-gray-900">Email</label>
              <input id="onb-email" type="email" required class="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm" value="${escapeHtml(company.email || '')}" />
            </div>
            <div>
              <label class="text-sm font-semibold text-gray-900">City</label>
              <input id="onb-city" type="text" class="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm" value="${escapeHtml(company.city || '')}" placeholder="Brussels" />
            </div>
            <div>
              <label class="text-sm font-semibold text-gray-900">Phone</label>
              <input type="text" readonly class="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-700" value="${escapeHtml(company.phone || '—')}" />
              <p class="mt-1 text-xs text-gray-500">From your registration. It cannot be changed here for security—contact support if it needs updating.</p>
            </div>
          </div>
          <p id="onb-err" class="mt-4 hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"></p>
          ${footerNav(true)}
        </div>`
    } else if (step === 3) {
      const cards = PRESETS.map(
        (p) => `
        <label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 shadow-sm transition hover:border-yellow-300/80 hover:bg-white has-[:checked]:border-yellow-400 has-[:checked]:bg-yellow-50/40">
          <input type="checkbox" data-onb-type="${p.key}" class="mt-1 h-4 w-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400/30" ${ui.enabledTypes[p.key] ? 'checked' : ''} />
          <div class="min-w-0 flex-1">
            <p class="font-bold text-gray-900">${escapeHtml(p.title)}</p>
            <p class="text-xs text-gray-600">${escapeHtml(p.hint)}</p>
            <p class="mt-2 font-mono text-[11px] text-gray-500">€${DEFAULT_PRICING[p.key].start} start · €${DEFAULT_PRICING[p.key].per_km}/km</p>
          </div>
        </label>`
      ).join('')
      inner = `
        ${topBar}
        ${progressRow(3)}
        <div class="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-lg md:p-8">
          <h1 class="text-xl font-bold text-gray-900">Pricing &amp; vehicles</h1>
          <p class="mt-1 text-sm text-gray-600">Turn on the vehicle types you offer. We&apos;ll use sensible default prices—you can change this later anytime in your dashboard.</p>
          <div class="mt-6 grid gap-3">${cards}</div>
          <p id="onb-err" class="mt-4 hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"></p>
          ${footerNav(true)}
        </div>`
    } else {
      inner = `
        ${topBar}
        ${progressRow(4)}
        <div class="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-lg md:p-8">
          <div class="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            ${icon.sparkles('h-8 w-8 text-emerald-700')}
          </div>
          <h1 class="text-2xl font-bold text-gray-900">Your TAXIO booking system is live</h1>
          <p class="mt-2 text-sm text-gray-600">Share this link with customers or print the QR code for your desk or vehicle.</p>
          <div class="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Public booking URL</p>
            <p class="mt-2 break-all text-sm font-medium text-gray-900">${escapeHtml(bookingUrl)}</p>
            <p id="onb-copy-fb" class="mt-2 hidden text-xs font-semibold text-emerald-600">Copied!</p>
          </div>
          <div class="mx-auto mt-6 flex max-w-[200px] justify-center rounded-xl border border-gray-100 bg-white p-3 shadow-inner">
            <img src="${escapeHtml(bookingQrSrc)}" width="200" height="200" alt="Booking QR code" class="h-48 w-48 rounded-lg" loading="lazy" decoding="async" />
          </div>
          <div class="mt-8 flex flex-col gap-3">
            <a href="${escapeHtml(bookingUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3.5 text-sm font-bold text-gray-900 shadow hover:bg-yellow-500">${icon.eye('h-4 w-4')}Open booking page</a>
            <button type="button" id="onb-copy-url" class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">${icon.externalLink('h-4 w-4')}Copy booking link</button>
            <a href="${escapeHtml(bookingQrSrc)}" download="taxio-booking-qr.png" target="_blank" rel="noopener noreferrer" class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">${icon.qrCode('h-4 w-4')}Download QR code</a>
            <a href="/dashboard/company" class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow hover:bg-gray-800">Open dashboard</a>
            <a href="${escapeHtml(waShareUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-3.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100">${icon.messageCircle('h-4 w-4')}Share on WhatsApp</a>
          </div>
          <p class="mt-6 text-center text-xs text-gray-500">Fleet, pricing details, and branding are all available in your dashboard whenever you need them.</p>
        </div>`
    }

    root.innerHTML = `<div class="min-h-screen bg-[#eef0f3] px-4 py-8 md:py-12">
      <div class="mx-auto max-w-lg pb-8">${inner}</div>
    </div>`

    void bind()
  }

  render()
}
