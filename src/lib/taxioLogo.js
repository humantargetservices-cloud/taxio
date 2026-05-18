import taxioLogoUrl from '../assets/images/logo/taxio-logo.png'

export const TAXIO_LOGO_ALT = 'TAXIO logo'

/**
 * Official TAXIO mark (PNG). Use `padDark` on light backgrounds so the logo’s black
 * canvas blends with the app’s dark navy chrome.
 *
 * @param {{ wrapClass?: string, imgClass?: string, padDark?: boolean }} [opts]
 */
export function taxioLogoMark(opts = {}) {
  const wrapClass = opts.wrapClass || 'h-9 w-9'
  const imgClass = opts.imgClass || 'h-full w-full object-contain'
  const padDark = opts.padDark === true
  const outer = padDark
    ? `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 shadow-sm ring-1 ring-black/5 ${wrapClass}`
    : `inline-flex shrink-0 items-center justify-center overflow-hidden ${wrapClass}`
  return `<span class="${outer}"><img src="${taxioLogoUrl}" alt="${TAXIO_LOGO_ALT}" class="${imgClass}" width="64" height="64" decoding="async" /></span>`
}

/** Compact mark without extra wrapper padding (dark pages). */
export function taxioLogoImg(wrapClass = 'h-9 w-9') {
  return taxioLogoMark({ wrapClass, padDark: false })
}

/** Mark for light surfaces (login, cards on white). */
export function taxioLogoImgOnLight(wrapClass = 'h-9 w-9') {
  return taxioLogoMark({ wrapClass, padDark: true })
}
