const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const SLUG_LENGTH = 8

export function generateSlug(): string {
  const bytes = new Uint8Array(SLUG_LENGTH)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}
