import { escapeHtml } from './html.js'
import { formatDateTime } from './format.js'
import { icon } from './icons.js'

const DASH_PANEL =
  'rounded-2xl border border-gray-200/60 bg-white/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_32px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:p-6 dark:border-slate-700/40 dark:bg-slate-900/70 dark:shadow-[0_8px_40px_rgba(0,0,0,0.35)]'
const DASH_SUBCARD = 'rounded-xl border border-gray-100 bg-gray-50/80 dark:border-slate-600/50 dark:bg-slate-900/40'
const DASH_TEXT = 'text-gray-900 dark:text-slate-50'
const DASH_MUTED = 'text-gray-500 dark:text-slate-400'
const DASH_BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_14px_rgba(234,179,8,0.28)] transition-all duration-200 hover:bg-yellow-300 active:scale-[0.98] dark:bg-amber-400 dark:hover:bg-amber-300'
const DASH_BTN_SECONDARY =
  'inline-flex items-center justify-center rounded-xl border border-gray-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition-all duration-200 hover:bg-gray-50 active:scale-[0.98] dark:border-slate-600/70 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-700/80'
const DASH_BTN_ACCEPT =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400'
const DASH_BTN_REFUSE =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'

function fill(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''))
}

/** Best-effort parse of estimate text already stored in booking notes (no recalculation). Legacy only. */
export function estimateLabelFromBookingNotes(notes) {
  const s = String(notes || '')
  const m = s.match(/Estimate:[^\n]*€\s*([0-9]+(?:[.,][0-9]+)?)/i) || s.match(/€\s*([0-9]+(?:[.,][0-9]+)?)/)
  return m ? `€${String(m[1]).replace(',', '.')}` : null
}

/** Clean display labels like €35. → €35 without changing stored numerics. */
export function cleanTripPriceDisplay(label) {
  if (label == null || label === '') return null
  let s = String(label).trim()
  if (!s) return null
  // Repair mojibake euro from mis-encoded SQL apply; strip whole-euro trailing dot.
  s = s.replace(/â‚¬/g, '€').replace(/\u00e2\u20ac/g, '€')
  s = s.replace(/(€\s*\d+)\.(?!\d)/g, '$1')
  s = s.replace(/(\d+)\.\s*(EUR)\b/gi, '$1 $2')
  return s
}

/** Format structured booking trip price (immutable snapshot). Never recalculates. */
export function formatTripPriceLabel(amount, currency = 'EUR') {
  if (amount == null || amount === '' || Number.isNaN(Number(amount))) return null
  const n = Number(amount)
  const amt = Number.isInteger(n) ? String(n) : String(n)
  const cur = String(currency || 'EUR').trim().toUpperCase() || 'EUR'
  if (cur === 'EUR') return `€${amt}`
  return `${amt} ${cur}`
}

/**
 * Trip price display for a booking/rescue row.
 * Prefer Rescue preview copy → booking.estimated_price_eur → legacy notes.
 */
export function tripPriceLabelFromBooking(booking, rescue) {
  if (rescue?.preview_estimated_price) {
    return cleanTripPriceDisplay(rescue.preview_estimated_price)
  }
  const structured = formatTripPriceLabel(booking?.estimated_price_eur, booking?.price_currency)
  if (structured) return structured
  return cleanTripPriceDisplay(estimateLabelFromBookingNotes(booking?.notes))
}

export function routeLabel(pickup, dropoff) {
  const a = String(pickup || '').trim() || '—'
  const b = String(dropoff || '').trim() || '—'
  return `${a} → ${b}`
}

export function renderRescueConfirmModal(td) {
  return `<div id="rescue-confirm-modal" class="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="rescue-confirm-title">
    <div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6">
      <h3 id="rescue-confirm-title" class="text-lg font-bold ${DASH_TEXT}">${escapeHtml(td.rescueRefuseTitle)}</h3>
      <p class="mt-3 text-sm leading-relaxed ${DASH_MUTED}">${escapeHtml(td.rescueRefuseBody)}</p>
      <p class="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">${escapeHtml(td.rescueConfirmPrivacy)}</p>
      <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" id="rescue-confirm-cancel" class="${DASH_BTN_SECONDARY} min-h-[44px]">${escapeHtml(td.rescueConfirmCancel)}</button>
        <button type="button" id="rescue-confirm-send" class="${DASH_BTN_PRIMARY} min-h-[44px]">${escapeHtml(td.rescueRefuseConfirm)}</button>
      </div>
      <p id="rescue-confirm-msg" class="mt-3 hidden text-sm font-medium text-red-600 dark:text-red-400"></p>
    </div>
  </div>`
}

