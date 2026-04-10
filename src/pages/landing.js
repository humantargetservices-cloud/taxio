import { translations } from '../i18n.js'
import { icon, featureIcon } from '../lib/icons.js'

let lang = localStorage.getItem('language') || 'en'
let dark = localStorage.getItem('darkMode') === 'true'
let detailsOpen = false

function copy() {
  return translations[lang] || translations.en
}

function renderFeatureCard(f) {
  const t = dark
  return `
    <div class="flex flex-col gap-6 rounded-xl border-2 transition-all hover:border-yellow-400 ${t ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}">
      <div class="px-6 pt-6 last:pb-6">
        <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-yellow-400">
          ${featureIcon(f.icon, 'h-7 w-7 text-gray-900')}
        </div>
        <h3 class="mb-2 text-xl font-bold ${t ? 'text-white' : 'text-gray-900'}">${f.title}</h3>
        <p class="${t ? 'text-gray-400' : 'text-gray-600'}">${f.desc}</p>
      </div>
    </div>`
}

function renderHowStep(step, i, total) {
  const t = dark
  const arrow =
    i < total - 1
      ? icon.arrowRight(`hidden md:block absolute top-1/2 -right-12 h-8 w-8 -translate-y-1/2 transform ${t ? 'text-gray-600' : 'text-gray-300'}`)
      : ''
  return `
    <div class="text-center">
      <div class="relative mb-6">
        <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 text-3xl font-bold text-gray-900 shadow-lg">${step.step}</div>
        ${arrow}
      </div>
      <h3 class="mb-3 text-xl font-bold ${t ? 'text-white' : 'text-gray-900'}">${step.title}</h3>
      <p class="${t ? 'text-gray-400' : 'text-gray-600'}">${step.desc}</p>
    </div>`
}

