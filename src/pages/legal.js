import { icon } from '../lib/icons.js'

const COMPANIES = {
  en: {
    title: 'Terms & Conditions — Taxi companies',
    html: `<p class="mb-4 text-gray-600 dark:text-gray-400">These terms apply to taxi and transport companies that register for and use TAXIO as a hosted digital presence (website, booking request tools, and related features).</p>
<ul class="mb-4 list-disc space-y-2 pl-5 text-gray-600 dark:text-gray-400">
<li><strong class="text-gray-800 dark:text-gray-200">Your business, your responsibility.</strong> You remain solely responsible for your taxi operations, vehicles, drivers, pricing, licences, insurance, tax and social obligations, and compliance with all laws and regulations that apply to you.</li>
<li><strong class="text-gray-800 dark:text-gray-200">Accuracy of information.</strong> You are responsible for keeping company details, contact information, and availability accurate on your TAXIO presence.</li>
<li><strong class="text-gray-800 dark:text-gray-200">Customers.</strong> Bookings and ride requests are between you and your customers. TAXIO provides software and hosting to help you present your business and receive requests; it does not provide transport services.</li>
<li><strong class="text-gray-800 dark:text-gray-200">Acceptable use.</strong> You agree not to misuse the platform (e.g. fraud, illegal content, or activity that could harm other users or the service).</li>
<li><strong class="text-gray-800 dark:text-gray-200">Service changes.</strong> Features, plans, and availability may evolve. Where legally required, material changes will be communicated appropriately.</li>
</ul>
<p class="text-sm text-gray-500 dark:text-gray-500">This text is for practical business use and does not replace advice from your lawyer for your jurisdiction.</p>`,
  },
  fr: {
    title: 'Conditions — Entreprises de taxi',
    html: `<p class="mb-4 text-gray-600 dark:text-gray-400">Ces conditions s'appliquent aux entreprises de taxi qui utilisent TAXIO comme présence numérique hébergée.</p>
<ul class="mb-4 list-disc space-y-2 pl-5 text-gray-600 dark:text-gray-400">
<li>Vous restez seul responsable de votre activité, véhicules, chauffeurs, tarifs, licences, assurances et conformité légale.</li>
<li>Vous garantissez l'exactitude des informations affichées sur votre page TAXIO.</li>
<li>Les réservations sont conclues entre vous et vos clients ; TAXIO fournit l'outil numérique, pas le transport.</li>
<li>Usage loyal du service ; pas d'usage frauduleux ou illégal.</li>
</ul>
<p class="text-sm text-gray-500">Texte pratique — faites valider par votre conseil si nécessaire.</p>`,
  },
  nl: {
    title: 'Voorwaarden — Taxibedrijven',
    html: `<p class="mb-4 text-gray-600 dark:text-gray-400">Deze voorwaarden gelden voor taxibedrijven die TAXIO gebruiken als gehoste digitale aanwezigheid.</p>
<ul class="mb-4 list-disc space-y-2 pl-5 text-gray-600 dark:text-gray-400">
<li>U blijft volledig verantwoordelijk voor uw exploitatie, voertuigen, chauffeurs, prijzen, vergunningen, verzekeringen en naleving van de wet.</li>
<li>U zorgt voor juiste bedrijfs- en contactgegevens op uw TAXIO-pagina.</li>
<li>Boekingen lopen tussen u en uw klanten; TAXIO levert software, geen vervoer.</li>
<li>Geen misbruik of illegale activiteiten via het platform.</li>
</ul>
<p class="text-sm text-gray-500">Praktische tekst — laat juridisch toetsen indien nodig.</p>`,
  },
}

