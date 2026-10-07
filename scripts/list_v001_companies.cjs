const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

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
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

;(async () => {
  const { data, error } = await admin
    .from('companies')
    .select('id,name,slug,status,rescue_enabled')
    .in('id', ['27c589cc-ea6e-4264-99c6-3710a1c1defe', 'cc0c86e8-ff8e-41a8-84e8-a8af6fc5f358'])
  if (error) throw error
  console.log(JSON.stringify(data, null, 2))
})().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
