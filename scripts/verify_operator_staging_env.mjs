const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim()
const apiBase = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').trim().replace(/\/$/, '')
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim()
const live = String(process.env.EXPO_PUBLIC_ENABLE_LIVE_ACTIONS || 'false')

function hostOf(value) {
  try { return new URL(value).host } catch { return '' }
}

const failures = []
if (hostOf(supabaseUrl) !== 'lyjicuuyrvblbsqlduqg.supabase.co') failures.push('supabase-host')
if (apiBase !== 'https://staging.taxio.be') failures.push('api-base')
if (!anonKey.startsWith('sb_publishable_') || anonKey.length < 40) failures.push('anon-key')
if (/service_role|gdiamipqrhxbmrcsnqdk|www\.taxio\.be/.test(anonKey)) failures.push('anon-key-rejected')
if (live === 'true') failures.push('live-actions')

console.log(JSON.stringify({
  supabaseHost: hostOf(supabaseUrl) || 'missing',
  apiBase: apiBase || 'missing',
  anonKeyPresent: Boolean(anonKey),
  liveActions: live === 'true' ? 'enabled' : 'disabled',
}))
if (failures.length) {
  console.error('staging-config-rejected:' + failures.join(','))
  process.exit(1)
}
