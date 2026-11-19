const fs = require('fs')
const path = require('path')
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins')

const WORKMANAGER_R8_RULES = `
# Expo SDK 58 / AGP 9: WorkManager + Room instantiate these reflectively.
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class * extends androidx.work.InputMerger { <init>(); }
`.trim()

const KOTLIN_FILES = {
  'TaxioPayload.kt': `package be.taxio.alert

import android.content.Intent
import org.json.JSONObject

data class TaxioPayload(
  val title: String,
  val body: String,
  val bookingId: String,
  val rescueRequestId: String,
  val rescueOpportunityId: String,
  val eventType: String,
  val expiresAtMs: Long,
  val deepLink: String,
  val statusUrl: String
) {
  fun writeTo(intent: Intent) {
    intent.putExtra("title", title)
    intent.putExtra("body", body)
    intent.putExtra("booking_id", bookingId)
    intent.putExtra("rescue_request_id", rescueRequestId)
    intent.putExtra("rescue_opportunity_id", rescueOpportunityId)
    intent.putExtra("event_type", eventType)
    intent.putExtra("expires_at_ms", expiresAtMs)
    intent.putExtra("deep_link", deepLink)
    intent.putExtra("status_url", statusUrl)
  }

  companion object {
    private fun parseObject(raw: String?): JSONObject? {
      if (raw.isNullOrBlank()) return null
      return try {
        val parsed = JSONObject(raw)
        if (parsed.optString("taxio_native_alert") == "1") parsed else null
      } catch (_: Exception) {
        null
      }
    }

    fun fromRemoteData(data: Map<String, String>): TaxioPayload? {
      var json: JSONObject? = null

      if (data["taxio_native_alert"] == "1") {
        json = JSONObject()
        data.forEach { (key, value) -> json.put(key, value) }
      }

      if (json == null) {
        json =
          parseObject(data["body"]) ?:
          parseObject(data["dataString"]) ?:
          parseObject(data["data"]) ?:
          parseObject(data["message"])
      }

      if (json == null) return null

      val expiresAtMs = json.optString("expires_at_ms").toLongOrNull() ?: 0L
      if (expiresAtMs <= System.currentTimeMillis()) return null

      return TaxioPayload(
        title = json.optString("title", "🚕 TAXIO TRIP"),
        body = json.optString("body", "Action required — open TAXIO now."),
        bookingId = json.optString("booking_id", ""),
        rescueRequestId = json.optString("rescue_request_id", ""),
        rescueOpportunityId = json.optString("rescue_opportunity_id", ""),
        eventType = json.optString("event_type", ""),
        expiresAtMs = expiresAtMs,
        deepLink = json.optString("deep_link", "https://www.taxio.be/dashboard/company"),
        statusUrl = json.optString("status_url", "")
      )
    }
  }
}
`,

  'TaxioFirebaseMessagingService.kt': `package be.taxio.alert

import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class TaxioFirebaseMessagingService : FirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    val payload = TaxioPayload.fromRemoteData(remoteMessage.data) ?: return

    val requestId = payload.bookingId.ifBlank {
      payload.rescueOpportunityId.ifBlank { "unknown" }
    }

    Log.i(TAG, "[TAXIO-NATIVE] PUSH_RECEIVED request=" + requestId)

    val intent = Intent(this, TaxioAlertService::class.java)
    payload.writeTo(intent)

    try {
      ContextCompat.startForegroundService(this, intent)
      Log.i(TAG, "[TAXIO-NATIVE] FGS_START_REQUESTED request=" + requestId)
    } catch (error: Exception) {
      Log.e(TAG, "[TAXIO-NATIVE] FGS_START_FAILED request=" + requestId, error)
    }
  }

  override fun onNewToken(token: String) {
    super.onNewToken(token)
    // Never log the token itself.
    Log.i(TAG, "[TAXIO-NATIVE] FCM_TOKEN_REFRESHED")
  }

  companion object {
    private const val TAG = "TaxioNative"
  }
}
`,

  'TaxioAlertService.kt': `package be.taxio.alert

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class TaxioAlertService : Service() {
  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var poller: ScheduledExecutorService? = null
  private val handler = Handler(Looper.getMainLooper())
  private var expiryRunnable: Runnable? = null
  private var activeRequestId: String = "unknown"

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent == null) {
      stopSelf()
      return START_NOT_STICKY
    }

    stopAlertResources()

    val expiresAtMs = intent.getLongExtra("expires_at_ms", 0L)
    if (expiresAtMs <= System.currentTimeMillis()) {
      stopSelf()
      return START_NOT_STICKY
    }

    val title = intent.getStringExtra("title") ?: "🚕 TAXIO TRIP"
    val body = intent.getStringExtra("body") ?: "Action required — open TAXIO now."
    val deepLink = intent.getStringExtra("deep_link") ?: "https://www.taxio.be/dashboard/company"
    val statusUrl = intent.getStringExtra("status_url") ?: ""
    val bookingId = intent.getStringExtra("booking_id") ?: ""
    val rescueOpportunityId = intent.getStringExtra("rescue_opportunity_id") ?: ""
    activeRequestId = bookingId.ifBlank { rescueOpportunityId.ifBlank { "test" } }

    startForeground(
      NOTIFICATION_ID,
      buildNotification(title, body, deepLink)
    )
    Log.i(TAG, "[TAXIO-NATIVE] FGS_STARTED request=" + activeRequestId)

    startAudio()
    startVibration()

    val remainingMs = (expiresAtMs - System.currentTimeMillis()).coerceAtLeast(1L)
    expiryRunnable = Runnable { finishAlert("expired") }
    handler.postDelayed(expiryRunnable!!, remainingMs)

    if (statusUrl.isNotBlank()) {
      startStatusPolling(statusUrl)
    }

    return START_NOT_STICKY
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager = getSystemService(NotificationManager::class.java)
    val channel = NotificationChannel(
      CHANNEL_ID,
      "TAXIO urgent trip pager",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Urgent Company A and Rescue trip requests"
      setSound(null, null)
      enableVibration(false)
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(title: String, body: String, deepLink: String): android.app.Notification {
    val tapIntent = Intent(this, TaxioOpenPwaReceiver::class.java).apply {
      putExtra("deep_link", deepLink)
    }
    val tapPendingIntent = PendingIntent.getBroadcast(
      this,
      2201,
      tapIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(tapPendingIntent)
      .setOnlyAlertOnce(true)
      .build()
  }

  private fun startAudio() {
    try {
      val soundId = resources.getIdentifier("taxio_offer", "raw", packageName)
      val soundUri: Uri = if (soundId != 0) {
        Uri.parse("android.resource://" + packageName + "/" + soundId)
      } else {
        android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM)
      }

      player = MediaPlayer().apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        )
        setWakeMode(this@TaxioAlertService, PowerManager.PARTIAL_WAKE_LOCK)
        setDataSource(this@TaxioAlertService, soundUri)
        isLooping = true
        prepare()
        start()
      }
      Log.i(TAG, "[TAXIO-NATIVE] AUDIO_STARTED request=" + activeRequestId)
    } catch (error: Exception) {
      Log.e(TAG, "[TAXIO-NATIVE] AUDIO_FAILED request=" + activeRequestId, error)
    }
  }

  private fun startVibration() {
    try {
      vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        getSystemService(VibratorManager::class.java).defaultVibrator
      } else {
        @Suppress("DEPRECATION")
        getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
      }

      val pattern = longArrayOf(0, 700, 200, 700, 200, 1000, 200)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
      } else {
        @Suppress("DEPRECATION")
        vibrator?.vibrate(pattern, 0)
      }
    } catch (error: Exception) {
      Log.e(TAG, "[TAXIO-NATIVE] VIBRATION_FAILED request=" + activeRequestId, error)
    }
  }

  private fun startStatusPolling(statusUrl: String) {
    poller = Executors.newSingleThreadScheduledExecutor()
    poller?.scheduleAtFixedRate({
      try {
        val connection = URL(statusUrl).openConnection() as HttpURLConnection
        connection.requestMethod = "GET"
        connection.connectTimeout = 1800
        connection.readTimeout = 1800
        connection.setRequestProperty("Accept", "application/json")

        val code = connection.responseCode
        if (code in 200..299) {
          val body = connection.inputStream.bufferedReader().use { it.readText() }
          val json = JSONObject(body)
          if (!json.optBoolean("active", true)) {
            handler.post { finishAlert(json.optString("state", "inactive")) }
          } else {
            Log.d(TAG, "[TAXIO-NATIVE] STATUS_ACTIVE request=" + activeRequestId)
          }
        }
        connection.disconnect()
      } catch (_: Exception) {
        // Network loss must never silence an actionable request.
        // Local expires_at remains the hard stop.
      }
    }, 800, 2000, TimeUnit.MILLISECONDS)
  }

  private fun finishAlert(reason: String) {
    Log.i(TAG, "[TAXIO-NATIVE] ALERT_STOPPED request=" + activeRequestId + " reason=" + reason)
    stopSelf()
  }

  private fun stopAlertResources() {
    expiryRunnable?.let { handler.removeCallbacks(it) }
    expiryRunnable = null

    poller?.shutdownNow()
    poller = null

    try {
      player?.stop()
    } catch (_: Exception) {
    }
    try {
      player?.release()
    } catch (_: Exception) {
    }
    player = null

    try {
      vibrator?.cancel()
    } catch (_: Exception) {
    }
    vibrator = null
  }

  override fun onDestroy() {
    stopAlertResources()
    try {
      val manager = getSystemService(NotificationManager::class.java)
      manager.cancel(NOTIFICATION_ID)
    } catch (_: Exception) {
    }
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  companion object {
    private const val TAG = "TaxioNative"
    private const val CHANNEL_ID = "taxio-native-pager-v1"
    private const val NOTIFICATION_ID = 49049
  }
}
`,

  'TaxioOpenPwaReceiver.kt': `package be.taxio.alert

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log

class TaxioOpenPwaReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val deepLink = intent.getStringExtra("deep_link")
      ?: "https://www.taxio.be/dashboard/company"

    context.stopService(Intent(context, TaxioAlertService::class.java))

    val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    try {
      context.startActivity(openIntent)
      Log.i(TAG, "[TAXIO-NATIVE] PWA_OPENED")
    } catch (error: Exception) {
      Log.e(TAG, "[TAXIO-NATIVE] PWA_OPEN_FAILED", error)
    }
  }

  companion object {
    private const val TAG = "TaxioNative"
  }
}
`,
}

