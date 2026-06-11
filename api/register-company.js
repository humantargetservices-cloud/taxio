import {
  escapeHtmlEmail,
  getClientIp,
  getOriginFromReq,
  getUserAgent,
  json,
  makeSupabaseServiceClient,
  safeSendEmail,
  slugFromCompanyName,
  verifyTurnstileToken,
  validateSupabaseServiceEnv,
  normalizeCompanyLocale,
} from './_utils.js'

const DEFAULT_PRICING = {
  Standard: { start: '5.00', per_km: '2.00', initial_km: '3' },
  Van: { start: '8.00', per_km: '3.00', initial_km: '3' },
  Luxury: { start: '10.00', per_km: '4.00', initial_km: '3' },
}

function defaultRegistrationPricing() {
  return {
    Standard: { enabled: true, ...DEFAULT_PRICING.Standard },
  }
}

function required(value) {
  return String(value || '').trim()
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function cleanPhoneInput(raw) {
  return String(raw || '')
    .trim()
    .replace(/[\s().-]/g, '')
}

const REGISTRATION_PHONE_DIALS = ['+32', '+31', '+352', '+33', '+49', '+44', '+212', '+90']

function dialDigits(dial) {
  return String(dial || '').replace(/\D/g, '')
}

function normalizeBelgianPhoneToE164(rawPhone) {
  const clean = cleanPhoneInput(rawPhone)
  if (!clean) return ''
  if (clean.startsWith('+')) {
    const digits = clean.slice(1).replace(/\D/g, '')
    if (!digits.startsWith('32')) return ''
    const nsn = digits.slice(2).replace(/^0+/, '')
    if (!isValidBelgianNationalNumber(nsn)) return ''
    return `+32${nsn}`
  }
  if (clean.startsWith('00')) return normalizeBelgianPhoneToE164(`+${clean.slice(2)}`)
  const digits = clean.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('32')) return normalizeBelgianPhoneToE164(`+${digits}`)
  if (!digits.startsWith('0')) return ''
  const nsn = digits.slice(1)
  if (!isValidBelgianNationalNumber(nsn)) return ''
  return `+32${nsn}`
}

function parseRegistrationE164(phone) {
  const s = String(phone || '').trim()
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return null
  const digits = s.slice(1)
  const allowed = REGISTRATION_PHONE_DIALS.map((d) => dialDigits(d)).sort((a, b) => b.length - a.length)
  for (const cc of allowed) {
    if (digits.startsWith(cc)) {
      return { cc, nsn: digits.slice(cc.length), e164: s }
    }
  }
  return null
}

function normalizeRegistrationPhoneToE164(rawPhone) {
  const clean = cleanPhoneInput(rawPhone)
  if (!clean) return ''
  if (clean.startsWith('+')) {
    return parseRegistrationE164(clean)?.e164 || ''
  }
  if (clean.startsWith('00')) return normalizeRegistrationPhoneToE164(`+${clean.slice(2)}`)
  return normalizeBelgianPhoneToE164(clean)
}

function normalizePhoneForCompare(phone) {
  return normalizeRegistrationPhoneToE164(phone).replace(/\D/g, '')
}

/**
 * Canonical Belgian VAT key for comparison: BE + 10 enterprise digits.
 * Treats BE0123456789, be 0123 456 789, 0123456789 as same (do NOT use /^BE0?/ replace — it corrupts BE0123456789).
 */
