import { icon } from '../lib/icons.js'
import { escapeHtml } from '../lib/html.js'
import {
  OPERATOR_LEGAL_NAME,
  OPERATOR_REGISTERED_ADDRESS_DISPLAY,
  OPERATOR_VAT_DISPLAY,
  OPERATOR_LEGAL_EMAIL,
  BILLING_CYCLE_DISPLAY,
  BILLING_PLAN_FEES_DISPLAY,
  BILLING_PER_VEHICLE_FEES_DISPLAY,
  BILLING_PAYMENT_METHOD_DISPLAY,
  BILLING_LATE_PAYMENT_DISPLAY,
} from '../lib/legalOperatorConfig.js'

function operatorBlockHtml() {
  const em = escapeHtml(OPERATOR_LEGAL_EMAIL)
  const mailto = encodeURIComponent(OPERATOR_LEGAL_EMAIL)
  return `<div class="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-600 dark:bg-slate-900/50">
<p class="font-semibold text-slate-900 dark:text-white">Legal operator</p>
<p class="mt-2 text-gray-600 dark:text-gray-400">The <strong class="text-slate-800 dark:text-slate-200">TAXIO</strong> brand and platform are operated by <strong class="text-slate-800 dark:text-slate-200">${escapeHtml(OPERATOR_LEGAL_NAME)}</strong>.</p>
<dl class="mt-4 space-y-3 text-gray-700 dark:text-gray-300">
<div>
<dt class="font-medium text-slate-800 dark:text-slate-200">Registered address</dt>
<dd class="mt-0.5 text-slate-600 dark:text-slate-400">${escapeHtml(OPERATOR_REGISTERED_ADDRESS_DISPLAY)}</dd>
</div>
<div>
<dt class="font-medium text-slate-800 dark:text-slate-200">VAT / company number</dt>
<dd class="mt-0.5 text-slate-600 dark:text-slate-400">${escapeHtml(OPERATOR_VAT_DISPLAY)}</dd>
</div>
<div>
<dt class="font-medium text-slate-800 dark:text-slate-200">Legal &amp; privacy contact</dt>
<dd class="mt-0.5"><a href="mailto:${mailto}" class="font-medium text-blue-700 underline hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300">${em}</a></dd>
</div>
</dl>
</div>`
}

function companyBillingSectionHtml() {
  return `<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">5. Billing and payment</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">Unless otherwise agreed in writing, platform fees follow the structure below. Published amounts are defined in <span class="font-mono text-xs">src/lib/legalOperatorConfig.js</span> and should match your invoice or company dashboard.</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li><strong class="text-slate-800 dark:text-slate-200">Billing cycle:</strong> ${escapeHtml(BILLING_CYCLE_DISPLAY)}</li>
<li><strong class="text-slate-800 dark:text-slate-200">Plan fees:</strong> ${escapeHtml(BILLING_PLAN_FEES_DISPLAY)}</li>
<li><strong class="text-slate-800 dark:text-slate-200">Per-vehicle fees:</strong> ${escapeHtml(BILLING_PER_VEHICLE_FEES_DISPLAY)}</li>
<li><strong class="text-slate-800 dark:text-slate-200">Payment method:</strong> ${escapeHtml(BILLING_PAYMENT_METHOD_DISPLAY)}</li>
<li><strong class="text-slate-800 dark:text-slate-200">Late payment:</strong> ${escapeHtml(BILLING_LATE_PAYMENT_DISPLAY)}</li>
</ul>
<p class="text-sm text-gray-500 dark:text-gray-500">Custom quotes or signed agreements override this summary when they explicitly differ.</p>`
}

