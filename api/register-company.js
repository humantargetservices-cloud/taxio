import {
  escapeHtmlEmail,
  getOriginFromReq,
  json,
  makeSupabaseServiceClient,
  safeSendEmail,
  slugFromCompanyName,
  validateSupabaseServiceEnv,
} from './_utils.js'

const DEFAULT_PRICING = {
  Standard: { start: '5.00', per_km: '2.00', initial_km: '3' },
  Van: { start: '8.00', per_km: '3.00', initial_km: '3' },
  Luxury: { start: '10.00', per_km: '4.00', initial_km: '3' },
}

function required(value) {
  return String(value || '').trim()
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

/**
 * Belgian phone: treat +32... and 0... (national) as the same for duplicate checks.
 * Strips non-digits, then normalizes leading 0 to 32 for typical mobile/landline lengths.
 */
function normalizePhoneForCompare(phone) {
  let d = String(phone || '').trim().replace(/\D/g, '')
  if (!d) return ''
  // National format: 0XXXXXXXXX (9–10 digits after 0) → 32 + rest
  if (d.startsWith('0') && d.length >= 9 && d.length <= 11) {
    d = `32${d.slice(1)}`
  }
  return d
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
  const raw = String(phone || '').trim()
  if (!/^[+\d()\-.\s]+$/.test(raw)) return false
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
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
    const normalizedVat = normalizeVatForCompare(vatNumberInput)
    const normalizedPhone = normalizePhoneForCompare(phoneInput)

    if (!companyName || !vatNumberInput || !phoneInput || !email || !city) {
      return json(res, 400, { error: 'Missing required fields.' })
    }
    if (!termsAccepted) {
      return json(res, 400, { error: 'Terms must be accepted.' })
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
      return json(res, 400, { error: 'Please enter a valid phone number.' })
    }
    if (!isValidBelgianVat(vatNumberInput)) {
      return json(res, 400, { error: 'Please enter a valid Belgian VAT number.' })
    }
    if (!isValidCity(city)) {
      return json(res, 400, { error: 'Please enter a valid city name.' })
    }

    const supabase = makeSupabaseServiceClient()
    const origin = getOriginFromReq(req)

    const { data: existingBySlug } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()
    if (existingBySlug) {
      return json(res, 409, {
        error:
          'That company name produces a subdomain already taken. Slightly change the company name and try again.',
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
        error: 'A company registration with this email already exists.',
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
        error: 'This VAT number is already registered on TAXIO.',
      })
    }
    const phoneTaken = dupRows.some(
      (r) => normalizePhoneForCompare(r.phone) === normalizedPhone
    )
    if (phoneTaken) {
      return json(res, 409, {
        error: 'This phone number is already registered on TAXIO.',
      })
    }

    const { data: company, error: cErr } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        slug,
        vat_number: normalizedVat,
        email,
        phone: phoneInput.trim(),
        city,
        country: null,
        status: 'pending',
        owner_user_id: null,
        slogan: 'Your Ride, Your Way, Anytime!',
        availability_status: 'available',
        subscription_plan: 'basic',
        pricing: DEFAULT_PRICING,
      })
      .select('id, name, slug, email, vat_number, phone, city, status, created_at')
      .single()

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
          <li><strong>Phone:</strong> ${escapeHtmlEmail(phoneInput.trim())}</li>
          <li><strong>City:</strong> ${escapeHtmlEmail(city)}</li>
          <li><strong>Request date (UTC):</strong> ${escapeHtmlEmail(requestedAt)}</li>
          <li><strong>Slug:</strong> ${escapeHtmlEmail(slug)}</li>
        </ul>
        <p><a href="${escapeHtmlEmail(adminDashboardUrl)}">Open admin dashboard</a></p>
      `,
      })
      if (mail?.skipped || mail?.ok === false) {
        console.warn('[register-company:admin-notify] Admin email was not sent:', mail)
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
