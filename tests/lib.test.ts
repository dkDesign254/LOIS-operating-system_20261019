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

import { readiness } from '../src/lib/readiness.ts'
const base = { risk: 'high', amount_kes: null, evidence_present: false, evidence_note: null, evidence_date: null, deadline: null, source_state: null, status: 'pending', requester: 'a@b.c' }

test('readiness gives five separate measures and no single score', () => {
  const ms = readiness(base, [], true)
  assert.equal(ms.length, 5)
  assert.deepEqual(ms.map((m) => m.key), ['coverage', 'freshness', 'reliability', 'unresolved', 'authority'])
})

test('high risk with no evidence is critical, and absent data is "Not assessed" not zero', () => {
  const ms = readiness(base, [], true)
  assert.equal(ms[0].status, 'crit')
  assert.equal(ms[1].status, 'none')
  assert.equal(ms[2].text, 'Not assessed')
  assert.equal(ms[3].text.includes('not challenged yet'), true)
})

test('freshness uses the 30 day rule and unresolved counts open challenge points', () => {
  const ok = readiness({ ...base, risk: 'low', evidence_present: true, evidence_date: '2026-10-01', deadline: '2026-10-20' }, [{ point: 'x', mark: 'unresolved' }], false)
  assert.equal(ok[1].status, 'ok')
  assert.equal(ok[3].status, 'warn')
  assert.equal(ok[4].status, 'warn')
})
