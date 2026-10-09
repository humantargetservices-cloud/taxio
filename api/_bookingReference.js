/**
 * Human-readable booking references for WhatsApp matching (e.g. TX-7K3P9Q).
 * Not sequential / not UUID.
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1

export function generateBookingReference() {
  const bytes = new Uint8Array(6)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    const nodeCrypto = require('crypto')
    nodeCrypto.randomFillSync(bytes)
  }
  let suffix = ''
  for (let i = 0; i < 6; i++) suffix += ALPHABET[bytes[i] % ALPHABET.length]
  return `TX-${suffix}`
}

/** Extract first TX-XXXXXX from free text (case-insensitive). */
export function extractBookingReferenceFromText(text) {
  const m = String(text || '').toUpperCase().match(/\bTX-[A-Z0-9]{6}\b/)
  return m ? m[0] : null
}
