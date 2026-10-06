import { supabase } from './supabase.js'
import { apiUrl } from './api.js'

/** @type {import('@supabase/supabase-js').RealtimeChannel | null} */
let rescueChannel = null
/** @type {ReturnType<typeof setInterval> | null} */
let rescuePollTimer = null

export async function fetchRescueGloballyEnabled() {
  const { data, error } = await supabase
    .from('taxio_platform_flags')
    .select('rescue_globally_enabled')
    .eq('id', 1)
    .maybeSingle()
  if (error) {
    console.warn('[rescue] flags', error.message)
    return false
  }
  return data?.rescue_globally_enabled === true
}

/** Rescues originated by this company (outbound). */
export async function listRescueRequestsForOriginCompany(companyId) {
  const cols =
    'id,booking_request_id,original_company_id,status,accepted_by_company_id,activated_at,accepted_at,closed_at,preview_pickup_label,preview_dropoff_label,preview_ride_datetime,preview_car_type,preview_service_type,preview_estimated_price'
  let { data, error } = await supabase
    .from('rescue_requests')
    .select(cols)
    .eq('original_company_id', companyId)
    .order('activated_at', { ascending: false })
  if (error && /preview_estimated_price/i.test(error.message || '')) {
    ;({ data, error } = await supabase
      .from('rescue_requests')
      .select(
        'id,booking_request_id,original_company_id,status,accepted_by_company_id,activated_at,accepted_at,closed_at,preview_pickup_label,preview_dropoff_label,preview_ride_datetime,preview_car_type,preview_service_type'
      )
      .eq('original_company_id', companyId)
      .order('activated_at', { ascending: false }))
  }
  if (error) throw error
  return data || []
}

/** Open opportunities offered to this company (inbound). */
export async function listRescueOpportunitiesForCompany(companyId) {
  const embedWithPrice = `
      id,
      status,
      created_at,
      responded_at,
      rescue_request_id,
      rescue:rescue_requests (
        id,
        status,
        original_company_id,
        accepted_by_company_id,
        activated_at,
        accepted_at,
        preview_pickup_label,
        preview_dropoff_label,
        preview_ride_datetime,
        preview_car_type,
        preview_service_type,
        preview_estimated_price,
        booking_request_id
      )
    `
  const embedNoPrice = `
      id,
      status,
      created_at,
      responded_at,
      rescue_request_id,
      rescue:rescue_requests (
        id,
        status,
        original_company_id,
        accepted_by_company_id,
        activated_at,
        accepted_at,
        preview_pickup_label,
        preview_dropoff_label,
        preview_ride_datetime,
        preview_car_type,
        preview_service_type,
        booking_request_id
      )
    `
  let { data, error } = await supabase
    .from('rescue_opportunities')
    .select(embedWithPrice)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error && /preview_estimated_price/i.test(error.message || '')) {
    ;({ data, error } = await supabase
      .from('rescue_opportunities')
      .select(embedNoPrice)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }))
  }
  if (error) throw error
  return data || []
}

export async function fetchCompanyNamesByIds(ids) {
  const uniq = [...new Set((ids || []).filter(Boolean))]
  if (!uniq.length) return {}
  const { data, error } = await supabase.from('companies').select('id,name').in('id', uniq)
  if (error) {
    console.warn('[rescue] company names', error.message)
    return {}
  }
  const map = {}
  for (const row of data || []) map[row.id] = row.name
  return map
}

export async function activateRescueRequest({ bookingRequestId, companyId, accessToken }) {
  const res = await fetch(apiUrl('/api/rescue-activate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ bookingRequestId, companyId }),
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok && body?.ok === true, status: res.status, body }
}

export async function acceptRescueRequest({ rescueRequestId, companyId, accessToken }) {
  const res = await fetch(apiUrl('/api/rescue-accept'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ rescueRequestId, companyId }),
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok && body?.ok === true, status: res.status, body }
}

export async function getRescueBookingDetails(rescueRequestId) {
  const { data, error } = await supabase.rpc('get_rescue_booking_details', {
    p_rescue_request_id: rescueRequestId,
  })
  if (error) return { ok: false, code: 'RPC_ERROR', error: error.message }
  return data && typeof data === 'object' ? data : { ok: false, code: 'EMPTY' }
}

export function mapRescuesByBookingId(rescues) {
  const map = {}
  for (const r of rescues || []) {
    if (r?.booking_request_id) map[r.booking_request_id] = r
  }
  return map
}

export function countOpenOpportunities(opportunities) {
  return (opportunities || []).filter((o) => o.status === 'OFFERED' && o.rescue?.status === 'OPEN')
    .length
}

/**
 * Best-effort live updates: realtime channel + light poll.
 * Calls onChange when something may have changed (debounced by caller remount).
 */
export function startRescueLiveUpdates(companyId, onChange) {
  stopRescueLiveUpdates()
  let scheduled = null
  const fire = () => {
    if (scheduled) return
    scheduled = setTimeout(() => {
      scheduled = null
      try {
        onChange()
      } catch (e) {
        console.warn('[rescue] live update handler', e)
      }
    }, 400)
  }

  try {
    rescueChannel = supabase
      .channel(`taxio-rescue-${companyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_requests' },
        fire
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rescue_opportunities',
          filter: `company_id=eq.${companyId}`,
        },
        fire
      )
      .subscribe()
  } catch (e) {
    console.warn('[rescue] realtime unavailable', e)
  }

  rescuePollTimer = setInterval(fire, 15000)
}

export function stopRescueLiveUpdates() {
  if (rescuePollTimer) {
    clearInterval(rescuePollTimer)
    rescuePollTimer = null
  }
  if (rescueChannel) {
    try {
      supabase.removeChannel(rescueChannel)
    } catch {
      /* ignore */
    }
    rescueChannel = null
  }
}
