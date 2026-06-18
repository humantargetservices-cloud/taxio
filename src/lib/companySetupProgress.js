import {
  hasExplicitVehicleTypeConfig,
  resolveEnabledBookingCarTypes,
} from './bookingCarTypes.js'

export const TAXIO_DASHBOARD_SUPPORT_WA = '32492702795'
export const DEFAULT_COMPANY_SLOGAN = 'Fast & Reliable Service'

export const SETUP_PREVIEW_STORAGE_KEY = (companyId) =>
  `taxio_booking_preview_${String(companyId || '')}`

export const SETUP_QR_STORAGE_KEY = (companyId) =>
  `taxio_qr_stickers_${String(companyId || '')}`

export function normalizeCompanyWhatsAppDigits(phone) {
  const clean = String(phone || '')
    .trim()
    .replace(/[\s().-]/g, '')
  if (!clean) return null
  let digits = ''
  if (clean.startsWith('+')) {
    digits = clean.slice(1).replace(/\D/g, '')
  } else if (clean.startsWith('00')) {
    digits = clean.slice(2).replace(/\D/g, '')
  } else {
    const raw = clean.replace(/\D/g, '')
    digits = raw.startsWith('0') ? `32${raw.slice(1)}` : raw
  }
  if (!digits || digits.startsWith('0')) return null
  if (digits.length < 8 || digits.length > 15) return null
  return digits
}

export function companyHasLogo(company) {
  const raw = String(company?.logo_url || company?.logo || company?.image_url || '').trim()
  if (!raw) return false
  return /^https?:\/\//i.test(raw) || (raw.startsWith('/') && !raw.startsWith('//'))
}

export function companyHasCustomMotto(company) {
  const slogan = String(company?.slogan || '').trim()
  return slogan.length > 0 && slogan !== DEFAULT_COMPANY_SLOGAN
}

export function companyPricingConfigured(company) {
  return hasExplicitVehicleTypeConfig(company?.pricing)
}

export function buildTaxioSupportWaUrl({ companyName, bookingUrl, locale = 'en' }) {
  const lines =
    locale === 'nl'
      ? [
          'Hallo TAXIO, ik heb hulp nodig bij het instellen van mijn boekingspagina.',
          `Bedrijf: ${companyName}`,
          `Boekingspagina: ${bookingUrl}`,
        ]
      : locale === 'fr'
        ? [
            "Bonjour TAXIO, j'ai besoin d'aide pour configurer ma page de réservation.",
            `Entreprise : ${companyName}`,
            `Page de réservation : ${bookingUrl}`,
          ]
        : [
            'Hello TAXIO, I need help configuring my booking page.',
            `Company: ${companyName}`,
            `Booking page: ${bookingUrl}`,
          ]
  return `https://wa.me/${TAXIO_DASHBOARD_SUPPORT_WA}?text=${encodeURIComponent(lines.join('\n'))}`
}

export function buildQrStickersWaUrl({ companyName, bookingUrl, locale = 'en' }) {
  const lines =
    locale === 'nl'
      ? [
          'Hallo TAXIO, ik wil graag QR-code stickers ontvangen voor mijn taxi.',
          `Bedrijf: ${companyName}`,
          `Boekingspagina: ${bookingUrl}`,
          'Adres:',
          'Aantal wagens:',
        ]
      : locale === 'fr'
        ? [
            'Bonjour TAXIO, je souhaite recevoir des autocollants QR code pour mon taxi.',
            `Entreprise : ${companyName}`,
            `Page de réservation : ${bookingUrl}`,
            'Adresse :',
            'Nombre de véhicules :',
          ]
        : [
            'Hello TAXIO, I would like to receive QR code stickers for my taxi.',
            `Company: ${companyName}`,
            `Booking page: ${bookingUrl}`,
            'Address:',
            'Number of cars:',
          ]
  return `https://wa.me/${TAXIO_DASHBOARD_SUPPORT_WA}?text=${encodeURIComponent(lines.join('\n'))}`
}

/**
 * Setup score 50% (live) → 100% when all optional steps are done.
 */
export function calculateCompanySetupProgress(company, options = {}) {
  const { previewDone = false, qrRequested = false } = options
  const slug = String(company?.slug || '').trim()
  const live = company?.status === 'approved' && slug.length >= 2
  const pricingConfigured = companyPricingConfigured(company)
  const vehicleTypes = resolveEnabledBookingCarTypes(company)
  const pricingSummary = vehicleTypes.join(' / ')
  const hasPhoto = companyHasLogo(company)
  const mottoCustom = companyHasCustomMotto(company)
  const hasWhatsApp = !!normalizeCompanyWhatsAppDigits(company?.phone)

  let percent = 0
  if (live) percent += 50
  if (pricingConfigured) percent += 20
  if (hasPhoto) percent += 10
  if (mottoCustom) percent += 5
  if (hasWhatsApp) percent += 5
  if (previewDone) percent += 5
  if (qrRequested) percent += 5

  const items = [
    {
      key: 'live',
      completed: live,
      points: 50,
      actionId: 'preview',
      meta: { bookingUrl: options.bookingUrl || '' },
    },
    {
      key: 'pricing',
      completed: pricingConfigured,
      points: 20,
      actionId: 'pricing',
      meta: { pricingSummary, vehicleTypes },
    },
    {
      key: 'photo',
      completed: hasPhoto,
      points: 10,
      actionId: 'photo',
      meta: {},
    },
    {
      key: 'motto',
      completed: mottoCustom,
      points: 5,
      actionId: 'motto',
      meta: {},
    },
    {
      key: 'whatsapp',
      completed: hasWhatsApp,
      points: 5,
      actionId: null,
      meta: {},
    },
    {
      key: 'preview',
      completed: previewDone,
      points: 5,
      actionId: 'preview',
      meta: {},
    },
    {
      key: 'qr',
      completed: qrRequested,
      points: 5,
      actionId: 'qr',
      meta: {},
    },
  ]

  return {
    percent: Math.min(100, percent),
    live,
    pricingConfigured,
    pricingSummary,
    vehicleTypes,
    hasPhoto,
    mottoCustom,
    hasWhatsApp,
    previewDone,
    qrRequested,
    items,
  }
}
