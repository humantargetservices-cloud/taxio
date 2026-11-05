export function navigationUrl(address: string, provider: 'waze' | 'google'): string | null {
  const trimmed = address.trim()
  if (!trimmed) return null
  const encoded = encodeURIComponent(trimmed)
  if (provider === 'waze') return `https://waze.com/ul?q=${encoded}&navigate=yes`
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`
}
