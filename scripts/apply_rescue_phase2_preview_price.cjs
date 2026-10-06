/**
 * Apply RUN_ON_TAXIO_V001_STAGING_RESCUE_PHASE2_PREVIEW_PRICE.sql
 * ONLY against taxio-v001-staging (lyjicuuyrvblbsqlduqg).
 *
 * Requires DATABASE_URL or SUPABASE_DB_URL (Postgres connection string).
 * Service role JWT alone cannot run DDL via PostgREST.
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

function parseEnv(p) {
  const out = {}
  if (!fs.existsSync(p)) return out
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out[t.slice(0, i).trim()] = v
  }
  return out
}

const root = path.join(__dirname, '..')
const env = { ...parseEnv(path.join(root, '.env')), ...parseEnv(path.join(root, '.env.local')) }
const supabaseUrl = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const host = supabaseUrl ? new URL(supabaseUrl).hostname : ''
const dbUrl = String(env.DATABASE_URL || env.SUPABASE_DB_URL || process.env.DATABASE_URL || '').trim()

if (String(env.TAXIO_STAGING || '').toLowerCase() !== 'true' || !host.includes('lyjicuuyrvblbsqlduqg')) {
  console.log(JSON.stringify({ fatal: 'staging only', host }))
  process.exit(1)
}
if (!dbUrl) {
  console.log(
    JSON.stringify({
      fatal: 'missing_db_url',
      hint: 'Set DATABASE_URL or SUPABASE_DB_URL in .env.local (staging Postgres URI), then re-run.',
      sqlFile: 'supabase/RUN_ON_TAXIO_V001_STAGING_RESCUE_PHASE2_PREVIEW_PRICE.sql',
    })
  )
  process.exit(2)
}
if (!/lyjicuuyrvblbsqlduqg|aws-0-.*supabase/i.test(dbUrl)) {
  console.log(JSON.stringify({ fatal: 'db_url_not_staging', hint: 'Refusing non-staging DATABASE_URL' }))
  process.exit(1)
}

const sqlPath = path.join(root, 'supabase', 'RUN_ON_TAXIO_V001_STAGING_RESCUE_PHASE2_PREVIEW_PRICE.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

;(async () => {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query(sql)
    const cols = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'booking_requests'
        AND column_name IN ('estimated_price_eur', 'price_currency')
      ORDER BY column_name
    `)
    const rescueCol = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'rescue_requests'
        AND column_name = 'preview_estimated_price'
    `)
    console.log(
      JSON.stringify(
        {
          ok: true,
          host,
          bookingPriceCols: cols.rows.map((r) => r.column_name),
          rescuePreviewCol: rescueCol.rows.map((r) => r.column_name),
        },
        null,
        2
      )
    )
  } finally {
    await client.end()
  }
})().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: err.message }))
  process.exit(1)
})