const RIDERS = {
  en: {
    title: 'Terms & Conditions — Riders',
    html: `<p class="mb-4 text-gray-600 dark:text-gray-400">These terms apply when you use a taxi company’s TAXIO booking page to request a ride or contact that company (for example via WhatsApp, email, or phone).</p>
<ul class="mb-4 list-disc space-y-2 pl-5 text-gray-600 dark:text-gray-400">
<li><strong class="text-gray-800 dark:text-gray-200">Who provides the ride.</strong> The taxi company whose page you are using provides the transport service. TAXIO is a digital platform that helps that company show its business and receive your request — TAXIO is not your carrier.</li>
<li><strong class="text-gray-800 dark:text-gray-200">Estimates.</strong> Any distance, time, or price shown on the page is an estimate only. Final price and conditions are agreed with the taxi company.</li>
<li><strong class="text-gray-800 dark:text-gray-200">Your information.</strong> Information you enter may be sent to the company so they can respond. Use the page lawfully and do not submit false or harmful content.</li>
<li><strong class="text-gray-800 dark:text-gray-200">Limitation.</strong> To the extent permitted by law, TAXIO is not liable for the performance, safety, or quality of rides arranged directly with the taxi company.</li>
</ul>
<p class="text-sm text-gray-500 dark:text-gray-500">If you do not agree, do not use the booking tools on this page.</p>`,
  },
  fr: {
    title: 'Conditions — Passagers',
    html: `<p class="mb-4 text-gray-600 dark:text-gray-400">Ces conditions s'appliquent lorsque vous utilisez la page TAXIO d'une entreprise pour demander une course ou la contacter.</p>
<ul class="mb-4 list-disc space-y-2 pl-5 text-gray-600 dark:text-gray-400">
<li>Le transport est fourni par l'entreprise de taxi concernée. TAXIO est une couche numérique de mise en relation, pas le transporteur.</li>
<li>Les estimations (distance, durée, prix) sont indicatives ; le prix définitif s'arrête avec l'entreprise.</li>
<li>Vous utilisez la page de manière légale et honnête.</li>
<li>Dans les limites légales, TAXIO n'est pas responsable de l'exécution des courses par l'entreprise.</li>
</ul>`,
  },
  nl: {
    title: 'Voorwaarden — Passagiers',
    html: `<p class="mb-4 text-gray-600 dark:text-gray-400">Deze voorwaarden gelden wanneer u de TAXIO-boekingspagina van een taxibedrijf gebruikt om een rit aan te vragen of contact op te nemen.</p>
<ul class="mb-4 list-disc space-y-2 pl-5 text-gray-600 dark:text-gray-400">
<li>Het vervoer wordt door dat taxibedrijf geleverd. TAXIO is een digitaal koppelplatform, geen vervoerder.</li>
<li>Scherminschattingen zijn indicatief; de definitieve prijs spreekt u af met het bedrijf.</li>
<li>Gebruik de pagina eerlijk en volgens de wet.</li>
<li>Voor zover de wet het toelaat, is TAXIO niet aansprakelijk voor de uitvoering van ritten door het bedrijf.</li>
</ul>`,
  },
}

const PRIVACY = {
  en: {
    title: 'Privacy Policy',
    html: `<p class="mb-4 text-gray-600 dark:text-gray-400">This is a placeholder privacy policy for TAXIO. It will describe how company and customer data is processed, stored (including Supabase), and retained.</p><p class="text-gray-600 dark:text-gray-400">Update this document before going live.</p>`,
    back: 'Back to Home',
  },
  fr: {
    title: 'Politique de Confidentialité',
    html: `<p class="mb-4 text-gray-600 dark:text-gray-400">Texte provisoire — à remplacer avant mise en production.</p>`,
    back: "Retour à l'accueil",
  },
  nl: {
    title: 'Privacybeleid',
    html: `<p class="mb-4 text-gray-600 dark:text-gray-400">Voorlopige tekst — vervang voor livegang.</p>`,
    back: 'Terug naar home',
  },
}

function lang() {
  return localStorage.getItem('language') || 'en'
}

export function mountTerms(root) {
  const L = COMPANIES[lang()] || COMPANIES.en
  root.innerHTML = shell(L.title, L.html, backLabel())
}

export function mountTermsRiders(root) {
  const L = RIDERS[lang()] || RIDERS.en
  root.innerHTML = shell(L.title, L.html, backLabel())
}

export function mountPrivacy(root) {
  const L = PRIVACY[lang()] || PRIVACY.en
  root.innerHTML = shell(L.title, L.html, L.back)
}

function backLabel() {
  return PRIVACY[lang()]?.back || PRIVACY.en.back
}

function shell(title, innerHtml, backLabelText) {
  return `
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-900 px-4 py-10 md:py-14">
    <div class="mx-auto max-w-3xl">
      <a href="/" class="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300">
        ${icon.arrowLeft('h-4 w-4')}
        ${backLabelText}
      </a>
      <div class="mt-8 rounded-xl border border-gray-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">${title}</h1>
        <div class="prose prose-sm mt-6 max-w-none text-left dark:prose-invert">${innerHtml}</div>
      </div>
    </div>
  </div>`
}
