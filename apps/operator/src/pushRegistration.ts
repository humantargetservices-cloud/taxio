import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { operatorDb } from './backend'

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
}

function projectId() {
  return Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || ''
}

export async function registerOperatorForPush(companyId: string): Promise<PushRegistrationResult> {
  if (!operatorDb) return { ok: false, code: 'NOT_CONFIGURED' }
  if (!Device.isDevice) return { ok: false, code: 'NOT_DEVICE' }
  const existing = await Notifications.getPermissionsAsync()
  const permission = existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync()
  if (permission.status !== 'granted') return { ok: false, code: 'PERMISSION_DENIED' }
  await Notifications.setNotificationChannelAsync('taxio-offers', {
    name: 'Trip offers',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  })
  const id = projectId()
  if (!id) return { ok: false, code: 'NO_PROJECT_ID' }
  const token = await Notifications.getExpoPushTokenAsync({ projectId: id })
  const value = token.data
  const user = await operatorDb.auth.getUser()
  if (!user.data.user) return { ok: false, code: 'NOT_CONFIGURED' }
  const { error } = await operatorDb.from('operator_push_tokens').upsert({
    user_id: user.data.user.id,
    company_id: companyId,
    expo_push_token: value,
    platform: 'android',
    revoked_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'expo_push_token' })
  if (error) return { ok: false, code: 'REGISTRATION_FAILED' }
  return { ok: true, code: 'REGISTERED' }
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
