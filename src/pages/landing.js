import { translations } from '../i18n.js'
import { escapeHtml } from '../lib/html.js'
import { getLocale, setLocale, syncDocumentLang } from '../lib/locale.js'
import { icon, featureIcon } from '../lib/icons.js'
import { taxioLogoImg, taxioLogoImgOnLight } from '../lib/taxioLogo.js'
import { isPublicDarkMode, setPublicDarkMode, syncPublicThemeClass } from '../lib/publicTheme.js'

let lang = getLocale()
let detailsOpen = false

function copy() {
  return translations[lang] || translations.nl
}

function renderFeatureCard(f) {
  const t = isPublicDarkMode()
  return `
    <div class="flex flex-col gap-6 rounded-2xl border shadow-sm transition-shadow hover:shadow-md ${t ? 'border-slate-700/80 bg-slate-800/60' : 'border-slate-200/90 bg-white'}">
      <div class="px-6 pt-6 last:pb-6">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400/95 shadow-sm ring-1 ring-black/5">
          ${featureIcon(f.icon, 'h-6 w-6 text-gray-900')}
        </div>
        <h3 class="mb-2 text-lg font-semibold tracking-tight ${t ? 'text-white' : 'text-gray-900'}">${f.title}</h3>
        <p class="text-sm leading-relaxed ${t ? 'text-gray-400' : 'text-gray-600'}">${f.desc}</p>
      </div>
    </div>`
}

