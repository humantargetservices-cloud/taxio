import { supabase } from './supabase.js'
import { slugFromCompanyName } from './slug.js'

/** Default per-vehicle pricing (Set Pricing modal). */
export const DEFAULT_PRICING = {
  Standard: { start: '5.00', per_km: '2.00', initial_km: '3' },
  Van: { start: '8.00', per_km: '3.00', initial_km: '3' },
  Luxury: { start: '10.00', per_km: '4.00', initial_km: '3' },
}

const apiBase = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function apiUrl(path) {
  return `${apiBase}${path}`
}

/**
 * Submit pending company application (no auth user creation here).
 * Auth user is created only after admin approval via server API.
 */
export async function registerCompanyOwner(payload) {
  const {
    email,
    companyName,
    vatNumber,
    phone,
    city,
    country,
    termsAcceptedAt,
    termsVersion,
    locale,
    turnstileToken,
    companyWebsite,
    formStartedAt,
    submissionFingerprint,
    humanConfirmed,
    vehicleTypes,
  } = payload

  const slug = slugFromCompanyName(companyName)
  if (!slug || slug.length < 2) {
    return {
      error: new Error(
        'Company name must yield a valid subdomain (at least 2 letters or numbers).'
      ),
    }
  }

  try {
    // termsAcceptedAt / termsVersion: for future backend audit (terms_accepted, accepted_at, terms_version).
    const response = await fetch(apiUrl('/api/register-company'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        companyName,
        vatNumber,
        phone,
        city,
        country: country || null,
        termsAccepted: true,
        termsAcceptedAt: termsAcceptedAt || null,
        termsVersion: termsVersion || null,
        locale: locale || null,
        turnstileToken: turnstileToken || null,
        companyWebsite: companyWebsite || '',
        formStartedAt: Number(formStartedAt || 0),
        submissionFingerprint: submissionFingerprint || null,
        humanConfirmed: humanConfirmed === true,
        vehicleTypes: Array.isArray(vehicleTypes) ? vehicleTypes : [],
      }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      return {
        error: new Error(
          body.error || `Could not submit registration (${response.status || 'error'}).`
        ),
      }
    }
    return { data: body.data || { slug }, error: null }
  } catch (err) {
    return {
      error: new Error(
        err?.message ||
          'Registration could not be completed. Check your connection and try again.'
      ),
    }
  }
}

export async function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getMyProfile(userId) {
  if (!userId) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

/** After company onboarding wizard (or skip); persists across devices. */
export async function markCompanyOnboardingComplete(userId) {
  if (!userId) return { error: new Error('Missing user.') }
  const { error } = await supabase
    .from('profiles')
    .update({ company_onboarding_completed: true })
    .eq('id', userId)
  return { error }
}

/**
 * Resolve the company context for a logged-in user.
 * Prefer an approved company over pending/suspended; prefer owner over member-only; then newest.
 * (A single arbitrary membership row was incorrectly sending approved owners back to pending.)
 */
export async function getCompanyForUser(userId) {
  if (!userId) return null

  const { data: owned, error: e1 } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false })
  if (e1) throw e1

  const { data: memberships, error: e2 } = await supabase
    .from('company_members')
    .select('role, company:companies(*)')
    .eq('user_id', userId)
  if (e2) throw e2

  const candidates = []
  const seen = new Set()

  for (const c of owned || []) {
    if (!c?.id || seen.has(c.id)) continue
    seen.add(c.id)
    candidates.push({ c, via: 'owner' })
  }
  for (const m of memberships || []) {
    let c = m.company
    if (Array.isArray(c)) c = c[0]
    if (!c?.id || seen.has(c.id)) continue
    seen.add(c.id)
    candidates.push({ c, via: m.role || 'member' })
  }

  if (candidates.length === 0) return null

  const statusRank = (s) =>
    s === 'approved' ? 0 : s === 'suspended' ? 1 : s === 'pending' ? 2 : s === 'rejected' ? 3 : 4

  candidates.sort((a, b) => {
    const d = statusRank(a.c.status) - statusRank(b.c.status)
    if (d !== 0) return d
    if (a.via === 'owner' && b.via !== 'owner') return -1
    if (b.via === 'owner' && a.via !== 'owner') return 1
    const ta = new Date(a.c.created_at || 0).getTime()
    const tb = new Date(b.c.created_at || 0).getTime()
    return tb - ta
  })

  return candidates[0].c
}

