import { supabase } from './supabase.js'
import { apiUrl } from './api.js'

/** Client UX defaults — server deadlines are authoritative. */
export const ORIGINAL_COMPANY_DECISION_SECONDS = 25
export const RESCUE_OPPORTUNITY_SECONDS = 10

/** @type {import('@supabase/supabase-js').RealtimeChannel | null} */
let rescueChannel = null
/** @type {ReturnType<typeof setInterval> | null} */
let rescuePollTimer = null

export async function fetchRescueGloballyEnabled() {
  const { data, error } = await supabase
    .from('taxio_platform_flags')
    .select('rescue_globally_enabled,original_company_decision_seconds,rescue_opportunity_seconds')
    .eq('id', 1)
    .maybeSingle()
  if (error) {
    console.warn('[rescue] flags', error.message)
    return { enabled: false, decisionSeconds: ORIGINAL_COMPANY_DECISION_SECONDS, opportunitySeconds: RESCUE_OPPORTUNITY_SECONDS }
  }
  return {
    enabled: data?.rescue_globally_enabled === true,
    decisionSeconds: Number(data?.original_company_decision_seconds) || ORIGINAL_COMPANY_DECISION_SECONDS,
    opportunitySeconds: Number(data?.rescue_opportunity_seconds) || RESCUE_OPPORTUNITY_SECONDS,
  }
}

/** Rescues originated by this company (outbound). */
export async function listRescueRequestsForOriginCompany(companyId) {
  const cols =
    'id,booking_request_id,original_company_id,status,accepted_by_company_id,activated_at,accepted_at,closed_at,preview_pickup_label,preview_dropoff_label,preview_ride_datetime,preview_car_type,preview_service_type,preview_estimated_price,passenger_confirm_status'
  let { data, error } = await supabase
    .from('rescue_requests')
    .select(cols)
    .eq('original_company_id', companyId)
    .order('activated_at', { ascending: false })
  if (error && /passenger_confirm_status|preview_estimated_price/i.test(error.message || '')) {
    ;({ data, error } = await supabase
      .from('rescue_requests')
      .select(
        'id,booking_request_id,original_company_id,status,accepted_by_company_id,activated_at,accepted_at,closed_at,preview_pickup_label,preview_dropoff_label,preview_ride_datetime,preview_car_type,preview_service_type,preview_estimated_price'
      )
      .eq('original_company_id', companyId)
      .order('activated_at', { ascending: false }))
  }
  if (error) throw error
  return data || []
}

/** Open opportunities offered to this company (inbound). */
export async function listRescueOpportunitiesForCompany(companyId) {
  const embed = `
      id,
      status,
      created_at,
      responded_at,
      expires_at,
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
        passenger_confirm_status,
        booking_request_id
      )
    `
  let { data, error } = await supabase
    .from('rescue_opportunities')
    .select(embed)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error && /expires_at|passenger_confirm_status|preview_estimated_price/i.test(error.message || '')) {
    ;({ data, error } = await supabase
      .from('rescue_opportunities')
      .select(
        `id,status,created_at,responded_at,rescue_request_id,rescue:rescue_requests(id,status,original_company_id,accepted_by_company_id,activated_at,accepted_at,preview_pickup_label,preview_dropoff_label,preview_ride_datetime,preview_car_type,preview_service_type,preview_estimated_price,booking_request_id)`
      )
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

export async function tickRescueTimeouts(accessToken) {
  const res = await fetch(apiUrl('/api/rescue'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: 'tick' }),
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok && body?.ok !== false, status: res.status, body }
}

export async function activateRescueRequest({ bookingRequestId, companyId, accessToken }) {
  const res = await fetch(apiUrl('/api/rescue'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: 'decline', bookingRequestId, companyId }),
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok && body?.ok === true, status: res.status, body }
}

export async function acceptRescueRequest({ rescueRequestId, companyId, accessToken }) {
  const res = await fetch(apiUrl('/api/rescue'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: 'accept', rescueRequestId, companyId }),
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

export async function passengerRescuePreview(token) {
  const res = await fetch(apiUrl('/api/rescue'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'passenger_preview', token }),
  })
  return res.json().catch(() => ({ ok: false, code: 'EMPTY' }))
}

export async function passengerRescueConfirm(token) {
  const res = await fetch(apiUrl('/api/rescue'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'passenger_confirm', token }),
  })
  return res.json().catch(() => ({ ok: false, code: 'EMPTY' }))
}

export async function passengerRescueCancel(token) {
  const res = await fetch(apiUrl('/api/rescue'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'passenger_cancel', token }),
  })
  return res.json().catch(() => ({ ok: false, code: 'EMPTY' }))
}

export function mapRescuesByBookingId(rescues) {
  const map = {}
  for (const r of rescues || []) {
    if (r?.booking_request_id) map[r.booking_request_id] = r
  }
  return map
}

export function countOpenOpportunities(opportunities) {
  const now = Date.now()
  return (opportunities || []).filter((o) => {
    if (o.status !== 'OFFERED' || o.rescue?.status !== 'OPEN') return false
    if (o.expires_at && new Date(o.expires_at).getTime() <= now) return false
    return true
  }).length
}

export function secondsRemaining(deadlineIso) {
  if (!deadlineIso) return 0
  return Math.max(0, Math.ceil((new Date(deadlineIso).getTime() - Date.now()) / 1000))
}

/**
 * Best-effort live updates: realtime channel + light poll + timeout tick.
 */
export function startRescueLiveUpdates(companyId, onChange, opts = {}) {
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
    }, 250)
  }

  try {
    rescueChannel = supabase
      .channel(`rescue-live-${companyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_requests' },
        fire
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_opportunities' },
        fire
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booking_requests' },
        fire
      )
      .subscribe()
  } catch (e) {
    console.warn('[rescue] realtime', e)
  }

  const accessToken = opts.accessToken
  rescuePollTimer = setInterval(() => {
    if (accessToken) {
      tickRescueTimeouts(accessToken).finally(fire)
    } else {
      fire()
    }
  }, 3000)
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
