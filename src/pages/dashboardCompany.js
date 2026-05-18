import { navigate } from '../nav.js'
import { translations, tDashboard } from '../i18n.js'
import {
  getSession,
  getMyProfile,
  getCompanyForUser,
  listBookingRequestsForCompany,
  listCarsForCompany,
  insertCar,
  updateCar,
  deleteCar,
  updateCompanyByOwner,
  uploadCompanyLogo,
  removeCompanyLogo,
  DEFAULT_PRICING,
} from '../lib/api.js'
import { signOutEverywhere } from '../lib/auth.js'
import { formatDateTime } from '../lib/format.js'
import { escapeHtml } from '../lib/html.js'
import { icon } from '../lib/icons.js'
import { taxioLogoImg } from '../lib/taxioLogo.js'
import { absolutePublicBookingUrl } from '../lib/tenant.js'
import { getLocale, setLocale, syncDocumentLang } from '../lib/locale.js'

const dashState = {
  tab: 'overview',
  modal: null,
  editingCarId: null,
}

function pricingOf(company) {
  const p = company.pricing
  if (p && typeof p === 'object' && Object.keys(p).length) return p
  return { ...DEFAULT_PRICING }
}

function tabClass(active) {
  return active
    ? 'rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200'
    : 'rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white/60'
}

function overviewCard(opts) {
  const { color, iconHtml, title, subtitle, id } = opts
  return `
    <button type="button" data-overview-card="${id}" class="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-md transition hover:shadow-lg">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full ${color}">
        ${iconHtml}
      </div>
      <h3 class="text-base font-bold text-gray-900">${title}</h3>
      ${subtitle ? `<p class="mt-1 text-xs text-gray-500">${subtitle}</p>` : ''}
    </button>`
}