export async function fetchApprovedCompanyBySlug(slug) {
  const normalized = slugFromCompanyName(slug)
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', normalized)
    .eq('status', 'approved')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createBookingRequest(row) {
  try {
    const response = await fetch(apiUrl('/api/public-booking'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { error: new Error(body.error || `Booking request failed (${response.status}).`) }
    }
    return { error: null, data: body.data || null }
  } catch (err) {
    return {
      error: new Error(err?.message || 'Booking request could not be submitted.'),
    }
  }
}

function riderTermsColumnsMissing(err) {
  const m = String(err?.message || '').toLowerCase()
  return (
    m.includes('rider_terms_accepted') ||
    m.includes('rider_terms_accepted_at') ||
    m.includes('rider_terms_version')
  )
}

function bookingLegalNotesFallback(row, baseNote) {
  if (!row.termsAcceptance || typeof row.termsAcceptance !== 'object') return baseNote || null
  const a = row.termsAcceptance
  const tag = `taxio_legal[terms_accepted=${a.terms_accepted === true};accepted_at=${a.accepted_at || ''};terms_version=${a.terms_version || ''}]`
  return baseNote ? `${baseNote} | ${tag}` : tag
}

/** Log a quick-book intent (e.g. after WhatsApp) with minimal fields. */
export async function createQuickBookingLog(row) {
  return createBookingRequest({
    ...row,
    notes: bookingLegalNotesFallback(row, row.notes || ''),
  })
}

export async function listBookingRequestsForCompany(companyId) {
  const { data, error } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function listPendingCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listAllCompaniesForAdmin() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function listBookingRequestsForAdmin() {
  const { data, error } = await supabase
    .from('booking_requests')
    .select('id, company_id, customer_phone, customer_email, ip_address, turnstile_passed, created_at')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  if (error) throw error
  return data || []
}

export async function listAbuseRateEventsForAdmin(hours = 24) {
  const sinceIso = new Date(Date.now() - Math.max(1, Number(hours) || 24) * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('abuse_rate_events')
    .select('id, action, ip_address, company_id, contact_key, metadata, created_at')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function approveCompany(companyId) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) return { error: new Error('You must be signed in as admin.') }

  const res = await fetch(apiUrl('/api/admin-approve-company'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ companyId }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { error: new Error(json.error || 'Approval failed.') }
  return { error: null, data: json.data || null }
}

export async function rejectCompany(companyId) {
  const { error } = await supabase
    .from('companies')
    .update({ status: 'rejected', approved_at: null })
    .eq('id', companyId)
  return { error }
}

export async function suspendCompany(companyId) {
  const { error } = await supabase
    .from('companies')
    .update({ status: 'suspended' })
    .eq('id', companyId)
  return { error }
}

export async function reactivateCompany(companyId) {
  const { error } = await supabase
    .from('companies')
    .update({ status: 'approved' })
    .eq('id', companyId)
  return { error }
}

export async function reopenCompanyToPending(companyId) {
  const { error } = await supabase
    .from('companies')
    .update({ status: 'pending', approved_at: null })
    .eq('id', companyId)
  return { error }
}

export async function setCompanySubscriptionPlan(companyId, plan) {
  if (plan !== 'basic' && plan !== 'premium') {
    return { error: new Error('Invalid plan.') }
  }
  const { error } = await supabase
    .from('companies')
    .update({ subscription_plan: plan })
    .eq('id', companyId)
  return { error }
}

const ADMIN_EDITABLE_COMPANY_FIELDS = [
  'name',
  'slug',
  'email',
  'phone',
  'city',
  'country',
  'vat_number',
  'slogan',
  'availability_status',
  'pricing',
  'logo_url',
  'hourly_enabled',
  'hourly_rate_eur',
  'hourly_min_hours',
]

/**
 * Platform admin updates company profile fields through the protected service-role API.
 * Only keys present on `patch` are written; `undefined` values are skipped server-side.
 */
export async function updateCompanyAsAdmin(companyId, patch) {
  const filteredPatch = {}
  for (const k of ADMIN_EDITABLE_COMPANY_FIELDS) {
    if (k in (patch || {})) filteredPatch[k] = patch[k]
  }
  if (Object.keys(filteredPatch).length === 0) return { error: null, data: { updated: false } }

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) return { error: new Error('You must be signed in as admin.') }

  const res = await fetch(apiUrl('/api/admin-update-company'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ companyId, patch: filteredPatch }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { error: new Error(body.error || `Company update failed (${res.status}).`) }
  return { error: null, data: body.data || null }
}

export async function deleteCompanyAsAdmin(companyId) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) return { error: new Error('You must be signed in as admin.') }

  const res = await fetch(apiUrl('/api/admin-delete-company'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ companyId }),
  })
  const raw = await res.text()
  let jsonBody = {}
  try {
    jsonBody = raw ? JSON.parse(raw) : {}
  } catch {
    const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 120)
    const hint =
      raw.trim().startsWith('<') || raw.includes('<!DOCTYPE')
        ? ' The server returned HTML instead of JSON (often a missing /api route in local dev or a bad API base URL).'
        : ''
    return {
      error: new Error(
        snippet
          ? `Delete failed (HTTP ${res.status}): ${snippet}${hint}`
          : `Delete failed (HTTP ${res.status}).${hint}`
      ),
    }
  }
  if (!res.ok) {
    return {
      error: new Error(
        jsonBody.error ||
          `Delete failed (HTTP ${res.status}).`
      ),
    }
  }
  return { error: null }
}