export function mountLanding(root) {
  const o = copy()
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.lang = lang === 'fr' ? 'fr' : lang === 'nl' ? 'nl' : 'en'

  const t = dark
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
      <button type="button" data-lang="en" class="rounded-full px-2.5 py-2 text-xs font-semibold transition-all ${lang === 'en' ? 'bg-gray-900 text-white' : t ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}">EN</button>
      <button type="button" data-lang="fr" class="rounded-full px-2.5 py-2 text-xs font-semibold transition-all ${lang === 'fr' ? 'bg-gray-900 text-white' : t ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}">FR</button>
      <button type="button" data-lang="nl" class="rounded-full px-2.5 py-2 text-xs font-semibold transition-all ${lang === 'nl' ? 'bg-gray-900 text-white' : t ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}">NL</button>
    </div>
  </div>
  <div class="fixed top-4 left-4 z-50">
    <a href="/admin/login" class="inline-flex items-center gap-1 text-xs font-medium ${t ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-800'}">${icon.shield('h-3 w-3')} ${o.admin}</a>
  </div>

  <section class="px-4 pt-24 pb-16 ${t ? 'bg-slate-900' : 'bg-white'}">
    <div class="container mx-auto max-w-4xl">
      <div class="mb-16 text-center">
        <div class="mb-6 flex flex-col items-center gap-4">
          <div class="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-2xl">
            ${icon.car('h-10 w-10 text-slate-900')}
            <div class="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-white bg-green-500">
              ${icon.zap('h-3 w-3 text-white')}
            </div>
          </div>
          <h1 class="text-6xl font-black tracking-tight ${t ? 'text-white' : 'text-slate-900'}">${o.title}</h1>
        </div>
        <p class="mb-3 text-2xl font-medium ${t ? 'text-gray-300' : 'text-gray-700'}">${o.tagline}</p>
        <p class="text-lg font-bold ${t ? 'text-yellow-400' : 'text-yellow-600'}">${o.subtitle}</p>
      </div>

      <div class="mb-12 grid gap-6 md:grid-cols-3">
        <div class="flex flex-col gap-6 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-2xl ${t ? 'border-slate-700 bg-slate-800 hover:border-yellow-400' : 'border-gray-200 bg-white hover:border-yellow-400'}">
          <div class="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 text-center pb-4">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 shadow-lg">
              ${icon.building2('h-8 w-8 text-gray-900')}
            </div>
            <h4 class="mb-2 text-xl ${t ? 'text-white' : 'text-gray-900'}">${o.registerCard.title}</h4>
            <p class="text-sm ${t ? 'text-gray-400' : 'text-gray-600'}">${o.registerCard.desc}</p>
          </div>
          <div class="px-6 pb-6">
            <a href="/register" class="inline-flex h-12 w-full items-center justify-center rounded-md bg-yellow-400 px-4 text-base font-semibold text-gray-900 shadow-md hover:bg-yellow-500">${o.registerCard.button}</a>
          </div>
        </div>

        <div class="flex flex-col gap-6 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-2xl ${t ? 'border-slate-700 bg-slate-800 hover:border-yellow-400' : 'border-gray-200 bg-white hover:border-yellow-400'}">
          <div class="px-6 pt-6 text-center pb-4">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ${t ? 'bg-slate-700' : 'bg-gray-900'}">
              ${icon.car('h-8 w-8 text-white')}
            </div>
            <h4 class="mb-2 text-xl ${t ? 'text-white' : 'text-gray-900'}">${o.loginCard.title}</h4>
            <p class="text-sm ${t ? 'text-gray-400' : 'text-gray-600'}">${o.loginCard.desc}</p>
          </div>
          <div class="px-6 pb-6">
            <a href="/login/company" class="inline-flex h-12 w-full items-center justify-center rounded-md px-4 text-base font-semibold shadow-md ${t ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-900 text-white hover:bg-gray-800'}">${o.loginCard.button}</a>
          </div>
        </div>

        <div class="flex flex-col gap-6 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-2xl ${t ? 'border-slate-700 bg-slate-800 hover:border-yellow-400' : 'border-gray-200 bg-white hover:border-yellow-400'}">
          <div class="px-6 pt-6 text-center pb-4">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ${t ? 'bg-slate-700' : 'bg-gray-100'}">
              ${icon.eye(`h-8 w-8 ${t ? 'text-yellow-400' : 'text-yellow-600'}`)}
            </div>
            <h4 class="mb-2 text-xl ${t ? 'text-white' : 'text-gray-900'}">${o.demoCard.title}</h4>
            <p class="text-sm ${t ? 'text-gray-400' : 'text-gray-600'}">${o.demoCard.desc}</p>
          </div>
          <div class="px-6 pb-6">
            <a href="/book/democompany" class="inline-flex h-12 w-full items-center justify-center rounded-md border-2 bg-transparent px-4 text-base font-semibold ${t ? 'border-gray-600 text-gray-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}">${o.demoCard.button}</a>
          </div>
        </div>
      </div>

      <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <a href="/taxis" class="inline-flex w-full items-center justify-center rounded-md px-8 py-6 text-lg font-semibold shadow-lg transition hover:opacity-95 sm:w-auto ${t ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-900 text-white hover:bg-gray-800'}">
          ${icon.search('mr-2 h-5 w-5')}
          ${o.lookingTaxi}
        </a>
        <button type="button" id="toggle-details" class="inline-flex w-full items-center justify-center rounded-md px-8 py-6 text-lg font-semibold text-gray-900 shadow-lg transition-all sm:w-auto ${detailsOpen ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-yellow-400 hover:bg-yellow-500'}">
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
        <div class="mb-16 text-center">
          <h2 class="mb-4 text-4xl font-bold ${t ? 'text-white' : 'text-gray-900'}">${o.howItWorksTitle}</h2>
        </div>
        <div class="grid gap-8 md:grid-cols-3">${howHtml}</div>
      </div>
    </section>

    <section class="px-4 py-20 ${t ? 'bg-slate-800' : 'bg-gray-50'}">
      <div class="container mx-auto max-w-5xl">
        <div class="mb-12 text-center">
          <h2 class="mb-4 text-4xl font-bold ${t ? 'text-white' : 'text-gray-900'}">${o.comparisonTitle}</h2>
        </div>
        <div class="overflow-hidden rounded-2xl shadow-2xl ${t ? 'bg-slate-900' : 'bg-white'}">
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
        <div class="mb-16 text-center">
          <h2 class="mb-4 text-4xl font-bold ${t ? 'text-white' : 'text-gray-900'}">${o.featuresTitle}</h2>
        </div>
        <div class="grid gap-8 md:grid-cols-3">${featuresHtml}</div>
      </div>
    </section>

    <section class="px-4 py-20 ${t ? 'bg-slate-800' : 'bg-gray-50'}">
      <div class="container mx-auto max-w-6xl">
        <div class="mb-12 text-center">
          <h2 class="mb-4 text-4xl font-bold ${t ? 'text-white' : 'text-gray-900'}">${o.pricingTitle}</h2>
          <p class="text-xl ${t ? 'text-gray-300' : 'text-gray-600'}">${o.pricingDesc}</p>
        </div>
        <div class="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          <div class="flex flex-col gap-6 rounded-xl border-2 shadow-xl transition-all hover:scale-105 ${t ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}">
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
              <a href="/register" class="inline-flex w-full items-center justify-center rounded-md border-2 bg-transparent px-4 py-6 text-lg font-semibold ${t ? 'border-gray-600 text-gray-300 hover:bg-slate-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}">
                ${o.registerCard.button}
                ${icon.arrowRight('ml-2 h-5 w-5')}
              </a>
            </div>
          </div>
          <div class="relative flex flex-col gap-6 rounded-xl border-4 border-yellow-400 shadow-2xl transition-all hover:scale-105 ${t ? 'bg-slate-900' : 'bg-white'}">
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
              <a href="/register" class="inline-flex w-full items-center justify-center rounded-md bg-yellow-400 px-4 py-6 text-lg font-semibold text-gray-900 shadow-lg hover:bg-yellow-500">
                ${o.registerCard.button}
                ${icon.arrowRight('ml-2 h-5 w-5')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>

  <footer class="px-4 py-8 ${t ? 'bg-slate-950' : 'bg-gray-900'}">
    <div class="container mx-auto max-w-6xl text-center">
      <p class="text-sm text-gray-400">${o.copyright}</p>
      <p class="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-2 text-xs text-gray-500 sm:gap-x-4">
        <a href="/legal-notice" class="hover:text-gray-300 hover:underline">${o.footerLegalNotice}</a>
        <a href="/terms" class="hover:text-gray-300 hover:underline">${o.footerTerms}</a>
        <a href="/company-terms" class="hover:text-gray-300 hover:underline">${o.footerCompanyTerms}</a>
        <a href="/privacy" class="hover:text-gray-300 hover:underline">${o.footerPrivacy}</a>
        <a href="/contact" class="hover:text-gray-300 hover:underline">${o.footerContact}</a>
      </p>
    </div>
  </footer>
</div>`

  root.querySelector('#toggle-dark')?.addEventListener('click', () => {
    dark = !dark
    localStorage.setItem('darkMode', String(dark))
    mountLanding(root)
  })

  root.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      lang = btn.getAttribute('data-lang')
      localStorage.setItem('language', lang)
      mountLanding(root)
    })
  })

  root.querySelector('#toggle-details')?.addEventListener('click', () => {
    detailsOpen = !detailsOpen
    mountLanding(root)
  })
}
