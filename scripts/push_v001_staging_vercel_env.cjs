/**
 * Push .env.local keys to linked Vercel project (taxio-v001-staging).
 * Staging only — refuses if Supabase host is not lyjicuuyrvblbsqlduqg.
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

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
const env = parseEnv(path.join(root, '.env.local'))
const url = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '')
if (!url.includes('lyjicuuyrvblbsqlduqg') || String(env.TAXIO_STAGING || '').toLowerCase() !== 'true') {
  console.error(JSON.stringify({ fatal: 'refusing: not staging env' }))
  process.exit(1)
}

const keys = [
  'TAXIO_STAGING',
  'VITE_TAXIO_STAGING',
  'VITE_SUPABASE_URL',
  'SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_GOOGLE_MAPS_API_KEY',
  'GOOGLE_MAPS_SERVER_API_KEY',
  'VITE_TURNSTILE_SITE_KEY',
  'VITE_TURNSTILE_ENABLED',
  'TURNSTILE_SECRET_KEY',
  'TURNSTILE_ENABLED',
  'MAIL_FROM',
  'ADMIN_NOTIFY_EMAIL',
  'RESEND_API_KEY',
]

const targets = ['production', 'preview', 'development']
const results = []

for (const key of keys) {
  const val = env[key]
  if (val == null || val === '') {
    results.push({ key, status: 'skip_empty' })
    continue
  }
  for (const target of targets) {
    const r = spawnSync('npx', ['vercel', 'env', 'add', key, target, '--force', '--yes'], {
      input: val + '\n',
      encoding: 'utf8',
      cwd: root,
      shell: true,
    })
    results.push({
      key,
      target,
      status: r.status === 0 ? 'ok' : 'fail',
      err: r.status === 0 ? null : String(r.stderr || r.stdout || '').slice(0, 200),
    })
  }
}

console.log(JSON.stringify({ host: 'lyjicuuyrvblbsqlduqg', results }, null, 2))
