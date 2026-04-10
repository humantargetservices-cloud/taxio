/**
 * MFA (2FA) — reserved for a future release.
 * Do not import from UI yet; keep auth flows unchanged until product enables this.
 *
 * Planned integration points (when implemented):
 * - After company login: optional TOTP enrollment / challenge
 * - Supabase Auth factors API (anon key + user session only)
 */
export const MFA_ENABLED = false

/** @returns {Promise<{ enrolled: boolean }>} */
export async function getMfaStatus() {
  return { enrolled: false }
}