const TERMS_OF_USE_BODY = `${operatorBlockHtml()}
<h2 class="mb-3 text-lg font-bold text-slate-900 dark:text-white">1. Nature of Service</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">TAXIO is a digital platform that allows independent taxi companies to present their services and receive booking or contact requests.</p>
<p class="mb-4 text-gray-600 dark:text-gray-400">TAXIO does <strong class="text-slate-800 dark:text-slate-200">not</strong> provide transport services.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">2. Independent Taxi Companies</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">Each taxi company using TAXIO is:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>an independent business</li>
<li>solely responsible for its services</li>
</ul>
<p class="mb-2 text-gray-600 dark:text-gray-400">Taxi companies must comply with all applicable laws, including:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>transport regulations</li>
<li>licensing requirements</li>
<li>taximeter obligations</li>
<li>insurance and tax obligations</li>
</ul>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">3. Company Verification</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">Before approval, TAXIO may verify:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>VAT number via KBO</li>
<li>business activity (NACE code)</li>
</ul>
<p class="mb-4 text-gray-600 dark:text-gray-400">TAXIO reserves the right to approve or reject any registration.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">4. Rider Requests</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">When a rider submits a request:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>it is sent directly to the selected taxi company</li>
<li>the transport contract is between rider and that company</li>
</ul>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">5. No Guarantee</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">TAXIO does not guarantee:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>availability of taxis</li>
<li>response time</li>
<li>pricing</li>
<li>quality of service</li>
</ul>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">6. Limitation of Liability</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">TAXIO is not responsible for:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>transport services</li>
<li>delays or cancellations</li>
<li>disputes between rider and taxi company</li>
<li>pricing or payment issues</li>
</ul>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">7. Platform Use</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">Users must:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>provide accurate information</li>
<li>not misuse the platform</li>
</ul>
<p class="mb-4 text-gray-600 dark:text-gray-400">TAXIO may suspend or remove accounts at any time.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">8. Changes</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">TAXIO may update these terms at any time.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">9. Governing Law</h2>
<p class="text-gray-600 dark:text-gray-400">This platform is governed by Belgian law.</p>`

const BOOKING_TERMS_BODY = `<p class="mb-4 text-gray-600 dark:text-gray-400">By submitting this request, you agree that:</p>
<ul class="mb-4 list-disc space-y-2 pl-5 text-gray-600 dark:text-gray-400">
<li>Your request is sent directly to the selected taxi company</li>
<li>TAXIO acts only as a communication platform</li>
<li>The transport service is provided by the taxi company, not TAXIO</li>
<li>TAXIO is not responsible for the service, pricing, or execution of the ride</li>
</ul>`

const COMPANY_TERMS_BODY = `${operatorBlockHtml()}
<h2 class="mb-3 text-lg font-bold text-slate-900 dark:text-white">1. Role of TAXIO</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">TAXIO is a software platform operated by Human Target Services. We provide hosting, tools, and a subdomain-based presence so your taxi company can receive booking and contact requests. We do <strong class="text-slate-800 dark:text-slate-200">not</strong> provide transport, dispatch as a carrier, or employ your drivers.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">2. Your legal responsibility</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">As an independent taxi company on TAXIO, you remain solely responsible for:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>performing transport services safely and lawfully</li>
<li>drivers, vehicles, licences, permits, and insurance</li>
<li>pricing, taximeter or fare rules where applicable, invoicing, and taxes</li>
<li>customer service, complaints, and disputes with riders</li>
<li>accuracy of information shown on your TAXIO page</li>
</ul>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">3. Account and subdomain</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">Your account and subdomain (e.g. <span class="font-mono text-xs">yourcompany.taxio.be</span>) are for your business only. You may not transfer, sell, or share access in a way that misleads riders or breaches these terms. You must keep credentials secure and notify us if you suspect unauthorised use.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">4. Suspension and termination</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">We may suspend or terminate access (including approval status or technical access) if you breach these terms, applicable law, or create risk to riders, other companies, or the platform. You may stop using TAXIO at any time; outstanding fees (if any) remain governed by the billing section below.</p>

${companyBillingSectionHtml()}

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">6. Rider data and GDPR</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">When a rider submits a request via TAXIO, relevant data is shared with <strong class="text-slate-800 dark:text-slate-200">your</strong> company so you can respond. You act as an independent controller (or co-controller, as applicable) for that data for your own transport and customer-management purposes. You must process rider personal data lawfully, fairly, and only as needed; honour access, correction, and deletion requests where required; and not use rider data for unrelated marketing without appropriate legal basis and transparency. Human Target Services processes data as described in the TAXIO Privacy Policy to operate the platform.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">7. Governing law</h2>
<p class="text-gray-600 dark:text-gray-400">These company terms are governed by Belgian law, without prejudice to mandatory consumer protections where applicable.</p>`

const CONTACT_BODY = `<p class="mb-4 text-gray-600 dark:text-gray-400">For questions about the TAXIO platform, ${escapeHtml(OPERATOR_LEGAL_NAME)}, or legal and privacy matters, email <a href="mailto:${encodeURIComponent(OPERATOR_LEGAL_EMAIL)}" class="font-medium text-blue-700 underline hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300">${escapeHtml(OPERATOR_LEGAL_EMAIL)}</a>.</p>
${operatorBlockHtml()}
<p class="text-sm text-gray-500 dark:text-gray-500">A contact form may be added later; email remains the primary channel.</p>`

