import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { operatorDb } from './backend'

/**
 * Push enrollment is intentionally disabled until an authenticated registration
 * endpoint verifies operator ownership and supports token revocation.
 * A native push token alone must never authorize a booking action.
 */
export const PUSH_REGISTRATION_ENABLED = false

export type PushReadiness = {
  supported: boolean
  permission: 'granted' | 'denied' | 'undetermined'
  reason?: string
}

export async function inspectPushReadiness(): Promise<PushReadiness> {
  if (!Device.isDevice) return { supported: false, permission: 'undetermined', reason: 'Physical device required' }
  if (!operatorDb) return { supported: false, permission: 'undetermined', reason: 'Company session unavailable' }
  const { status } = await Notifications.getPermissionsAsync()
  return { supported: true, permission: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined' }
}

/** No token collection or upload before server-side registration is approved. */
export async function registerOperatorForPush(): Promise<{ok:false;code:'NOT_ENABLED'}> {
  return {ok:false,code:'NOT_ENABLED'}
}
