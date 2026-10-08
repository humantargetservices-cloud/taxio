import { supabase } from './supabase.js'
import { apiUrl } from './api.js'

/** Client UX defaults — server deadlines (pg_cron) are authoritative. */
export const ORIGINAL_COMPANY_DECISION_SECONDS = 25
export const RESCUE_OPPORTUNITY_SECONDS = 10

/** @type {import('@supabase/supabase-js').RealtimeChannel | null} */
let rescueChannel = null
/** @type {ReturnType<typeof setInterval> | null} */
let rescueRefreshTimer = null

export async function fetchRescueGloballyEnabled() {
  try {
    const { data, error } = await supabase
      .from('taxio_platform_flags')
      .select('rescue_globally_enabled,original_company_decision_seconds,rescue_opportunity_seconds')
      .eq('id', 1)
      .maybeSingle()
    if (error) {
      console.warn('[rescue] flags', error.message)
      return {
        enabled: false,
        decisionSeconds: ORIGINAL_COMPANY_DECISION_SECONDS,
        opportunitySeconds: RESCUE_OPPORTUNITY_SECONDS,
      }
    }
    return {
      enabled: data?.rescue_globally_enabled === true,
      decisionSeconds: Number(data?.original_company_decision_seconds) || ORIGINAL_COMPANY_DECISION_SECONDS,
      opportunitySeconds: Number(data?.rescue_opportunity_seconds) || RESCUE_OPPORTUNITY_SECONDS,
    }
  } catch (e) {
    console.warn('[rescue] flags failed soft', e?.message || e)
    return {
      enabled: false,
      decisionSeconds: ORIGINAL_COMPANY_DECISION_SECONDS,
      opportunitySeconds: RESCUE_OPPORTUNITY_SECONDS,
    }
  }
}

/** Open opportunities offered to this company (inbound). Soft-fails to []. */
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
  try {
    const { data, error } = await supabase
      .from('rescue_opportunities')
      .select(embed)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (error) {
      console.warn('[rescue] opportunities', error.message)
      return []
    }
    return data || []
  } catch (e) {
    console.warn('[rescue] opportunities failed soft', e?.message || e)
    return []
  }
}

/** Decline / activate Rescue for Company A (ONE activation path). */
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

/** Atomic Rescue accept for Company B/C/D/E. */
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

export function secondsRemaining(deadlineIso) {
  if (!deadlineIso) return 0
  return Math.max(0, Math.ceil((new Date(deadlineIso).getTime() - Date.now()) / 1000))
}

/**
 * UI-only live subscription for Rescue notifications.
 * Does NOT call process_timeouts / tick — pg_cron owns deadlines.
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
    }, 250)
  }

  try {
    rescueChannel = supabase
      .channel(`rescue-notify-${companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rescue_requests' }, fire)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rescue_opportunities' }, fire)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_requests' }, fire)
      .subscribe()
  } catch (e) {
    console.warn('[rescue] realtime', e)
  }

  // Lightweight UI refresh only — no timeout activation
  rescueRefreshTimer = setInterval(fire, 8000)
}

export function stopRescueLiveUpdates() {
  if (rescueRefreshTimer) {
    clearInterval(rescueRefreshTimer)
    rescueRefreshTimer = null
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