const COMPANIES = {
  en: {
    title: 'Terms of Use — TAXIO',
    html: TERMS_OF_USE_BODY,
  },
  fr: {
    title: "Conditions d'utilisation — TAXIO",
    html: `<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Version anglaise (informative) — traduction juridique à prévoir si nécessaire.</p>
${TERMS_OF_USE_BODY}`,
  },
  nl: {
    title: 'Gebruiksvoorwaarden — TAXIO',
    html: `<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Engelse versie (informatief) — juridische vertaling kan later worden toegevoegd.</p>
${TERMS_OF_USE_BODY}`,
  },
}

const RIDERS = {
  en: {
    title: 'Booking Terms',
    html: BOOKING_TERMS_BODY,
  },
  fr: {
    title: 'Conditions de réservation',
    html: `<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Version anglaise (informative) — traduction à prévoir si nécessaire.</p>
${BOOKING_TERMS_BODY}`,
  },
  nl: {
    title: 'Boekingsvoorwaarden',
    html: `<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Engelse versie (informatief) — vertaling kan later worden toegevoegd.</p>
${BOOKING_TERMS_BODY}`,
  },
}

const PRIVACY_BODY = `<p class="mb-4 text-gray-600 dark:text-gray-400">TAXIO is the name of the platform. The platform is operated by <strong class="text-slate-800 dark:text-slate-200">${escapeHtml(OPERATOR_LEGAL_NAME)}</strong> (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;). We provide software that allows independent taxi companies to present their services and receive booking or contact requests from users. We do not provide transport services.</p>
<p class="mb-6 text-gray-600 dark:text-gray-400">We respect your privacy and process personal data in accordance with the General Data Protection Regulation (GDPR).</p>
${operatorBlockHtml()}

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">2. Data We Collect</h2>
<p class="mb-2 font-semibold text-slate-800 dark:text-slate-200">From taxi companies:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>Company name</li>
<li>VAT number</li>
<li>Contact details (email, phone)</li>
<li>Address and business information</li>
</ul>
<p class="mb-2 font-semibold text-slate-800 dark:text-slate-200">From riders:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>Phone number and/or email</li>
<li>Pick-up and drop-off information (if provided)</li>
</ul>
<p class="mb-2 font-semibold text-slate-800 dark:text-slate-200">Technical data:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>IP address</li>
<li>Browser/device information</li>
<li>Basic usage logs</li>
</ul>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">3. Purpose of Processing</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">We process data only to:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>operate the platform</li>
<li>allow communication between riders and taxi companies</li>
<li>manage company registrations and approvals</li>
<li>ensure platform security</li>
</ul>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">4. Legal Basis</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">Processing is based on:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>legitimate interest (platform operation)</li>
<li>user consent (when submitting contact/booking request)</li>
</ul>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">5. Data Sharing</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">Rider data is shared <strong class="text-slate-800 dark:text-slate-200">only</strong> with the selected taxi company to allow them to respond to the request.</p>
<p class="mb-4 text-gray-600 dark:text-gray-400">We do not sell or share personal data with third parties for marketing.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">6. Data Retention</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">We keep data only as long as necessary for:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>platform operation</li>
<li>legal obligations</li>
</ul>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">7. Your Rights</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">You have the right to:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>access your data</li>
<li>request correction or deletion</li>
<li>object to processing</li>
</ul>
<p class="mb-4 text-gray-600 dark:text-gray-400">Requests can be sent to <a href="mailto:${encodeURIComponent(OPERATOR_LEGAL_EMAIL)}" class="font-medium text-blue-700 underline hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300">${escapeHtml(OPERATOR_LEGAL_EMAIL)}</a> or to the address shown in the <strong class="text-slate-800 dark:text-slate-200">Legal operator</strong> section above.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">8. Security</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">We implement appropriate technical and organizational measures to protect your data.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">9. Contact</h2>
<p class="text-gray-600 dark:text-gray-400"><strong class="text-slate-800 dark:text-slate-200">${escapeHtml(OPERATOR_LEGAL_NAME)}</strong> (TAXIO platform) — ${escapeHtml(OPERATOR_REGISTERED_ADDRESS_DISPLAY)} — VAT: ${escapeHtml(OPERATOR_VAT_DISPLAY)} — <a href="mailto:${encodeURIComponent(OPERATOR_LEGAL_EMAIL)}" class="font-medium text-blue-700 underline hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300">${escapeHtml(OPERATOR_LEGAL_EMAIL)}</a></p>`

