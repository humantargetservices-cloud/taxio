/**
 * Enable-notifications decisions that do not need the OneSignal SDK.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  IOS_HOME_SCREEN_MESSAGE,
  ONESIGNAL_SW_PATH,
  ONESIGNAL_SW_SCOPE,
  companyOneSignalExternalId,
  planPushEnable,
} from '../src/lib/oneSignalEnablePlan.js'

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
})
