import { translations } from '../i18n.js'
import { escapeHtml } from '../lib/html.js'
import { getLocale, setLocale, syncDocumentLang } from '../lib/locale.js'
import { icon, featureIcon } from '../lib/icons.js'
import { taxioLogoImg } from '../lib/taxioLogo.js'
import { isPublicDarkMode, setPublicDarkMode, syncPublicThemeClass } from '../lib/publicTheme.js'

let lang = getLocale()
let detailsOpen = false

function copy() {
  return translations[lang] || translations.nl
}

function renderWhyChooseCard(card, t) {
  const ic =
    card.iconKey && icon[card.iconKey]
      ? icon[card.iconKey]('h-5 w-5 text-gray-900')
      : featureIcon(card.icon, 'h-5 w-5 text-gray-900')
  return `
    <div class="rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${t ? 'border-slate-700/70 bg-slate-800/50' : 'border-slate-200/90 bg-white'}">
      <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 shadow-sm ring-1 ring-black/5">
        ${ic}
      </div>
      <h3 class="mb-1.5 text-base font-semibold tracking-tight ${t ? 'text-white' : 'text-gray-900'}">${card.title}</h3>
      <p class="text-sm leading-relaxed ${t ? 'text-gray-400' : 'text-gray-600'}">${card.desc}</p>
    </div>`
}

