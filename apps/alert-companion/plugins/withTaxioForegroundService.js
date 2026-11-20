const fs = require('fs')
const path = require('path')
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins')

const WORKMANAGER_R8_RULES = `
# Expo SDK 58 / AGP 9: WorkManager + Room instantiate these reflectively.
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class * extends androidx.work.InputMerger { <init>(); }
`.trim()

const KOTLIN_FILES = {
  'TaxioPayload.kt': `package be.taxio.operator

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

  'TaxioFirebaseMessagingService.kt': `package be.taxio.operator

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

  'TaxioAlertService.kt': `package be.taxio.operator

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
    val tapIntent = Intent(this, TaxioOpenPwaActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      putExtra("deep_link", deepLink)
    }
    val tapPendingIntent = PendingIntent.getActivity(
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

  'TaxioWatchService.kt': `package be.taxio.operator

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class TaxioWatchService : Service() {
  private var poller: ScheduledExecutorService? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var watchToken: String = ""
  private var activeAlertKey: String? = null

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val supplied = intent?.getStringExtra("watch_token")?.trim().orEmpty()
    if (supplied.isNotBlank()) {
      watchToken = supplied
      getSharedPreferences(PREFS, MODE_PRIVATE)
        .edit()
        .putString(KEY_TOKEN, supplied)
        .apply()
    } else if (watchToken.isBlank()) {
      watchToken = getSharedPreferences(PREFS, MODE_PRIVATE)
        .getString(KEY_TOKEN, "")
        .orEmpty()
    }

    if (watchToken.isBlank()) {
      stopSelf()
      return START_NOT_STICKY
    }

    startForeground(WATCH_NOTIFICATION_ID, buildWatchNotification())
    acquireWakeLock()
    startPolling()
    Log.i(TAG, "[TAXIO-WATCH] WATCH_STARTED")

    return START_STICKY
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java)
    val channel = NotificationChannel(
      WATCH_CHANNEL_ID,
      "TAXIO trip monitoring",
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Keeps TAXIO trip monitoring active while the driver is connected."
      setSound(null, null)
      enableVibration(false)
      lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
    }
    manager.createNotificationChannel(channel)
  }

  private fun buildWatchNotification(): android.app.Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
      ?: Intent(this, MainActivity::class.java)
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)

    val pending = PendingIntent.getActivity(
      this,
      49048,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    return NotificationCompat.Builder(this, WATCH_CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("TAXIO alerts active")
      .setContentText("Monitoring Company A and Rescue requests")
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setContentIntent(pending)
      .build()
  }

  private fun acquireWakeLock() {
    if (wakeLock?.isHeld == true) return
    val pm = getSystemService(POWER_SERVICE) as PowerManager
    wakeLock = pm.newWakeLock(
      PowerManager.PARTIAL_WAKE_LOCK,
      packageName + ":taxio-watch"
    ).apply {
      setReferenceCounted(false)
      acquire()
    }
  }

  private fun startPolling() {
    if (poller != null) return

    poller = Executors.newSingleThreadScheduledExecutor()
    poller?.scheduleAtFixedRate({
      try {
        pollOnce()
      } catch (error: Exception) {
        Log.w(TAG, "[TAXIO-WATCH] POLL_ERROR", error)
      }
    }, 0, 3, TimeUnit.SECONDS)
  }

  private fun pollOnce() {
    val encoded = URLEncoder.encode(watchToken, StandardCharsets.UTF_8.toString())
    val url = URL("https://www.taxio.be/api/native-alert-poll?token=" + encoded)
    val connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "GET"
    connection.connectTimeout = 2200
    connection.readTimeout = 2200
    connection.setRequestProperty("Accept", "application/json")
    connection.setRequestProperty("Cache-Control", "no-store")

    val code = connection.responseCode
    if (code !in 200..299) {
      connection.disconnect()
      return
    }

    val raw = connection.inputStream.bufferedReader().use { it.readText() }
    connection.disconnect()

    val root = JSONObject(raw)
    if (!root.optBoolean("active", false)) {
      clearActiveAlert()
      return
    }

    val alert = root.optJSONObject("alert") ?: return
    val key = alert.optString("key", "")
    if (key.isBlank()) return

    if (key == activeAlertKey) return
    activeAlertKey = key

    val alertIntent = Intent(this, TaxioAlertService::class.java).apply {
      putExtra("title", alert.optString("title", "🚕 TAXIO TRIP"))
      putExtra("body", alert.optString("body", "Action required — open TAXIO now."))
      putExtra("booking_id", alert.optString("booking_id", ""))
      putExtra("rescue_request_id", alert.optString("rescue_request_id", ""))
      putExtra("rescue_opportunity_id", alert.optString("rescue_opportunity_id", ""))
      putExtra("event_type", alert.optString("event_type", ""))
      putExtra("expires_at_ms", alert.optLong("expires_at_ms", 0L))
      putExtra("deep_link", alert.optString("deep_link", "https://www.taxio.be/dashboard/company"))
      putExtra("status_url", "")
    }

    ContextCompat.startForegroundService(this, alertIntent)
    Log.i(TAG, "[TAXIO-WATCH] ALERT_STARTED key=" + key)
  }

  private fun clearActiveAlert() {
    if (activeAlertKey == null) return
    stopService(Intent(this, TaxioAlertService::class.java))
    Log.i(TAG, "[TAXIO-WATCH] ALERT_CLEARED key=" + activeAlertKey)
    activeAlertKey = null
  }

  override fun onDestroy() {
    poller?.shutdownNow()
    poller = null
    clearActiveAlert()

    try {
      wakeLock?.let { if (it.isHeld) it.release() }
    } catch (_: Exception) {
    }
    wakeLock = null

    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  companion object {
    private const val TAG = "TaxioWatch"
    private const val WATCH_CHANNEL_ID = "taxio-watch-v1"
    private const val WATCH_NOTIFICATION_ID = 49048
    private const val PREFS = "taxio-watch"
    private const val KEY_TOKEN = "watch-token"
  }
}
`,

  'TaxioPagerModule.kt': `package be.taxio.operator

import android.content.Intent
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.ReactPackage

class TaxioPagerModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "TaxioPager"

  @ReactMethod
  fun startWatch(token: String) {
    val cleaned = token.trim()
    if (cleaned.isBlank()) return

    val intent = Intent(reactContext, TaxioWatchService::class.java).apply {
      putExtra("watch_token", cleaned)
    }
    ContextCompat.startForegroundService(reactContext, intent)
  }

  @ReactMethod
  fun stopWatch() {
    reactContext.getSharedPreferences("taxio-watch", 0)
      .edit()
      .remove("watch-token")
      .apply()
    reactContext.stopService(Intent(reactContext, TaxioWatchService::class.java))
    reactContext.stopService(Intent(reactContext, TaxioAlertService::class.java))
  }
}

