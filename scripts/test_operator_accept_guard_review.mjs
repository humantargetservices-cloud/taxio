import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const file = readFileSync(new URL('../api/rescue.js', import.meta.url), 'utf8')
const start = file.indexOf("if (action === 'accept_booking')")
const end = file.indexOf("if (action === 'accept')", start)
const block = file.slice(start, end)

test('booking acceptance is scoped to ID, company and new state', () => {
  assert.ok(start >= 0 && end > start)
  for (const clause of [".eq('id', bookingRequestId)",".eq('company_id', companyId)",".eq('status', 'new')"]) assert.ok(block.includes(clause), clause)
})
test('booking acceptance filters deadline atomically with status update', () => {
  assert.match(block, /\.gt\('decision_deadline_at',\s*new Date\(\)\.toISOString\(\)\)/)
  assert.ok(block.indexOf(".gt('decision_deadline_at'") < block.indexOf(".select('id')"))
})
test('no matching/expired booking returns conflict before notification', () => {
  assert.match(block, /if \(!updated\?\.id\)/)
  assert.match(block, /NO_LONGER_AVAILABLE/)
})
