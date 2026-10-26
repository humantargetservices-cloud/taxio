import { operatorDb } from './backend'

/** Never ship mobile service-role secrets. All trip decisions are authorized by TAXIO's server. */
export type OperatorAction =
  | { action: 'accept_booking'; companyId: string; bookingRequestId: string }
  | { action: 'decline'; companyId: string; bookingRequestId: string }
  | { action: 'accept'; companyId: string; rescueRequestId: string }
  | { action: 'mark_on_way' | 'mark_arrived' | 'complete_trip'; companyId: string; bookingRequestId?: string; rescueRequestId?: string }

export type OperatorActionResult = { ok: boolean; code?: string; error?: string }

/** This remains off until the operator approves production integration and access tests pass. */
const ACTIONS_ENABLED = false

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
  const response = await fetch(apiBaseUrl.replace(/\/$/, '') + '/api/rescue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session.access_token },
    body: JSON.stringify(payload),
  })
  const result = await response.json().catch(() => ({}))
  return { ok: response.ok && result.ok === true, code: result.code, error: result.error }
}
