import taxioLogoUrl from '../assets/images/logo/taxio-logo.png'

export const TAXIO_LOGO_ALT = 'TAXIO logo'

/**
 * Official TAXIO mark (transparent PNG, original artwork). Platform branding only.
 *
 * @param {{ wrapClass?: string, imgClass?: string }} [opts]
 */
export function taxioLogoMark(opts = {}) {
  const wrapClass = opts.wrapClass || 'h-9 w-9'
  const imgClass = opts.imgClass || 'h-full w-full object-contain object-center'
  return `<span class="inline-flex shrink-0 items-center justify-center ${wrapClass}"><img src="${taxioLogoUrl}" alt="${TAXIO_LOGO_ALT}" class="${imgClass}" width="64" height="64" decoding="async" /></span>`
}

/** Logo on dark navy/slate UI (default). */
export function taxioLogoImg(wrapClass = 'h-9 w-9') {
  return taxioLogoMark({ wrapClass })
}

/** Logo on light surfaces — same transparent asset, no extra chrome. */
export function taxioLogoImgOnLight(wrapClass = 'h-9 w-9') {
  return taxioLogoMark({ wrapClass })
}