export async function mountDashboardCompany(root) {
  syncDocumentLang(getLocale())
  const loadLang = getLocale()
  root.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center bg-[#eef0f3]">
      <div class="h-10 w-10 animate-pulse rounded-full border-2 border-gray-300 border-t-yellow-500"></div>
      <p class="mt-3 text-sm text-gray-500">${tDashboard(loadLang).loading}</p>
    </div>`

  const session = await getSession()
  if (!session) {
    navigate('/login/company')
    return
  }
  const profile = await getMyProfile(session.user.id)
  if (profile?.first_login_required) {
    navigate('/change-password/company')
    return
  }

  if (profile?.company_onboarding_completed === false) {
    navigate('/onboarding/company')
    return
  }

  const company = await getCompanyForUser(session.user.id)
  if (!company) {
    navigate('/register')
    return
  }
  if (company.status === 'pending') {
    navigate('/pending-approval')
    return
  }
  if (company.status === 'suspended') {
    navigate('/pending-approval')
    return
  }
  if (company.status === 'rejected') {
    navigate('/pending-approval')
    return
  }

  let cars = []
  let bookings = []
  try {
    cars = await listCarsForCompany(company.id)
  } catch {
    cars = []
  }
  try {
    bookings = await listBookingRequestsForCompany(company.id)
  } catch {
    bookings = []
  }

  const dashLang = getLocale()
  const td = tDashboard(dashLang)

  const vatLine = company.vat_number
    ? `${td.vatLine} ${escapeHtml(company.vat_number)}`
    : `${td.vatLine} —`
  const bookPublicUrl = absolutePublicBookingUrl(company.slug)
  const bookingQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(bookPublicUrl)}`
  const pricing = pricingOf(company)
  const avail = company.availability_status || 'available'
  const logoRaw = String(company.logo_url || '').trim()
  const logoOk = /^https?:\/\//i.test(logoRaw)
  const logoSrcEsc = logoOk ? escapeHtml(logoRaw) : ''

  const tabsR1 = [
    { id: 'overview', label: td.tabOverview },
    { id: 'cars', label: td.tabCars },
    { id: 'pricing', label: td.tabPricing },
    { id: 'essential', label: td.tabEssential },
  ]
  const tabsR2 = [
    { id: 'drivers', label: td.tabDrivers },
    { id: 'ride-requests', label: td.tabRides },
    { id: 'license', label: td.tabLicense },
  ]

  function tabRowHtml(row, current) {
    return `<div class="flex flex-wrap justify-center gap-2">${row
      .map(
        (t) =>
          `<button type="button" data-dash-tab="${t.id}" class="${tabClass(current === t.id)}">${t.label}</button>`
      )
      .join('')}</div>`
  }

  let bodyHtml = ''
  const t = dashState.tab

  if (t === 'overview') {
    bodyHtml = `
      <div class="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 class="text-lg font-bold text-gray-900">${td.shareTitle}</h2>
            <p class="mt-1 text-sm text-gray-500">${td.shareSubtitle}</p>
            <div class="mt-4 flex max-w-full flex-col gap-2 sm:flex-row sm:items-center">
              <input type="text" readonly value="${escapeHtml(bookPublicUrl)}" class="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-800 sm:text-sm" id="dash-booking-url-field" />
              <div class="flex flex-wrap gap-2">
                <button type="button" id="dash-copy-booking-url" class="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800">${td.copyLink}</button>
                <a href="${escapeHtml(bookPublicUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">${icon.eye('h-4 w-4')}${td.openLive}</a>
                <a href="${escapeHtml(bookingQrSrc)}" download="taxio-booking-qr.png" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100">${td.downloadQr}</a>
              </div>
            </div>
            <p id="dash-copy-feedback" class="mt-2 hidden text-xs font-medium text-emerald-600">${td.copied}</p>
          </div>
          <div class="mx-auto shrink-0 rounded-xl border border-gray-100 bg-white p-2 shadow-inner lg:mx-0">
            <img src="${escapeHtml(bookingQrSrc)}" width="160" height="160" alt="" class="h-40 w-40 rounded-lg" loading="lazy" decoding="async" />
          </div>
        </div>
      </div>
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        ${overviewCard({
          id: 'add-car',
          color: 'bg-blue-500',
          iconHtml: icon.plus('h-8 w-8 text-white'),
          title: td.cardAddCar,
        })}
        ${overviewCard({
          id: 'set-pricing',
          color: 'bg-violet-500',
          iconHtml: `<span class="text-2xl font-bold text-white">$</span>`,
          title: td.cardPricing,
        })}
        ${overviewCard({
          id: 'customize',
          color: 'bg-yellow-400',
          iconHtml: icon.palette('h-8 w-8 text-gray-900'),
          title: td.cardCustomize,
        })}
        ${overviewCard({
          id: 'essential',
          color: 'bg-emerald-500',
          iconHtml: icon.helpCircle('h-8 w-8 text-white'),
          title: td.cardEssential,
        })}
        ${overviewCard({
          id: 'car-types',
          color: 'bg-orange-500',
          iconHtml: icon.car('h-8 w-8 text-white'),
          title: td.cardCarTypes,
        })}
      </div>`
  } else if (t === 'cars') {
    const rows =
      cars.length === 0
        ? `<p class="py-8 text-center text-sm text-gray-500">${td.noCars}</p>`
        : cars
            .map(
              (c) => `
      <div class="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
          ${icon.car('h-6 w-6')}
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-bold text-gray-900">${escapeHtml(c.model)}</p>
          <p class="text-xs text-gray-600">${escapeHtml(c.license_plate)} · ${escapeHtml(String(c.year || ''))}${c.driver_name ? ` · ${escapeHtml(c.driver_name)}` : ''}</p>
        </div>
        <span class="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-bold text-gray-900">${escapeHtml(c.car_type)}</span>
        <button type="button" data-edit-car="${escapeHtml(c.id)}" class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white">
          ${icon.pencil('h-3.5 w-3.5')}
          ${td.edit}
        </button>
      </div>`
            )
            .join('')
    bodyHtml = `
      <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
        <h2 class="text-lg font-bold text-gray-900">${td.carsHead}</h2>
        <p class="text-sm text-gray-500">${td.carsSub}</p>
        <div class="mt-6 space-y-3">${rows}</div>
        <button type="button" id="open-add-car" class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3.5 text-sm font-bold text-gray-900 shadow hover:bg-yellow-500">
          ${icon.plus('h-5 w-5')}
          ${td.addCar}
        </button>
      </div>`
  } else if (t === 'pricing') {
    bodyHtml = `
      <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
        <h2 class="text-lg font-bold text-gray-900">${td.pricingHead}</h2>
        <p class="text-sm text-gray-500">${td.pricingSub}</p>
        <div id="pricing-form-mount" class="mt-6 space-y-4"></div>
        <button type="button" id="save-pricing" class="mt-6 w-full rounded-xl bg-yellow-400 py-3.5 text-sm font-bold text-gray-900 shadow hover:bg-yellow-500">${td.savePricing}</button>
      </div>`
  } else if (t === 'essential') {
    const slogan = company.slogan || 'Fast & Reliable Service'
    const logoPreviewInner = logoOk
      ? `<img id="dash-logo-preview-img" src="${logoSrcEsc}" alt="" class="h-full w-full object-cover" decoding="async" />`
      : `<div class="flex h-full w-full items-center justify-center bg-slate-900">${taxioLogoImg('h-16 w-16')}</div>`
    bodyHtml = `
      <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
        <h2 class="text-lg font-bold text-gray-900">${td.essentialHead}</h2>
        <p class="text-sm text-gray-500">${td.essentialSub}</p>
        <div class="mt-6 space-y-4">
          <div class="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div class="flex shrink-0 justify-center sm:justify-start">
                <div id="dash-logo-preview-wrap" class="relative flex h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-inner">
                  ${logoPreviewInner}
                </div>
              </div>
              <div class="min-w-0 flex-1 space-y-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">${escapeHtml(td.logoHead)}</p>
                <p class="text-sm leading-relaxed text-gray-600">${escapeHtml(td.logoSub)}</p>
                <div class="flex flex-wrap items-center gap-2 pt-1">
                  <input type="file" id="dash-logo-input" accept="image/jpeg,image/png,image/webp" class="sr-only" />
                  <label for="dash-logo-input" class="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-gray-900 shadow hover:bg-yellow-500">${escapeHtml(td.logoChoose)}</label>
                  ${
                    logoOk
                      ? `<button type="button" id="dash-logo-remove" class="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">${escapeHtml(td.logoRemove)}</button>`
                      : ''
                  }
                </div>
                <p class="text-xs text-gray-400">${escapeHtml(td.logoHint)}</p>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <div class="flex items-start gap-3">
              <span class="text-emerald-600">${icon.helpCircle('h-5 w-5')}</span>
              <div>
                <p class="text-xs text-gray-500">${td.companyName}</p>
                <p class="font-bold text-gray-900">${escapeHtml(company.name)}</p>
              </div>
            </div>
            <button type="button" data-edit-field="name" class="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">${icon.pencil('h-3 w-3')}${td.edit}</button>
          </div>
          <div class="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <div>
              <p class="text-xs text-gray-500">${td.slogan}</p>
              <p class="font-bold text-gray-900">${escapeHtml(slogan)}</p>
            </div>
            <button type="button" data-edit-field="slogan" class="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">${icon.pencil('h-3 w-3')}${td.edit}</button>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl border border-gray-100 bg-white p-4">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-gray-500">${td.phone}</p>
                  <p class="mt-1 text-sm font-semibold text-gray-900">${escapeHtml(company.phone || '—')}</p>
                </div>
                <span class="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Locked</span>
              </div>
              <p class="mt-2 text-[11px] text-gray-400">${td.lockedHint}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-white p-4">
              <p class="text-xs text-gray-500">${td.email}</p>
              <p class="mt-1 text-sm font-semibold text-gray-900 break-all">${escapeHtml(company.email)}</p>
            </div>
            <div class="rounded-xl border border-gray-100 bg-white p-4">
              <p class="text-xs text-gray-500">${td.city}</p>
              <p class="mt-1 text-sm font-semibold text-gray-900">${escapeHtml(company.city || '—')}</p>
            </div>
          </div>
          <div class="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs text-gray-500">${td.vatLine}</p>
                <p class="font-bold text-gray-900">${escapeHtml(company.vat_number || '—')}</p>
              </div>
              <span class="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500">Locked</span>
            </div>
            <p class="mt-2 text-[11px] text-gray-400">${td.lockedHintVat}</p>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <div>
              <p class="text-xs text-gray-500 mb-2">${td.carTypes}</p>
              <div class="flex flex-wrap gap-2">
                <span class="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-gray-900">Standard</span>
                <span class="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-gray-900">Van</span>
                <span class="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-gray-900">Luxury</span>
              </div>
            </div>
            <button type="button" data-edit-field="contact" class="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">${icon.pencil('h-3 w-3')}${td.edit}</button>
          </div>
        </div>
      </div>`
  } else if (t === 'drivers') {
    bodyHtml = `
      <div class="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-md">
        <p class="font-semibold text-gray-900">${td.driversHead}</p>
        <p class="mt-2 text-sm text-gray-500">${td.driversSub}</p>
      </div>`
  } else if (t === 'ride-requests') {
    const filtered = [...bookings]
    bodyHtml = `
      <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
        <h2 class="text-lg font-bold text-gray-900">${td.ridesHead}</h2>
        <p class="text-sm text-gray-500">${td.ridesSub}</p>
        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="search" id="ride-search" placeholder="${escapeHtml(td.ridesSearch)}" class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm" />
          <button type="button" disabled title="Coming soon" class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-400">
            ${td.exportSoon}
          </button>
        </div>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th class="py-3 pr-4">${td.thPassenger}</th>
                <th class="py-3 pr-4">${td.thFrom}</th>
                <th class="py-3 pr-4">${td.thTo}</th>
                <th class="py-3 pr-4">${td.thWhen}</th>
                <th class="py-3">${td.thActions}</th>
              </tr>
            </thead>
            <tbody id="ride-tbody">
              ${filtered
                .map((b) => {
                  const wa = company.phone
                    ? `https://wa.me/${String(company.phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Regarding booking from ${b.pickup_address}`)}`
                    : ''
                  const em = `mailto:${encodeURIComponent(company.email)}?subject=${encodeURIComponent('Booking')}&body=${encodeURIComponent(`Passenger: ${b.customer_name || '—'}\nFrom: ${b.pickup_address}\nTo: ${b.dropoff_address}`)}`
                  return `
                <tr class="border-b border-gray-100 ride-row" data-search="${escapeHtml(`${b.customer_name} ${b.pickup_address} ${b.dropoff_address} ${b.ride_datetime}`.toLowerCase())}">
                  <td class="py-3 pr-4 font-medium text-gray-900">${escapeHtml(b.customer_name || '—')}</td>
                  <td class="py-3 pr-4 text-gray-600">${escapeHtml(b.pickup_address)}</td>
                  <td class="py-3 pr-4 text-gray-600">${escapeHtml(b.dropoff_address)}</td>
                  <td class="py-3 pr-4 whitespace-nowrap text-gray-600">${escapeHtml(formatDateTime(b.ride_datetime))}</td>
                  <td class="py-3">
                    <div class="flex flex-wrap gap-2">
                      <a href="${wa ? escapeHtml(wa) : '#'}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50 ${!company.phone ? 'pointer-events-none opacity-40' : ''}">${icon.messageCircle('h-3.5 w-3.5')}${td.wa}</a>
                      <a href="${escapeHtml(em)}" class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50">${icon.mail('h-3.5 w-3.5')}${td.mail}</a>
                    </div>
                  </td>
                </tr>`
                })
                .join('')}
            </tbody>
          </table>
          ${filtered.length === 0 ? `<p class="py-8 text-center text-sm text-gray-500">${td.noRides}</p>` : ''}
        </div>
      </div>`
  } else if (t === 'license') {
    const plan = company.subscription_plan === 'premium' ? 'Premium' : 'Basic'
    bodyHtml = `
      <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-md">
        <h2 class="text-lg font-bold text-gray-900">${td.licenseHead}</h2>
        <p class="mt-2 text-sm text-gray-600"><span class="rounded-full bg-gray-900 px-3 py-0.5 text-xs font-bold text-white">${plan}</span></p>
        <p class="mt-4 text-sm text-gray-500">${td.licenseSub}</p>
      </div>`
  }

  root.innerHTML = `
    <div class="min-h-screen bg-[#eef0f3] pb-12">
      <header class="border-b border-gray-200 bg-white shadow-sm">
        <div class="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4 px-4 py-4">
          <div class="flex gap-3">
            ${
              logoOk
                ? `<div class="relative flex h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200/80">
              <img src="${logoSrcEsc}" alt="" class="dash-header-logo-img h-full w-full object-cover" decoding="async" />
              <div class="dash-header-logo-fallback absolute inset-0 hidden items-center justify-center bg-slate-900">${taxioLogoImg('h-10 w-10')}</div>
            </div>`
                : `<div class="flex h-14 w-14 shrink-0 items-center justify-center">
              ${taxioLogoImg('h-14 w-14')}
            </div>`
            }
            <div>
              <h1 class="text-xl font-bold text-gray-900">${escapeHtml(company.name)}</h1>
              <p class="text-xs text-gray-500">${td.dashBadge}</p>
              <p class="mt-1 text-xs font-medium text-gray-600">${vatLine}</p>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <div class="flex flex-wrap items-center justify-end gap-2">
              <div class="flex rounded-full border border-gray-200 bg-white p-0.5 shadow-sm">
                ${['nl', 'fr', 'en']
                  .map(
                    (lc) =>
                      `<button type="button" data-dash-lang="${lc}" class="rounded-full px-2.5 py-1.5 text-xs font-semibold ${dashLang === lc ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}">${lc.toUpperCase()}</button>`
                  )
                  .join('')}
              </div>
              <button type="button" data-help class="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">${icon.helpCircle('h-4 w-4')}${td.help}</button>
              <button type="button" id="co-logout" class="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">${icon.logOut('h-4 w-4')}${td.logout}</button>
            </div>
            <select id="co-avail" class="rounded-full border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-gray-800 shadow-sm">
              <option value="available" ${avail === 'available' ? 'selected' : ''}>● ${td.availAvailable}</option>
              <option value="busy" ${avail === 'busy' ? 'selected' : ''}>${td.availBusy}</option>
              <option value="offline" ${avail === 'offline' ? 'selected' : ''}>${td.availOffline}</option>
            </select>
          </div>
        </div>
        <div class="mx-auto max-w-6xl space-y-2 border-t border-gray-100 bg-[#eef0f3] px-4 py-3">
          ${tabRowHtml(tabsR1, t)}
          ${tabRowHtml(tabsR2, t)}
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-4 py-8">
        <p id="dash-msg" class="mb-4 hidden rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"></p>
        ${bodyHtml}
      </main>

      <footer class="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-gray-500">
        <p>© 2026 TAXIO</p>
        <p class="mt-2">
          <a href="/terms" class="font-medium text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-gray-900">${translations[dashLang]?.footerTerms || 'Terms'}</a>
        </p>
        <p class="mt-2 font-medium text-amber-700/90">${td.footerPowered}</p>
      </footer>

      <div id="dash-modal-root"></div>
    </div>`

  root.querySelectorAll('[data-dash-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      dashState.tab = btn.getAttribute('data-dash-tab')
      dashState.modal = null
      mountDashboardCompany(root)
    })
  })

  root.querySelector('#co-logout')?.addEventListener('click', async () => {
    await signOutEverywhere()
    navigate('/')
  })

  root.querySelector('[data-help]')?.addEventListener('click', () => {
    navigate('/contact')
  })

  root.querySelectorAll('[data-dash-lang]').forEach((b) => {
    b.addEventListener('click', () => {
      const lc = b.getAttribute('data-dash-lang')
      if (lc) setLocale(lc)
      mountDashboardCompany(root)
    })
  })

  root.querySelector('#dash-copy-booking-url')?.addEventListener('click', async () => {
    const el = root.querySelector('#dash-booking-url-field')
    const fb = root.querySelector('#dash-copy-feedback')
    const url = el?.value || bookPublicUrl
    try {
      await navigator.clipboard.writeText(url)
      fb?.classList.remove('hidden')
      window.setTimeout(() => fb?.classList.add('hidden'), 2000)
    } catch {
      el?.select()
      document.execCommand('copy')
      fb?.classList.remove('hidden')
      window.setTimeout(() => fb?.classList.add('hidden'), 2000)
    }
  })

  root.querySelector('#co-avail')?.addEventListener('change', async (e) => {
    const v = e.target.value
    const { error } = await updateCompanyByOwner(company.id, { availability_status: v })
    if (error) {
      const m = root.querySelector('#dash-msg')
      m.textContent = error.message
      m.classList.remove('hidden')
    } else {
      mountDashboardCompany(root)
    }
  })

  root.querySelectorAll('[data-overview-card]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-overview-card')
      if (id === 'add-car' || id === 'car-types') {
        dashState.tab = 'cars'
        dashState.modal = id === 'add-car' ? 'add-car' : null
        mountDashboardCompany(root)
        return
      }
      if (id === 'set-pricing') {
        dashState.tab = 'pricing'
        mountDashboardCompany(root)
        return
      }
      if (id === 'essential') {
        dashState.tab = 'essential'
        mountDashboardCompany(root)
        return
      }
      if (id === 'customize') {
        dashState.tab = 'essential'
        dashState.modal = null
        mountDashboardCompany(root)
      }
    })
  })

  if (t === 'pricing') {
    const mount = root.querySelector('#pricing-form-mount')
    if (mount) {
      mount.innerHTML = ['Standard', 'Van', 'Luxury']
        .map((name) => {
          const p = pricing[name] || DEFAULT_PRICING[name]
          return `
        <div class="rounded-xl border border-gray-200 p-4">
          <p class="mb-3 font-bold text-gray-900">${name}</p>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="text-xs text-gray-500">Start</label>
              <input type="text" data-pcat="${name}" data-pfield="start" value="${escapeHtml(p.start)}" class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm" />
            </div>
            <div>
              <label class="text-xs text-gray-500">Per Km</label>
              <input type="text" data-pcat="${name}" data-pfield="per_km" value="${escapeHtml(p.per_km)}" class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm" />
            </div>
            <div>
              <label class="text-xs text-gray-500">Initial Km</label>
              <input type="text" data-pcat="${name}" data-pfield="initial_km" value="${escapeHtml(p.initial_km)}" class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm" />
            </div>
          </div>
        </div>`
        })
        .join('')
    }
    root.querySelector('#save-pricing')?.addEventListener('click', async () => {
      const next = { ...pricing }
      root.querySelectorAll('[data-pcat]').forEach((inp) => {
        const cat = inp.getAttribute('data-pcat')
        const field = inp.getAttribute('data-pfield')
        if (!next[cat]) next[cat] = {}
        next[cat][field] = inp.value
      })
      const { error } = await updateCompanyByOwner(company.id, { pricing: next })
      const m = root.querySelector('#dash-msg')
      if (error) {
        m.textContent = error.message
        m.classList.remove('hidden')
      } else {
        m.className = 'mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800'
        m.textContent = 'Pricing saved.'
        m.classList.remove('hidden')
        setTimeout(() => mountDashboardCompany(root), 600)
      }
    })
  }

  if (t === 'ride-requests') {
    root.querySelector('#ride-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase()
      root.querySelectorAll('.ride-row').forEach((tr) => {
        const hay = tr.getAttribute('data-search') || ''
        tr.style.display = !q || hay.includes(q) ? '' : 'none'
      })
    })
  }

  root.querySelector('.dash-header-logo-img')?.addEventListener('error', (e) => {
    const img = e.target
    img.classList.add('hidden')
    const fb = img.nextElementSibling
    if (fb?.classList.contains('dash-header-logo-fallback')) {
      fb.classList.remove('hidden')
      fb.classList.add('flex')
    }
  })

  if (t === 'essential') {
    const logoInput = root.querySelector('#dash-logo-input')
    const logoRemove = root.querySelector('#dash-logo-remove')
    logoInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      let objUrl = null
      const msgEl = root.querySelector('#dash-msg')
      try {
        objUrl = URL.createObjectURL(file)
        const wrap = root.querySelector('#dash-logo-preview-wrap')
        if (wrap) {
          wrap.innerHTML =
            '<img id="dash-logo-preview-img" alt="" class="h-full w-full object-cover" decoding="async" />'
          const im = wrap.querySelector('#dash-logo-preview-img')
          if (im) im.src = objUrl
        }
        const { error } = await uploadCompanyLogo(company.id, file)
        if (objUrl) URL.revokeObjectURL(objUrl)
        if (error) {
          if (msgEl) {
            msgEl.textContent = error.message
            msgEl.className =
              'mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
            msgEl.classList.remove('hidden')
          }
          mountDashboardCompany(root)
          return
        }
        mountDashboardCompany(root)
      } catch (err) {
        if (objUrl) URL.revokeObjectURL(objUrl)
        if (msgEl) {
          msgEl.textContent = err?.message || 'Upload failed.'
          msgEl.className =
            'mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
          msgEl.classList.remove('hidden')
        }
        mountDashboardCompany(root)
      }
    })
    logoRemove?.addEventListener('click', async () => {
      const msgEl = root.querySelector('#dash-msg')
      const { error } = await removeCompanyLogo(company.id)
      if (error) {
        if (msgEl) {
          msgEl.textContent = error.message
          msgEl.className =
            'mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
          msgEl.classList.remove('hidden')
        }
        return
      }
      mountDashboardCompany(root)
    })
  }

  root.querySelectorAll('[data-edit-field]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.getAttribute('data-edit-field')
      if (f === 'name') {
        const v = window.prompt('Company name', company.name)
        if (v == null) return
        updateCompanyByOwner(company.id, { name: v }).then(() => mountDashboardCompany(root))
      } else if (f === 'slogan') {
        const v = window.prompt('Slogan', company.slogan || '')
        if (v == null) return
        updateCompanyByOwner(company.id, { slogan: v }).then(() => mountDashboardCompany(root))
      } else if (f === 'contact') {
        const em = window.prompt('Email', company.email || '')
        if (em == null) return
        const city = window.prompt('City', company.city || '')
        if (city == null) return
        updateCompanyByOwner(company.id, { email: em, city }).then(() =>
          mountDashboardCompany(root)
        )
      }
    })
  })

  function openCarModal(editId) {
    const modalRoot = root.querySelector('#dash-modal-root')
    const edit = editId ? cars.find((c) => c.id === editId) : null
    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" id="car-modal-backdrop">
        <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div class="mb-4 flex items-start justify-between">
            <div>
              <h3 class="text-lg font-bold text-gray-900">${edit ? 'Edit Car' : 'Add Car'}</h3>
              <p class="text-sm text-gray-500">${edit ? 'Update vehicle details' : 'Add a new vehicle to your fleet'}</p>
            </div>
            <button type="button" id="car-modal-x" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100">${icon.x('h-5 w-5')}</button>
          </div>
          <form id="car-modal-form" class="space-y-4">
            <input type="hidden" name="car_id" value="${edit ? escapeHtml(edit.id) : ''}" />
            <div>
              <label class="text-sm font-semibold text-gray-900">Model</label>
              <input name="model" required class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Mercedes E-Class" value="${edit ? escapeHtml(edit.model) : ''}" />
            </div>
            <div>
              <label class="text-sm font-semibold text-gray-900">License Plate</label>
              <input name="license_plate" required class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="1-ABC-123" value="${edit ? escapeHtml(edit.license_plate) : ''}" />
            </div>
            <div>
              <label class="text-sm font-semibold text-gray-900">Year</label>
              <input name="year" type="number" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="2022" value="${edit ? escapeHtml(String(edit.year || '')) : ''}" />
            </div>
            <div>
              <label class="text-sm font-semibold text-gray-900">Car Type *</label>
              <select name="car_type" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                ${['Standard', 'Van', 'Luxury']
                  .map(
                    (o) =>
                      `<option value="${o}" ${edit && edit.car_type === o ? 'selected' : ''}>${o}</option>`
                  )
                  .join('')}
              </select>
            </div>
            <div>
              <label class="text-sm font-semibold text-gray-900">Driver name (optional)</label>
              <input name="driver_name" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="John Doe" value="${edit ? escapeHtml(edit.driver_name || '') : ''}" />
            </div>
            <button type="submit" class="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3.5 text-sm font-bold text-gray-900 shadow hover:bg-yellow-500">
              ${icon.plus('h-5 w-5')}
              ${edit ? 'Save Car' : 'Add Car'}
            </button>
          </form>
        </div>
      </div>`
    const close = () => {
      modalRoot.innerHTML = ''
      dashState.modal = null
    }
    modalRoot.querySelector('#car-modal-x')?.addEventListener('click', close)
    modalRoot.querySelector('#car-modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'car-modal-backdrop') close()
    })
    modalRoot.querySelector('#car-modal-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const carId = fd.get('car_id')
      const row = {
        company_id: company.id,
        model: fd.get('model'),
        license_plate: fd.get('license_plate'),
        year: fd.get('year') ? parseInt(fd.get('year'), 10) : null,
        car_type: fd.get('car_type'),
        driver_name: fd.get('driver_name') || null,
      }
      const { error } = carId
        ? await updateCar(carId, company.id, {
            model: row.model,
            license_plate: row.license_plate,
            year: row.year,
            car_type: row.car_type,
            driver_name: row.driver_name,
          })
        : await insertCar(row)
      if (!error) {
        close()
        mountDashboardCompany(root)
      } else {
        window.alert(error.message)
      }
    })
  }

  if (t === 'cars') {
    if (dashState.modal === 'add-car') {
      openCarModal(null)
      dashState.modal = null
    }
    root.querySelector('#open-add-car')?.addEventListener('click', () => openCarModal(null))
    root.querySelectorAll('[data-edit-car]').forEach((b) => {
      b.addEventListener('click', () => openCarModal(b.getAttribute('data-edit-car')))
    })
  }
}
