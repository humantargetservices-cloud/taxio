import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const app=readFileSync(new URL('../apps/operator/App.tsx',import.meta.url),'utf8')
test('seen offers use booking ID and exact deadline',()=>{
  assert.match(app,/seenOfferKeys\.current\?\.has\(b\.id\+'\:'\+b\.decision_deadline_at\)/)
  assert.match(app,/\.map\(b=>b\.id\+'\:'\+b\.decision_deadline_at\)/)
})
test('foreground offers do not create duplicate system notifications',()=>{
  assert.doesNotMatch(app,/Notifications\.scheduleNotificationAsync\(/)
})
test('polling and realtime updates share a single-flight guard',()=>{
  assert.match(app,/if\(syncInFlight\.current\) return/)
  assert.match(app,/finally \{syncInFlight\.current=false\}/)
})
