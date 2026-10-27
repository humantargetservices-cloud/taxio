/** Public hosts that must never be used by Operator development or test builds. */
const PRODUCTION_HOSTS = new Set([
  'gdiamipqrhxbmrcsnqdk.supabase.co',
  'taxio.be',
  'www.taxio.be',
])

export function hostnameOf(raw: string): string {
  const value = String(raw || '').trim()
  if (!value) return ''
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export function isProductionTarget(raw: string): boolean {
  const host = hostnameOf(raw)
  if (!host) return false
  if (PRODUCTION_HOSTS.has(host)) return true
  if (host.endsWith('.taxio.be') && !host.endsWith('.staging.taxio.be') && host !== 'staging.taxio.be') return true
  return false
}

export function isolatedValue(raw: string | undefined): { value: string; blocked: boolean } {
  const value = String(raw || '').trim()
  if (!value) return { value: '', blocked: false }
  if (isProductionTarget(value)) return { value: '', blocked: true }
  return { value, blocked: false }
}

export function apiBaseUrl(): string {
  return isolatedValue(process.env.EXPO_PUBLIC_API_BASE_URL).value.replace(/\/$/, '')
}

export function supabaseUrl(): string {
  return isolatedValue(process.env.EXPO_PUBLIC_SUPABASE_URL).value
}

export function liveActionsRequested(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_LIVE_ACTIONS === 'true'
}

/** Live writes require an explicit flag and a non-production https API base. */
export function liveActionsEnabled(): boolean {
  const base = apiBaseUrl()
  return liveActionsRequested() && base.startsWith('https://') && !isProductionTarget(base)
}

export function bookingHost(): string | null {
  const host = hostnameOf(apiBaseUrl())
  if (!host) return null
  if (host === 'staging.taxio.be' || host.endsWith('.staging.taxio.be')) return 'staging.taxio.be'
  return null
}
