const fs = require('fs')
const path = require('path')
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins')

const WORKMANAGER_R8_RULES = `
# Expo SDK 58 / AGP 9: WorkManager + Room instantiate these reflectively.
# Keep their no-arg constructors in minified release builds.
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class * extends androidx.work.InputMerger { <init>(); }
`.trim()

function withTaxioWorkManagerR8Fix(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const file = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      )
      let existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
      if (!existing.includes('-keep class * extends androidx.room.RoomDatabase { <init>(); }')) {
        existing = `${existing.trimEnd()}\n\n${WORKMANAGER_R8_RULES}\n`
        fs.writeFileSync(file, existing, 'utf8')
      }
      return config
    },
  ])
}

module.exports = function withTaxioForegroundService(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest
    const permissions = manifest['uses-permission'] || (manifest['uses-permission'] = [])
    const permissionName = 'android.permission.FOREGROUND_SERVICE_SPECIAL_USE'
    if (!permissions.some((item) => item?.$?.['android:name'] === permissionName)) {
      permissions.push({ $: { 'android:name': permissionName } })
    }

    const application = manifest.application?.[0]
    if (!application) return config
    const services = application.service || (application.service = [])
    const serviceName = 'app.notifee.core.ForegroundService'
    let service = services.find((item) => item?.$?.['android:name'] === serviceName)
    if (!service) {
      service = {
        $: {
          'android:name': serviceName,
          'android:foregroundServiceType': 'specialUse',
          'android:exported': 'false',
        },
      }
      services.push(service)
    } else {
      service.$ = service.$ || {}
      service.$['android:foregroundServiceType'] = 'specialUse'
      service.$['android:exported'] = service.$['android:exported'] || 'false'
    }

    const properties = service.property || (service.property = [])
    const propertyName = 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE'
    const existing = properties.find((item) => item?.$?.['android:name'] === propertyName)
    const value = 'Urgent taxi dispatch alert during a server-authoritative 49-second response window.'
    if (existing) {
      existing.$['android:value'] = value
    } else {
      properties.push({
        $: {
          'android:name': propertyName,
          'android:value': value,
        },
      })
    }

    return config
  })

  return withTaxioWorkManagerR8Fix(config)
}
