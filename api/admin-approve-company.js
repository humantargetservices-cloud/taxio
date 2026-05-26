import {
  escapeHtmlEmail,
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
  const { companyName, email, bookingUrl, loginUrl, tempPassword, qrSrc } = ctx

  const copy = {
    en: {
      subject: 'TAXIO — Your company is approved',
      greet: 'Hello',
      lead: 'Your TAXIO company account is approved.',
      qrHint: 'Customers can scan this QR code to open your booking page.',
      bookingLabel: 'Public booking page',
      loginLabel: 'Dashboard login',
      userLabel: 'Username',
      passLabel: 'Temporary one-time password',
      instruction: 'Log in, change your password, then configure your company profile.',
      signoff: '— TAXIO',
    },
    fr: {
      subject: 'TAXIO — Entreprise approuvée',
      greet: 'Bonjour',
      lead: 'Votre compte entreprise TAXIO est approuvé.',
      qrHint: 'Vos clients peuvent scanner ce QR code pour ouvrir votre page de réservation.',
      bookingLabel: 'Page de réservation publique',
      loginLabel: 'Connexion tableau de bord',
      userLabel: "Nom d'utilisateur",
      passLabel: 'Mot de passe temporaire à usage unique',
      instruction:
        'Connectez-vous, changez votre mot de passe, puis configurez votre profil entreprise.',
      signoff: '— TAXIO',
    },
    nl: {
      subject: 'TAXIO — Uw bedrijf is goedgekeurd',
      greet: 'Beste',
      lead: 'Uw TAXIO bedrijfsaccount is goedgekeurd.',
      qrHint: 'Klanten kunnen deze QR-code scannen om uw boekingspagina te openen.',
      bookingLabel: 'Openbare boekingspagina',
      loginLabel: 'Dashboardlogin',
      userLabel: 'Gebruikersnaam',
      passLabel: 'Tijdelijk eenmalig wachtwoord',
      instruction: 'Log in, wijzig uw wachtwoord en configureer daarna uw bedrijfsprofiel.',
      signoff: '— TAXIO',
    },
  }
  const t = copy[loc]
  const html = `
      <div style="font-family:system-ui,Segoe UI,sans-serif;line-height:1.5;color:#111;font-size:15px;">
        <p>${esc(t.greet)} ${esc(companyName)},</p>
        <p><strong>${esc(t.lead)}</strong></p>
        <p style="margin-top:0.5em;color:#444;">${esc(t.qrHint)}</p>
        <p style="margin-top:0.5em;"><img src="${esc(qrSrc)}" alt="TAXIO booking QR code" width="180" height="180" style="border:1px solid #e5e7eb;border-radius:10px;" /></p>
        <p><strong>${esc(t.bookingLabel)}:</strong> <a href="${esc(bookingUrl)}">${esc(bookingUrl)}</a></p>
        <p><strong>${esc(t.loginLabel)}:</strong> <a href="${esc(loginUrl)}">${esc(loginUrl)}</a></p>
        <p><strong>${esc(t.userLabel)}:</strong> ${esc(email)}</p>
        <p><strong>${esc(t.passLabel)}:</strong> <code style="font-size:14px;background:#f3f4f6;padding:2px 6px;border-radius:4px;">${esc(tempPassword)}</code></p>
        <p style="margin-top:1em;"><strong>${esc(t.instruction)}</strong></p>
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
        company_onboarding_completed: false,
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

    const loginUrl = 'https://www.taxio.be/login/company'
    const bookingUrl = `https://${company.slug}.taxio.be`
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(bookingUrl)}`

    const esc = escapeHtmlEmail
    const uiLocale = normalizeCompanyLocale(company.preferred_locale)

    const { subject: approvalSubject, html: approvalHtml } = approvalEmailForLocale(uiLocale, {
      escape: esc,
      companyName: company.name,
      email: company.email,
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