class TaxioPagerPackage : ReactPackage {
  override fun createNativeModules(
    reactContext: ReactApplicationContext
  ): List<NativeModule> = listOf(TaxioPagerModule(reactContext))

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> = emptyList()
}
`,

  'TaxioOpenPwaActivity.kt': `package be.taxio.operator

import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle

class TaxioOpenPwaActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    stopService(Intent(this, TaxioAlertService::class.java))

    val dashboard = Uri.parse("https://www.taxio.be/dashboard/company")
    val requested = intent.getStringExtra("deep_link")?.let(Uri::parse)
    val target = requested?.takeIf {
      it.scheme == dashboard.scheme && it.encodedAuthority == dashboard.encodedAuthority &&
        it.encodedPath == dashboard.encodedPath
    } ?: dashboard

    val openTrip = Intent(Intent.ACTION_VIEW, target).apply {
      addCategory(Intent.CATEGORY_BROWSABLE)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    // Resolve the actual trip URL to a Chrome-installed web app. A home-screen
    // shortcut that only opens a browser does not have a WebAPK package.
    val webApk = packageManager.queryIntentActivities(openTrip, PackageManager.MATCH_DEFAULT_ONLY)
      .firstOrNull { it.activityInfo.packageName.startsWith("org.chromium.webapk.") }
    if (webApk != null) {
      openTrip.setPackage(webApk.activityInfo.packageName)
      try {
        startActivity(openTrip)
        finish()
        return
      } catch (_: ActivityNotFoundException) {
        // The PWA may have been removed between resolving and opening it.
      }
    }

    AlertDialog.Builder(this)
      .setTitle("Install the TAXIO dashboard")
      .setMessage("Open www.taxio.be/dashboard/company in Chrome and choose Install app. Open TAXIO once from its home-screen icon and sign in, then tap your next trip alert.")
      .setPositiveButton(android.R.string.ok) { _, _ -> finish() }
      .setOnCancelListener { finish() }
      .show()
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
      const sourceDir = path.join(androidRoot, 'app', 'src', 'main', 'java', 'be', 'taxio', 'operator')
      fs.mkdirSync(sourceDir, { recursive: true })

      for (const [name, content] of Object.entries(KOTLIN_FILES)) {
        fs.writeFileSync(path.join(sourceDir, name), content, 'utf8')
      }

      const mainApplication = path.join(sourceDir, 'MainApplication.kt')
      let mainSource = fs.readFileSync(mainApplication, 'utf8')
      if (!mainSource.includes('TaxioPagerPackage()')) {
        const marker = 'PackageList(this).packages.apply {'
        if (!mainSource.includes(marker)) {
          throw new Error('Could not locate React Native package list in MainApplication.kt')
        }
        mainSource = mainSource.replace(
          marker,
          marker + '\n          add(TaxioPagerPackage())'
        )
        fs.writeFileSync(mainApplication, mainSource, 'utf8')
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
      if (!existing.includes('-keep class be.taxio.operator.TaxioFirebaseMessagingService')) {
        existing += `
# TAXIO native pager services are instantiated by Android/FCM.
-keep class be.taxio.operator.TaxioFirebaseMessagingService { *; }
-keep class be.taxio.operator.TaxioAlertService { *; }
-keep class be.taxio.alert.TaxioWatchService { *; }
-keep class be.taxio.alert.TaxioPagerModule { *; }
-keep class be.taxio.alert.TaxioPagerPackage { *; }
-keep class be.taxio.operator.TaxioOpenPwaActivity { *; }
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

    const queries = manifest.queries || (manifest.queries = [])
    const hasHttpsViewQuery = queries.some((entry) =>
      (entry?.intent || []).some((item) =>
        (item?.action || []).some((a) => a?.$?.['android:name'] === 'android.intent.action.VIEW') &&
        (item?.data || []).some((d) => d?.$?.['android:scheme'] === 'https')
      )
    )
    if (!hasHttpsViewQuery) {
      queries.push({
        intent: [{
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          category: [{ $: { 'android:name': 'android.intent.category.BROWSABLE' } }],
          data: [{ $: { 'android:scheme': 'https' } }],
        }],
      })
    }

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

    services.push({
      $: {
        'android:name': '.TaxioWatchService',
        'android:exported': 'false',
        'android:foregroundServiceType': 'specialUse',
        'android:stopWithTask': 'false',
      },
      property: [
        {
          $: {
            'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
            'android:value': 'Continuous taxi dispatch monitoring while the driver is connected.',
          },
        },
      ],
    })

    const activities = application.activity || (application.activity = [])
    activities.push({
      $: {
        'android:name': '.TaxioOpenPwaActivity',
        'android:exported': 'false',
        'android:excludeFromRecents': 'true',
        'android:theme': '@android:style/Theme.Material.Light.Dialog.NoActionBar',
      },
    })

    return config
  })

  return withTaxioNativeSources(config)
}