function ensurePermission(manifest, permissionName) {
  const permissions = manifest['uses-permission'] || (manifest['uses-permission'] = [])
  if (!permissions.some((item) => item?.$?.['android:name'] === permissionName)) {
    permissions.push({ $: { 'android:name': permissionName } })
  }
}

function withTaxioNativeSources(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidRoot = config.modRequest.platformProjectRoot
      const sourceDir = path.join(androidRoot, 'app', 'src', 'main', 'java', 'be', 'taxio', 'alert')
      fs.mkdirSync(sourceDir, { recursive: true })

      for (const [name, content] of Object.entries(KOTLIN_FILES)) {
        fs.writeFileSync(path.join(sourceDir, name), content, 'utf8')
      }

      const appBuild = path.join(androidRoot, 'app', 'build.gradle')
      let gradle = fs.readFileSync(appBuild, 'utf8')
      const firebaseMessagingDependency = "implementation 'com.google.firebase:firebase-messaging:25.0.1'"
      if (!gradle.includes(firebaseMessagingDependency)) {
        gradle = gradle.replace(
          /dependencies\s*\{/,
          `dependencies {\n    ${firebaseMessagingDependency}`
        )
        fs.writeFileSync(appBuild, gradle, 'utf8')
      }

      const proguard = path.join(androidRoot, 'app', 'proguard-rules.pro')
      let existing = fs.existsSync(proguard) ? fs.readFileSync(proguard, 'utf8') : ''
      if (!existing.includes('-keep class * extends androidx.room.RoomDatabase { <init>(); }')) {
        existing = `${existing.trimEnd()}\n\n${WORKMANAGER_R8_RULES}\n`
      }
      if (!existing.includes('-keep class be.taxio.alert.TaxioFirebaseMessagingService')) {
        existing += `
# TAXIO native pager services are instantiated by Android/FCM.
-keep class be.taxio.alert.TaxioFirebaseMessagingService { *; }
-keep class be.taxio.alert.TaxioAlertService { *; }
-keep class be.taxio.alert.TaxioOpenPwaReceiver { *; }
`
      }
      fs.writeFileSync(proguard, existing, 'utf8')

      return config
    },
  ])
}

