function describe(name) {
  const value = String(process.env[name] || '').trim()
  if (!value) return name + ' MISSING'
  let host = ''
  try { host = new URL(value).host } catch { return name + ' UNPARSEABLE' }
  const marks = []
  if (host === 'lyjicuuyrvblbsqlduqg.supabase.co') marks.push('staging-ref')
  if (host === 'gdiamipqrhxbmrcsnqdk.supabase.co') marks.push('PRODUCTION-REF')
  return name + ' ' + host + (marks.length ? ' ' + marks.join('+') : '')
}
console.log(describe('SUPABASE_URL'))
console.log(describe('VITE_SUPABASE_URL'))
console.log('TAXIO_STAGING ' + (String(process.env.TAXIO_STAGING || '').trim() === 'true' ? 'true' : 'not-true'))