export function renderRescueStatusBadge(td, rescue, winnerName) {
  if (!rescue) return ''
  if (rescue.status === 'OPEN') {
    return `<span class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
      <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500"></span>${escapeHtml(td.rescueStatusLooking)}
    </span>`
  }
  if (rescue.status === 'ACCEPTED') {
    const by = winnerName ? fill(td.rescueStatusAcceptedBy, { name: winnerName }) : td.rescueStatusAccepted
    return `<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200">
      ${icon.check('h-3 w-3')}${escapeHtml(by)}
    </span>`
  }
  if (rescue.status === 'CANCELLED' || rescue.status === 'EXPIRED') {
    return `<span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">${escapeHtml(td.rescueStatusClosed)}</span>`
  }
  return ''
}

function renderTripPriceLine(td, priceLabel) {
  if (!priceLabel) return ''
  return `<p class="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">${escapeHtml(td.rescueTripPrice)}: ${escapeHtml(priceLabel)}</p>`
}

/**
 * Actions for Company A on a booking row:
 * - Accept (normal) / Refuse (→ Rescue)
 * - or Rescue status if already activated
 */
export function renderBookingDecisionActions(td, booking, rescue, opts) {
  const { rescueGlobalOn, companyRescueOn, winnerName, tripPrice } = opts || {}
  const priceLine = renderTripPriceLine(td, tripPrice)
  if (rescue) {
    const badge = renderRescueStatusBadge(td, rescue, winnerName)
    const detail =
      rescue.status === 'OPEN'
        ? `<p class="mt-1 text-[11px] ${DASH_MUTED}">${escapeHtml(td.rescueStatusLookingDetail)}</p>`
        : rescue.status === 'ACCEPTED' && winnerName
          ? `<p class="mt-1 text-[11px] ${DASH_MUTED}">${escapeHtml(fill(td.rescueStatusAcceptedBy, { name: winnerName }))}</p>`
          : ''
    return `<div>${badge}${detail}${priceLine}</div>`
  }

  const st = String(booking.status || 'new')
  if (st === 'accepted') {
    return `<div><span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">${icon.check('h-3 w-3')}${escapeHtml(td.bookingAccepted)}</span>${priceLine}</div>`
  }
  if (st === 'rejected') {
    return `<div><span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">${escapeHtml(td.bookingRefused)}</span>${priceLine}</div>`
  }

  const canRescue = rescueGlobalOn && companyRescueOn
  return `<div>
    ${priceLine}
    <div class="mt-1.5 flex flex-wrap gap-1.5">
      <button type="button" data-booking-accept="${escapeHtml(booking.id)}" class="${DASH_BTN_ACCEPT} min-h-[36px]">${escapeHtml(td.bookingAccept)}</button>
      <button type="button" data-booking-refuse="${escapeHtml(booking.id)}" class="${DASH_BTN_REFUSE} min-h-[36px]" title="${escapeHtml(canRescue ? td.rescueRefuseHint : td.rescueRefuseNoNetwork)}">${escapeHtml(td.bookingRefuse)}</button>
    </div>
  </div>`
}

