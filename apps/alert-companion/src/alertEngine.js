import { Linking, Platform } from 'react-native'
import notifee, {
  AndroidForegroundServiceType,
  AndroidImportance,
  AndroidVisibility,
} from '@notifee/react-native'
import * as Notifications from 'expo-notifications'

export const ALERT_NOTIFICATION_ID = 'taxio-active-trip-alert'
export const ALERT_CHANNEL_ID = 'taxio-trip-alert-v2'

function parseJsonObject(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function extractTaxioAlertData(input) {
  // Expo SDK 58 serializes Expo Push Service payloads received by the
  // background notification task as { data: { dataString: "<json>" } }.
  // Foreground listeners generally expose the already-parsed content.data.
  const candidates = [
    parseJsonObject(input?.data?.dataString),
    input?.data,
    parseJsonObject(input?.dataString),
    parseJsonObject(input?.notification?.request?.content?.data?.dataString),
    input?.notification?.request?.content?.data,
    parseJsonObject(input?.request?.content?.data?.dataString),
    input?.request?.content?.data,
    parseJsonObject(input?.remoteMessage?.data?.dataString),
    input?.remoteMessage?.data,
    input,
  ]
  for (const item of candidates) {
    if (item && typeof item === 'object' && String(item.taxio_native_alert || '') === '1') {
      return item
    }
  }
  return null
}

export async function ensureAlertChannel() {
  if (Platform.OS !== 'android') return null
  return notifee.createChannel({
    id: ALERT_CHANNEL_ID,
    name: 'TAXIO urgent trip alerts',
    description: 'Urgent Company A and Rescue requests',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    vibration: true,
    vibrationPattern: [700, 200, 700, 200, 1000, 200],
    sound: 'taxio_offer',
  })
}

export async function stopAndroidAlert() {
  if (Platform.OS !== 'android') return
  await notifee.stopForegroundService().catch(() => {})
  await notifee.cancelNotification(ALERT_NOTIFICATION_ID).catch(() => {})
}

export async function startAndroidAlert(input) {
  if (Platform.OS !== 'android') return false
  const alert = extractTaxioAlertData(input)
  if (!alert) return false

  const expires = new Date(alert.expires_at || 0).getTime()
  if (!Number.isFinite(expires) || expires <= Date.now()) return false

  await ensureAlertChannel()
  await notifee.displayNotification({
    id: ALERT_NOTIFICATION_ID,
    title: String(alert.title || '🚕 NEW TAXIO TRIP'),
    body: String(alert.body || 'Action required — open TAXIO now.'),
    data: Object.fromEntries(
      Object.entries(alert).map(([key, value]) => [key, value == null ? '' : String(value)])
    ),
    android: {
      channelId: ALERT_CHANNEL_ID,
      asForegroundService: true,
      foregroundServiceTypes: [
        AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
      ],
      ongoing: true,
      autoCancel: false,
      loopSound: true,
      sound: 'taxio_offer',
      vibrationPattern: [700, 200, 700, 200, 1000, 200],
      lightUpScreen: true,
      pressAction: {
        id: 'open-taxio',
        launchActivity: 'default',
      },
      showTimestamp: true,
      timestamp: Date.now(),
      onlyAlertOnce: false,
    },
  })
  return true
}

export function registerForegroundAlertRunner() {
  if (Platform.OS !== 'android') return

  notifee.registerForegroundService((notification) => {
    return new Promise((resolve) => {
      const alert = extractTaxioAlertData(notification?.data || notification)
      const expires = new Date(alert?.expires_at || 0).getTime()
      let finished = false
      let timer = null
      let poller = null

      const finish = async () => {
        if (finished) return
        finished = true
        if (timer) clearTimeout(timer)
        if (poller) clearInterval(poller)
        await stopAndroidAlert()
        resolve()
      }

      if (!alert || !Number.isFinite(expires) || expires <= Date.now()) {
        void finish()
        return
      }

      timer = setTimeout(() => void finish(), Math.max(0, expires - Date.now() + 250))

      if (alert.status_url) {
        poller = setInterval(async () => {
          try {
            const response = await fetch(alert.status_url, {
              headers: { Accept: 'application/json' },
            })
            const state = await response.json().catch(() => null)
            if (response.ok && state && state.active === false) {
              await finish()
            }
          } catch {
            // A temporary network loss must not silence an actionable trip.
            // The authoritative expires_at still stops the alert.
          }
        }, 2500)
      }
    })
  })
}

export async function openTaxioFromAlert(input) {
  const alert = extractTaxioAlertData(input)
  const url = String(alert?.deep_link || '').trim()
  if (!url) return
  await stopAndroidAlert()
  await Linking.openURL(url)
}

export async function showLocalTestAlert() {
  if (Platform.OS === 'android') {
    return startAndroidAlert({
      taxio_native_alert: '1',
      title: '🚕 TAXIO TEST ALERT',
      body: '10-second local test. This does not create a booking.',
      expires_at: new Date(Date.now() + 10000).toISOString(),
      deep_link: 'https://www.taxio.be/dashboard/company',
    })
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚕 TAXIO TEST ALERT',
      body: 'Native iPhone notification test.',
      sound: 'taxio_offer.wav',
      interruptionLevel: 'timeSensitive',
      data: {
        taxio_native_alert: '1',
        deep_link: 'https://www.taxio.be/dashboard/company',
      },
    },
    trigger: null,
  })
}