const LEGAL_NOTICE_BODY = `<p class="mb-4 text-gray-600 dark:text-gray-400">TAXIO is the consumer-facing platform name. Legal responsibility for operating the service lies with the entity below.</p>
${operatorBlockHtml()}
<dl class="space-y-3 text-gray-600 dark:text-gray-400">
<div>
<dt class="font-semibold text-slate-800 dark:text-slate-200">Platform</dt>
<dd class="mt-0.5">TAXIO</dd>
</div>
<div>
<dt class="font-semibold text-slate-800 dark:text-slate-200">Website</dt>
<dd class="mt-0.5"><a href="https://www.taxio.be" class="font-medium text-blue-700 underline hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300" rel="noopener noreferrer">www.taxio.be</a></dd>
</div>
<div>
<dt class="font-semibold text-slate-800 dark:text-slate-200">Hosting</dt>
<dd class="mt-0.5">Vercel Inc.</dd>
</div>
</dl>`

const LEGAL_NOTICE = {
  en: {
    title: 'Legal Notice',
    html: LEGAL_NOTICE_BODY,
    back: 'Back to Home',
  },
  fr: {
    title: 'Mentions légales',
    html: `<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Version anglaise (informative).</p>
${LEGAL_NOTICE_BODY}`,
    back: "Retour à l'accueil",
  },
  nl: {
    title: 'Juridische vermelding',
    html: `<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Engelse versie (informatief).</p>
${LEGAL_NOTICE_BODY}`,
    back: 'Terug naar home',
  },
}

const COMPANY_TERMS = {
  en: {
    title: 'Company Terms — TAXIO',
    html: COMPANY_TERMS_BODY,
    back: 'Back to Home',
  },
  fr: {
    title: 'Conditions entreprises — TAXIO',
    html: `<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Version anglaise (informative).</p>
${COMPANY_TERMS_BODY}`,
    back: "Retour à l'accueil",
  },
  nl: {
    title: 'Bedrijfsvoorwaarden — TAXIO',
    html: `<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Engelse versie (informatief).</p>
${COMPANY_TERMS_BODY}`,
    back: 'Terug naar home',
  },
}

const CONTACT = {
  en: {
    title: 'Contact',
    html: CONTACT_BODY,
    back: 'Back to Home',
  },
  fr: {
    title: 'Contact',
    html: `<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Version anglaise (informative).</p>
${CONTACT_BODY}`,
    back: "Retour à l'accueil",
  },
  nl: {
    title: 'Contact',
    html: `<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Engelse versie (informatief).</p>
${CONTACT_BODY}`,
    back: 'Terug naar home',
  },
}

const PRIVACY = {
  en: {
    title: 'Privacy Policy',
    html: `<h2 class="mb-3 text-lg font-bold text-slate-900 dark:text-white">1. Introduction</h2>
${PRIVACY_BODY}`,
    back: 'Back to Home',
  },
  fr: {
    title: 'Politique de Confidentialité',
    html: `<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Version anglaise (informative) — traduction juridique à prévoir si nécessaire.</p>
<h2 class="mb-3 text-lg font-bold text-slate-900 dark:text-white">1. Introduction</h2>
${PRIVACY_BODY}`,
    back: "Retour à l'accueil",
  },
  nl: {
    title: 'Privacybeleid',
    html: `<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Engelse versie (informatief) — juridische vertaling kan later worden toegevoegd.</p>
<h2 class="mb-3 text-lg font-bold text-slate-900 dark:text-white">1. Introduction</h2>
${PRIVACY_BODY}`,
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

export function mountLegalNotice(root) {
  const L = LEGAL_NOTICE[lang()] || LEGAL_NOTICE.en
  root.innerHTML = shell(L.title, L.html, L.back)
}

export function mountCompanyTerms(root) {
  const L = COMPANY_TERMS[lang()] || COMPANY_TERMS.en
  root.innerHTML = shell(L.title, L.html, L.back)
}

export function mountContact(root) {
  const L = CONTACT[lang()] || CONTACT.en
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
