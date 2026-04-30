import {
  escapeHtmlEmail,
  getOriginFromReq,
  json,
  makeSupabaseServiceClient,
  makeTempPassword,
  safeSendEmail,
  validateSupabaseServiceEnv,
  normalizeCompanyLocale,
} from './_utils.js'

function isDuplicateAuthEmailError(err) {
  const msg = String(err?.message || '').toLowerCase()
  const code = String(err?.code ?? err?.status ?? '')
  if (msg.includes('already registered')) return true
  if (msg.includes('already been registered')) return true
  if (msg.includes('user already exists')) return true
  if (msg.includes('duplicate')) return true
  if (code === '422') return true
  return false
}

async function findAuthUserIdByEmail(supabase, email) {
  const want = String(email || '').trim().toLowerCase()
  if (!want) return null
  const perPage = 1000
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('[admin-approve:listUsers]', error)
      return null
    }
    const users = data?.users || []
    const hit = users.find((u) => (u.email || '').toLowerCase() === want)
    if (hit) return hit.id
    if (users.length < perPage) break
  }
  return null
}

async function assertEmailNotLinkedToOtherCompany(supabase, userId, companyId) {
  const { data: rows, error } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId)
  if (error) return { ok: false, error: `Could not verify memberships: ${error.message}` }
  const others = (rows || []).filter((r) => r.company_id !== companyId)
  if (others.length > 0) {
    return {
      ok: false,
      error:
        'This email is already linked to another company in TAXIO. Change the company email on the application, or remove the conflicting membership in Supabase before approving.',
    }
  }
  return { ok: true }
}

function approvalEmailForLocale(locale, ctx) {
  const loc = normalizeCompanyLocale(locale)
  const esc = ctx.escape
  const { companyName, vat, em, city, bookingUrl, loginUrl, tempPassword, qrSrc } = ctx

  const copy = {
    en: {
      subject: 'TAXIO — Your company is approved',
      greet: 'Hello',
      lead: 'Your registration is <strong>approved</strong>. Sign in below with your temporary password.',
      nameL: 'Name',
      vatL: 'VAT',
      emailL: 'Email',
      cityL: 'City',
      booking: 'Public booking page',
      qrHint: 'Share this link or QR with customers.',
      qrLinkLabel: 'QR code link',
      login: 'Dashboard login',
      user: 'Email (login)',
      pass: 'Temporary password',
      mustChange: 'You must change your password on first login.',
      signoff: '— TAXIO',
    },
    fr: {
      subject: 'TAXIO — Entreprise approuvée',
      greet: 'Bonjour',
      lead: 'Votre inscription est <strong>approuvée</strong>. Connectez-vous avec le mot de passe temporaire ci-dessous.',
      nameL: 'Nom',
      vatL: 'TVA',
      emailL: 'E-mail',
      cityL: 'Ville',
      booking: 'Page de réservation publique',
      qrHint: 'Partagez ce lien ou ce QR code avec vos clients.',
      qrLinkLabel: 'Lien du QR code',
      login: 'Connexion tableau de bord',
      user: 'E-mail (connexion)',
      pass: 'Mot de passe temporaire',
      mustChange: 'Vous devez changer votre mot de passe à la première connexion.',
      signoff: '— TAXIO',
    },
    nl: {
      subject: 'TAXIO — Uw bedrijf is goedgekeurd',
      greet: 'Beste',
      lead: 'Uw registratie is <strong>goedgekeurd</strong>. Log in met het tijdelijke wachtwoord hieronder.',
      nameL: 'Naam',
      vatL: 'BTW',
      emailL: 'E-mail',
      cityL: 'Stad',
      booking: 'Openbare boekingspagina',
      qrHint: 'Deel deze link of QR-code met klanten.',
      qrLinkLabel: 'QR-code link',
      login: 'Dashboardlogin',
      user: 'E-mail (login)',
      pass: 'Tijdelijk wachtwoord',
      mustChange: 'Wijzig dit wachtwoord bij de eerste login.',
      signoff: '— TAXIO',
    },
  }
  const t = copy[loc]
  const html = `
      <div style="font-family:system-ui,Segoe UI,sans-serif;line-height:1.5;color:#111;font-size:15px;">
        <p>${esc(t.greet)} ${esc(companyName)},</p>
        <p>${t.lead}</p>
        <ul style="margin:0.75em 0;padding-left:1.2em;">
          <li><strong>${esc(t.nameL)}:</strong> ${esc(companyName)}</li>
          <li><strong>${esc(t.vatL)}:</strong> ${vat}</li>
          <li><strong>${esc(t.emailL)}:</strong> ${em}</li>
          <li><strong>${esc(t.cityL)}:</strong> ${city}</li>
        </ul>
        <h2 style="font-size:15px;margin:1.2em 0 0.4em;">${esc(t.booking)}</h2>
        <p><a href="${esc(bookingUrl)}">${esc(bookingUrl)}</a></p>
        <p style="margin-top:0.5em;color:#444;">${esc(t.qrHint)}</p>
        <p><strong>${esc(t.qrLinkLabel)}:</strong> <a href="${esc(qrSrc)}">${esc(qrSrc)}</a></p>
        <p style="margin-top:0.5em;"><img src="${esc(qrSrc)}" alt="QR" width="180" height="180" style="border:1px solid #e5e7eb;border-radius:8px;" /></p>
        <h2 style="font-size:15px;margin:1.2em 0 0.4em;">${esc(t.login)}</h2>
        <p><strong>${esc(t.user)}:</strong> ${em}</p>
        <p><strong>${esc(t.pass)}:</strong> <code style="font-size:14px;background:#f3f4f6;padding:2px 6px;border-radius:4px;">${esc(tempPassword)}</code></p>
        <p><a href="${esc(loginUrl)}">${esc(loginUrl)}</a></p>
        <p style="margin-top:1em;"><strong>${esc(t.mustChange)}</strong></p>
        <p style="margin-top:1.25em;color:#444;">${esc(t.signoff)}</p>
      </div>`
  return { subject: t.subject, html }
}