export async function adminSendCommunicationEmail(payload) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) return { data: null, error: new Error('You must be signed in as admin.') }

  const res = await fetch(apiUrl('/api/admin-send-communication-email'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload || {}),
  })

  const raw = await res.text()
  let jsonBody = {}
  try {
    jsonBody = raw ? JSON.parse(raw) : {}
  } catch {
    const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 120)
    return {
      data: null,
      error: new Error(
        snippet
          ? `Email send failed (HTTP ${res.status}): ${snippet}`
          : `Email send failed (HTTP ${res.status}).`
      ),
    }
  }
  if (!res.ok) {
    return {
      data: null,
      error: new Error(jsonBody.error || `Email send failed (HTTP ${res.status}).`),
    }
  }
  return { data: jsonBody, error: null }
}

/**
 * Dev-only bulk cleanup (requires server TAXIO_DEV_CLEANUP_ENABLED=true).
 */
export async function devCleanupTestCompanies(payload) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) return { data: null, error: new Error('You must be signed in as admin.') }

  const res = await fetch(apiUrl('/api/admin-dev-cleanup-test-companies'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  const raw = await res.text()
  let jsonBody = {}
  try {
    jsonBody = raw ? JSON.parse(raw) : {}
  } catch {
    const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 120)
    return {
      data: null,
      error: new Error(
        snippet
          ? `Dev cleanup failed (HTTP ${res.status}): ${snippet}`
          : `Dev cleanup failed (HTTP ${res.status}).`
      ),
    }
  }
  if (res.status === 404) {
    return {
      data: null,
      error: new Error('Dev cleanup is not enabled (server TAXIO_DEV_CLEANUP_ENABLED).'),
    }
  }
  if (!res.ok) {
    return {
      data: null,
      error: new Error(jsonBody.error || `Dev cleanup failed (HTTP ${res.status}).`),
    }
  }
  return { data: jsonBody, error: null }
}

const BOOKING_STATUSES = ['new', 'reviewed', 'accepted', 'rejected']

export async function updateBookingRequestStatus(companyId, bookingId, status) {
  if (!BOOKING_STATUSES.includes(status)) {
    return { error: new Error('Invalid booking status.') }
  }
  const { error } = await supabase
    .from('booking_requests')
    .update({ status })
    .eq('id', bookingId)
    .eq('company_id', companyId)
  return { error }
}

export async function updateCompanyByOwner(companyId, patch) {
  const allowed = [
    'name',
    'email',
    'city',
    'country',
    'slogan',
    'availability_status',
    'pricing',
    'logo_url',
    'hourly_enabled',
    'hourly_rate_eur',
    'hourly_min_hours',
  ]
  const data = {}
  for (const k of allowed) {
    if (!(k in patch)) continue
    if (k === 'logo_url') {
      const v = patch[k]
      data[k] = v == null || v === '' ? null : String(v).trim()
      continue
    }
    if (k === 'hourly_enabled') {
      data[k] = patch[k] === true
      continue
    }
    if (k === 'hourly_rate_eur') {
      const n = Number(patch[k])
      data[k] = Number.isFinite(n) && n > 0 ? n : 60
      continue
    }
    if (k === 'hourly_min_hours') {
      const n = parseInt(String(patch[k]), 10)
      data[k] = Number.isFinite(n) && n >= 1 ? n : 3
      continue
    }
    data[k] = patch[k]
  }
  if (Object.keys(data).length === 0) return { error: null }
  const { error } = await supabase.from('companies').update(data).eq('id', companyId)
  return { error }
}

