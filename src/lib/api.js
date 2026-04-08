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
  const { email, companyName, vatNumber, phone, city, country } = payload

  const slug = slugFromCompanyName(companyName)
  if (!slug || slug.length < 2) {
    return {
      error: new Error(
        'Company name must yield a valid subdomain (at least 2 letters or numbers).'
      ),
    }
  }

  try {
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
  const { error } = await supabase.from('booking_requests').insert(row)
  return { error }
}

/** Log a quick-book intent (e.g. after WhatsApp) with minimal fields. */
export async function createQuickBookingLog(row) {
  const payload = {
    company_id: row.company_id,
    pickup_address: row.pickup_address,
    dropoff_address: row.dropoff_address,
    car_type: row.car_type || null,
    customer_name: row.customer_name ?? 'WhatsApp request',
    customer_phone: row.customer_phone ?? '',
    customer_email: null,
    ride_datetime: row.ride_datetime ?? new Date().toISOString(),
    notes: row.notes || null,
    status: 'new',
  }
  const { error } = await supabase.from('booking_requests').insert(payload)
  return { error }
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
  return { error: null }
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
  ]
  const data = {}
  for (const k of allowed) {
    if (k in patch) data[k] = patch[k]
  }
  if (Object.keys(data).length === 0) return { error: null }
  const { error } = await supabase.from('companies').update(data).eq('id', companyId)
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
    .select('id, name, slug, city, country')
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
