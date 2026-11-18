import 'react-native-url-polyfill/auto'
import { Platform } from 'react-native'
import { registerRootComponent } from 'expo'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'
import notifee, { EventType } from '@notifee/react-native'
import App from './App'
import {
  extractTaxioAlertData,
  openTaxioFromAlert,
  registerForegroundAlertRunner,
  startAndroidAlert,
} from './src/alertEngine'

const BACKGROUND_NOTIFICATION_TASK = 'TAXIO_NATIVE_ALERT_TASK'

registerForegroundAlertRunner()

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error || Platform.OS !== 'android') return
  const alert = extractTaxioAlertData(data)
  if (alert) await startAndroidAlert(alert)
})

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(() => {})

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
    await openTaxioFromAlert(detail.notification?.data)
  }
})

registerRootComponent(App)
