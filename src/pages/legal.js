import { icon } from '../lib/icons.js'
import { escapeHtml } from '../lib/html.js'
import { getLocale, setLocale, syncDocumentLang } from '../lib/locale.js'
import { tBooking } from '../i18n.js'
import {
  OPERATOR_LEGAL_NAME,
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

/** Single rider / public terms at <code>/terms</code> (platform role, booking, liability, privacy ref, complaints). */
const RIDER_TERMS_BODY = `${operatorBlockHtml()}

<h2 class="mb-3 text-lg font-bold text-slate-900 dark:text-white">1. Who these terms are for</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">These Terms of Use apply to you if you use the TAXIO website, apps, or any rider-facing part of the platform (including viewing taxi company pages hosted on TAXIO and sending booking or contact requests).</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">2. What TAXIO is — and is not</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">TAXIO is a <strong class="text-slate-800 dark:text-slate-200">software platform and hosting layer</strong>. We make tools available so independent taxi companies can have a presence (including on subdomains or paths under the TAXIO domain) and receive booking or contact requests from the public.</p>
<p class="mb-4 text-gray-600 dark:text-gray-400">TAXIO does <strong class="text-slate-800 dark:text-slate-200">not</strong> provide passenger transport. TAXIO is <strong class="text-slate-800 dark:text-slate-200">not</strong> a taxi operator, carrier, or employer of drivers. TAXIO does <strong class="text-slate-800 dark:text-slate-200">not</strong> dispatch rides as a transport undertaking and does <strong class="text-slate-800 dark:text-slate-200">not</strong> control how taxi companies run their services, set prices, or perform journeys.</p>
<p class="mb-4 text-gray-600 dark:text-gray-400">Each taxi company listed on the platform is a separate business. Any contract or agreement for a ride is between <strong class="text-slate-800 dark:text-slate-200">you and that taxi company</strong>, not with TAXIO.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">3. How booking and contact requests work</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">When you submit a booking or contact request through a company’s page or tools on TAXIO:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>your request is directed to the <strong class="text-slate-800 dark:text-slate-200">selected taxi company</strong>;</li>
<li>TAXIO acts as a <strong class="text-slate-800 dark:text-slate-200">technical intermediary</strong> (hosting, forms, messaging channels such as links to third-party apps) unless we explicitly state otherwise;</li>
<li>the taxi company is responsible for accepting or declining the request, pricing, dispatch, insurance, licences, and performing the transport.</li>
</ul>
<p class="mb-4 text-gray-600 dark:text-gray-400">By using the platform you acknowledge that information you provide may be transmitted to the taxi company so it can respond. You must provide information that is accurate and not misleading.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">4. Independent taxi companies</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">Companies using TAXIO are independent undertakings. They must comply with applicable law (including transport licensing, taximeter rules where applicable, insurance, tax, and consumer rules). TAXIO may verify registrations (for example VAT or trade-register checks) before or after listing, and may refuse or remove a company from the platform.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">5. No guarantee of service</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">TAXIO does not guarantee:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>availability of vehicles or drivers;</li>
<li>response times;</li>
<li>fares or estimates shown through the platform;</li>
<li>quality or outcome of any ride.</li>
</ul>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">6. Limitation of liability</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">To the fullest extent permitted by applicable law, TAXIO and its operator are not liable for:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>transport services or failure to provide them;</li>
<li>delays, cancellations, or safety incidents;</li>
<li>disputes between you and a taxi company, including payment disputes;</li>
<li>content or offers published by taxi companies on their hosted pages;</li>
<li>actions or omissions of third parties (including messaging or map providers).</li>
</ul>
<p class="mb-4 text-gray-600 dark:text-gray-400">Nothing in these terms excludes or limits liability that cannot be excluded or limited under mandatory law (including death or personal injury caused by negligence where the law so requires).</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">7. Acceptable use</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">You must not misuse the platform, attempt unauthorised access, scrape or overload systems, impersonate others, submit fraudulent requests, or use TAXIO for unlawful purposes. We may suspend access, remove content, or cooperate with authorities where appropriate.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">8. Privacy and personal data</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">We process personal data as described in our <a href="/privacy" class="font-medium text-blue-700 underline hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300">Privacy Policy</a>. In short: we operate the platform; rider data needed to handle a request is shared with the taxi company you select so it can respond; we do not sell your data for third-party marketing as described in that policy.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">9. Complaints and contact</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">For issues about a specific ride, price, or driver, contact the taxi company first. For questions about the TAXIO platform, data protection, or these terms, contact us at <a href="mailto:${encodeURIComponent(OPERATOR_LEGAL_EMAIL)}" class="font-medium text-blue-700 underline hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300">${escapeHtml(OPERATOR_LEGAL_EMAIL)}</a> or use the <a href="/contact" class="font-medium text-blue-700 underline hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300">Contact</a> page.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">10. Changes</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">We may update these terms. Material changes will be reflected by updating this page and, where required, by other reasonable notice. Continued use after changes take effect constitutes acceptance unless mandatory law requires otherwise.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">11. Governing law</h2>
<p class="text-gray-600 dark:text-gray-400">These terms are governed by <strong class="text-slate-800 dark:text-slate-200">Belgian law</strong>, without prejudice to mandatory consumer protections that may apply to you.</p>`

/** Single company terms at <code>/company-terms</code> (registration, hosting, billing, IP, liability). */
const COMPANY_TERMS_BODY = `${operatorBlockHtml()}

<h2 class="mb-3 text-lg font-bold text-slate-900 dark:text-white">1. Role of TAXIO</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">TAXIO is a <strong class="text-slate-800 dark:text-slate-200">software platform</strong> operated by ${escapeHtml(OPERATOR_LEGAL_NAME)}. We provide hosting, technical infrastructure, and tools so your taxi company can maintain a presence on TAXIO (including under a subdomain or path on the TAXIO domain) and receive booking or contact requests from the public.</p>
<p class="mb-4 text-gray-600 dark:text-gray-400">TAXIO does <strong class="text-slate-800 dark:text-slate-200">not</strong> provide passenger transport, act as a carrier, employ your drivers, or control your day-to-day operations. You remain solely responsible for transport services offered to riders.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">2. Hosted presence and platform property</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">Your company page and subdomain (e.g. <span class="font-mono text-xs">yourcompany.taxio.be</span>) are part of the TAXIO platform. You receive a <strong class="text-slate-800 dark:text-slate-200">limited, revocable right</strong> to use that presence for your business in line with these terms and our policies. You do <strong class="text-slate-800 dark:text-slate-200">not</strong> acquire ownership of the TAXIO domain, brand, software, databases, or underlying infrastructure. You may not sell, transfer, or sublicense your access in a way that misleads riders or breaches these terms.</p>
<p class="mb-4 text-gray-600 dark:text-gray-400">You are responsible for the accuracy, lawfulness, and updating of all content and offers shown on your hosted page (including prices, vehicle types, and contact details).</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">3. Your transport service and compliance</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">As an independent taxi company you are solely responsible for:</p>
<ul class="mb-4 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
<li>performing transport safely and lawfully;</li>
<li>drivers, vehicles, licences, permits, and insurance;</li>
<li>pricing, taximeter or fare rules where applicable, invoicing, and taxes;</li>
<li>customer service, complaints, and disputes with riders;</li>
<li>compliance with data protection law for data you process as controller (see section 8).</li>
</ul>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">4. Account, credentials, and use</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">Accounts are for your business only. You must keep credentials secure, authorise only appropriate staff, and notify us promptly of suspected unauthorised use. You must not misuse the platform, interfere with security, attempt to access other companies’ data, or use TAXIO in a way that harms riders, other companies, or the platform.</p>

${companyBillingSectionHtml()}

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">6. Suspension and termination</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">We may suspend or terminate your access (including approval status, hosting, or technical access) if you breach these terms or applicable law, fail to pay fees when due, create risk to riders or the platform, or if we are required to do so by law or a competent authority. You may stop using TAXIO at any time subject to outstanding fees and transition where reasonably required.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">7. Prohibited conduct and fraud</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">You must not use TAXIO for fraud, misrepresentation, illegal transport, circumvention of licensing, harassment, spam, malware distribution, or any activity that violates law or third-party rights. We may investigate, remove content, suspend accounts, and cooperate with authorities.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">8. Rider data and privacy</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">When a rider submits a request via TAXIO, relevant data is shared with <strong class="text-slate-800 dark:text-slate-200">your</strong> company so you can respond. You act as an independent controller (or co-controller, as applicable) for that data for your transport and customer-management purposes. You must process personal data lawfully, fairly, and only as needed; honour access, correction, and deletion requests where required; and not use rider data for unrelated marketing without appropriate legal basis and transparency.</p>
<p class="mb-4 text-gray-600 dark:text-gray-400">${escapeHtml(OPERATOR_LEGAL_NAME)} processes data as described in the <a href="/privacy" class="font-medium text-blue-700 underline hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300">TAXIO Privacy Policy</a> to operate the platform.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">9. Intellectual property and brand</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">The TAXIO name, logos, software, documentation, and platform content (excluding your uploaded business content) are protected by intellectual property laws. You may not use TAXIO marks in a way that suggests endorsement beyond your listing, register confusing domain names, or copy the platform’s look and feel to mislead users. You grant us a licence to host, display, and technically process your content as needed to operate your presence.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">10. Limitation of liability</h2>
<p class="mb-2 text-gray-600 dark:text-gray-400">To the fullest extent permitted by law, TAXIO and its operator are not liable for your business results, loss of profits, indirect or consequential damages, or claims arising from your transport services, except where liability cannot be excluded under mandatory law.</p>
<p class="mb-4 text-gray-600 dark:text-gray-400">The platform is provided on an “as is” and “as available” basis. We do not warrant uninterrupted or error-free operation.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">11. Changes</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">We may update these company terms. Continued use after publication of changes constitutes acceptance of the updated terms where permitted by law. If you do not agree, you must stop using the platform and may request closure of your account subject to contractual and legal obligations.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">12. Governing law</h2>
<p class="text-gray-600 dark:text-gray-400">These company terms are governed by <strong class="text-slate-800 dark:text-slate-200">Belgian law</strong>, without prejudice to mandatory consumer protections where applicable.</p>`

const CONTACT_BODY = `<p class="mb-4 text-gray-600 dark:text-gray-400">For questions about the TAXIO platform, ${escapeHtml(OPERATOR_LEGAL_NAME)}, or legal and privacy matters, email <a href="mailto:${encodeURIComponent(OPERATOR_LEGAL_EMAIL)}" class="font-medium text-blue-700 underline hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300">${escapeHtml(OPERATOR_LEGAL_EMAIL)}</a>.</p>
${operatorBlockHtml()}
<p class="text-sm text-gray-500 dark:text-gray-500">A contact form may be added later; email remains the primary channel.</p>`

const RIDER_TERMS = {
  en: {
    title: 'Terms of Use — Riders & Public',
    html: RIDER_TERMS_BODY,
  },
  fr: {
    title: "Conditions d'utilisation — usagers & public",
    html: `<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Version anglaise (informative) — traduction juridique à prévoir si nécessaire.</p>
${RIDER_TERMS_BODY}`,
  },
  nl: {
    title: 'Gebruiksvoorwaarden — reizigers & publiek',
    html: `<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Engelse versie (informatief) — juridische vertaling kan later worden toegevoegd.</p>
${RIDER_TERMS_BODY}`,
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
<p class="mb-4 text-gray-600 dark:text-gray-400">Requests can be sent to <a href="mailto:${encodeURIComponent(OPERATOR_LEGAL_EMAIL)}" class="font-medium text-blue-700 underline hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300">${escapeHtml(OPERATOR_LEGAL_EMAIL)}</a>.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">8. Security</h2>
<p class="mb-4 text-gray-600 dark:text-gray-400">We implement appropriate technical and organizational measures to protect your data.</p>

<h2 class="mb-3 mt-8 text-lg font-bold text-slate-900 dark:text-white">9. Contact</h2>
<p class="text-gray-600 dark:text-gray-400"><strong class="text-slate-800 dark:text-slate-200">${escapeHtml(OPERATOR_LEGAL_NAME)}</strong> (TAXIO platform) — VAT: ${escapeHtml(OPERATOR_VAT_DISPLAY)} — <a href="mailto:${encodeURIComponent(OPERATOR_LEGAL_EMAIL)}" class="font-medium text-blue-700 underline hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300">${escapeHtml(OPERATOR_LEGAL_EMAIL)}</a></p>`

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

function legalLocaleToggleHtml() {
  const cur = getLocale()
  return `
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="text-xs font-medium text-slate-500">${escapeHtml(tBooking(cur).langLabel)}</span>
          <div class="flex rounded-full border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-600 dark:bg-slate-800">
            ${['nl', 'fr', 'en']
              .map(
                (lc) =>
                  `<button type="button" data-taxio-locale="${lc}" class="rounded-full px-2.5 py-1 text-xs font-semibold ${cur === lc ? 'bg-slate-900 text-white dark:bg-yellow-500 dark:text-slate-900' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}">${lc.toUpperCase()}</button>`
              )
              .join('')}
          </div>
        </div>`
}

function attachLegalLocales(root, remount) {
  root.querySelectorAll('[data-taxio-locale]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lc = btn.getAttribute('data-taxio-locale')
      if (lc) {
        setLocale(lc)
        remount()
      }
    })
  })
}

/** Rider & public terms at <code>/terms</code>. */
export function mountTerms(root) {
  syncDocumentLang(getLocale())
  const L = RIDER_TERMS[getLocale()] || RIDER_TERMS.nl
  root.innerHTML = shell(L.title, L.html, backLabel())
  attachLegalLocales(root, () => mountTerms(root))
}

export function mountPrivacy(root) {
  syncDocumentLang(getLocale())
  const L = PRIVACY[getLocale()] || PRIVACY.nl
  root.innerHTML = shell(L.title, L.html, L.back)
  attachLegalLocales(root, () => mountPrivacy(root))
}

export function mountCompanyTerms(root) {
  syncDocumentLang(getLocale())
  const L = COMPANY_TERMS[getLocale()] || COMPANY_TERMS.nl
  root.innerHTML = shell(L.title, L.html, L.back)
  attachLegalLocales(root, () => mountCompanyTerms(root))
}

export function mountContact(root) {
  syncDocumentLang(getLocale())
  const L = CONTACT[getLocale()] || CONTACT.nl
  root.innerHTML = shell(L.title, L.html, L.back)
  attachLegalLocales(root, () => mountContact(root))
}

function backLabel() {
  return PRIVACY[getLocale()]?.back || PRIVACY.nl.back
}

function shell(title, innerHtml, backLabelText) {
  return `
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-900 px-4 py-10 md:py-14">
    <div class="mx-auto max-w-3xl">
      <a href="/" class="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-yellow-400 dark:hover:text-yellow-300">
        ${icon.arrowLeft('h-4 w-4')}
        ${backLabelText}
      </a>
      ${legalLocaleToggleHtml()}
      <div class="mt-8 rounded-xl border border-gray-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">${title}</h1>
        <div class="prose prose-sm mt-6 max-w-none text-left dark:prose-invert">${innerHtml}</div>
      </div>
    </div>
  </div>`
}