const COMPANY_LOGOS_BUCKET = 'company-logos'
const MAX_LOGO_UPLOAD_BYTES = 2 * 1024 * 1024
const MAX_LOGO_EDGE_PX = 640

async function downscaleImageFileToJpegBlob(file, maxEdge) {
  const bmp = await createImageBitmap(file)
  try {
    let w = bmp.width
    let h = bmp.height
    const scale = Math.min(1, maxEdge / Math.max(w, h, 1))
    w = Math.max(1, Math.round(w * scale))
    h = Math.max(1, Math.round(h * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported.')
    ctx.drawImage(bmp, 0, 0, w, h)
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image.'))),
        'image/jpeg',
        0.88
      )
    })
  } finally {
    bmp.close?.()
  }
}

/**
 * Upload company logo to Supabase Storage (`company-logos/{companyId}/logo.jpg`)
 * and save public URL on `companies.logo_url`.
 */
export async function uploadCompanyLogo(companyId, file) {
  if (!companyId || !file) return { error: new Error('Missing file or company.') }
  const okTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!okTypes.includes(file.type)) {
    return { error: new Error('Please choose a JPEG, PNG, or WebP image.') }
  }
  if (file.size > MAX_LOGO_UPLOAD_BYTES) {
    return { error: new Error('Image must be 2 MB or smaller.') }
  }
  try {
    const blob = await downscaleImageFileToJpegBlob(file, MAX_LOGO_EDGE_PX)
    const path = `${companyId}/logo.jpg`
    const { error: upErr } = await supabase.storage
      .from(COMPANY_LOGOS_BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '86400' })
    if (upErr) return { error: new Error(upErr.message || 'Upload failed.') }
    const { data } = supabase.storage.from(COMPANY_LOGOS_BUCKET).getPublicUrl(path)
    const base = data?.publicUrl
    if (!base) return { error: new Error('Could not resolve image URL.') }
    const u = new URL(base)
    u.searchParams.set('v', String(Date.now()))
    const publicUrl = u.toString()
    const { error: dbErr } = await updateCompanyByOwner(companyId, { logo_url: publicUrl })
    if (dbErr) return { error: new Error(dbErr.message || 'Could not save logo URL.') }
    return { publicUrl, error: null }
  } catch (err) {
    return { error: new Error(err?.message || 'Could not process image.') }
  }
}

/** Remove stored logo file (best effort) and clear `companies.logo_url`. */
export async function removeCompanyLogo(companyId) {
  if (!companyId) return { error: new Error('Missing company.') }
  const path = `${companyId}/logo.jpg`
  await supabase.storage.from(COMPANY_LOGOS_BUCKET).remove([path])
  const { error } = await updateCompanyByOwner(companyId, { logo_url: null })
  return { error }
}

export async function listCarsForCompany(companyId) {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function insertCar(row) {
  const { error } = await supabase.from('cars').insert(row)
  return { error }
}

export async function updateCar(carId, companyId, patch) {
  const { error } = await supabase
    .from('cars')
    .update(patch)
    .eq('id', carId)
    .eq('company_id', companyId)
  return { error }
}

export async function deleteCar(carId, companyId) {
  const { error } = await supabase.from('cars').delete().eq('id', carId).eq('company_id', companyId)
  return { error }
}

export async function countCarsForCompany(companyId) {
  const { count, error } = await supabase
    .from('cars')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
  if (error) throw error
  return count || 0
}

export async function countAllCarsAdmin() {
  const { count, error } = await supabase.from('cars').select('*', { count: 'exact', head: true })
  if (error) throw error
  return count || 0
}

export async function countCarsByCompanyIdsAdmin() {
  const { data, error } = await supabase.from('cars').select('company_id')
  if (error) throw error
  const map = {}
  for (const r of data || []) {
    map[r.company_id] = (map[r.company_id] || 0) + 1
  }
  return map
}

/** Public directory: approved companies (RLS allows SELECT where status = approved). */
export async function listApprovedCompaniesDirectory() {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, slug, city, country, availability_status')
    .eq('status', 'approved')
    .order('name', { ascending: true })
  if (error) throw error
  return data || []
}

/** Fleet car types for public booking page (requires cars_select_public_approved_company policy). */
export async function fetchFleetCarTypesForBooking(companyId) {
  if (!companyId) return []
  const { data, error } = await supabase.from('cars').select('car_type').eq('company_id', companyId)
  if (error) {
    console.warn('[fetchFleetCarTypesForBooking]', error.message)
    return []
  }
  return data || []
}
