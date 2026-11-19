import { NativeModules, Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { expoProjectId, TAXIO_API_ORIGIN } from './config'

const DEVICE_ID_KEY = 'taxio-alert-installation-id'
const PUSH_TOKEN_KEY = 'taxio-alert-expo-push-token'

async function installationId() {
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY)
  if (!id) {
    id = `taxio-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id)
  }
  return id
}

export async function requestAlertPermissionAndToken() {
  if (!Device.isDevice) throw new Error('Push notifications require a physical phone.')

  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync()
    status = requested.status
  }
  if (status !== 'granted') throw new Error('Notification permission was not granted.')

  const projectId = expoProjectId()
  if (!projectId) throw new Error('TAXIO Alert push project is not configured.')

  const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, expoPushToken)
  return expoPushToken
}

function pagerModule() {
  const mod = NativeModules?.TaxioPager
  if (Platform.OS === 'android' && !mod) {
    throw new Error('Native TAXIO watcher module is not available in this build.')
  }
  return mod
}

export async function registerNativeDevice(accessToken) {
  const expoPushToken = await requestAlertPermissionAndToken()
  const deviceId = await installationId()
  const response = await fetch(`${TAXIO_API_ORIGIN}/api/native-alert-device`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'register',
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      device_id: deviceId,
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload?.error || payload?.code || 'Could not register native alerts.')
  }
  if (Platform.OS === 'android') {
    if (!payload?.watch_token) throw new Error('Android watch token was not returned.')
    pagerModule()?.startWatch(payload.watch_token)
  }
  return { ...payload, expoPushToken }
}

export async function sendNativeTestAlert(accessToken) {
  const response = await fetch(`${TAXIO_API_ORIGIN}/api/native-alert-test`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload?.error || payload?.code || 'Could not arm native test alert.')
  }
  return payload
}

export async function unregisterNativeDevice(accessToken) {
  if (Platform.OS === 'android') {
    try { pagerModule()?.stopWatch() } catch {}
  }
  const expoPushToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY)
  if (!expoPushToken || !accessToken) return
  await fetch(`${TAXIO_API_ORIGIN}/api/native-alert-device`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'unregister',
      expo_push_token: expoPushToken,
    }),
  }).catch(() => {})
}