function normalizeVatForCompare(vatRaw) {
  const s = String(vatRaw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  let digits = ''
  if (s.startsWith('BE')) {
    digits = s.slice(2).replace(/\D/g, '')
  } else {
    digits = s.replace(/\D/g, '')
  }
  if (digits.length > 10) digits = digits.slice(-10)
  if (digits.length > 0 && digits.length < 10) digits = digits.padStart(10, '0')
  return `BE${digits}`
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidPhone(phone) {
  const parsed = parseRegistrationE164(normalizeRegistrationPhoneToE164(phone))
  if (!parsed) return false
  if (parsed.cc === '32') return isValidBelgianNationalNumber(parsed.nsn)
  return /^[1-9]\d{7,11}$/.test(parsed.nsn)
}

function isValidBelgianNationalNumber(nsn) {
  return /^[1-9]\d{7,8}$/.test(String(nsn || ''))
}

function isValidBelgianE164(phone) {
  const s = String(phone || '').trim()
  if (!/^\+32\d{8,9}$/.test(s)) return false
  return isValidBelgianNationalNumber(s.slice(3))
}

function isValidBelgianVat(vatRaw) {
  return /^BE\d{10}$/.test(normalizeVatForCompare(vatRaw))
}

/** Load all companies' vat_number + phone (all statuses). Paginate — default REST limit can miss rows. */
async function fetchAllCompaniesVatPhone(supabase) {
  const pageSize = 1000
  const rows = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, vat_number, phone')
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data?.length) break
    rows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return rows
}

function isValidCity(city) {
  const value = String(city || '').trim()
  if (value.length < 2 || value.length > 80) return false
  return /^[A-Za-zÀ-ÖØ-öø-ÿ'’\-\s.]+$/.test(value)
}

function hasObviousFakeCompanyName(name) {
  const n = String(name || '')
    .trim()
    .toLowerCase()
  if (!n) return true
  if (['test', 'testing', 'aaa', 'qwerty', 'asdf', 'random'].includes(n)) return true
  if (/^(.)\1{2,}$/.test(n.replace(/\s+/g, ''))) return true
  if (/^[a-z]{1,3}$/.test(n)) return true
  return false
}

async function countAbuseEvents(supabase, { action, sinceIso, ipAddress }) {
  let q = supabase
    .from('abuse_rate_events')
    .select('id', { count: 'exact', head: true })
    .eq('action', action)
    .gte('created_at', sinceIso)
  if (ipAddress) q = q.eq('ip_address', ipAddress)
  const { count, error } = await q
  if (error) throw error
  return count || 0
}

async function logAbuseEvent(supabase, row) {
  const { error } = await supabase.from('abuse_rate_events').insert(row)
  if (error) throw error
}

async function logBlockedRegistration(supabase, { ipAddress, reason, extra = {} }) {
  try {
    await logAbuseEvent(supabase, {
      action: 'company_registration_blocked',
      ip_address: ipAddress || null,
      metadata: { reason, ...extra },
    })
  } catch (err) {
    console.error('[register-company:blocked-log]', err)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const envErr = validateSupabaseServiceEnv()
  if (envErr) return json(res, 503, { error: envErr })

  try {
    const body =
      typeof req.body === 'string' && req.body ? JSON.parse(req.body) : req.body || {}
    const companyName = required(body.companyName)
    const vatNumberInput = required(body.vatNumber)
    const phoneInput = required(body.phone)
    const email = normalizeEmail(body.email)
    const city = required(body.city)
    const termsAccepted = !!body.termsAccepted
    const humanConfirmed = !!body.humanConfirmed
    let companyTermsAcceptedAt = new Date().toISOString()
    if (body.termsAcceptedAt) {
      const d = new Date(body.termsAcceptedAt)
      if (!Number.isNaN(d.getTime())) companyTermsAcceptedAt = d.toISOString()
    }
    const companyTermsVersion = String(body.termsVersion || '').trim() || null
    const preferred_locale = normalizeCompanyLocale(body.locale || body.preferred_locale)
    const turnstileToken = String(body.turnstileToken || '').trim()
    const honeypot = String(body.companyWebsite || '').trim()
    const formStartedAt = Number(body.formStartedAt || 0)
    const submissionFingerprint = String(body.submissionFingerprint || '').trim().slice(0, 220)
    const normalizedVat = normalizeVatForCompare(vatNumberInput)
    const normalizedPhoneE164 = normalizeRegistrationPhoneToE164(phoneInput)
    const normalizedPhone = normalizePhoneForCompare(phoneInput)
    const ipAddress = getClientIp(req)
    const userAgent = getUserAgent(req)
    const contactKey =
      submissionFingerprint ||
      `reg:${normalizedVat}:${normalizedPhone}:${email}`.slice(0, 220)

    if (!companyName || !vatNumberInput || !phoneInput || !email || !city) {
      return json(res, 400, { error: 'Missing required fields.' })
    }
    if (honeypot) {
      return json(res, 400, { error: 'Security verification failed. Please retry the form.' })
    }
    if (!humanConfirmed) {
      return json(res, 400, { error: 'Please confirm you are a real person.' })
    }
    if (!Number.isFinite(formStartedAt) || Date.now() - formStartedAt < 1000) {
      return json(res, 400, { error: 'Please wait a moment before submitting.' })
    }
    if (!termsAccepted) {
      return json(res, 400, { error: 'Terms must be accepted.' })
    }
    if (hasObviousFakeCompanyName(companyName)) {
      return json(res, 400, {
        error: 'Company name looks invalid. Please enter your real legal company name.',
      })
    }

    const slug = slugFromCompanyName(companyName)
    if (!slug || slug.length < 2) {
      return json(res, 400, {
        error: 'Company name must yield a valid subdomain.',
      })
    }
    if (!/^[a-z0-9]{2,40}$/.test(slug)) {
      return json(res, 400, { error: 'Generated subdomain is invalid.' })
    }
    if (!isValidEmail(email)) {
      return json(res, 400, { error: 'Please enter a valid email address.' })
    }
    if (!isValidPhone(phoneInput)) {
      return json(res, 400, {
        error: 'Please enter a valid phone number.',
      })
    }
    if (!isValidBelgianVat(vatNumberInput)) {
      return json(res, 400, { error: 'Please enter a valid Belgian VAT number.' })
    }
    if (!isValidCity(city)) {
      return json(res, 400, { error: 'Please enter a valid city name.' })
    }

    const supabase = makeSupabaseServiceClient()
    const origin = getOriginFromReq(req)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    if (ipAddress !== 'unknown') {
      let perIpCount = 0
      try {
        perIpCount = await countAbuseEvents(supabase, {
          action: 'company_registration_submit',
          sinceIso: oneHourAgo,
          ipAddress,
        })
      } catch (ipCountErr) {
        console.error('[register-company:rate-limit-ip]', ipCountErr)
      }
      if (perIpCount >= 3) {
        await logBlockedRegistration(supabase, {
          ipAddress,
          reason: 'rate_limit_ip_3_per_hour',
        })
        return json(res, 429, {
          error: 'Too many attempts. Please try again later.',
        })
      }
    }
    try {
      await logAbuseEvent(supabase, {
        action: 'company_registration_submit',
        ip_address: ipAddress,
        metadata: { ua: userAgent ? 'present' : 'missing' },
        contact_key: contactKey,
      })
    } catch (rateLogErr) {
      console.error('[register-company:abuse-log]', rateLogErr)
    }

    const turnstile = await verifyTurnstileToken(turnstileToken, ipAddress)
    if (turnstile.enabled && !turnstile.passed) {
      await logBlockedRegistration(supabase, {
        ipAddress,
        reason: 'turnstile_failed',
        extra: { turnstile_reason: turnstile.reason || null },
      })
      return json(res, 400, {
        error: 'Security verification failed. Please retry the form.',
        code: 'TURNSTILE_FAILED',
      })
    }

    const { data: existingBySlug } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()
    if (existingBySlug) {
      return json(res, 409, {
        error: 'This subdomain is already taken. Please adjust your company name slightly.',
      })
    }

    const { data: existingByEmail } = await supabase
      .from('companies')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle()
    if (existingByEmail) {
      return json(res, 409, {
        error: 'This email is already used for another company.',
      })
    }
    let dupRows
    try {
      dupRows = await fetchAllCompaniesVatPhone(supabase)
    } catch (dupErr) {
      return json(res, 500, {
        error: `Could not validate duplicates: ${dupErr?.message || String(dupErr)}`,
      })
    }
    const vatTaken = dupRows.some(
      (r) => normalizeVatForCompare(r.vat_number) === normalizedVat
    )
    if (vatTaken) {
      return json(res, 409, {
        error: 'This VAT number is already registered.',
      })
    }

    const baseCompanyRow = {
      name: companyName,
      slug,
      vat_number: normalizedVat,
      email,
      phone: normalizedPhoneE164,
      city,
      country: null,
      status: 'pending',
      owner_user_id: null,
      slogan: 'Your Ride, Your Way, Anytime!',
      availability_status: 'available',
      subscription_plan: 'basic',
      pricing: defaultRegistrationPricing(),
      preferred_locale,
      ip_address: ipAddress,
      user_agent: userAgent,
      turnstile_passed: turnstile.enabled ? !!turnstile.passed : null,
      turnstile_error: turnstile.enabled && !turnstile.passed ? String(turnstile.reason || '') : null,
    }

    const legalCompanyRow = {
      company_terms_accepted: true,
      company_terms_accepted_at: companyTermsAcceptedAt,
      company_terms_version: companyTermsVersion,
    }

    function companyTermsColumnsMissing(err) {
      const m = String(err?.message || '').toLowerCase()
      return (
        m.includes('company_terms_accepted') ||
        m.includes('company_terms_accepted_at') ||
        m.includes('company_terms_version')
      )
    }

    function preferredLocaleColumnMissing(err) {
      const m = String(err?.message || '').toLowerCase()
      return m.includes('preferred_locale')
    }
    function abuseMetaColumnsMissing(err) {
      const m = String(err?.message || '').toLowerCase()
      return (
        m.includes('ip_address') ||
        m.includes('user_agent') ||
        m.includes('turnstile_passed') ||
        m.includes('turnstile_error')
      )
    }

    let { data: company, error: cErr } = await supabase
      .from('companies')
      .insert({ ...baseCompanyRow, ...legalCompanyRow })
      .select('id, name, slug, email, vat_number, phone, city, status, created_at')
      .single()

    if (cErr && preferredLocaleColumnMissing(cErr)) {
      console.warn(
        '[register-company] preferred_locale missing; retry without it. Apply supabase/migration_company_preferred_locale.sql.'
      )
      const { preferred_locale: _drop, ...rowNoLocale } = baseCompanyRow
      ;({ data: company, error: cErr } = await supabase
        .from('companies')
        .insert({ ...rowNoLocale, ...legalCompanyRow })
        .select('id, name, slug, email, vat_number, phone, city, status, created_at')
        .single())
    }
    if (cErr && companyTermsColumnsMissing(cErr)) {
      console.warn(
        '[register-company] Legal acceptance columns missing; retry without them. Apply supabase/migration_legal_acceptance.sql.'
      )
      const { preferred_locale: _pl, ...withoutLocale } = baseCompanyRow
      ;({ data: company, error: cErr } = await supabase
        .from('companies')
        .insert(baseCompanyRow)
        .select('id, name, slug, email, vat_number, phone, city, status, created_at')
        .single())
      if (cErr && preferredLocaleColumnMissing(cErr)) {
        ;({ data: company, error: cErr } = await supabase
          .from('companies')
          .insert(withoutLocale)
          .select('id, name, slug, email, vat_number, phone, city, status, created_at')
          .single())
      }
    }
    if (cErr && abuseMetaColumnsMissing(cErr)) {
      console.warn(
        '[register-company] Abuse metadata columns missing; retry without metadata. Apply supabase/migration_abuse_protection_metadata.sql.'
      )
      const {
        ip_address: _ip,
        user_agent: _ua,
        turnstile_passed: _tp,
        turnstile_error: _te,
        ...withoutAbuseMeta
      } = baseCompanyRow
      ;({ data: company, error: cErr } = await supabase
        .from('companies')
        .insert({ ...withoutAbuseMeta, ...legalCompanyRow })
        .select('id, name, slug, email, vat_number, phone, city, status, created_at')
        .single())
      if (cErr && companyTermsColumnsMissing(cErr)) {
        ;({ data: company, error: cErr } = await supabase
          .from('companies')
          .insert(withoutAbuseMeta)
          .select('id, name, slug, email, vat_number, phone, city, status, created_at')
          .single())
      }
    }

    if (cErr) {
      console.error('[register-company:insert]', cErr)
      if (String(cErr.code || '') === '23502' && /owner_user_id/i.test(String(cErr.message || ''))) {
        return json(res, 500, {
          error:
            'Database is missing onboarding migration for nullable companies.owner_user_id. Run migration_onboarding_admin_approval.sql and retry.',
          code: 'MISSING_ONBOARDING_MIGRATION',
        })
      }
      const hint =
        cErr.code === '23505'
          ? 'A record with this value already exists (e.g. slug or unique field).'
          : cErr.message || 'Database error.'
      return json(res, 500, {
        error: `Could not submit registration. ${hint}`,
        code: cErr.code || undefined,
      })
    }

    const adminEmail = String(process.env.ADMIN_NOTIFY_EMAIL || '').trim()
    const adminDashboardUrl = `${origin}/admin/dashboard`
    const requestedAt =
      company?.created_at != null
        ? new Date(company.created_at).toISOString()
        : new Date().toISOString()

    // Only the platform admin receives email at registration — no company-facing email.
    if (adminEmail) {
      const mail = await safeSendEmail({
        to: adminEmail,
        subject: `New TAXIO pending company: ${companyName}`,
        html: `
        <p>A new company registration is pending approval.</p>
        <ul>
          <li><strong>Name:</strong> ${escapeHtmlEmail(companyName)}</li>
          <li><strong>VAT:</strong> ${escapeHtmlEmail(normalizedVat)}</li>
          <li><strong>Email:</strong> ${escapeHtmlEmail(email)}</li>
          <li><strong>Phone:</strong> ${escapeHtmlEmail(normalizedPhoneE164)}</li>
          <li><strong>City:</strong> ${escapeHtmlEmail(city)}</li>
          <li><strong>Request date (UTC):</strong> ${escapeHtmlEmail(requestedAt)}</li>
          <li><strong>Slug:</strong> ${escapeHtmlEmail(slug)}</li>
          <li><strong>Registration language:</strong> ${escapeHtmlEmail(preferred_locale)}</li>
        </ul>
        <p><a href="${escapeHtmlEmail(adminDashboardUrl)}">Open admin dashboard</a></p>
      `,
      })
      if (mail?.skipped || mail?.ok === false) {
        console.error('[register-company:admin-notify] Admin notification email failed; registration row already saved.', {
          companyId: company?.id,
          slug,
          skipped: !!mail?.skipped,
          reason: mail?.reason || null,
          provider: mail?.provider || null,
          error: mail?.error || null,
        })
        // Never return 500 or technical hints to the browser — operators must see a normal success flow.
        return json(res, 200, { data: { company, slug } })
      }
    } else {
      console.warn(
        '[register-company] ADMIN_NOTIFY_EMAIL is not set; no admin notification email sent.'
      )
    }

    return json(res, 200, { data: { company, slug } })
  } catch (err) {
    console.error('[register-company]', err)
    const msg = err?.message || String(err)
    if (msg.includes('Server misconfiguration')) {
      return json(res, 503, { error: msg })
    }
    return json(res, 500, { error: msg || 'Internal server error.' })
  }
}
