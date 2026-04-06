/**
 * Matches Figma reference: alphanumeric slug derived from company name (no hyphens).
 * Used for companies.slug and /book/:slug URLs.
 */
export function slugFromCompanyName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
}
