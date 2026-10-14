/**
 * STAGING ONLY — manually dispatch one company_push_outbox row via secured API.
 *
 * Does NOT create a public unauthenticated endpoint.
 * Requires env:
 *   COMPANY_PUSH_WEBHOOK_SECRET
 *   STAGING_APP_ORIGIN (e.g. https://staging.taxio.be) OR PUBLIC_APP_ORIGIN
 *
 * Usage:
 *   node scripts/staging_company_push_dispatch_one.cjs <outbox_id>
 *   node scripts/staging_company_push_dispatch_one.cjs --dedupe booking-new:<uuid>
 *
 * Optional: load .env.local if present (does not print secrets).
 */
const fs = require('fs')
const path = require('path')

function loadEnvFile(name) {
  try {
    const p = path.resolve(process.cwd(), name)
    const raw = fs.readFileSync(p, 'utf8')
    for (const line of raw.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq < 1) continue
      const key = t.slice(0, eq).trim()
      let val = t.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (key && process.env[key] == null) process.env[key] = val
    }
  } catch {
    /* missing ok */
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

async function main() {
  const args = process.argv.slice(2)
  let outboxId = ''
  let dedupeKey = ''
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dedupe' && args[i + 1]) {
      dedupeKey = String(args[++i]).trim()
    } else if (!args[i].startsWith('-')) {
      outboxId = String(args[i]).trim()
    }
  }

  if (!outboxId && !dedupeKey) {
    console.error('Usage: node scripts/staging_company_push_dispatch_one.cjs <outbox_id>')
    console.error('   or: node scripts/staging_company_push_dispatch_one.cjs --dedupe <dedupe_key>')
    process.exit(1)
  }

  const secret = String(process.env.COMPANY_PUSH_WEBHOOK_SECRET || '').trim()
  if (!secret) {
    console.error('Missing COMPANY_PUSH_WEBHOOK_SECRET (fail closed).')
    process.exit(1)
  }

  const origin = String(
    process.env.STAGING_APP_ORIGIN || process.env.PUBLIC_APP_ORIGIN || 'https://staging.taxio.be'
  )
    .trim()
    .replace(/\/$/, '')

  if (!/staging/i.test(origin) && process.env.TAXIO_STAGING !== 'true') {
    console.error('Refusing: origin does not look like staging. Set STAGING_APP_ORIGIN.')
    process.exit(1)
  }

  const url = `${origin}/api/company-push-dispatch`
  const body = outboxId ? { outbox_id: outboxId } : { dedupe_key: dedupeKey }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
      'X-Taxio-Push-Secret': secret,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  console.log(JSON.stringify({ http: res.status, ...json }, null, 2))
  process.exit(res.ok && json.ok !== false ? 0 : 2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
