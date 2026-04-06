import { icon } from '../lib/icons.js'

const COPY = {
  en: {
    termsTitle: 'Terms & Conditions',
    termsHtml: `<p class="mb-4 text-gray-600 dark:text-gray-400">This is a placeholder for TAXIO platform terms. Replace with your lawyer-approved terms before production.</p><p class="text-gray-600 dark:text-gray-400">By using TAXIO you agree to operate lawfully as a licensed taxi or transport provider where applicable.</p>`,
    privacyTitle: 'Privacy Policy',
    privacyHtml: `<p class="mb-4 text-gray-600 dark:text-gray-400">This is a placeholder privacy policy for TAXIO. It will describe how company and customer data is processed, stored (including Supabase), and retained.</p><p class="text-gray-600 dark:text-gray-400">Update this document before going live.</p>`,
    back: 'Back to Home',
  },
  fr: {
    termsTitle: 'Conditions Générales',
    termsHtml: `<p class="mb-4 text-gray-600 dark:text-gray-400">Texte provisoire — à remplacer par vos CGU validées juridiquement.</p>`,
    privacyTitle: 'Politique de Confidentialité',
    privacyHtml: `<p class="mb-4 text-gray-600 dark:text-gray-400">Texte provisoire — à remplacer avant mise en production.</p>`,
    back: "Retour à l'accueil",
  },
  nl: {
    termsTitle: 'Algemene Voorwaarden',
    termsHtml: `<p class="mb-4 text-gray-600 dark:text-gray-400">Voorlopige tekst — vervang door juridisch goedgekeurde voorwaarden.</p>`,
    privacyTitle: 'Privacybeleid',
    privacyHtml: `<p class="mb-4 text-gray-600 dark:text-gray-400">Voorlopige tekst — vervang voor livegang.</p>`,
    back: 'Terug naar home',
  },
}

function lang() {
  return localStorage.getItem('language') || 'en'
}

export function mountTerms(root) {
  const L = COPY[lang()] || COPY.en
  root.innerHTML = shell(L.termsTitle, L.termsHtml, L.back)
}

export function mountPrivacy(root) {
  const L = COPY[lang()] || COPY.en
  root.innerHTML = shell(L.privacyTitle, L.privacyHtml, L.back)
}

function shell(title, innerHtml, backLabel) {
  return `
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-900 px-4 py-10 md:py-14">
    <div class="mx-auto max-w-3xl">
      <a href="/" class="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300">
        ${icon.arrowLeft('h-4 w-4')}
        ${backLabel}
      </a>
      <div class="mt-8 rounded-xl border border-gray-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">${title}</h1>
        <div class="prose prose-sm mt-6 max-w-none text-left dark:prose-invert">${innerHtml}</div>
      </div>
    </div>
  </div>`
}
