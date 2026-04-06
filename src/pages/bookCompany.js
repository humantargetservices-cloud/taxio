import { fetchApprovedCompanyBySlug, createQuickBookingLog } from '../lib/api.js'
import { escapeHtml } from '../lib/html.js'
import { icon } from '../lib/icons.js'
import { estimateTrip } from '../lib/tripEstimate.js'

const DEFAULT_SLOGAN = 'Your Ride, Your Way, Anytime!'
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '')
}

function waLink(phone, body) {
  const n = digitsOnly(phone)
  if (!n) return null
  return `https://wa.me/${n}?text=${encodeURIComponent(body)}`
}

export async function mountBookCompany(root, slug) {
  root.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center bg-[#f3f4f6] px-4 py-8">
      <div class="h-10 w-10 animate-pulse rounded-full border-2 border-gray-300 border-t-yellow-500"></div>
      <p class="mt-3 text-sm text-gray-500">Loading…</p>
    </div>`

  let company
  try {
    company = await fetchApprovedCompanyBySlug(slug)
  } catch {
    company = null
  }

  if (!company) {
    root.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center bg-[#f3f4f6] px-4 py-12">
        <p class="text-lg font-bold text-gray-900">Company not found</p>
        <p class="mt-2 text-center text-sm text-gray-600">This booking link is invalid or the company is not approved.</p>
        <a href="/" class="mt-6 text-sm font-semibold text-yellow-600 hover:underline">TAXIO home</a>
      </div>`
    return
  }

  const slogan = (company.slogan || DEFAULT_SLOGAN).trim()
  const vat = company.vat_number ? `BTW: ${company.vat_number}` : ''
  const phone = company.phone || ''
  const avail = company.availability_status === 'busy' ? 'Busy' : company.availability_status === 'offline' ? 'Offline' : 'Available'
  const availDot = company.availability_status === 'available' ? 'bg-green-500' : 'bg-amber-500'
  const pricing = company.pricing && typeof company.pricing === 'object' ? company.pricing : null
  const configuredTypes = pricing ? Object.keys(pricing).filter(Boolean) : []
  const showCarSelector = configuredTypes.length > 0
  const carTypes = showCarSelector ? configuredTypes : ['standard']

  const carCardsHtml = showCarSelector
    ? carTypes
        .map((t, idx) => {
          const selectedCls =
            idx === 0
              ? 'border-yellow-400 bg-yellow-400 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300'
          const iconHtml =
            String(t).toLowerCase().includes('van')
              ? icon.users('h-6 w-6 text-amber-600')
              : String(t).toLowerCase().includes('lux')
                ? icon.star('h-6 w-6 text-amber-600')
                : icon.car('h-6 w-6 text-gray-900')
          const seats = String(t).toLowerCase().includes('van')
            ? '1-7'
            : String(t).toLowerCase().includes('lux')
              ? '1-3'
              : '1-4'
          return `<button type="button" data-car="${escapeHtml(t)}" class="book-car flex flex-col items-center rounded-xl border-2 ${selectedCls} p-3 text-center transition-all">
              ${iconHtml}
              <span class="mt-1 text-xs font-bold text-gray-900">${escapeHtml(t)}</span>
              <span class="text-[10px] text-gray-700">${seats}</span>
            </button>`
        })
        .join('')
    : ''

  root.innerHTML = `
    <div class="min-h-screen bg-[#f0f2f5] px-4 py-8 pb-16">
      <div class="mx-auto max-w-md space-y-5">
        <div class="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-md">
          <button type="button" id="book-qr-hint" class="absolute right-4 top-4 rounded-lg p-2 text-amber-600 hover:bg-gray-50" title="QR code" aria-label="QR code">
            ${icon.sparkles('h-5 w-5')}
          </button>
          <div class="flex gap-4 pr-10">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-yellow-400 shadow-sm">
              ${icon.car('h-8 w-8 text-gray-900')}
            </div>
            <div class="min-w-0 flex-1">
              <h1 class="text-xl font-bold text-gray-900">${escapeHtml(company.name)}</h1>
              <p class="mt-0.5 text-sm font-medium italic text-amber-600">${escapeHtml(slogan)}</p>
              ${vat ? `<p class="mt-2 text-xs text-gray-600">${escapeHtml(vat)}</p>` : ''}
              ${phone ? `<p class="text-xs text-gray-600">${escapeHtml(phone)}</p>` : ''}
            </div>
          </div>
          <div class="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
            <span class="h-2 w-2 rounded-full ${availDot}"></span>
            <span class="text-sm font-medium text-gray-800">${avail}</span>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-md">
          <div class="space-y-4">
            <div>
              <label class="text-sm font-bold text-gray-900">Pick-up Location</label>
              <div class="relative mt-1">
                <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-green-600">${icon.mapPin('h-4 w-4')}</span>
                <input id="bk-pickup" type="text" autocomplete="street-address" placeholder="Enter pick-up address" class="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500" />
              </div>
            </div>
            <div>
              <label class="text-sm font-bold text-gray-900">Drop-off Location</label>
              <div class="relative mt-1">
                <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-red-500">${icon.mapPin('h-4 w-4')}</span>
                <input id="bk-dropoff" type="text" placeholder="Enter drop-off address" class="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500" />
              </div>
            </div>

            ${showCarSelector ? `<div>
              <p class="text-sm font-bold text-gray-900">Select Car Type</p>
              <div class="mt-2 grid grid-cols-3 gap-2">
                ${carCardsHtml}
              </div>
            </div>` : ''}

            <div>
              <p class="text-sm font-bold text-gray-900">When do you need the ride?</p>
              <div class="mt-2 grid grid-cols-2 gap-2">
                <button type="button" id="bk-ride-now" class="rounded-lg border-2 border-yellow-400 bg-yellow-400 px-3 py-2 text-sm font-semibold text-gray-900">Ride Now</button>
                <button type="button" id="bk-ride-schedule" class="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">Schedule</button>
              </div>
              <div id="bk-schedule-wrap" class="mt-3 hidden">
                <input id="bk-schedule-at" type="datetime-local" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500" />
              </div>
            </div>

            <div id="bk-estimate" class="hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
              <p class="text-sm font-bold text-gray-900">Trip Estimate</p>
              <div id="bk-estimate-loading" class="mt-2 text-xs text-gray-500">Calculating...</div>
              <div id="bk-estimate-body" class="mt-2 hidden text-sm text-gray-700">
                <p>Distance: <span id="bk-est-dist" class="font-semibold"></span></p>
                <p>Duration: <span id="bk-est-dur" class="font-semibold"></span></p>
                <p>Estimated price: <span id="bk-est-price" class="font-semibold text-gray-900"></span></p>
              </div>
            </div>

            <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
              <label class="flex cursor-pointer items-start gap-2">
                <input type="checkbox" id="bk-terms" class="mt-0.5 h-4 w-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500" />
                <span class="text-sm text-gray-700">I accept the <a href="/terms" class="font-semibold text-blue-600 hover:underline">terms and conditions</a></span>
              </label>
            </div>

            <p id="bk-err" class="hidden text-sm text-red-600"></p>

            <button type="button" id="bk-wa" disabled class="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-300 py-3.5 text-sm font-bold text-gray-500 shadow-sm disabled:cursor-not-allowed enabled:bg-green-600 enabled:text-white enabled:hover:bg-green-700">
              ${icon.messageCircle('h-5 w-5')}
              Book with WhatsApp
            </button>

            <div class="grid grid-cols-2 gap-3">
              <a id="bk-mail" href="#" class="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                ${icon.mail('h-4 w-4')}
                Email
              </a>
              <a id="bk-call" href="#" class="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                ${icon.phone('h-4 w-4')}
                Call
              </a>
            </div>
          </div>
        </div>

        <footer class="pt-4 text-center text-xs text-gray-500">
          <p>© 2026 TAXIO. All rights reserved.</p>
          <p class="mt-1 font-medium text-amber-600">Powered by TAXIO</p>
        </footer>
      </div>
    </div>`

  let selectedCar = carTypes[0]
  let rideMode = 'now'
  let estimateTimer = null
  const pickupEl = root.querySelector('#bk-pickup')
  const dropEl = root.querySelector('#bk-dropoff')
  const termsEl = root.querySelector('#bk-terms')
  const waBtn = root.querySelector('#bk-wa')
  const errEl = root.querySelector('#bk-err')
  const estWrap = root.querySelector('#bk-estimate')
  const estLoading = root.querySelector('#bk-estimate-loading')
  const estBody = root.querySelector('#bk-estimate-body')
  const estDist = root.querySelector('#bk-est-dist')
  const estDur = root.querySelector('#bk-est-dur')
  const estPrice = root.querySelector('#bk-est-price')
  const rideNowBtn = root.querySelector('#bk-ride-now')
  const rideScheduleBtn = root.querySelector('#bk-ride-schedule')
  const scheduleWrap = root.querySelector('#bk-schedule-wrap')
  const scheduleInput = root.querySelector('#bk-schedule-at')
  let latestEstimate = null

  const mailA = root.querySelector('#bk-mail')
  const callA = root.querySelector('#bk-call')
  if (company.email) {
    mailA.href = `mailto:${encodeURIComponent(company.email)}?subject=${encodeURIComponent('Taxi booking request')}`
  } else {
    mailA.classList.add('pointer-events-none', 'opacity-40')
  }
  if (phone) {
    callA.href = `tel:${digitsOnly(phone)}`
  } else {
    callA.classList.add('pointer-events-none', 'opacity-40')
  }

  function syncCarUi() {
    if (!showCarSelector) return
    root.querySelectorAll('.book-car').forEach((btn) => {
      const t = btn.getAttribute('data-car')
      const on = t === selectedCar
      btn.className =
        'book-car flex flex-col items-center rounded-xl border-2 p-3 text-center transition-all ' +
        (on
          ? 'border-yellow-400 bg-yellow-400 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300')
    })
  }

  function buildMessage() {
    const pu = pickupEl.value.trim()
    const doff = dropEl.value.trim()
    return `Hello ${company.name}, I would like to book a ride.

Pick-up: ${pu}
Drop-off: ${doff}
Car type: ${selectedCar}`
  }

  function refreshWaState() {
    const ok =
      termsEl.checked &&
      pickupEl.value.trim() &&
      dropEl.value.trim() &&
      digitsOnly(phone).length > 0
    waBtn.disabled = !ok
    errEl.classList.add('hidden')
  }

  function syncRideTimingUi() {
    const isNow = rideMode === 'now'
    if (rideNowBtn) {
      rideNowBtn.className =
        'rounded-lg border-2 px-3 py-2 text-sm font-semibold ' +
        (isNow
          ? 'border-yellow-400 bg-yellow-400 text-gray-900'
          : 'border-gray-200 bg-white text-gray-700')
    }
    if (rideScheduleBtn) {
      rideScheduleBtn.className =
        'rounded-lg border-2 px-3 py-2 text-sm font-semibold ' +
        (!isNow
          ? 'border-yellow-400 bg-yellow-400 text-gray-900'
          : 'border-gray-200 bg-white text-gray-700')
    }
    if (scheduleWrap) scheduleWrap.classList.toggle('hidden', isNow)
  }

  async function refreshEstimate() {
    const pickup = pickupEl.value.trim()
    const dropoff = dropEl.value.trim()
    if (!pickup || !dropoff) {
      latestEstimate = null
      estWrap?.classList.add('hidden')
      return
    }
    estWrap?.classList.remove('hidden')
    estLoading?.classList.remove('hidden')
    estBody?.classList.add('hidden')

    const trip = await estimateTrip({
      pickupAddress: pickup,
      dropoffAddress: dropoff,
      pricing,
      carType: selectedCar || 'standard',
      apiKey: GOOGLE_API_KEY,
    })

    latestEstimate = trip
    if (estDist) estDist.textContent = `${trip.distanceKm} km`
    if (estDur) estDur.textContent = `${trip.durationMin} min`
    if (estPrice) estPrice.textContent = `€${trip.estimatedPrice}`
    estLoading?.classList.add('hidden')
    estBody?.classList.remove('hidden')
  }

  function queueEstimate() {
    if (estimateTimer) window.clearTimeout(estimateTimer)
    estimateTimer = window.setTimeout(() => {
      refreshEstimate().catch(() => {
        estWrap?.classList.add('hidden')
      })
    }, 350)
  }

  root.querySelectorAll('.book-car').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCar = btn.getAttribute('data-car')
      syncCarUi()
      queueEstimate()
    })
  })
  syncCarUi()
  syncRideTimingUi()

  rideNowBtn?.addEventListener('click', () => {
    rideMode = 'now'
    syncRideTimingUi()
  })
  rideScheduleBtn?.addEventListener('click', () => {
    rideMode = 'schedule'
    syncRideTimingUi()
  })

  ;[pickupEl, dropEl, termsEl].forEach((el) => {
    el.addEventListener('input', refreshWaState)
    el.addEventListener('change', refreshWaState)
  })
  pickupEl.addEventListener('input', queueEstimate)
  dropEl.addEventListener('input', queueEstimate)
  refreshWaState()

  root.querySelector('#book-qr-hint')?.addEventListener('click', () => {
    window.alert(
      'Share your booking page: ' + window.location.href + '\n(QR generation can be added in a future release.)'
    )
  })

  waBtn.addEventListener('click', async () => {
    errEl.classList.add('hidden')
    if (!termsEl.checked) {
      errEl.textContent = 'Please accept the terms to continue.'
      errEl.classList.remove('hidden')
      return
    }
    const pu = pickupEl.value.trim()
    const doff = dropEl.value.trim()
    if (!pu || !doff) {
      errEl.textContent = 'Please enter pick-up and drop-off.'
      errEl.classList.remove('hidden')
      return
    }
    const n = digitsOnly(phone)
    if (!n) {
      errEl.textContent = 'This company has no phone number for WhatsApp.'
      errEl.classList.remove('hidden')
      return
    }
    let whenLine = 'When: Ride now'
    let rideDateIso = null
    if (rideMode === 'schedule') {
      const raw = scheduleInput?.value || ''
      if (!raw) {
        errEl.textContent = 'Please select date and time for scheduled ride.'
        errEl.classList.remove('hidden')
        return
      }
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) {
        errEl.textContent = 'Please enter a valid schedule date and time.'
        errEl.classList.remove('hidden')
        return
      }
      rideDateIso = d.toISOString()
      whenLine = `When: Scheduled at ${raw}`
    }
    const estimateLine = latestEstimate
      ? `\nEstimate: ${latestEstimate.distanceKm} km, ${latestEstimate.durationMin} min, €${latestEstimate.estimatedPrice}`
      : ''
    const text = `${buildMessage()}\n${whenLine}${estimateLine}`
    const url = waLink(phone, text)
    await createQuickBookingLog({
      company_id: company.id,
      pickup_address: pu,
      dropoff_address: doff,
      car_type: selectedCar,
      customer_phone: phone,
      ride_datetime: rideDateIso,
      notes: `WhatsApp quick book · ${selectedCar} · ${rideMode}${estimateLine}`,
    })
    window.open(url, '_blank', 'noopener,noreferrer')
  })
}
