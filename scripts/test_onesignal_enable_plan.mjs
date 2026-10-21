/**
 * Enable-notifications decisions that do not need the OneSignal SDK.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  absoluteDashboardLaunchUrl,
  buildPushNotificationContent,
  publicAppOrigin,
} from '../api/_companyPush.js'
import {
  IOS_HOME_SCREEN_MESSAGE,
  ONESIGNAL_SW_PATH,
  ONESIGNAL_SW_SCOPE,
  PRODUCTION_PUSH_ORIGIN,
  companyOneSignalExternalId,
  isCompetingRootOneSignalWorker,
  isIosDevice,
  isPushEnrollmentComplete,
  oneSignalInitWorkerOptions,
  planPushEnable,
  pushUiModeFromSnapshot,
} from '../src/lib/oneSignalEnablePlan.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const COMPANY = '11111111-2222-3333-4444-555555555555'

function plan(overrides = {}) {
  return planPushEnable({
    supported: true,
    ios: false,
    installedPwa: false,
    permission: 'default',
    alreadySubscribed: false,
    companyId: COMPANY,
    appIdConfigured: true,
    ...overrides,
  })
}

describe('company external id', () => {
  it('stays company:<company_id>', () => {
    assert.equal(companyOneSignalExternalId(COMPANY), `company:${COMPANY}`)
    assert.equal(plan().externalId, `company:${COMPANY}`)
  })
})

describe('service worker registration target', () => {
  it('uses the root /sw.js worker and root scope', () => {
    assert.equal(ONESIGNAL_SW_PATH, '/sw.js')
    assert.equal(ONESIGNAL_SW_SCOPE, '/')
    assert.equal(ONESIGNAL_SW_PATH.startsWith('/'), true)
  })
})

describe('planPushEnable', () => {
  it('unsupported browser', () => {
    const result = plan({ supported: false, ios: false })
    assert.equal(result.ok, false)
    assert.equal(result.code, 'UNSUPPORTED')
  })

  it('iOS not installed as a Home Screen PWA', () => {
    const result = plan({ ios: true, installedPwa: false, supported: true })
    assert.equal(result.ok, false)
    assert.equal(result.code, 'IOS_NEEDS_HOME_SCREEN')
    assert.match(result.userMessage, /Share/)
    assert.match(result.userMessage, /Add to Home Screen/)
    assert.equal(result.userMessage, IOS_HOME_SCREEN_MESSAGE)
  })

  it('iOS installed PWA continues to the permission flow', () => {
    const result = plan({ ios: true, installedPwa: true, permission: 'default' })
    assert.equal(result.ok, null)
    assert.equal(result.code, 'REQUEST_PERMISSION')
    assert.equal(result.externalId, `company:${COMPANY}`)
  })

  it('permission denied does not request again', () => {
    const result = plan({ permission: 'denied' })
    assert.equal(result.ok, false)
    assert.equal(result.code, 'DENIED')
    assert.equal(result.permission, 'denied')
  })

  it('permission granted and already subscribed is success', () => {
    const result = plan({ permission: 'granted', alreadySubscribed: true })
    assert.equal(result.ok, true)
    assert.equal(result.code, 'ALREADY_SUBSCRIBED')
    assert.equal(result.externalId, `company:${COMPANY}`)
  })

  it('permission granted but not subscribed continues to opt-in', () => {
    const result = plan({ permission: 'granted', alreadySubscribed: false })
    assert.equal(result.ok, null)
    assert.equal(result.code, 'OPT_IN')
    assert.equal(result.externalId, `company:${COMPANY}`)
  })

  it('Android Chrome is a supported browser, not the iOS Home Screen gate', () => {
    const android = {
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    }
    assert.equal(isIosDevice(android), false)
    const result = plan({ ios: false, supported: true, permission: 'default', installedPwa: false })
    assert.equal(result.ok, null)
    assert.equal(result.code, 'REQUEST_PERMISSION')
  })
})

describe('enabled only with a real push subscription', () => {
  it('permission denied is blocked', () => {
    assert.equal(pushUiModeFromSnapshot({ permission: 'denied', optedIn: false }), 'blocked')
  })

  it('permission granted but no subscription is not enabled', () => {
    assert.equal(
      isPushEnrollmentComplete({
        permission: 'granted',
        optedIn: false,
        subscriptionIdPresent: false,
        tokenPresent: false,
      }),
      false
    )
    assert.equal(
      pushUiModeFromSnapshot({
        permission: 'granted',
        optedIn: true,
        subscriptionIdPresent: false,
        tokenPresent: false,
      }),
      'incomplete'
    )
    assert.equal(
      pushUiModeFromSnapshot({
        permission: 'granted',
        optedIn: false,
        subscriptionIdPresent: true,
        tokenPresent: true,
      }),
      'incomplete'
    )
  })

  it('permission granted plus subscription id or token is enabled', () => {
    assert.equal(
      pushUiModeFromSnapshot({
        permission: 'granted',
        optedIn: true,
        subscriptionIdPresent: true,
        tokenPresent: true,
      }),
      'on'
    )
    assert.equal(
      isPushEnrollmentComplete({
        permission: 'granted',
        optedIn: true,
        subscriptionIdPresent: false,
        tokenPresent: true,
      }),
      true
    )
  })
})

describe('one service worker configuration', () => {
  it('points OneSignal at /sw.js scope / and overrides Typical Site defaults', () => {
    const opts = oneSignalInitWorkerOptions()
    assert.equal(ONESIGNAL_SW_PATH, '/sw.js')
    assert.equal(ONESIGNAL_SW_SCOPE, '/')
    assert.equal(opts.path, '/')
    assert.equal(opts.serviceWorkerPath, 'sw.js')
    assert.deepEqual(opts.serviceWorkerParam, { scope: '/' })
    assert.equal(opts.serviceWorkerOverrideForTypical, true)
    assert.equal(opts.serviceWorkerPath.includes('OneSignalSDKWorker'), false)
  })

  it('drops only a root default OneSignal worker, never /sw.js or /onesignal/', () => {
    assert.equal(
      isCompetingRootOneSignalWorker({ scriptPath: '/OneSignalSDKWorker.js', scopePath: '/' }),
      true
    )
    assert.equal(
      isCompetingRootOneSignalWorker({ scriptPath: '/OneSignalSDKUpdaterWorker.js', scopePath: '/' }),
      true
    )
    assert.equal(isCompetingRootOneSignalWorker({ scriptPath: '/sw.js', scopePath: '/' }), false)
    assert.equal(
      isCompetingRootOneSignalWorker({
        scriptPath: '/onesignal/OneSignalSDKWorker.js',
        scopePath: '/onesignal/',
      }),
      false
    )
  })

  it('keeps OneSignal inside the unified root worker and does not add a second root worker file', () => {
    const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8')
    assert.match(sw, /importScripts\('https:\/\/cdn\.onesignal\.com\/sdks\/web\/v16\/OneSignalSDK\.sw\.js'\)/)
    assert.equal(fs.existsSync(path.join(root, 'public/OneSignalSDKWorker.js')), false)
    const client = fs.readFileSync(path.join(root, 'src/lib/oneSignalPush.js'), 'utf8')
    assert.match(client, /oneSignalInitWorkerOptions\(\)/)
    assert.equal(/serviceWorkerPath:\s*['"]OneSignalSDKWorker\.js['"]/.test(client), false)
  })

  it('installed PWA scope includes the root service worker and opens the company dashboard', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf8'))
    assert.equal(manifest.scope, '/')
    assert.equal(manifest.start_url, '/dashboard/company')
    assert.equal(manifest.display, 'standalone')
  })
})

describe('production push origin and new-trip payload', () => {
  const prev = process.env.PUBLIC_APP_ORIGIN
  after(() => {
    if (prev == null) delete process.env.PUBLIC_APP_ORIGIN
    else process.env.PUBLIC_APP_ORIGIN = prev
  })

  it('uses https://www.taxio.be for the company dashboard deep link', () => {
    assert.equal(PRODUCTION_PUSH_ORIGIN, 'https://www.taxio.be')
    process.env.PUBLIC_APP_ORIGIN = 'https://www.taxio.be'
    assert.equal(publicAppOrigin(), 'https://www.taxio.be')
    assert.equal(
      absoluteDashboardLaunchUrl('booking=abc'),
      'https://www.taxio.be/dashboard/company?booking=abc'
    )
  })

  it('new booking and rescue opportunity share the response-window message', () => {
    const booking = buildPushNotificationContent('COMPANY_BOOKING_NEW', {
      bookingId: 'b1',
      urlQuery: 'booking=b1',
    })
    const rescue = buildPushNotificationContent('RESCUE_OPPORTUNITY_NEW', {
      opportunityId: 'o1',
      rescueRequestId: 'r1',
      urlQuery: 'rescue=r1',
    })
    assert.equal(booking.title, 'New trip request')
    assert.equal(booking.body, 'New trip request — respond within 30 seconds.')
    assert.equal(booking.data.url, '/dashboard/company?booking=b1')
    assert.equal(rescue.title, 'New trip request')
    assert.equal(rescue.body, booking.body)
    assert.equal(rescue.data.url, '/dashboard/company?rescue=r1')
  })
})
