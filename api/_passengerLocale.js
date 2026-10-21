/**
 * Passenger booking language: stored as en|nl|fr on booking_requests.passenger_locale.
 * Maps to Meta WhatsApp template language codes for production templates.
 * Staging English-only templates always force language "en".
 */

/** @param {unknown} raw */
export function normalizePassengerLocale(raw) {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
  if (!s) return 'en'
  if (s === 'en' || s.startsWith('en-')) return 'en'
  if (s === 'nl' || s.startsWith('nl-')) return 'nl'
  if (s === 'fr' || s.startsWith('fr-')) return 'fr'
  return 'en'
}

/**
 * Booking passenger_locale → Meta template language code (production).
 * @param {unknown} passengerLocale
 */
export function mapPassengerLocaleToWhatsAppLanguage(passengerLocale) {
  const loc = normalizePassengerLocale(passengerLocale)
  if (loc === 'nl') return 'nl_BE'
  if (loc === 'fr') return 'fr'
  return 'en'
}

function envTemplateLangFallback() {
  return String(process.env.WHATSAPP_TEMPLATE_LANG || '').trim() || 'en'
}

/**
 * True when this send must stay on English-only staging templates.
 * Prefer template-name + staging env/host — never use company preferred_locale.
 */
export function forceWhatsAppEnglishTemplateLanguage(templateName) {
  const name = String(templateName || '').trim().toLowerCase()
  if (name.includes('_staging') || name.endsWith('_staging')) return true
  if (String(process.env.TAXIO_STAGING || '').trim().toLowerCase() === 'true') return true
  const origin = String(process.env.PUBLIC_APP_ORIGIN || '')
    .trim()
    .toLowerCase()
  if (!origin) return false
  if (origin.includes('stagingtaxio')) return true
  try {
    return new URL(origin).hostname.startsWith('staging.')
  } catch {
    return false
  }
}

/**
 * Resolve Meta `template.language.code` for a send.
 * Staging / *_staging templates → always "en".
 * Production names → map booking passenger_locale; else WHATSAPP_TEMPLATE_LANG; else en.
 *
 * @param {{ passengerLocale?: unknown, templateName?: unknown }} opts
 */
export function resolveWhatsAppTemplateLanguage(opts = {}) {
  const templateName = String(opts.templateName || '').trim()
  if (forceWhatsAppEnglishTemplateLanguage(templateName)) {
    return 'en'
  }
  const raw = opts.passengerLocale
  if (raw != null && String(raw).trim() !== '') {
    return mapPassengerLocaleToWhatsAppLanguage(raw)
  }
  return envTemplateLangFallback() || 'en'
}
