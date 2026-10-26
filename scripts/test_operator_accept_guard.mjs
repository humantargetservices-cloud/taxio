import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const file=readFileSync(new URL('../api/rescue.js',import.meta.url),'utf8')
const block=file.slice(file.indexOf("if (action === 'accept_booking')"),file.indexOf("if (action === 'accept')"))
test('normal booking acceptance requires company, new state and unexpired deadline in same update',()=>{
  assert.match(block,/\.eq\('id',\s*bookingRequestId\)/)
  assert.match(block,/\.eq\('company_id',\s*companyId\)/)
  assert.match(block,/\.eq\('status',\s*'new'\)/)
  assert.match(block,/\.gt\('decision_deadline_at',\s*new Date\(\)\.toISOString\(\)\)/)
  assert.ok(block.indexOf(".gt('decision_deadline_at'") < block.indexOf(".select('id')"))
})
test('acceptance does not fall through when update affects zero rows',()=>{
  assert.match(block,/if \(!updated\?\.id\)/)
  assert.match(block,/NO_LONGER_AVAILABLE/)
})
