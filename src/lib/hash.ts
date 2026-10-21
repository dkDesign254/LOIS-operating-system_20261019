import { createHash, randomBytes } from 'node:crypto'

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

/** New API key. Only the hash is stored; the full key is shown to the user once. */
export function newApiKey() {
  const key = `lois_live_${randomBytes(24).toString('hex')}`
  return { key, prefix: key.slice(0, 14), hash: sha256(key) }
}

export const newSecret = () => `whsec_${randomBytes(24).toString('hex')}`
