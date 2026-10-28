/** Read-only staging diagnostic. Returns the Supabase host classification, never a key. */
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, code: 'METHOD_NOT_ALLOWED' })
    return
  }
  const raw = String(process.env.SUPABASE_URL || '').trim()
  let host = ''
  try { host = new URL(raw).host } catch { host = '' }
  res.status(200).json({
    ok: true,
    supabaseHost: host || null,
    stagingProject: host === 'lyjicuuyrvblbsqlduqg.supabase.co',
    productionProject: host === 'gdiamipqrhxbmrcsnqdk.supabase.co',
  })
}
