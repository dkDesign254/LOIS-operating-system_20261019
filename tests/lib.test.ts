import test from 'node:test'
import assert from 'node:assert/strict'
import { chunkText } from '../src/lib/chunk.ts'
import { sha256, newApiKey, newSecret } from '../src/lib/hash.ts'
import { toVector } from '../src/lib/embed.ts'

test('chunkText keeps passages within the limit and loses no text', () => {
  const text = Array.from({ length: 40 }, (_, i) => `Paragraph ${i}. ` + 'word '.repeat(60)).join('\n\n')
  const chunks = chunkText(text)
  assert.ok(chunks.length > 1)
  for (const c of chunks) assert.ok(c.length <= 1000, `chunk too long: ${c.length}`)
  assert.ok(chunks.join(' ').includes('Paragraph 39.'))
})

test('chunkText handles empty and single-line input', () => {
  assert.deepEqual(chunkText(''), [])
  assert.deepEqual(chunkText('Hello.'), ['Hello.'])
})

test('API keys are unique, prefixed, and only the hash is derivable', () => {
  const a = newApiKey()
  const b = newApiKey()
  assert.notEqual(a.key, b.key)
  assert.ok(a.key.startsWith('lois_live_'))
  assert.equal(a.hash, sha256(a.key))
  assert.equal(a.hash.length, 64)
  assert.ok(newSecret().startsWith('whsec_'))
})

test('toVector formats a pgvector literal', () => {
  assert.equal(toVector([1, 0.5, -2]), '[1,0.5,-2]')
})