function renderHowStep(step, i, total) {
  const t = isPublicDarkMode()
  const arrow =
    i < total - 1
      ? icon.arrowRight(`hidden md:block absolute top-1/2 -right-12 h-8 w-8 -translate-y-1/2 transform ${t ? 'text-gray-600' : 'text-gray-300'}`)
      : ''
  return `
    <div class="text-center">
      <div class="relative mb-6">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-bold text-gray-900 shadow-sm ring-1 ring-black/5">${step.step}</div>
        ${arrow}
      </div>
      <h3 class="mb-2 text-lg font-semibold tracking-tight ${t ? 'text-white' : 'text-gray-900'}">${step.title}</h3>
      <p class="mx-auto max-w-xs text-sm leading-relaxed ${t ? 'text-gray-400' : 'text-gray-600'}">${step.desc}</p>
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

  const featuresHtml = o.features.map(renderFeatureCard).join('')
  const howHtml = o.howItWorks.map((s, i) => renderHowStep(s, i, o.howItWorks.length)).join('')

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
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
              ${taxioLogoImg('h-14 w-14')}
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
    <section class="px-4 py-20 ${t ? 'bg-slate-800' : 'bg-gray-50'}">
      <div class="container mx-auto max-w-6xl">
        <div class="grid items-center gap-12 md:grid-cols-2">
          <div>
            <div class="mb-4 inline-block rounded-full bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-500">The Problem</div>
            <h2 class="mb-4 text-3xl font-bold ${t ? 'text-white' : 'text-gray-900'}">${o.problemTitle}</h2>
            <p class="mb-6 text-lg ${t ? 'text-gray-300' : 'text-gray-600'}">${o.problemDesc}</p>
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                ${icon.x('h-5 w-5 shrink-0 text-red-500')}
                <span class="${t ? 'text-gray-300' : 'text-gray-700'}">25% commission on EVERY ride</span>
              </div>
              <div class="flex items-center gap-3">
                ${icon.x('h-5 w-5 shrink-0 text-red-500')}
                <span class="${t ? 'text-gray-300' : 'text-gray-700'}">No control over pricing</span>
              </div>
              <div class="flex items-center gap-3">
                ${icon.x('h-5 w-5 shrink-0 text-red-500')}
                <span class="${t ? 'text-gray-300' : 'text-gray-700'}">No direct customer relationship</span>
              </div>
            </div>
          </div>
          <div>
            <div class="mb-4 inline-block rounded-full bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-500">The Solution</div>
            <h2 class="mb-4 text-3xl font-bold ${t ? 'text-white' : 'text-gray-900'}">${o.solutionTitle}</h2>
            <p class="mb-6 text-lg ${t ? 'text-gray-300' : 'text-gray-600'}">${o.solutionDesc}</p>
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                ${icon.check('h-5 w-5 shrink-0 text-green-500')}
                <span class="${t ? 'text-gray-300' : 'text-gray-700'}">0% commission - Keep 100%</span>
              </div>
              <div class="flex items-center gap-3">
                ${icon.check('h-5 w-5 shrink-0 text-green-500')}
                <span class="${t ? 'text-gray-300' : 'text-gray-700'}">Full pricing control</span>
              </div>
              <div class="flex items-center gap-3">
                ${icon.check('h-5 w-5 shrink-0 text-green-500')}
                <span class="${t ? 'text-gray-300' : 'text-gray-700'}">Direct WhatsApp contact</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 py-20 ${t ? 'bg-slate-900' : 'bg-white'}">
      <div class="container mx-auto max-w-6xl">
        <div class="mb-14 text-center">
          <h2 class="text-3xl font-bold tracking-tight sm:text-4xl ${t ? 'text-white' : 'text-slate-900'}">${o.howItWorksTitle}</h2>
        </div>
        <div class="grid gap-8 md:grid-cols-3">${howHtml}</div>
      </div>
    </section>

    <section class="px-4 py-20 ${t ? 'bg-slate-800' : 'bg-gray-50'}">
      <div class="container mx-auto max-w-5xl">
        <div class="mb-10 text-center">
          <h2 class="text-3xl font-bold tracking-tight sm:text-4xl ${t ? 'text-white' : 'text-slate-900'}">${o.comparisonTitle}</h2>
        </div>
        <div class="overflow-hidden rounded-2xl border shadow-lg ${t ? 'border-slate-700/80 bg-slate-900' : 'border-slate-200/90 bg-white'}">
          <table class="w-full">
            <thead class="${t ? 'bg-slate-700' : 'bg-gray-100'}">
              <tr>
                <th class="p-4 text-left ${t ? 'text-gray-300' : 'text-gray-700'}"></th>
                <th class="p-4 text-center">
                  <div class="inline-block rounded-lg bg-yellow-400 px-4 py-2 font-bold text-gray-900">TAXIO</div>
                </th>
                <th class="p-4 text-center ${t ? 'text-gray-400' : 'text-gray-600'}">Other Platforms</th>
              </tr>
            </thead>
            <tbody>
              <tr class="${t ? 'border-b border-gray-700' : 'border-b border-gray-200'}">
                <td class="p-4 font-semibold ${t ? 'text-gray-300' : 'text-gray-700'}">${o.comparison.commission}</td>
                <td class="p-4 text-center">
                  <div class="flex items-center justify-center gap-2">
                    ${icon.check('h-5 w-5 text-green-500')}
                    <span class="font-bold ${t ? 'text-green-400' : 'text-green-600'}">${o.comparison.taxio}</span>
                  </div>
                </td>
                <td class="p-4 text-center">
                  <div class="flex items-center justify-center gap-2">
                    ${icon.x('h-5 w-5 text-red-500')}
                    <span class="${t ? 'text-gray-400' : 'text-gray-600'}">${o.comparison.others}</span>
                  </div>
                </td>
              </tr>
              <tr class="${t ? 'border-b border-gray-700' : 'border-b border-gray-200'}">
                <td class="p-4 font-semibold ${t ? 'text-gray-300' : 'text-gray-700'}">${o.comparison.website}</td>
                <td class="p-4 text-center">${icon.check('h-6 w-6 mx-auto text-green-500')}</td>
                <td class="p-4 text-center">${icon.x('h-6 w-6 mx-auto text-red-500')}</td>
              </tr>
              <tr class="${t ? 'border-b border-gray-700' : 'border-b border-gray-200'}">
                <td class="p-4 font-semibold ${t ? 'text-gray-300' : 'text-gray-700'}">${o.comparison.pricing}</td>
                <td class="p-4 text-center">${icon.check('h-6 w-6 mx-auto text-green-500')}</td>
                <td class="p-4 text-center">${icon.x('h-6 w-6 mx-auto text-red-500')}</td>
              </tr>
              <tr class="${t ? 'border-b border-gray-700' : 'border-b border-gray-200'}">
                <td class="p-4 font-semibold ${t ? 'text-gray-300' : 'text-gray-700'}">${o.comparison.contact}</td>
                <td class="p-4 text-center">${icon.check('h-6 w-6 mx-auto text-green-500')}</td>
                <td class="p-4 text-center">${icon.x('h-6 w-6 mx-auto text-red-500')}</td>
              </tr>
              <tr>
                <td class="p-4 font-semibold ${t ? 'text-gray-300' : 'text-gray-700'}">${o.comparison.cost}</td>
                <td class="p-4 text-center"><span class="font-bold ${t ? 'text-yellow-400' : 'text-yellow-600'}">€29/month</span></td>
                <td class="p-4 text-center"><span class="${t ? 'text-gray-400' : 'text-gray-600'}">€0 + 25% commission</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="px-4 py-20 ${t ? 'bg-slate-900' : 'bg-white'}">
      <div class="container mx-auto max-w-6xl">
        <div class="mb-14 text-center">
          <h2 class="text-3xl font-bold tracking-tight sm:text-4xl ${t ? 'text-white' : 'text-slate-900'}">${o.featuresTitle}</h2>
        </div>
        <div class="grid gap-8 md:grid-cols-3">${featuresHtml}</div>
      </div>
    </section>

    <section class="px-4 py-20 ${t ? 'bg-slate-800' : 'bg-gray-50'}">
      <div class="container mx-auto max-w-6xl">
        <div class="mb-10 text-center">
          <h2 class="text-3xl font-bold tracking-tight sm:text-4xl ${t ? 'text-white' : 'text-slate-900'}">${o.pricingTitle}</h2>
          <p class="mt-3 max-w-xl mx-auto text-base leading-relaxed sm:text-lg ${t ? 'text-gray-300' : 'text-slate-600'}">${o.pricingDesc}</p>
        </div>
        <div class="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 md:gap-8">
          <div class="flex flex-col gap-6 rounded-2xl border shadow-md transition-shadow hover:shadow-lg ${t ? 'border-slate-700/80 bg-slate-900' : 'border-slate-200/90 bg-white'}">
            <div class="px-6 pt-8 pb-8">
              <div class="mb-6 text-center">
                <div class="mb-4 inline-block rounded-full bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-500">${o.pricingBasic.badge}</div>
                <h3 class="mb-2 text-3xl font-bold ${t ? 'text-white' : 'text-gray-900'}">${o.pricingBasic.name}</h3>
                <div class="mb-1 text-4xl font-bold ${t ? 'text-white' : 'text-gray-900'}">${o.pricingBasic.price}</div>
                <p class="text-sm ${t ? 'text-gray-400' : 'text-gray-600'}">${o.pricingBasic.period}</p>
              </div>
              <div class="mb-6 space-y-3">
                ${o.pricingBasic.features.map((l) => `<div class="flex items-center gap-3">${icon.check('h-5 w-5 shrink-0 text-green-500')}<span class="${t ? 'text-gray-300' : 'text-gray-700'}">${l}</span></div>`).join('')}
                ${o.pricingBasic.notIncluded.map((l) => `<div class="flex items-center gap-3 opacity-50">${icon.x('h-5 w-5 shrink-0 text-gray-400')}<span class="${t ? 'text-gray-400' : 'text-gray-500'}">${l}</span></div>`).join('')}
              </div>
              <a href="/register" class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-transparent px-4 py-3.5 text-sm font-semibold transition ${t ? 'border-slate-600 text-gray-200 hover:bg-slate-800/80' : 'text-slate-700 hover:bg-slate-50'}">
                ${o.registerCard.button}
                ${icon.arrowRight('h-5 w-5')}
              </a>
            </div>
          </div>
          <div class="relative flex flex-col gap-6 rounded-2xl border-2 border-amber-400/90 shadow-lg ring-1 ring-amber-400/20 transition-shadow hover:shadow-xl ${t ? 'bg-slate-900' : 'bg-white'}">
            <div class="px-6 pt-8 pb-8">
              <div class="mb-6 text-center">
                <div class="mb-4 inline-block rounded-full bg-yellow-400 px-4 py-2 text-sm font-bold text-gray-900">${o.pricingPremium.badge}</div>
                <h3 class="mb-2 text-3xl font-bold ${t ? 'text-white' : 'text-gray-900'}">${o.pricingPremium.name}</h3>
                <div class="mb-1 text-4xl font-bold ${t ? 'text-white' : 'text-gray-900'}">${o.pricingPremium.price}</div>
                <p class="text-sm ${t ? 'text-gray-400' : 'text-gray-600'}">${o.pricingPremium.period}</p>
              </div>
              <div class="mb-6 space-y-3">
                ${o.pricingPremium.features.map((l) => `<div class="flex items-center gap-3">${icon.check('h-5 w-5 shrink-0 text-green-500')}<span class="${t ? 'text-gray-300' : 'text-gray-700'}">${l}</span></div>`).join('')}
              </div>
              <a href="/register" class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-yellow-500">
                ${o.registerCard.button}
                ${icon.arrowRight('h-5 w-5')}
              </a>
            </div>
          </div>
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