module.exports = function withTaxioNativePager(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest
    manifest.$ = manifest.$ || {}
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools'

    ensurePermission(manifest, 'android.permission.WAKE_LOCK')
    ensurePermission(manifest, 'android.permission.FOREGROUND_SERVICE')
    ensurePermission(manifest, 'android.permission.FOREGROUND_SERVICE_SPECIAL_USE')

    const application = manifest.application?.[0]
    if (!application) return config

    const services = application.service || (application.service = [])

    // Expo remains responsible for permission + ExpoPushToken creation, but
    // TAXIO's native FCM service owns message delivery so no React Native
    // cold-start is required before ringing.
    if (!services.some((item) => item?.$?.['android:name'] === 'expo.modules.notifications.service.ExpoFirebaseMessagingService')) {
      services.push({
        $: {
          'android:name': 'expo.modules.notifications.service.ExpoFirebaseMessagingService',
          'tools:node': 'remove',
        },
      })
    }

    services.push({
      $: {
        'android:name': '.TaxioFirebaseMessagingService',
        'android:exported': 'false',
      },
      'intent-filter': [
        {
          $: { 'android:priority': '100' },
          action: [{ $: { 'android:name': 'com.google.firebase.MESSAGING_EVENT' } }],
        },
      ],
    })

    services.push({
      $: {
        'android:name': '.TaxioAlertService',
        'android:exported': 'false',
        'android:foregroundServiceType': 'specialUse',
      },
      property: [
        {
          $: {
            'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
            'android:value': 'Urgent taxi dispatch pager during a server-authoritative response window.',
          },
        },
      ],
    })

    const receivers = application.receiver || (application.receiver = [])
    receivers.push({
      $: {
        'android:name': '.TaxioOpenPwaReceiver',
        'android:exported': 'false',
      },
    })

    return config
  })

  return withTaxioNativeSources(config)
}
