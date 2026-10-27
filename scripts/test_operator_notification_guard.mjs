import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sync = readFileSync(new URL('../apps/operator/src/hooks/useOfferSync.ts', import.meta.url), 'utf8')
const app = readFileSync(new URL('../apps/operator/App.tsx', import.meta.url), 'utf8')
test('seen offers use booking ID and exact deadline', () => {
  assert.match(sync, /b\.id\s*\+\s*':'\s*\+\s*b\.decision_deadline_at/)
})
test('foreground offers do not create duplicate system notifications', () => {
  assert.doesNotMatch(app + sync, /Notifications\.scheduleNotificationAsync\(/)
})
test('polling and realtime updates share a single-flight guard', () => {
  assert.match(sync, /if\(syncInFlight\.current\) return/)
  assert.match(sync, /syncInFlight\.current=false/)
})
