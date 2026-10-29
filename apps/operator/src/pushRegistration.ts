import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { operatorDb } from './backend'
import { apiBaseUrl, liveActionsEnabled } from './utils/environment'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export type PushRegistrationResult = {
  ok: boolean
  code: 'REGISTERED' | 'NOT_DEVICE' | 'PERMISSION_DENIED' | 'NO_PROJECT_ID' | 'NOT_CONFIGURED' | 'REGISTRATION_FAILED'
  permission: 'granted' | 'denied' | 'undetermined' | 'unknown'
}

const OFFER_CHANNEL = 'taxio-offers-v2'

function projectId() {
  return Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || ''
}

export async function registerOperatorForPush(companyId: string): Promise<PushRegistrationResult> {
  if (!operatorDb) return { ok: false, code: 'NOT_CONFIGURED', permission: 'unknown' }
  if (!Device.isDevice) return { ok: false, code: 'NOT_DEVICE', permission: 'unknown' }
  const existing = await Notifications.getPermissionsAsync()
  const permission = existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync()
  const permissionState = permission.status === 'granted' || permission.status === 'denied' ? permission.status : 'undetermined'
  await Notifications.setNotificationChannelAsync(OFFER_CHANNEL, {
    name: 'Trip offers',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'taxio_offer.wav',
    vibrationPattern: [0, 400, 200, 400],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  })
  if (permissionState !== 'granted') return { ok: false, code: 'PERMISSION_DENIED', permission: permissionState }
  const id = projectId()
  if (!id) return { ok: false, code: 'NO_PROJECT_ID', permission: permissionState }
  const token = await Notifications.getExpoPushTokenAsync({ projectId: id })
  const value = token.data
  const user = await operatorDb.auth.getUser()
  if (!user.data.user) return { ok: false, code: 'NOT_CONFIGURED', permission: permissionState }
  const { error } = await operatorDb.from('operator_push_tokens').upsert({
    user_id: user.data.user.id,
    company_id: companyId,
    expo_push_token: value,
    platform: 'android',
    revoked_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'expo_push_token' })
  if (error) return { ok: false, code: 'REGISTRATION_FAILED', permission: permissionState }
  return { ok: true, code: 'REGISTERED', permission: permissionState }
}

export async function sendStagingTestPush(): Promise<{ ok: boolean; code: string }> {
  if (!liveActionsEnabled()) return { ok: false, code: 'NOT_ENABLED' }
  const base = apiBaseUrl()
  if (!operatorDb || !base.startsWith('https://')) return { ok: false, code: 'NOT_CONFIGURED' }
  const session = await operatorDb.auth.getSession()
  const token = session.data.session?.access_token
  if (!token) return { ok: false, code: 'SESSION_EXPIRED' }
  try {
    const response = await fetch(base + '/api/operator-push-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: '{}',
    })
    const result = await response.json().catch(() => ({}))
    return { ok: response.ok && result.ok === true, code: String(result.code || (response.ok ? 'SENT' : 'FAILED')) }
  } catch {
    return { ok: false, code: 'NETWORK_ERROR' }
  }
}

export async function revokeOperatorPush() {
  if (!operatorDb) return
  const user = await operatorDb.auth.getUser()
  if (!user.data.user) return
  await operatorDb.from('operator_push_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', user.data.user.id)
    .is('revoked_at', null)
}