export function mountLanding(root) {
  lang = getLocale()
  const o = copy()
  syncPublicThemeClass()
  syncDocumentLang(lang)

  const t = isPublicDarkMode()
  const whyLabel = detailsOpen ? o.hideDetails : o.whyChoose
  const chevronClass = detailsOpen ? 'ml-2 h-5 w-5 transition-transform rotate-180' : 'ml-2 h-5 w-5 transition-transform'

  const whyChooseHtml = (o.whyChooseCards || []).map((c) => renderWhyChooseCard(c, t)).join('')

  root.innerHTML = `
<div class="min-h-screen transition-colors duration-300 ${t ? 'bg-slate-900' : 'bg-white'}">
  <div class="fixed top-4 right-4 z-50 flex items-center gap-2">
    <button type="button" id="toggle-dark" class="rounded-full p-3 shadow-lg transition-all ${t ? 'bg-slate-800 text-gray-300 hover:bg-slate-700' : 'bg-white text-gray-600 hover:bg-gray-100'}" aria-label="Toggle dark mode">
      ${t ? icon.moon('h-5 w-5') : icon.sun('h-5 w-5')}
    </button>
    <div class="flex gap-0.5 rounded-full p-1 shadow-lg ${t ? 'bg-slate-800' : 'bg-white'}">
      <button type="button" data-lang="nl" class="rounded-full px-2.5 py-2 text-xs font-semibold transition-all ${lang === 'nl' ? 'bg-gray-900 text-white' : t ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}">NL</button>
      <button type="button" data-lang="fr" class="rounded-full px-2.5 py-2 text-xs font-semibold transition-all ${lang === 'fr' ? 'bg-gray-900 text-white' : t ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}">FR</button>
      <button type="button" data-lang="en" class="rounded-full px-2.5 py-2 text-xs font-semibold transition-all ${lang === 'en' ? 'bg-gray-900 text-white' : t ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}">EN</button>
    </div>
  </div>
  <section class="px-4 pt-20 pb-12 sm:pt-24 sm:pb-14 ${t ? 'bg-slate-900' : 'bg-gradient-to-b from-slate-50 via-white to-white'}">
    <div class="container mx-auto max-w-5xl">
      <div class="mb-10 text-center sm:mb-12">
        <div class="mb-6 flex flex-col items-center gap-5 sm:mb-8">
          ${taxioLogoImg('h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]')}
          <div class="max-w-2xl space-y-4">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] ${t ? 'text-yellow-400/90' : 'text-amber-700/80'}">TAXIO</p>
            <h1 class="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl ${t ? 'text-white' : 'text-slate-900'}">${o.title}</h1>
            <p class="text-lg font-medium leading-snug sm:text-xl ${t ? 'text-gray-300' : 'text-slate-600'}">${o.tagline}</p>
            <p class="text-base font-semibold ${t ? 'text-yellow-400' : 'text-amber-700'}">${o.subtitle}</p>
          </div>
        </div>
      </div>

      <div class="mb-10 grid gap-5 md:grid-cols-3 md:gap-6">
        <div class="flex flex-col rounded-2xl border shadow-sm transition-shadow hover:shadow-md ${t ? 'border-slate-700/80 bg-slate-800/60' : 'border-slate-200/90 bg-white'}">
          <div class="flex flex-1 flex-col px-6 pt-8 pb-4 text-center">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-yellow-400 shadow-sm ring-1 ring-black/5">
              ${icon.building2('h-7 w-7 text-gray-900')}
            </div>
            <h4 class="mb-2 text-lg font-semibold tracking-tight ${t ? 'text-white' : 'text-gray-900'}">${o.registerCard.title}</h4>
            <p class="text-sm leading-relaxed ${t ? 'text-gray-400' : 'text-gray-600'}">${o.registerCard.desc}</p>
          </div>
          <div class="mt-auto px-6 pb-6">
            <a href="/register" class="inline-flex h-11 w-full items-center justify-center rounded-xl bg-yellow-400 px-4 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-yellow-500">${o.registerCard.button}</a>
          </div>
        </div>

        <div class="flex flex-col rounded-2xl border shadow-sm transition-shadow hover:shadow-md ${t ? 'border-slate-700/80 bg-slate-800/60' : 'border-slate-200/90 bg-white'}">
          <div class="flex flex-1 flex-col px-6 pt-8 pb-4 text-center">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5 ${t ? 'bg-slate-700' : 'bg-slate-100'}">
              ${icon.car(`h-7 w-7 ${t ? 'text-yellow-400' : 'text-amber-600'}`)}
            </div>
            <h4 class="mb-2 text-lg font-semibold tracking-tight ${t ? 'text-white' : 'text-gray-900'}">${o.loginCard.title}</h4>
            <p class="text-sm leading-relaxed ${t ? 'text-gray-400' : 'text-gray-600'}">${o.loginCard.desc}</p>
          </div>
          <div class="mt-auto px-6 pb-6">
            <a href="/login/company" class="inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-sm transition ${t ? 'bg-slate-600 text-white hover:bg-slate-500' : 'bg-slate-900 text-white hover:bg-slate-800'}">${o.loginCard.button}</a>
          </div>
        </div>

        <div class="flex flex-col rounded-2xl border shadow-sm transition-shadow hover:shadow-md ${t ? 'border-slate-700/80 bg-slate-800/60' : 'border-slate-200/90 bg-white'}">
          <div class="flex flex-1 flex-col px-6 pt-8 pb-4 text-center">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5 ${t ? 'bg-slate-700' : 'bg-slate-100'}">
              ${icon.eye(`h-7 w-7 ${t ? 'text-yellow-400' : 'text-amber-600'}`)}
            </div>
            <h4 class="mb-2 text-lg font-semibold tracking-tight ${t ? 'text-white' : 'text-gray-900'}">${o.demoCard.title}</h4>
            <p class="text-sm leading-relaxed ${t ? 'text-gray-400' : 'text-gray-600'}">${o.demoCard.desc}</p>
          </div>
          <div class="mt-auto px-6 pb-6">
            <a href="/book/demo" class="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300/80 bg-transparent px-4 text-sm font-semibold transition ${t ? 'border-slate-600 text-gray-200 hover:bg-slate-700/50' : 'text-slate-700 hover:bg-slate-50'}" aria-label="${escapeHtml(o.demoCard.title)} — ${escapeHtml(o.demoCard.button)}">${o.demoCard.button}</a>
          </div>
        </div>
      </div>

      <div class="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
        <a href="/taxis" class="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold shadow-sm transition sm:w-auto ${t ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-900 text-white hover:bg-slate-800'}">
          ${icon.search('h-5 w-5 shrink-0')}
          ${o.lookingTaxi}
        </a>
        <button type="button" id="toggle-details" class="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-gray-900 shadow-sm transition sm:w-auto ${detailsOpen ? 'bg-amber-400 hover:bg-amber-500' : 'bg-yellow-400 hover:bg-yellow-500'}">
          ${whyLabel}
          ${icon.chevronDown(chevronClass)}
        </button>
      </div>
    </div>
  </section>

  <div id="detail-sections" class="${detailsOpen ? '' : 'hidden'}">
    <section class="px-4 py-12 sm:py-16 ${t ? 'bg-slate-800' : 'bg-gray-50'}">
      <div class="container mx-auto max-w-5xl">
        <div class="mb-8 text-center sm:mb-10">
          <h2 class="text-2xl font-bold tracking-tight sm:text-3xl ${t ? 'text-white' : 'text-gray-900'}">${o.whyChooseTitle}</h2>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${whyChooseHtml}</div>
        <div class="mt-10 text-center">
          <p class="text-base font-medium ${t ? 'text-gray-300' : 'text-gray-700'}">${o.whyChooseCtaTitle}</p>
          <a href="/register" class="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-bold text-gray-900 shadow-sm transition hover:bg-yellow-500">
            ${o.whyChooseCtaButton}
            ${icon.arrowRight('h-4 w-4')}
          </a>
        </div>
      </div>
    </section>
  </div>

  <footer class="border-t border-white/10 px-4 py-12 ${t ? 'bg-slate-950' : 'bg-slate-900'}">
    <div class="container mx-auto max-w-4xl text-center">
      <p class="text-sm font-medium text-slate-300">${o.copyright}</p>
      <nav class="mt-5 flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-xs text-slate-400" aria-label="Legal">
        <a href="/terms" class="rounded-md px-2 py-1 hover:bg-white/5 hover:text-slate-200">${o.footerTerms}</a>
        <span class="text-slate-600" aria-hidden="true">·</span>
        <a href="/company-terms" class="rounded-md px-2 py-1 hover:bg-white/5 hover:text-slate-200">${o.footerCompanyTerms}</a>
        <span class="text-slate-600" aria-hidden="true">·</span>
        <a href="/privacy" class="rounded-md px-2 py-1 hover:bg-white/5 hover:text-slate-200">${o.footerPrivacy}</a>
        <span class="text-slate-600" aria-hidden="true">·</span>
        <a href="/contact" class="rounded-md px-2 py-1 hover:bg-white/5 hover:text-slate-200">${o.footerContact}</a>
      </nav>
    </div>
  </footer>
</div>`

  root.querySelector('#toggle-dark')?.addEventListener('click', () => {
    setPublicDarkMode(!isPublicDarkMode())
    mountLanding(root)
  })

  root.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      lang = setLocale(btn.getAttribute('data-lang'))
      mountLanding(root)
    })
  })

  root.querySelector('#toggle-details')?.addEventListener('click', () => {
    detailsOpen = !detailsOpen
    mountLanding(root)
  })
}
