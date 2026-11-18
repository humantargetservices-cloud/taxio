import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import * as TaskManager from 'expo-task-manager'
import { ensureAlertChannel } from './alertEngine'
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

  // Android 13+ does not present notification permission until a channel exists.
  await ensureAlertChannel()

  // Do not claim native alerts are connected until the headless notification
  // task is actually registered. This task is what wakes Android when the app
  // is minimized/locked/terminated.
  await Notifications.registerTaskAsync('TAXIO_NATIVE_ALERT_TASK')
  const taskRegistered = await TaskManager.isTaskRegisteredAsync('TAXIO_NATIVE_ALERT_TASK')
  if (!taskRegistered) {
    throw new Error('Android background notification task is not registered.')
  }

  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync()
    status = requested.status
  }
  if (status !== 'granted') throw new Error('Notification permission was not granted.')

  const projectId = expoProjectId()
  if (!projectId) {
    throw new Error('EAS project ID is not configured yet. Run eas init for alert-companion.')
  }

  const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, expoPushToken)
  return expoPushToken
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
  return { ...payload, expoPushToken }
}

export async function unregisterNativeDevice(accessToken) {
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
