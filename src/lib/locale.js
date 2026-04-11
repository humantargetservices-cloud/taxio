/**
 * App-wide UI locale (Belgian market default: Dutch).
 * Persisted in localStorage under the same key used since launch: "language".
 */
export const LOCALE_STORAGE_KEY = 'language'
export const DEFAULT_LOCALE = 'nl'
/** Display / toggle order */
export const SUPPORTED_LOCALES = ['nl', 'fr', 'en']

export function normalizeLocale(raw) {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (SUPPORTED_LOCALES.includes(s)) return s
  return DEFAULT_LOCALE
}

export function getLocale() {
  try {
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
  } catch {
    return DEFAULT_LOCALE
  }
}

/**
 * Persist choice and sync &lt;html lang&gt;.
 */
export function setLocale(code) {
  const next = normalizeLocale(code)
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, next)
  } catch {
    /* ignore quota / private mode */
  }
  syncDocumentLang(next)
  return next
}

export function syncDocumentLang(locale = getLocale()) {
  const L = normalizeLocale(locale)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = L === 'fr' ? 'fr' : L === 'nl' ? 'nl' : 'en'
  }
}
