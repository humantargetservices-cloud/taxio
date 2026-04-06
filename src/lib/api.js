import { supabase } from './supabase.js'
import { slugFromCompanyName } from './slug.js'

/** Default per-vehicle pricing (Set Pricing modal). */
export const DEFAULT_PRICING = {
  Standard: { start: '5.00', per_km: '2.00', initial_km: '3' },
  Van: { start: '8.00', per_km: '3.00', initial_km: '3' },
  Luxury: { start: '10.00', per_km: '4.00', initial_km: '3' },
}

const DEFAULT_SLOGAN = 'Your Ride, Your Way, Anytime!'

/**
 * Sign up + insert profile, pending company, owner membership.
 * Slug is derived from company name. Extended profile fields for dashboard/booking UI.
 */
export async function registerCompanyOwner(payload) {
  const {
    email,
    password,
    passwordConfirm,
    companyName,
    vatNumber,
    phone,
    city,
    country,
  } = payload

  if (password !== passwordConfirm) {
    return { error: new Error('Passwords do not match.') }
  }

  const slug = slugFromCompanyName(companyName)
  if (!slug || slug.length < 2) {
    return {
      error: new Error(
        'Company name must yield a valid subdomain (at least 2 letters or numbers).'
      ),
    }
  }

  const { data: authData, error: signErr } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: companyName } },
  })
  if (signErr) return { error: signErr }

  const user = authData.user
  const session = authData.session
  if (!user) {
    return {
      error: new Error(
        'Account created. If email confirmation is enabled, confirm your email and sign in to finish setup.'
      ),
    }
  }

  if (!session) {
    return {
      error: new Error(
        'No active session after signup. Disable email confirmation in Supabase Auth for this MVP, or complete email verification and run registration again.'
      ),
    }
  }

  const fullName = String(companyName || '').trim() || email.split('@')[0]

  const { error: pErr } = await supabase.from('profiles').insert({
    id: user.id,
    full_name: fullName,
    email,
    role: 'company_owner',
  })
  if (pErr) return { error: pErr }

  const companyRow = {
    name: companyName,
    slug,
    vat_number: vatNumber || null,
    email,
    phone: phone || null,
    city: city || null,
    country: country || null,
    status: 'pending',
    owner_user_id: user.id,
    slogan: DEFAULT_SLOGAN,
    availability_status: 'available',
    subscription_plan: 'basic',
    pricing: DEFAULT_PRICING,
  }

  const { data: company, error: cErr } = await supabase
    .from('companies')
    .insert(companyRow)
    .select('id, slug, status, name')
    .single()

  if (cErr) {
    if (cErr.code === '23505') {
      return {
        error: new Error(
          'That company name produces a subdomain already taken. Slightly change the company name and try again.'
        ),
      }
    }
    return { error: cErr }
  }

  const { error: mErr } = await supabase.from('company_members').insert({
    company_id: company.id,
    user_id: user.id,
    role: 'owner',
  })
  if (mErr) return { error: mErr }

  return { data: { company, user, slug }, error: null }
}

export async function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getCompanyForUser(userId) {
  const { data: byOwner, error: e1 } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (e1) throw e1
  if (byOwner) return byOwner

  const { data: memberRow, error: e2 } = await supabase
    .from('company_members')
    .select('company:companies(*)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  if (e2) throw e2
  return memberRow?.company || null
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
  const { error } = await supabase
    .from('companies')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', companyId)
  return { error }
}

export async function rejectCompany(companyId) {
  const { error } = await supabase
    .from('companies')
    .update({ status: 'rejected', approved_at: null })
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
    'phone',
    'city',
    'country',
    'vat_number',
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