async function ensureAdminFromBearer(supabase, authHeader) {
  const token = String(authHeader || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, error: 'Missing bearer token.' }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) return { ok: false, error: 'Invalid auth token.' }

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (pErr || profile?.role !== 'platform_admin') {
    return { ok: false, error: 'Not authorized.' }
  }
  return { ok: true, adminUserId: userData.user.id }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const envErr = validateSupabaseServiceEnv()
  if (envErr) return json(res, 503, { error: envErr })

  try {
    const supabase = makeSupabaseServiceClient()
    const auth = await ensureAdminFromBearer(supabase, req.headers.authorization)
    if (!auth.ok) return json(res, 401, { error: auth.error })

    const body =
      typeof req.body === 'string' && req.body ? JSON.parse(req.body) : req.body || {}
    const companyId = String(body.companyId || '').trim()
    if (!companyId) return json(res, 400, { error: 'companyId is required.' })

    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .maybeSingle()
    if (companyErr) {
      console.error('[admin-approve:load-company]', companyErr)
      return json(res, 500, { error: `Could not load company: ${companyErr.message}` })
    }
    if (!company) return json(res, 404, { error: 'Company not found.' })
    if (company.status === 'approved' && company.owner_user_id) {
      return json(res, 409, { error: 'Company is already approved and has an owner.' })
    }

    const tempPassword = makeTempPassword()
    let userId

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: company.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: company.name },
    })

    if (createErr || !created?.user?.id) {
      if (createErr && isDuplicateAuthEmailError(createErr)) {
        const existingId = await findAuthUserIdByEmail(supabase, company.email)
        if (!existingId) {
          return json(res, 409, {
            error:
              'This email is already registered in Supabase Auth, but the existing user could not be found. Resolve the conflict in the Supabase dashboard (Auth → Users) or use a different company email.',
            code: 'AUTH_EMAIL_CONFLICT',
          })
        }
        const memberCheck = await assertEmailNotLinkedToOtherCompany(
          supabase,
          existingId,
          company.id
        )
        if (!memberCheck.ok) {
          return json(res, 409, { error: memberCheck.error, code: 'AUTH_EMAIL_IN_USE' })
        }
        const { error: updErr } = await supabase.auth.admin.updateUserById(existingId, {
          password: tempPassword,
          email_confirm: true,
        })
        if (updErr) {
          console.error('[admin-approve:updateUser]', updErr)
          return json(res, 500, {
            error: `Could not reset password for existing Auth user: ${updErr.message || String(updErr)}`,
            code: 'AUTH_UPDATE_FAILED',
          })
        }
        userId = existingId
      } else {
        console.error('[admin-approve:createUser]', createErr)
        return json(res, 500, {
          error:
            createErr?.message ||
            'Could not create Auth user. Check Supabase Auth settings and logs.',
          code: 'AUTH_CREATE_FAILED',
        })
      }
    } else {
      userId = created.user.id
    }

    const { error: profileErr } = await supabase.from('profiles').upsert(
      {
        id: userId,
        full_name: company.name,
        email: company.email,
        role: 'company_owner',
        first_login_required: true,
      },
      { onConflict: 'id' }
    )
    if (profileErr) {
      console.error('[admin-approve:profile]', profileErr)
      return json(res, 500, {
        error: `Could not save owner profile: ${profileErr.message}`,
        code: 'PROFILE_UPSERT_FAILED',
      })
    }

    const { error: memberErr } = await supabase.from('company_members').upsert(
      {
        company_id: company.id,
        user_id: userId,
        role: 'owner',
      },
      { onConflict: 'company_id,user_id' }
    )
    if (memberErr) {
      console.error('[admin-approve:member]', memberErr)
      return json(res, 500, {
        error: `Could not link owner membership: ${memberErr.message}`,
        code: 'MEMBER_UPSERT_FAILED',
      })
    }

    const { data: updatedCompany, error: updErr } = await supabase
      .from('companies')
      .update({
        status: 'approved',
        owner_user_id: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', company.id)
      .select('id, status, owner_user_id')
      .maybeSingle()

    if (updErr) {
      console.error('[admin-approve:update-company]', updErr)
      return json(res, 500, {
        error: `Could not approve company: ${updErr.message}`,
        code: 'COMPANY_UPDATE_FAILED',
      })
    }

    const ownerOk = String(updatedCompany?.owner_user_id || '') === String(userId)
    const statusOk = updatedCompany?.status === 'approved'
    if (!updatedCompany || !statusOk || !ownerOk) {
      console.error('[admin-approve:update-company:not-persisted]', {
        companyId: company.id,
        updatedCompany,
        expectedUserId: userId,
      })
      return json(res, 500, {
        error:
          'Company approval did not persist in the database (row unchanged or trigger reverted fields). Apply supabase/migration_fix_companies_guard_service_role_bypass.sql on your database.',
        code: 'COMPANY_UPDATE_NOT_APPLIED',
      })
    }

    console.log('[admin-approve:company-updated]', {
      id: updatedCompany.id,
      status: updatedCompany.status,
      owner_user_id: updatedCompany.owner_user_id,
    })

    const origin = getOriginFromReq(req)
    const loginUrl = `${origin}/login/company`
    const bookingUrl = `${origin}/book/${company.slug}`
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(bookingUrl)}`

    const esc = escapeHtmlEmail
    const vat = esc(company.vat_number || '—')
    const em = esc(company.email)
    const city = esc(company.city || '—')
    const uiLocale = normalizeCompanyLocale(company.preferred_locale)

    const { subject: approvalSubject, html: approvalHtml } = approvalEmailForLocale(uiLocale, {
      escape: esc,
      companyName: company.name,
      vat,
      em,
      city,
      bookingUrl,
      loginUrl,
      tempPassword,
      qrSrc,
    })

    const mail = await safeSendEmail({
      to: company.email,
      subject: approvalSubject,
      html: approvalHtml,
    })
    if (mail?.skipped || mail?.ok === false) {
      console.warn('[admin-approve:company-email] Approval credentials email was not sent:', mail)
      return json(res, 200, {
        data: {
          approved: true,
          companyId: company.id,
          userId,
          emailWarning:
            'Company approved but email failed to send. Verify RESEND_API_KEY, MAIL_FROM, and verified sender domain in Resend.',
        },
      })
    }

    return json(res, 200, { data: { approved: true, companyId: company.id, userId } })
  } catch (err) {
    console.error('[admin-approve-company]', err)
    const msg = err?.message || String(err)
    if (msg.includes('Server misconfiguration')) {
      return json(res, 503, { error: msg })
    }
    return json(res, 500, { error: msg || 'Internal server error.' })
  }
}