export function renderRescueTab(td, opts) {
  const {
    companyRescueOn,
    rescueGlobalOn,
    openOppCount,
    opportunities,
    outbound,
    winnerNames,
    acceptedDetails,
  } = opts

  const killBanner = !rescueGlobalOn
    ? `<div class="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">${escapeHtml(td.rescueGlobalOff)}</div>`
    : ''

  const settingsCard = `
    <div class="${DASH_SUBCARD} p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <h3 class="text-base font-bold ${DASH_TEXT}">${escapeHtml(td.rescueNetworkTitle)}</h3>
          <p class="mt-1 text-sm leading-relaxed ${DASH_MUTED}">${escapeHtml(td.rescueNetworkSub)}</p>
        </div>
        <label class="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold ${DASH_TEXT} dark:border-slate-600 dark:bg-slate-800">
          <input type="checkbox" id="dash-rescue-enabled" class="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400" ${companyRescueOn ? 'checked' : ''} ${!rescueGlobalOn ? 'disabled' : ''} />
          <span>${escapeHtml(companyRescueOn ? td.rescueOn : td.rescueOff)}</span>
        </label>
      </div>
      <button type="button" id="save-rescue-enabled" class="${DASH_BTN_PRIMARY} mt-4 min-h-[44px]" ${!rescueGlobalOn ? 'disabled' : ''}>${escapeHtml(td.rescueSaveSetting)}</button>
      <p id="dash-rescue-msg" class="mt-2 text-sm font-medium ${DASH_MUTED}"></p>
    </div>`

  const openOpps = (opportunities || []).filter((o) => o.status === 'OFFERED' && o.rescue?.status === 'OPEN')
  const acceptedOpps = (opportunities || []).filter((o) => o.status === 'ACCEPTED')
  const missedOpps = (opportunities || []).filter(
    (o) => o.status === 'MISSED' || (o.status === 'OFFERED' && o.rescue?.status === 'ACCEPTED')
  )

  const oppCards = openOpps.length
    ? openOpps
        .map((o) => {
          const r = o.rescue || {}
          const priceLabel = cleanTripPriceDisplay(r.preview_estimated_price)
          const price = priceLabel
            ? `<p class="mt-2 text-sm font-bold text-amber-700 dark:text-amber-300">${escapeHtml(td.rescueTripPrice)}: ${escapeHtml(priceLabel)}</p>`
            : ''
          return `<article class="${DASH_SUBCARD} p-4" data-rescue-opp="${escapeHtml(o.rescue_request_id)}" data-rescue-push-title="${escapeHtml(td.rescuePushTitle)}">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">${escapeHtml(td.rescueOppBadge)}</p>
                <p class="mt-2 text-sm font-semibold ${DASH_TEXT}">${escapeHtml(r.preview_pickup_label || '—')} → ${escapeHtml(r.preview_dropoff_label || '—')}</p>
                ${price}
              </div>
              <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">${escapeHtml(td.rescueOppOpen)}</span>
            </div>
            <dl class="mt-3 grid grid-cols-2 gap-2 text-xs ${DASH_MUTED}">
              <div><dt class="font-semibold">${escapeHtml(td.rescueWhen)}</dt><dd class="${DASH_TEXT}">${escapeHtml(formatDateTime(r.preview_ride_datetime) || '—')}</dd></div>
              <div><dt class="font-semibold">${escapeHtml(td.rescueCarType)}</dt><dd class="${DASH_TEXT}">${escapeHtml(r.preview_car_type || '—')}</dd></div>
              <div><dt class="font-semibold">${escapeHtml(td.rescueServiceType)}</dt><dd class="${DASH_TEXT}">${escapeHtml(r.preview_service_type || '—')}</dd></div>
            </dl>
            <p class="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">${escapeHtml(td.rescueOppPrivacyHint)}</p>
            <p class="mt-2 text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">${escapeHtml(td.rescueAcceptPriceHint)}</p>
            <button type="button" data-rescue-accept="${escapeHtml(o.rescue_request_id)}" class="${DASH_BTN_PRIMARY} mt-4 w-full min-h-[44px]" ${!rescueGlobalOn || !companyRescueOn ? 'disabled' : ''}>${escapeHtml(td.rescueAccept)}</button>
            <p class="rescue-accept-msg mt-2 hidden text-sm font-medium"></p>
          </article>`
        })
        .join('')
    : `<p class="py-6 text-center text-sm ${DASH_MUTED}">${escapeHtml(td.rescueNoOpportunities)}</p>`

  const wonCards = acceptedOpps
    .map((o) => {
      const r = o.rescue || {}
      const details = acceptedDetails?.[o.rescue_request_id]
      const booking = details?.booking
      return `<article class="${DASH_SUBCARD} border-emerald-200/70 p-4 dark:border-emerald-500/30">
        <p class="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">${escapeHtml(td.rescueAcceptedTitle)}</p>
        <p class="mt-1 text-sm font-medium text-emerald-800 dark:text-emerald-200">${escapeHtml(td.rescueDetailsUnlocked)}</p>
        ${
          booking
            ? `<div class="mt-3 space-y-1.5 text-sm">
          <p class="font-semibold ${DASH_TEXT}">${escapeHtml(booking.customer_name || '—')}</p>
          <p class="${DASH_MUTED}">${escapeHtml(td.phone)}: <a class="font-semibold text-emerald-700 dark:text-emerald-300" href="tel:${escapeHtml(booking.customer_phone || '')}">${escapeHtml(booking.customer_phone || '—')}</a></p>
          <p class="${DASH_TEXT}">${escapeHtml(booking.pickup_address || '—')}</p>
          <p class="${DASH_MUTED}">→ ${escapeHtml(booking.dropoff_address || '—')}</p>
          ${
            tripPriceLabelFromBooking(booking, r)
              ? `<p class="font-semibold text-amber-700 dark:text-amber-300">${escapeHtml(td.rescueTripPrice)}: ${escapeHtml(tripPriceLabelFromBooking(booking, r))}</p>`
              : ''
          }
          <p class="text-xs ${DASH_MUTED}">${escapeHtml(formatDateTime(booking.ride_datetime) || '—')} · ${escapeHtml(booking.car_type || '')}</p>
          ${booking.notes ? `<p class="mt-2 text-xs ${DASH_MUTED}">${escapeHtml(booking.notes)}</p>` : ''}
        </div>`
            : `<p class="mt-2 text-sm ${DASH_MUTED}">${escapeHtml(r.preview_pickup_label || '—')} → ${escapeHtml(r.preview_dropoff_label || '—')}</p>
               ${
                 cleanTripPriceDisplay(r.preview_estimated_price)
                   ? `<p class="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-300">${escapeHtml(td.rescueTripPrice)}: ${escapeHtml(cleanTripPriceDisplay(r.preview_estimated_price))}</p>`
                   : ''
               }
               <button type="button" data-rescue-load-details="${escapeHtml(o.rescue_request_id)}" class="${DASH_BTN_SECONDARY} mt-3 min-h-[40px] text-xs">${escapeHtml(td.rescueLoadDetails)}</button>`
        }
      </article>`
    })
    .join('')

  const missedNote = missedOpps.length
    ? `<p class="mt-4 text-xs ${DASH_MUTED}">${escapeHtml(fill(td.rescueMissedCount, { count: String(missedOpps.length) }))}</p>`
    : ''

  const outboundCards = (outbound || []).length
    ? outbound
        .map((r) => {
          const winner = r.accepted_by_company_id ? winnerNames[r.accepted_by_company_id] : ''
          return `<article class="${DASH_SUBCARD} p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              ${renderRescueStatusBadge(td, r, winner)}
              <span class="text-[11px] ${DASH_MUTED}">${escapeHtml(formatDateTime(r.activated_at))}</span>
            </div>
            <p class="mt-2 text-sm font-semibold ${DASH_TEXT}">${escapeHtml(r.preview_pickup_label || '—')} → ${escapeHtml(r.preview_dropoff_label || '—')}</p>
            ${
              cleanTripPriceDisplay(r.preview_estimated_price)
                ? `<p class="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-300">${escapeHtml(td.rescueTripPrice)}: ${escapeHtml(cleanTripPriceDisplay(r.preview_estimated_price))}</p>`
                : ''
            }
            ${
              r.status === 'ACCEPTED' && winner
                ? `<p class="mt-1 text-sm ${DASH_MUTED}">${escapeHtml(fill(td.rescueStatusAcceptedBy, { name: winner }))}</p>`
                : r.status === 'OPEN'
                  ? `<p class="mt-1 text-sm ${DASH_MUTED}">${escapeHtml(td.rescueStatusLookingDetail)}</p>`
                  : ''
            }
          </article>`
        })
        .join('')
    : `<p class="py-4 text-center text-sm ${DASH_MUTED}">${escapeHtml(td.rescueNoOutbound)}</p>`

  return `
    <div class="${DASH_PANEL}">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold ${DASH_TEXT}">${escapeHtml(td.rescueTabHead)}</h2>
          <p class="text-sm ${DASH_MUTED}">${escapeHtml(td.rescueTabSub)}</p>
        </div>
        ${
          openOppCount > 0
            ? `<span class="inline-flex items-center rounded-full bg-amber-400 px-2.5 py-1 text-xs font-black text-slate-900">${escapeHtml(String(openOppCount))}</span>`
            : ''
        }
      </div>
      ${killBanner}
      <div class="mt-5 space-y-5">
        ${settingsCard}
        <section>
          <h3 class="text-sm font-bold ${DASH_TEXT}">${escapeHtml(td.rescueInboundHead)}</h3>
          <p class="mt-0.5 text-xs ${DASH_MUTED}">${escapeHtml(td.rescueInboundSub)}</p>
          <div class="mt-3 space-y-3">${oppCards}</div>
          ${wonCards ? `<div class="mt-4 space-y-3">${wonCards}</div>` : ''}
          ${missedNote}
        </section>
        <section>
          <h3 class="text-sm font-bold ${DASH_TEXT}">${escapeHtml(td.rescueOutboundHead)}</h3>
          <p class="mt-0.5 text-xs ${DASH_MUTED}">${escapeHtml(td.rescueOutboundSub)}</p>
          <div class="mt-3 space-y-3">${outboundCards}</div>
        </section>
      </div>
    </div>`
}
