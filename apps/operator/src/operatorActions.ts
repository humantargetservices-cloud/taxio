import { operatorDb } from './backend'

/** Never ship mobile service-role secrets. All trip decisions are authorized by TAXIO's server. */
export type OperatorAction =
  | { action: 'accept_booking'; companyId: string; bookingRequestId: string }
  | { action: 'decline'; companyId: string; bookingRequestId: string }
  | { action: 'accept'; companyId: string; rescueRequestId: string }
  | { action: 'mark_on_way' | 'mark_arrived' | 'complete_trip'; companyId: string; bookingRequestId?: string; rescueRequestId?: string }

export type OperatorActionResult = { ok: boolean; code?: string; error?: string }

/** This remains off until the operator approves production integration and access tests pass. */
const ACTIONS_ENABLED = process.env.EXPO_PUBLIC_ENABLE_LIVE_ACTIONS === 'true'

export function mobileActionsEnabled(): boolean { return ACTIONS_ENABLED }

export async function sendOperatorAction(
  apiBaseUrl: string,
  companyId: string,
  payload: OperatorAction
): Promise<OperatorActionResult> {
  if (!ACTIONS_ENABLED) return { ok: false, code: 'NOT_ENABLED', error: 'Live driver actions require explicit approval.' }
  if (!operatorDb || !apiBaseUrl.startsWith('https://') || !companyId || payload.companyId !== companyId)
    return { ok: false, code: 'INVALID_CONTEXT' }
  const { data, error: sessionErr } = await operatorDb.auth.getSession()
  if (sessionErr || !data.session?.access_token) return { ok: false, code: 'SESSION_EXPIRED' }
  let session = data.session
  if (session.expires_at && session.expires_at * 1000 < Date.now() + 60000) {
    const refreshed = await operatorDb.auth.refreshSession()
    if (refreshed.error || !refreshed.data.session) return { ok: false, code: 'SESSION_EXPIRED' }
    session = refreshed.data.session
  }
  const post = (token:string) => fetch(apiBaseUrl.replace(/\/$/, '') + '/api/rescue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(payload),
  })
  try {
    let response = await post(session.access_token)
    if (response.status === 401) {
      const refreshed = await operatorDb.auth.refreshSession()
      if (refreshed.error || !refreshed.data.session) return { ok: false, code: 'SESSION_EXPIRED' }
      response = await post(refreshed.data.session.access_token)
    }
    const result = await response.json().catch(() => ({}))
    return { ok: response.ok && result.ok === true, code: result.code, error: result.error || (!response.ok ? 'Request failed' : undefined) }
  } catch {
    return { ok: false, code: 'NETWORK_ERROR', error: 'Unable to reach TAXIO. Check connection and refresh trip status before retrying.' }
  }
}
